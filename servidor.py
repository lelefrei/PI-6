from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import os

app = Flask(__name__)
CORS(app)


# ============================================================
# CONFIGURAÇÃO DO BANCO DE DADOS
# ============================================================

# No Render:
# DATABASE_URL será configurada nas Environment Variables.
#
# Localmente, você também pode usar DATABASE_URL.
#
# Exemplo:
# postgresql://postgres.xxxxx:SENHA@aws-0-xxxxx.pooler.supabase.com:5432/postgres

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    DB_CONFIG = {
        "dsn": DATABASE_URL
    }
else:
    # Configuração alternativa para execução local
    DB_CONFIG = {
        "host": os.getenv("SUPABASE_DB_HOST"),
        "database": os.getenv("SUPABASE_DB_NAME", "postgres"),
        "user": os.getenv("SUPABASE_DB_USER", "postgres"),
        "password": os.getenv("SUPABASE_DB_PASSWORD"),
        "port": os.getenv("SUPABASE_DB_PORT", "5432"),
        "sslmode": os.getenv("SUPABASE_DB_SSLMODE", "require")
    }


# ============================================================
# CONTROLE DE ALERTA
# ============================================================

passou_limite_global = False


# ============================================================
# ROTA DE TESTE / HEALTH CHECK
# ============================================================

@app.route('/health')
def health():
    conn = None

    try:
        conn = psycopg2.connect(**DB_CONFIG)

        return jsonify({
            "status": "ok",
            "database": "postgres",
            "supabase": True
        })

    except Exception as e:
        return jsonify({
            "status": "erro",
            "erro": str(e)
        }), 500

    finally:
        if conn:
            conn.close()


# ============================================================
# DADOS ATUAIS
# ============================================================

@app.route('/dados_atuais')
def dados_atuais():
    global passou_limite_global

    conn = None

    try:
        limite_usuario = float(
            request.args.get('limite', 14080)
        )

        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # ----------------------------------------------------
        # Última potência registrada
        # ----------------------------------------------------

        cur.execute("""
            SELECT potencia_watts
            FROM leituras_energia
            ORDER BY data_hora DESC
            LIMIT 1
        """)

        res = cur.fetchone()

        potencia = float(res[0]) if res else 0.0

        # ----------------------------------------------------
        # Verifica limite e registra alerta
        # ----------------------------------------------------

        if potencia > limite_usuario:

            if not passou_limite_global:

                cur.execute("""
                    INSERT INTO historico_alertas
                    (
                        potencia_watts,
                        limite_definido
                    )
                    VALUES (%s, %s)
                """, (
                    potencia,
                    limite_usuario
                ))

                conn.commit()

                passou_limite_global = True

        else:
            passou_limite_global = False

        # ----------------------------------------------------
        # Energia consumida no dia
        # ----------------------------------------------------

        cur.execute("""
            SELECT
                SUM(
                    potencia_watts / 1000.0
                    * (2.0 / 3600.0)
                )
            FROM leituras_energia
            WHERE data_hora::date = current_date
        """)

        res_energia = cur.fetchone()

        energia_dia = (
            float(res_energia[0])
            if res_energia
            and res_energia[0] is not None
            else 0.0
        )

        # ----------------------------------------------------
        # Pico de potência do dia
        # ----------------------------------------------------

        cur.execute("""
            SELECT MAX(potencia_watts)
            FROM leituras_energia
            WHERE data_hora::date = current_date
        """)

        res_pico = cur.fetchone()

        pico_dia = (
            float(res_pico[0])
            if res_pico
            and res_pico[0] is not None
            else 0.0
        )

        # ----------------------------------------------------
        # Quantidade de alertas do dia
        # ----------------------------------------------------

        cur.execute("""
            SELECT COUNT(*)
            FROM historico_alertas
            WHERE data_hora::date = current_date
        """)

        alertas_hoje = cur.fetchone()[0]

        cur.close()
        conn.close()

        # ----------------------------------------------------
        # Resposta
        # ----------------------------------------------------

        return jsonify({
            "potencia": round(potencia, 2),
            "energiaDia": round(energia_dia, 3),
            "picoDia": round(pico_dia, 2),
            "alertasHoje": alertas_hoje
        })

    except Exception as e:

        print(f"Erro em dados_atuais: {e}")

        if conn:
            conn.close()

        return jsonify({
            "erro": str(e)
        }), 500


# ============================================================
# HISTÓRICO DIÁRIO
# ============================================================

@app.route('/historico_diario')
def historico_diario():

    conn = None

    try:

        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        cur.execute("""
            SELECT
                c.data_ref,
                c.consumo_kwh,
                COALESCE(a.total_alertas, 0)
                    AS alertas_do_dia

            FROM (

                SELECT
                    data_hora::date AS data_ref,

                    ROUND(
                        SUM(
                            potencia_watts / 1000.0
                            * (2.0 / 3600.0)
                        ),
                        2
                    ) AS consumo_kwh

                FROM leituras_energia

                GROUP BY data_ref

            ) c

            LEFT JOIN (

                SELECT
                    data_hora::date AS data_ref,
                    COUNT(*) AS total_alertas

                FROM historico_alertas

                GROUP BY data_ref

            ) a

            ON c.data_ref = a.data_ref

            ORDER BY c.data_ref DESC

            LIMIT 7
        """)

        dados = cur.fetchall()

        cur.close()
        conn.close()

        # Inverte para ficar do mais antigo
        # para o mais recente

        dados_invertidos = list(
            reversed(dados)
        )

        valores = [
            float(d[1])
            for d in dados_invertidos
        ]

        media_7_dias = (
            sum(valores) / len(valores)
            if valores
            else 0.0
        )

        return jsonify({

            "labels": [
                d[0].strftime("%d/%m")
                for d in dados_invertidos
            ],

            "valores": valores,

            "alertas": [
                int(d[2])
                for d in dados_invertidos
            ],

            "media": round(
                media_7_dias,
                2
            )
        })

    except Exception as e:

        print(
            f"Erro no histórico diário: {e}"
        )

        if conn:
            conn.close()

        return jsonify({
            "labels": [],
            "valores": [],
            "alertas": [],
            "media": 0.0
        })


# ============================================================
# HISTÓRICO MENSAL
# ============================================================

@app.route('/historico_mensal')
def historico_mensal():

    conn = None

    try:

        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        cur.execute("""
            SELECT

                to_char(
                    data_hora,
                    'MM/YYYY'
                ) AS mes_ref,

                ROUND(
                    SUM(
                        potencia_watts / 1000.0
                        * (2.0 / 3600.0)
                    ),
                    2
                ) AS consumo_kwh,

                EXTRACT(
                    YEAR FROM data_hora
                ) AS ano,

                EXTRACT(
                    MONTH FROM data_hora
                ) AS mes

            FROM leituras_energia

            GROUP BY
                mes_ref,
                ano,
                mes

            ORDER BY
                ano ASC,
                mes ASC
        """)

        dados = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({

            "labels": [
                d[0]
                for d in dados
            ],

            "valores": [
                float(d[1])
                for d in dados
            ]
        })

    except Exception as e:

        print(
            f"Erro no histórico mensal: {e}"
        )

        if conn:
            conn.close()

        return jsonify({
            "labels": [],
            "valores": []
        }), 500


# ============================================================
# FILTRO AVANÇADO
# ============================================================

@app.route('/filtrar_avancado')
def filtrar_avancado():

    conn = None

    try:

        ano = request.args.get('ano')
        mes = request.args.get('mes')

        # ----------------------------------------------------
        # Ano obrigatório
        # ----------------------------------------------------

        if not ano:

            return jsonify({
                "erro": "O parâmetro 'ano' é obrigatório"
            }), 400

        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # ----------------------------------------------------
        # CASO A
        # Apenas o ano foi informado
        # ----------------------------------------------------

        if not mes or mes == "":

            cur.execute("""

                SELECT

                    to_char(
                        data_hora,
                        'MM/YYYY'
                    ) AS mes_ref,

                    ROUND(
                        SUM(
                            potencia_watts / 1000.0
                            * (2.0 / 3600.0)
                        ),
                        2
                    ) AS consumo_kwh

                FROM leituras_energia

                WHERE EXTRACT(
                    YEAR FROM data_hora
                ) = %s

                GROUP BY
                    mes_ref,
                    EXTRACT(MONTH FROM data_hora)

                ORDER BY
                    EXTRACT(MONTH FROM data_hora) ASC

            """, (
                int(ano),
            ))

            dados = cur.fetchall()

            labels = [
                d[0]
                for d in dados
            ]

            valores = [
                float(d[1])
                for d in dados
            ]

            media = (
                round(
                    sum(valores)
                    / len(valores),
                    2
                )
                if valores
                else 0.0
            )

        # ----------------------------------------------------
        # CASO B
        # Ano e mês foram informados
        # ----------------------------------------------------

        else:

            cur.execute("""

                SELECT

                    to_char(
                        data_hora,
                        'MM/YYYY'
                    ) AS mes_ref,

                    ROUND(
                        SUM(
                            potencia_watts / 1000.0
                            * (2.0 / 3600.0)
                        ),
                        2
                    ) AS consumo_kwh

                FROM leituras_energia

                WHERE
                    EXTRACT(
                        YEAR FROM data_hora
                    ) = %s

                    AND EXTRACT(
                        MONTH FROM data_hora
                    ) = %s

                GROUP BY mes_ref

            """, (
                int(ano),
                int(mes)
            ))

            res = cur.fetchone()

            if res:

                mes_str = (
                    f"{int(mes):02d}/{ano}"
                )

                labels = [
                    mes_str
                ]

                valores = [
                    float(res[1])
                ]

                media = float(
                    res[1]
                )

            else:

                mes_str = (
                    f"{int(mes):02d}/{ano}"
                )

                labels = [
                    mes_str
                ]

                valores = [
                    0.0
                ]

                media = 0.0

        cur.close()
        conn.close()

        return jsonify({

            "labels": labels,

            "valores": valores,

            "media": media
        })

    except Exception as e:

        print(
            f"Erro na filtragem avançada: {e}"
        )

        if conn:
            conn.close()

        return jsonify({

            "labels": [],

            "valores": [],

            "media": 0.0,

            "erro": str(e)
        }), 500


# ============================================================
# EXECUÇÃO
# ============================================================

if __name__ == '__main__':

    port = int(
        os.getenv("PORT", "5000")
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )

if __name__ == '__main__':
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)

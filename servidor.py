import os
import time
import random
import threading
from datetime import datetime

import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS


# ============================================================
# CONFIGURAÇÃO DO FLASK
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# BANCO DE DADOS - SUPABASE
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("A variável DATABASE_URL não foi configurada no Render.")


def conectar_banco():
    """
    Cria uma conexão com o PostgreSQL do Supabase.
    """
    return psycopg2.connect(DATABASE_URL)


# ============================================================
# CONFIGURAÇÃO DO MONITORAMENTO
# ============================================================

LIMITE_ALERTA = 1400

# Tempo entre cada leitura simulada
INTERVALO_DADOS = 5

# Tensão utilizada para calcular a potência
TENSAO = 220


# ============================================================
# GERADOR AUTOMÁTICO DE DADOS
# ============================================================

def gerar_dados_automaticamente():

    print("==========================================")
    print("GERADOR AUTOMÁTICO DE DADOS INICIADO")
    print("==========================================")

    while True:

        try:

            # ------------------------------------------------
            # GERA UMA CORRENTE ALEATÓRIA
            # ------------------------------------------------

            corrente = round(
                random.uniform(2.0, 8.0),
                2
            )

            # ------------------------------------------------
            # CALCULA A POTÊNCIA
            # P = V x I
            # ------------------------------------------------

            potencia = round(
                TENSAO * corrente,
                2
            )

            # ------------------------------------------------
            # DATA E HORA
            # ------------------------------------------------

            data_hora = datetime.now()

            # ------------------------------------------------
            # CONECTA AO BANCO
            # ------------------------------------------------

            conn = conectar_banco()
            cursor = conn.cursor()

            # ------------------------------------------------
            # INSERE A LEITURA
            # ------------------------------------------------

            cursor.execute(
                """
                INSERT INTO public.leituras_energia
                (
                    sensor_id,
                    corrente_amperes,
                    potencia_watts,
                    data_hora
                )
                VALUES (%s, %s, %s, %s)
                """,
                (
                    "ESP32_SIMULADO",
                    corrente,
                    potencia,
                    data_hora
                )
            )

            # ------------------------------------------------
            # VERIFICA SE ULTRAPASSOU O LIMITE
            # ------------------------------------------------

            if potencia > LIMITE_ALERTA:

                cursor.execute(
                    """
                    INSERT INTO public.historico_alertas
                    (
                        potencia_watts,
                        limite_definido,
                        data_hora
                    )
                    VALUES (%s, %s, %s)
                    """,
                    (
                        potencia,
                        LIMITE_ALERTA,
                        data_hora
                    )
                )

                print(
                    f"⚠️ ALERTA! "
                    f"Potência: {potencia} W "
                    f"(limite: {LIMITE_ALERTA} W)"
                )

            # ------------------------------------------------
            # CONFIRMA AS ALTERAÇÕES
            # ------------------------------------------------

            conn.commit()

            cursor.close()
            conn.close()

            print(
                f"✓ Dados inseridos | "
                f"Corrente: {corrente} A | "
                f"Potência: {potencia} W | "
                f"Horário: {data_hora.strftime('%H:%M:%S')}"
            )

        except Exception as erro:

            print("❌ Erro ao gerar dados:")
            print(erro)

        # ----------------------------------------------------
        # AGUARDA 5 SEGUNDOS
        # ----------------------------------------------------

        time.sleep(INTERVALO_DADOS)


# ============================================================
# ROTA DE TESTE
# ============================================================

@app.route("/health", methods=["GET"])
def health():

    try:

        conn = conectar_banco()
        cursor = conn.cursor()

        cursor.execute("SELECT 1;")

        cursor.fetchone()

        cursor.close()
        conn.close()

        return jsonify({
            "status": "ok",
            "database": "postgres",
            "supabase": True
        })

    except Exception as erro:

        return jsonify({
            "status": "erro",
            "database": "postgres",
            "supabase": False,
            "erro": str(erro)
        }), 500


# ============================================================
# DADOS ATUAIS
# ============================================================

@app.route("/dados_atuais", methods=["GET"])
def dados_atuais():

    try:

        conn = conectar_banco()
        cursor = conn.cursor()

        # ----------------------------------------------------
        # ÚLTIMA POTÊNCIA
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT potencia_watts
            FROM public.leituras_energia
            ORDER BY data_hora DESC
            LIMIT 1
            """
        )

        resultado = cursor.fetchone()

        if resultado:
            potencia_atual = float(resultado[0])
        else:
            potencia_atual = 0


        # ----------------------------------------------------
        # CONSUMO DO DIA
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                COALESCE(
                    SUM(
                        potencia_watts / 1000.0 *
                        (5.0 / 3600.0)
                    ),
                    0
                )
            FROM public.leituras_energia
            WHERE DATE(data_hora) = CURRENT_DATE
            """
        )

        resultado = cursor.fetchone()

        energia_dia = float(resultado[0] or 0)


        # ----------------------------------------------------
        # MAIOR POTÊNCIA DO DIA
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                COALESCE(
                    MAX(potencia_watts),
                    0
                )
            FROM public.leituras_energia
            WHERE DATE(data_hora) = CURRENT_DATE
            """
        )

        resultado = cursor.fetchone()

        pico_dia = float(resultado[0] or 0)


        # ----------------------------------------------------
        # QUANTIDADE DE ALERTAS DO DIA
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                COUNT(*)
            FROM public.historico_alertas
            WHERE DATE(data_hora) = CURRENT_DATE
            """
        )

        resultado = cursor.fetchone()

        alertas_hoje = int(resultado[0] or 0)


        cursor.close()
        conn.close()


        return jsonify({

            "potencia": potencia_atual,

            "energiaDia": round(
                energia_dia,
                3
            ),

            "picoDia": pico_dia,

            "alertasHoje": alertas_hoje

        })


    except Exception as erro:

        print("Erro em /dados_atuais:")
        print(erro)

        return jsonify({
            "erro": str(erro)
        }), 500


# ============================================================
# HISTÓRICO DIÁRIO
# ============================================================

@app.route("/historico_diario", methods=["GET"])
def historico_diario():

    try:

        conn = conectar_banco()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                DATE(data_hora) AS dia,

                COALESCE(
                    SUM(
                        potencia_watts / 1000.0 *
                        (5.0 / 3600.0)
                    ),
                    0
                ) AS consumo,

                COALESCE(
                    MAX(potencia_watts),
                    0
                ) AS pico

            FROM public.leituras_energia

            GROUP BY DATE(data_hora)

            ORDER BY dia ASC

            LIMIT 30
            """
        )

        resultados = cursor.fetchall()

        cursor.close()
        conn.close()


        dados = []

        for linha in resultados:

            dados.append({

                "data": str(linha[0]),

                "consumo": round(
                    float(linha[1] or 0),
                    3
                ),

                "pico": round(
                    float(linha[2] or 0),
                    2
                )

            })


        return jsonify(dados)


    except Exception as erro:

        print("Erro em /historico_diario:")
        print(erro)

        return jsonify({
            "erro": str(erro)
        }), 500


# ============================================================
# HISTÓRICO MENSAL
# ============================================================

@app.route("/historico_mensal", methods=["GET"])
def historico_mensal():

    try:

        conn = conectar_banco()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT

                TO_CHAR(
                    DATE_TRUNC(
                        'month',
                        data_hora
                    ),
                    'YYYY-MM'
                ) AS mes,

                COALESCE(
                    SUM(
                        potencia_watts / 1000.0 *
                        (5.0 / 3600.0)
                    ),
                    0
                ) AS consumo,

                COALESCE(
                    MAX(potencia_watts),
                    0
                ) AS pico

            FROM public.leituras_energia

            GROUP BY
                DATE_TRUNC(
                    'month',
                    data_hora
                )

            ORDER BY
                DATE_TRUNC(
                    'month',
                    data_hora
                ) ASC

            LIMIT 12
            """
        )

        resultados = cursor.fetchall()

        cursor.close()
        conn.close()


        dados = []

        for linha in resultados:

            dados.append({

                "mes": str(linha[0]),

                "consumo": round(
                    float(linha[1] or 0),
                    3
                ),

                "pico": round(
                    float(linha[2] or 0),
                    2
                )

            })


        return jsonify(dados)


    except Exception as erro:

        print("Erro em /historico_mensal:")
        print(erro)

        return jsonify({
            "erro": str(erro)
        }), 500


# ============================================================
# FILTRO AVANÇADO
# ============================================================

@app.route("/filtrar_avancado", methods=["GET"])
def filtrar_avancado():

    try:

        inicio = request.args.get("inicio")
        fim = request.args.get("fim")


        conn = conectar_banco()
        cursor = conn.cursor()


        # ----------------------------------------------------
        # SE NÃO INFORMAR DATAS
        # ----------------------------------------------------

        if not inicio or not fim:

            cursor.execute(
                """
                SELECT
                    data_hora,
                    potencia_watts,
                    corrente_amperes
                FROM public.leituras_energia
                ORDER BY data_hora DESC
                LIMIT 100
                """
            )

        else:

            cursor.execute(
                """
                SELECT
                    data_hora,
                    potencia_watts,
                    corrente_amperes
                FROM public.leituras_energia
                WHERE data_hora BETWEEN %s AND %s
                ORDER BY data_hora ASC
                """,
                (
                    inicio,
                    fim
                )
            )


        resultados = cursor.fetchall()

        cursor.close()
        conn.close()


        dados = []


        for linha in resultados:

            dados.append({

                "data_hora": linha[0].isoformat()
                if linha[0]
                else None,

                "potencia": float(
                    linha[1] or 0
                ),

                "corrente": float(
                    linha[2] or 0
                )

            })


        return jsonify(dados)


    except Exception as erro:

        print("Erro em /filtrar_avancado:")
        print(erro)

        return jsonify({
            "erro": str(erro)
        }), 500


# ============================================================
# INICIA O GERADOR AUTOMÁTICO
# ============================================================

thread = threading.Thread(
    target=gerar_dados_automaticamente,
    daemon=True
)

thread.start()


# ============================================================
# EXECUÇÃO LOCAL
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                5000
            )
        ),
        debug=False
    )

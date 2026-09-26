import os
import time
import random
import psycopg2
from datetime import datetime


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERRO: DATABASE_URL não foi configurada.")
    exit()


LIMITE_ALERTA = 1400
INTERVALO_SEGUNDOS = 5


def gerar_leitura():

    corrente = round(
        random.uniform(2.0, 8.0),
        2
    )

    tensao = 220

    potencia = round(
        tensao * corrente,
        2
    )

    return corrente, potencia


def salvar_leitura(corrente, potencia):

    conn = None

    try:

        conn = psycopg2.connect(
            DATABASE_URL
        )

        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO leituras_energia
            (
                sensor_id,
                corrente_amperes,
                potencia_watts,
                data_hora
            )
            VALUES
            (%s, %s, %s, %s)
            """,
            (
                "ESP32_SIMULADO",
                corrente,
                potencia,
                datetime.now()
            )
        )

        if potencia > LIMITE_ALERTA:

            cursor.execute(
                """
                INSERT INTO historico_alertas
                (
                    potencia_watts,
                    limite_definido,
                    data_hora
                )
                VALUES
                (%s, %s, %s)
                """,
                (
                    potencia,
                    LIMITE_ALERTA,
                    datetime.now()
                )
            )

        conn.commit()

        cursor.close()
        conn.close()

        return True

    except Exception as erro:

        print("Erro ao salvar:", erro)

        if conn:
            conn.close()

        return False


print("=" * 50)
print("GERADOR DE DADOS - TÔ LIGADO!")
print("=" * 50)

print("Conectado ao Supabase.")
print("Gerando dados automaticamente...")
print("Pressione CTRL + C para parar.")
print()


while True:

    corrente, potencia = gerar_leitura()

    sucesso = salvar_leitura(
        corrente,
        potencia
    )

    agora = datetime.now().strftime(
        "%H:%M:%S"
    )

    if sucesso:

        print(
            f"[{agora}] "
            f"Corrente: {corrente} A | "
            f"Potência: {potencia} W"
        )

        if potencia > LIMITE_ALERTA:

            print(
                "⚠️ ALERTA: potência acima do limite!"
            )

    time.sleep(
        INTERVALO_SEGUNDOS
    )

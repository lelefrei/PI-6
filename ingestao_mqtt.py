import paho.mqtt.client as mqtt
import psycopg2

import os

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DB_CONFIG = {"dsn": DATABASE_URL}
else:
    DB_CONFIG = {
        "host": os.getenv("DB_HOST", "localhost"),
        "database": os.getenv("DB_NAME", "to_ligado"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "postgres"),
        "port": os.getenv("DB_PORT", "5432")
    }

def salvar_no_banco(potencia):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        query = "INSERT INTO leituras_energia (corrente_amperes, potencia_watts) VALUES (%s, %s)"
        cur.execute(query, (potencia/220.0, potencia))
        conn.commit()
        cur.close()
        conn.close()
        print(f"Dados salvos: {potencia}W")
    except Exception as e:
        print(f"Erro ao salvar: {e}")

def on_message(client, userdata, msg):
    salvar_no_banco(float(msg.payload.decode()))

from paho.mqtt import client as mqtt_client

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
client.on_message = on_message
client.connect(os.getenv("MQTT_HOST", "broker.hivemq.com"), int(os.getenv("MQTT_PORT", "1883")), 60)
client.subscribe(os.getenv("MQTT_TOPIC", "projeto/medidor/potencia"))
client.loop_forever()
import psycopg2
import random
from datetime import datetime, timedelta

# Configuração de acesso ao seu banco de dados
DB_CONFIG = {
    "host": "localhost",
    "database": "to_ligado",
    "user": "postgres",
    "password": "postgres"
}

def gerar_dados_historicos():
    print("A iniciar a geração de dados históricos para o PostgreSQL...")
    
    data_inicio = datetime(2024, 1, 1, 0, 0, 0)
    data_fim = datetime(2026, 4, 30, 23, 59, 59)
    
    # Uma leitura a cada 2 horas
    intervalo_tempo = timedelta(hours=2)
    
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        data_atual = data_inicio
        registos_inseridos = 0
        valores_para_inserir = []
        
        while data_atual <= data_fim:
            hora = data_atual.hour
            
            # Lógica de flutuações de consumo residencial
            if 0 <= hora < 6:
                potencia = random.uniform(150.0, 600.0)
            elif 6 <= hora < 9:
                potencia = random.uniform(800.0, 4500.0)
            elif 18 <= hora < 23:
                if random.random() > 0.85:
                    potencia = random.uniform(12000.0, 16800.0) 
                else:
                    potencia = random.uniform(2000.0, 8000.0)
            else:
                potencia = random.uniform(400.0, 1800.0)
                
            potencia = round(potencia, 2)
            corrente = round((potencia / 220.0), 2)
            
            # Incluindo todos os campos necessários na tupla de inserção
            # (sensor_id, potencia_watts, corrente_amperes, data_hora)
            valores_para_inserir.append(('ESP32_01', potencia, corrente, data_atual))
            
            # Commit em blocos para performance
            if len(valores_para_inserir) >= 2000:
                cur.executemany(
                    "INSERT INTO leituras_energia (sensor_id, potencia_watts, corrente_amperes, data_hora) VALUES (%s, %s, %s, %s);",
                    valores_para_inserir
                )
                registos_inseridos += len(valores_para_inserir)
                valores_para_inserir = []
                print(f"... {registos_inseridos} registos guardados.")
                
            data_atual += intervalo_tempo
            
        if valores_para_inserir:
            cur.executemany(
                "INSERT INTO leituras_energia (sensor_id, potencia_watts, corrente_amperes, data_hora) VALUES (%s, %s, %s, %s);",
                valores_para_inserir
            )
            registos_inseridos += len(valores_para_inserir)
            
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"\nSucesso total! Foram gerados e inseridos {registos_inseridos} registos com sucesso no PostgreSQL.")
        
    except Exception as e:
        print(f"Erro fatal ao injetar dados: {e}")
        if conn:
            conn.close()

if __name__ == "__main__":
    gerar_dados_historicos()
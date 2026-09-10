CREATE TABLE IF NOT EXISTS leituras_energia (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(50) DEFAULT 'ESP32_01',
    corrente_amperes DECIMAL(10, 2) NOT NULL,
    potencia_watts DECIMAL(10, 2) NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historico_alertas (
    id SERIAL PRIMARY KEY,
    potencia_watts DECIMAL(10, 2) NOT NULL,
    limite_definido DECIMAL(10, 2) NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leituras_data_hora
ON leituras_energia(data_hora);

CREATE INDEX IF NOT EXISTS idx_alertas_data_hora
ON historico_alertas(data_hora);

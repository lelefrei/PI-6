# Tô Ligado! — Monitor de Energia Residencial

Projeto de monitoramento de consumo de energia com dashboard web, API Flask,
PostgreSQL e MQTT.

## Estrutura

- `frontend/` — site (HTML, CSS e JavaScript), hospedável no GitHub Pages.
- `backend/` — API Flask, ingestão MQTT e geração de histórico.
- `database/` — estrutura e consultas PostgreSQL.

## 1. GitHub Pages (frontend)

1. Crie um repositório público chamado `to-ligado`.
2. Envie o conteúdo de `frontend/` para a raiz do repositório.
3. No GitHub: Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
4. O GitHub fornecerá a URL do site.

## 2. API

A API é o arquivo `backend/servidor.py`.

Ela possui:
- `/dados_atuais`
- `/historico_diario`
- `/historico_mensal`
- `/filtrar_avancado`

Para produção, configure `DATABASE_URL` com a string de conexão do PostgreSQL.
O servidor usa a variável `PORT` fornecida pela plataforma de hospedagem.

Com Gunicorn:
`gunicorn servidor:app`

## 3. PostgreSQL

Execute `database/to_ligado_db.sql` no PostgreSQL.

IMPORTANTE: a API usa a tabela `historico_alertas` além de `leituras_energia`,
por isso as duas tabelas estão no script de banco.

## 4. Conectar o frontend à API

Abra `frontend/app.js` e altere:

`const API_BASE_URL = "COLOQUE_A_URL_DA_API_AQUI";`

para a URL pública da API, por exemplo:

`const API_BASE_URL = "https://to-ligado-api.onrender.com";`

Depois faça commit/push no GitHub.

## 5. MQTT

O `ingestao_mqtt.py` escuta:
- broker padrão: `broker.hivemq.com`
- porta padrão: `1883`
- tópico padrão: `projeto/medidor/potencia`

Esses valores podem ser alterados pelas variáveis:
`MQTT_HOST`, `MQTT_PORT` e `MQTT_TOPIC`.

O processo MQTT é um worker separado da API e precisa permanecer executando
para receber as leituras do ESP32.

## 6. Variáveis de ambiente

Para o backend:

`DATABASE_URL` — conexão PostgreSQL.

Alternativamente:
`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`.

Para MQTT:
`MQTT_HOST`, `MQTT_PORT`, `MQTT_TOPIC`.

## Arquitetura

ESP32 → MQTT/HiveMQ → `ingestao_mqtt.py` → PostgreSQL
→ `servidor.py` → Dashboard no GitHub Pages.

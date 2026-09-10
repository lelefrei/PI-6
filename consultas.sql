--Consumo Total Acumulado e Custo (R$)
SELECT 
    ROUND(SUM(potencia_watts / 1000.0 * (2.0 / 3600.0)), 4) as kwh_total,
    ROUND(SUM(potencia_watts / 1000.0 * (2.0 / 3600.0)) * 0.75, 2) as custo_estimado_reais
FROM leituras_energia;

--Média de Consumo por Período do Dia
SELECT 
    EXTRACT(HOUR FROM data_hora) as hora_do_dia,
    ROUND(AVG(potencia_watts), 2) as media_watts
FROM leituras_energia
GROUP BY hora_do_dia
ORDER BY hora_do_dia;

--O "Coração" do Projeto: Comparativo Mensal
SELECT 
    date_trunc('month', data_hora) as mes,
    SUM(potencia_watts) as total_watts
FROM leituras_energia
GROUP BY mes
ORDER BY mes DESC;
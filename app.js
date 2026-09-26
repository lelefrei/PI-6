// ============================================================
// TÔ LIGADO! — MONITOR DE ENERGIA
// ============================================================

const API_BASE_URL = "https://pi6-3ggn.onrender.com";

let graficoTempoReal = null;
let graficoConsumoDiario = null;
let graficoConsumoMensal = null;


// ============================================================
// ELEMENTOS DOS CARDS
// ============================================================

const potenciaElement = document.getElementById("potenciaAtual");
const energiaElement = document.getElementById("energiaDia");
const picoElement = document.getElementById("picoDia");
const alertasElement = document.getElementById("alertasHoje");


// ============================================================
// DADOS ATUAIS
// ============================================================

async function carregarDadosAtuais() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/dados_atuais`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao buscar dados atuais");
        }

        const dados = await resposta.json();

        if (potenciaElement) {
            potenciaElement.textContent =
                `${Number(dados.potencia).toFixed(0)} W`;
        }

        if (energiaElement) {
            energiaElement.textContent =
                `${Number(dados.energiaDia).toFixed(3)} kWh`;
        }

        if (picoElement) {
            picoElement.textContent =
                `${Number(dados.picoDia).toFixed(0)} W`;
        }

        if (alertasElement) {
            alertasElement.textContent =
                dados.alertasHoje;
        }

    } catch (erro) {

        console.error(
            "Erro ao carregar dados atuais:",
            erro
        );
    }
}


// ============================================================
// CONSUMO DIÁRIO
// ============================================================

async function carregarConsumoDiario() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/historico_diario`
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar histórico diário"
            );
        }

        const dados = await resposta.json();

        console.log(
            "Dados consumo diário:",
            dados
        );

        const labels = dados.map(
            item => formatarData(item.data)
        );

        const valores = dados.map(
            item => Number(item.consumo)
        );

        criarGraficoConsumoDiario(
            labels,
            valores
        );

    } catch (erro) {

        console.error(
            "Erro no consumo diário:",
            erro
        );
    }
}


// ============================================================
// GRÁFICO CONSUMO DIÁRIO
// ============================================================

function criarGraficoConsumoDiario(
    labels,
    valores
) {

    const canvas =
        document.getElementById(
            "graficoConsumoDiario"
        );

    if (!canvas) {
        console.error(
            "Canvas graficoConsumoDiario não encontrado."
        );
        return;
    }

    if (graficoConsumoDiario) {
        graficoConsumoDiario.destroy();
    }

    graficoConsumoDiario =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Consumo (kWh)",

                        data: valores,

                        borderWidth: 1,

                        borderRadius: 8
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: true
                    },

                    tooltip: {

                        callbacks: {

                            label: function(context) {

                                return ` ${Number(
                                    context.raw
                                ).toFixed(3)} kWh`;

                            }
                        }
                    }
                },

                scales: {

                    y: {

                        beginAtZero: true,

                        title: {

                            display: true,

                            text: "Consumo (kWh)"
                        }
                    },

                    x: {

                        title: {

                            display: true,

                            text: "Data"
                        }
                    }
                }
            }
        });
}


// ============================================================
// CONSUMO MENSAL
// ============================================================

async function carregarConsumoMensal() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/historico_mensal`
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar histórico mensal"
            );
        }

        const dados = await resposta.json();

        console.log(
            "Dados consumo mensal:",
            dados
        );

        const labels = dados.map(
            item => formatarMes(item.mes)
        );

        const valores = dados.map(
            item => Number(item.consumo)
        );

        criarGraficoConsumoMensal(
            labels,
            valores
        );

    } catch (erro) {

        console.error(
            "Erro no consumo mensal:",
            erro
        );
    }
}


// ============================================================
// GRÁFICO CONSUMO MENSAL
// ============================================================

function criarGraficoConsumoMensal(
    labels,
    valores
) {

    const canvas =
        document.getElementById(
            "graficoConsumoMensal"
        );

    if (!canvas) {
        console.error(
            "Canvas graficoConsumoMensal não encontrado."
        );
        return;
    }

    if (graficoConsumoMensal) {
        graficoConsumoMensal.destroy();
    }

    graficoConsumoMensal =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Consumo (kWh)",

                        data: valores,

                        borderWidth: 1,

                        borderRadius: 8
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: true
                    },

                    tooltip: {

                        callbacks: {

                            label: function(context) {

                                return ` ${Number(
                                    context.raw
                                ).toFixed(3)} kWh`;

                            }
                        }
                    }
                },

                scales: {

                    y: {

                        beginAtZero: true,

                        title: {

                            display: true,

                            text: "Consumo (kWh)"
                        }
                    },

                    x: {

                        title: {

                            display: true,

                            text: "Mês"
                        }
                    }
                }
            }
        });
}


// ============================================================
// POTÊNCIA EM TEMPO REAL
// ============================================================

async function carregarPotenciaTempoReal() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/filtrar_avancado`
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar potência"
            );
        }

        const dados = await resposta.json();

        const dadosOrdenados =
            [...dados].reverse();

        const ultimasLeituras =
            dadosOrdenados.slice(-30);

        const labels =
            ultimasLeituras.map(
                item => formatarHora(
                    item.data_hora
                )
            );

        const valores =
            ultimasLeituras.map(
                item => Number(item.potencia)
            );

        criarGraficoTempoReal(
            labels,
            valores
        );

    } catch (erro) {

        console.error(
            "Erro na potência em tempo real:",
            erro
        );
    }
}


// ============================================================
// GRÁFICO TEMPO REAL
// ============================================================

function criarGraficoTempoReal(
    labels,
    valores
) {

    const canvas =
        document.getElementById(
            "graficoTempoReal"
        );

    if (!canvas) {
        return;
    }

    if (graficoTempoReal) {
        graficoTempoReal.destroy();
    }

    graficoTempoReal =
        new Chart(canvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Potência (W)",

                        data: valores,

                        tension: 0.35,

                        fill: true,

                        pointRadius: 3,

                        pointHoverRadius: 6,

                        borderWidth: 2
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {

                    intersect: false,

                    mode: "index"
                },

                plugins: {

                    legend: {
                        display: true
                    },

                    tooltip: {

                        callbacks: {

                            label: function(context) {

                                return ` ${Number(
                                    context.raw
                                ).toFixed(0)} W`;

                            }
                        }
                    }
                },

                scales: {

                    y: {

                        beginAtZero: true,

                        title: {

                            display: true,

                            text: "Potência (W)"
                        }
                    },

                    x: {
                        // Oculta os horários no eixo inferior.
                        // O horário correto continua disponível no tooltip ao passar o mouse.
                        display: false
                    }
                }
            }
        });
}


// ============================================================
// FORMATAÇÃO DE DATA
// ============================================================

function formatarData(data) {

    if (!data) {
        return "";
    }

    const partes =
        data.split("-");

    if (partes.length !== 3) {
        return data;
    }

    return `${partes[2]}/${partes[1]}`;
}


// ============================================================
// FORMATAÇÃO DE MÊS
// ============================================================

function formatarMes(mes) {

    if (!mes) {
        return "";
    }

    const partes =
        mes.split("-");

    if (partes.length !== 2) {
        return mes;
    }

    return `${partes[1]}/${partes[0]}`;
}


// ============================================================
// FORMATAÇÃO DE HORA
// ============================================================

function formatarHora(dataHora) {

    if (!dataHora) {
        return "";
    }

    let valor = String(dataHora).trim();

    // Os timestamps do banco podem chegar sem informação de fuso.
    // Nesse caso, tratamos o valor como UTC e convertemos para São Paulo.
    if (
        /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(valor) &&
        !(/[Zz]|[+-]\d{2}:\d{2}$/.test(valor))
    ) {
        valor = valor.replace(" ", "T") + "Z";
    }

    const data = new Date(valor);

    if (isNaN(data.getTime())) {
        return dataHora;
    }

    // Horário de Brasília / São Paulo (UTC-3).
    return data.toLocaleTimeString(
        "pt-BR",
        {
            timeZone: "America/Sao_Paulo",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


// ============================================================
// ATUALIZAÇÃO COMPLETA
// ============================================================

async function atualizarDashboard() {

    await carregarDadosAtuais();

    await carregarPotenciaTempoReal();

    await carregarConsumoDiario();

    await carregarConsumoMensal();
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        atualizarDashboard();

        // Atualiza a cada 10 segundos
        setInterval(
            atualizarDashboard,
            10000
        );
    }
);

// ============================================================
// TÔ LIGADO 2.0! — MONITOR DE ENERGIA
// ============================================================

const API_BASE_URL = "https://pi6-3ggn.onrender.com";

let realtimeChart = null;
let dailyChart = null;
let monthlyChart = null;

const TARIFA = 0.95;


// ============================================================
// ELEMENTOS DO HTML
// ============================================================

const potenciaElement =
    document.getElementById("potencia");

const energiaElement =
    document.getElementById("energiaDia");

const custoElement =
    document.getElementById("custo");

const picoElement =
    document.getElementById("pico");

const contadorAlertasElement =
    document.getElementById("contadorAlertas");

const statusText =
    document.getElementById("statusText");

const statusPill =
    document.getElementById("statusPill");

const consumoStatus =
    document.getElementById("consumoStatus");


// ============================================================
// DADOS ATUAIS
// ============================================================

async function carregarDadosAtuais() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/dados_atuais`
        );

        if (!resposta.ok) {
            throw new Error("Erro na API");
        }

        const dados = await resposta.json();

        console.log("Dados atuais:", dados);


        // POTÊNCIA
        if (potenciaElement) {

            potenciaElement.textContent =
                `${Number(dados.potencia).toFixed(0)} W`;

        }


        // ENERGIA
        if (energiaElement) {

            energiaElement.textContent =
                `${Number(dados.energiaDia).toFixed(3)} kWh`;

        }


        // CUSTO
        if (custoElement) {

            const custo =
                Number(dados.energiaDia) * TARIFA;

            custoElement.textContent =
                `R$ ${custo.toFixed(2).replace(".", ",")}`;

        }


        // PICO
        if (picoElement) {

            picoElement.textContent =
                `${Number(dados.picoDia).toFixed(0)} W`;

        }


        // ALERTAS
        if (contadorAlertasElement) {

            contadorAlertasElement.textContent =
                dados.alertasHoje;

        }


        // STATUS
        if (statusText) {

            statusText.textContent =
                "Online";

        }

        if (consumoStatus) {

            consumoStatus.textContent =
                "Monitoramento ativo";

        }

        if (statusPill) {

            statusPill.classList.add("online");

        }

    } catch (erro) {

        console.error(
            "Erro ao carregar dados atuais:",
            erro
        );

        if (statusText) {
            statusText.textContent =
                "Offline";
        }

        if (consumoStatus) {
            consumoStatus.textContent =
                "Aguardando conexão";
        }
    }
}


// ============================================================
// GRÁFICO EM TEMPO REAL
// ============================================================

async function carregarTempoReal() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/filtrar_avancado`
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar leituras"
            );
        }

        const dados = await resposta.json();

        console.log(
            "Leituras recebidas:",
            dados
        );


        // Pega as últimas 30 leituras
        const ultimas =
            dados.slice(0, 30).reverse();


        const labels =
            ultimas.map(item =>
                formatarHora(item.data_hora)
            );


        const valores =
            ultimas.map(item =>
                Number(item.potencia)
            );


        criarGraficoTempoReal(
            labels,
            valores
        );

    } catch (erro) {

        console.error(
            "Erro no gráfico em tempo real:",
            erro
        );
    }
}


// ============================================================
// CRIAR GRÁFICO EM TEMPO REAL
// ============================================================

function criarGraficoTempoReal(
    labels,
    valores
) {

    const canvas =
        document.getElementById(
            "realtimeChart"
        );

    if (!canvas) {

        console.error(
            "Canvas realtimeChart não encontrado."
        );

        return;
    }


    if (realtimeChart) {
        realtimeChart.destroy();
    }


    realtimeChart =
        new Chart(canvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Potência (W)",

                        data: valores,

                        borderWidth: 3,

                        tension: 0.35,

                        fill: true,

                        pointRadius: 3,

                        pointHoverRadius: 6
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

                                return (
                                    " Potência: " +
                                    Number(
                                        context.raw
                                    ).toFixed(0) +
                                    " W"
                                );

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

                        title: {

                            display: true,

                
                        }
                    }
                }
            }
        });
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
                "Erro no histórico diário"
            );
        }

        const dados =
            await resposta.json();


        console.log(
            "Histórico diário:",
            dados
        );


        const ultimos7 =
            dados.slice(-7);


        const labels =
            ultimos7.map(item =>
                formatarData(item.data)
            );


        const valores =
            ultimos7.map(item =>
                Number(item.consumo)
            );


        criarGraficoDiario(
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
// CRIAR GRÁFICO DIÁRIO
// ============================================================

function criarGraficoDiario(
    labels,
    valores
) {

    const canvas =
        document.getElementById(
            "dailyChart"
        );


    if (!canvas) {

        console.error(
            "Canvas dailyChart não encontrado."
        );

        return;
    }


    if (dailyChart) {

        dailyChart.destroy();

    }


    dailyChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Consumo (kWh)",

                        data: valores,

                        borderWidth: 1,

                        borderRadius: 8,

                        maxBarThickness: 60
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

                                return (
                                    " Consumo: " +
                                    Number(
                                        context.raw
                                    ).toFixed(3) +
                                    " kWh"
                                );

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
                "Erro no histórico mensal"
            );
        }

        const dados =
            await resposta.json();


        console.log(
            "Histórico mensal:",
            dados
        );


        const labels =
            dados.map(item =>
                formatarMes(item.mes)
            );


        const valores =
            dados.map(item =>
                Number(item.consumo)
            );


        criarGraficoMensal(
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
// CRIAR GRÁFICO MENSAL
// ============================================================

function criarGraficoMensal(
    labels,
    valores
) {

    const canvas =
        document.getElementById(
            "monthlyChart"
        );


    if (!canvas) {

        console.error(
            "Canvas monthlyChart não encontrado."
        );

        return;
    }


    if (monthlyChart) {

        monthlyChart.destroy();

    }


    monthlyChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Consumo (kWh)",

                        data: valores,

                        borderWidth: 1,

                        borderRadius: 8,

                        maxBarThickness: 70
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

                                return (
                                    " Consumo: " +
                                    Number(
                                        context.raw
                                    ).toFixed(3) +
                                    " kWh"
                                );

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
// FORMATAR DATA
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

    return (
        partes[2] +
        "/" +
        partes[1]
    );
}


// ============================================================
// FORMATAR MÊS
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

    return (
        partes[1] +
        "/" +
        partes[0]
    );
}


// ============================================================
// FORMATAR HORA
// ============================================================

function formatarHora(dataHora) {

    if (!dataHora) {
        return "";
    }

    const data =
        new Date(dataHora);

    if (isNaN(data.getTime())) {
        return dataHora;
    }

    return data.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


// ============================================================
// ATUALIZAR DASHBOARD
// ============================================================

async function atualizarDashboard() {

    console.log(
        "Atualizando dashboard..."
    );

    await carregarDadosAtuais();

    await carregarTempoReal();

    await carregarConsumoDiario();

    await carregarConsumoMensal();

}


// ============================================================
// BOTÃO ATUALIZAR
// ============================================================

const refreshBtn =
    document.getElementById(
        "refreshBtn"
    );

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        atualizarDashboard
    );

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        atualizarDashboard();


        // Atualiza automaticamente
        // a cada 10 segundos

        setInterval(
            atualizarDashboard,
            10000
        );

    }
);

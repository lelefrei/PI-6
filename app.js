const API_BASE_URL = "https://pi6-3ggn.onrender.com";

let realtimeChart = null;
let dailyChart = null;
let monthlyChart = null;

const TARIFA = 0.95;


// =====================================================
// ELEMENTOS
// =====================================================

const potencia = document.getElementById("potencia");
const energiaDia = document.getElementById("energiaDia");
const custo = document.getElementById("custo");
const pico = document.getElementById("pico");
const contadorAlertas = document.getElementById("contadorAlertas");


// =====================================================
// DADOS ATUAIS
// =====================================================

async function carregarDadosAtuais() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/dados_atuais`
        );

        const dados = await response.json();

        console.log("DADOS ATUAIS:", dados);

        potencia.textContent =
            `${Number(dados.potencia).toFixed(0)} W`;

        energiaDia.textContent =
            `${Number(dados.energiaDia).toFixed(3)} kWh`;

        pico.textContent =
            `${Number(dados.picoDia).toFixed(0)} W`;

        contadorAlertas.textContent =
            dados.alertasHoje;

        const valorCusto =
            Number(dados.energiaDia) * TARIFA;

        custo.textContent =
            `R$ ${valorCusto.toFixed(2).replace(".", ",")}`;

    } catch (erro) {

        console.error(
            "ERRO DADOS ATUAIS:",
            erro
        );

    }

}


// =====================================================
// GRÁFICO EM TEMPO REAL
// =====================================================

async function carregarTempoReal() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/filtrar_avancado`
        );

        const dados = await response.json();

        console.log(
            "DADOS TEMPO REAL:",
            dados
        );

        const ultimos =
            dados.slice(0, 30).reverse();

        const labels =
            ultimos.map(item =>
                formatarHora(item.data_hora)
            );

        const valores =
            ultimos.map(item =>
                Number(item.potencia)
            );

        const canvas =
            document.getElementById("realtimeChart");

        if (!canvas) return;

        if (realtimeChart) {
            realtimeChart.destroy();
        }

        realtimeChart = new Chart(
            canvas,
            {
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

                            pointRadius: 3
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {
                            beginAtZero: true
                        }

                    }

                }

            }
        );

    } catch (erro) {

        console.error(
            "ERRO TEMPO REAL:",
            erro
        );

    }

}


// =====================================================
// GRÁFICO DIÁRIO
// =====================================================

async function carregarGraficoDiario() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/historico_diario`
        );

        const dados = await response.json();

        console.log(
            "DADOS DIÁRIOS:",
            dados
        );

        if (!Array.isArray(dados)) {

            console.error(
                "A API diária não retornou uma lista:",
                dados
            );

            return;
        }

        const labels =
            dados.map(item =>
                formatarData(
                    item.data || item.data_ref
                )
            );

        const valores =
            dados.map(item =>
                Number(
                    item.consumo ??
                    item.consumo_kwh ??
                    item.consumo
                )
            );

        console.log(
            "LABELS DIÁRIOS:",
            labels
        );

        console.log(
            "VALORES DIÁRIOS:",
            valores
        );


        const canvas =
            document.getElementById("dailyChart");

        if (!canvas) {

            console.error(
                "dailyChart NÃO EXISTE NO HTML"
            );

            return;
        }


        if (dailyChart) {
            dailyChart.destroy();
        }


        dailyChart = new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label: "Consumo diário (kWh)",

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
                                        " " +
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

                                text: "kWh"
                            }

                        },

                        x: {

                            title: {

                                display: true,

                                text: "Dia"
                            }

                        }

                    }

                }

            }
        );

    } catch (erro) {

        console.error(
            "ERRO GRÁFICO DIÁRIO:",
            erro
        );

    }

}


// =====================================================
// GRÁFICO MENSAL
// =====================================================

async function carregarGraficoMensal() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/historico_mensal`
        );

        const dados = await response.json();

        console.log(
            "DADOS MENSAIS:",
            dados
        );

        if (!Array.isArray(dados)) {

            console.error(
                "A API mensal não retornou uma lista:",
                dados
            );

            return;
        }

        const labels =
            dados.map(item =>
                formatarMes(
                    item.mes
                )
            );

        const valores =
            dados.map(item =>
                Number(
                    item.consumo ??
                    item.consumo_kwh ??
                    item.consumo
                )
            );


        console.log(
            "LABELS MENSAIS:",
            labels
        );

        console.log(
            "VALORES MENSAIS:",
            valores
        );


        const canvas =
            document.getElementById("monthlyChart");

        if (!canvas) {

            console.error(
                "monthlyChart NÃO EXISTE NO HTML"
            );

            return;
        }


        if (monthlyChart) {
            monthlyChart.destroy();
        }


        monthlyChart = new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label: "Consumo mensal (kWh)",

                            data: valores,

                            borderWidth: 1,

                            borderRadius: 8,

                            maxBarThickness: 80
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
                                        " " +
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

                                text: "kWh"
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

            }
        );

    } catch (erro) {

        console.error(
            "ERRO GRÁFICO MENSAL:",
            erro
        );

    }

}


// =====================================================
// FORMATAÇÕES
// =====================================================

function formatarData(data) {

    if (!data) {
        return "";
    }

    const partes =
        String(data).split("-");

    if (partes.length === 3) {

        return `${partes[2]}/${partes[1]}`;

    }

    return data;

}


function formatarMes(mes) {

    if (!mes) {
        return "";
    }

    const partes =
        String(mes).split("-");

    if (partes.length === 2) {

        return `${partes[1]}/${partes[0]}`;

    }

    return mes;

}


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


// =====================================================
// ATUALIZAR TUDO
// =====================================================

async function atualizarDashboard() {

    console.log(
        "========== ATUALIZANDO =========="
    );

    await carregarDadosAtuais();

    await carregarTempoReal();

    await carregarGraficoDiario();

    await carregarGraficoMensal();

}


// =====================================================
// BOTÃO ATUALIZAR
// =====================================================

const refreshBtn =
    document.getElementById("refreshBtn");

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        atualizarDashboard
    );

}


// =====================================================
// MODO NOTURNO
// =====================================================

const themeBtn =
    document.getElementById("themeBtn");

const temaSalvo =
    localStorage.getItem("tema");

if (temaSalvo === "dark") {

    document.body.classList.add("dark");

    if (themeBtn) {
        themeBtn.textContent = "☀️";
    }

}


if (themeBtn) {

    themeBtn.addEventListener(
        "click",
        function() {

            document.body.classList.toggle(
                "dark"
            );

            const dark =
                document.body.classList.contains(
                    "dark"
                );

            if (dark) {

                themeBtn.textContent = "☀️";

                localStorage.setItem(
                    "tema",
                    "dark"
                );

            } else {

                themeBtn.textContent = "🌙";

                localStorage.setItem(
                    "tema",
                    "light"
                );

            }

        }
    );

}


// =====================================================
// INICIAR
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        atualizarDashboard();

        setInterval(
            atualizarDashboard,
            10000
        );

    }
);

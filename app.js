/// ============================================================
// TÔ LIGADO! — MONITOR DE ENERGIA
// ============================================================


// ============================================================
// 1. CONFIGURAÇÃO
// ============================================================

const API_BASE_URL = "https://pi6-3ggn.onrender.com";


// ============================================================
// 2. VARIÁVEIS DOS GRÁFICOS
// ============================================================

let graficoTempoReal = null;
let graficoConsumoDiario = null;
let graficoConsumoMensal = null;
let graficoAlertas = null;


// ============================================================
// 3. ELEMENTOS DA PÁGINA
// ============================================================

const potenciaElement = document.getElementById("potenciaAtual");
const energiaElement = document.getElementById("energiaDia");
const picoElement = document.getElementById("picoDia");
const alertasElement = document.getElementById("alertasHoje");


// ============================================================
// 4. BUSCAR DADOS ATUAIS
// ============================================================

async function carregarDadosAtuais() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/dados_atuais`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao buscar dados atuais.");
        }

        const dados = await resposta.json();


        // ----------------------------------------------------
        // ATUALIZA OS CARDS
        // ----------------------------------------------------

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
// 5. CONSUMO DIÁRIO
// ============================================================

async function carregarConsumoDiario() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/historico_diario`
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar histórico diário."
            );
        }

        const dados = await resposta.json();


        // ----------------------------------------------------
        // LABELS DO GRÁFICO
        // ----------------------------------------------------

        const labels = dados.map(
            item => formatarData(item.data)
        );


        // ----------------------------------------------------
        // VALORES DE CONSUMO
        // ----------------------------------------------------

        const valores = dados.map(
            item => Number(item.consumo)
        );


        // ----------------------------------------------------
        // CRIA O GRÁFICO
        // ----------------------------------------------------

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
// 6. GRÁFICO DE CONSUMO DIÁRIO
// ============================================================

function criarGraficoConsumoDiario(
    labels,
    valores
) {

    const canvas = document.getElementById(
        "graficoConsumoDiario"
    );

    if (!canvas) {
        return;
    }


    // --------------------------------------------------------
    // DESTRÓI O GRÁFICO ANTERIOR
    // --------------------------------------------------------

    if (graficoConsumoDiario) {
        graficoConsumoDiario.destroy();
    }


    // --------------------------------------------------------
    // CRIA NOVO GRÁFICO
    // --------------------------------------------------------

    graficoConsumoDiario = new Chart(
        canvas.getContext("2d"),
        {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Consumo diário (kWh)",

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

        }
    );
}


// ============================================================
// 7. CONSUMO MENSAL
// ============================================================

async function carregarConsumoMensal() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/historico_mensal`
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar histórico mensal."
            );
        }

        const dados = await resposta.json();


        // ----------------------------------------------------
        // LABELS
        // ----------------------------------------------------

        const labels = dados.map(
            item => formatarMes(item.mes)
        );


        // ----------------------------------------------------
        // VALORES
        // ----------------------------------------------------

        const valores = dados.map(
            item => Number(item.consumo)
        );


        // ----------------------------------------------------
        // CRIA GRÁFICO
        // ----------------------------------------------------

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
// 8. GRÁFICO DE CONSUMO MENSAL
// ============================================================

function criarGraficoConsumoMensal(
    labels,
    valores
) {

    const canvas = document.getElementById(
        "graficoConsumoMensal"
    );

    if (!canvas) {
        return;
    }


    // --------------------------------------------------------
    // REMOVE GRÁFICO ANTERIOR
    // --------------------------------------------------------

    if (graficoConsumoMensal) {
        graficoConsumoMensal.destroy();
    }


    // --------------------------------------------------------
    // CRIA NOVO GRÁFICO
    // --------------------------------------------------------

    graficoConsumoMensal = new Chart(
        canvas.getContext("2d"),
        {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Consumo mensal (kWh)",

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

        }
    );
}


// ============================================================
// 9. POTÊNCIA EM TEMPO REAL
// ============================================================

async function carregarPotenciaTempoReal() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/filtrar_avancado`
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar potência."
            );
        }

        const dados = await resposta.json();


        const dadosOrdenados = dados.reverse();


        const labels = dadosOrdenados.map(
            item => formatarHora(item.data_hora)
        );


        const valores = dadosOrdenados.map(
            item => Number(item.potencia)
        );


        criarGraficoTempoReal(
            labels,
            valores
        );


    } catch (erro) {

        console.error(
            "Erro no gráfico de potência:",
            erro
        );

    }
}


// ============================================================
// 10. GRÁFICO DE POTÊNCIA
// ============================================================

function criarGraficoTempoReal(
    labels,
    valores
) {

    const canvas = document.getElementById(
        "graficoTempoReal"
    );

    if (!canvas) {
        return;
    }


    if (graficoTempoReal) {
        graficoTempoReal.destroy();
    }


    graficoTempoReal = new Chart(
        canvas.getContext("2d"),
        {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {

                        label: "Potência (W)",

                        data: valores,

                        tension: 0.35,

                        fill: true,

                        borderWidth: 2

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: true
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

                            text: "Horário"
                        }

                    }

                }

            }

        }
    );
}


// ============================================================
// 11. FORMATA DATA
// ============================================================

function formatarData(data) {

    if (!data) {
        return "";
    }

    const partes = data.split("-");

    if (partes.length !== 3) {
        return data;
    }

    return `${partes[2]}/${partes[1]}`;
}


// ============================================================
// 12. FORMATA MÊS
// ============================================================

function formatarMes(mes) {

    if (!mes) {
        return "";
    }

    const partes = mes.split("-");

    if (partes.length !== 2) {
        return mes;
    }

    return `${partes[1]}/${partes[0]}`;
}


// ============================================================
// 13. FORMATA HORÁRIO
// ============================================================

function formatarHora(dataHora) {

    if (!dataHora) {
        return "";
    }

    const data = new Date(dataHora);

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
// 14. ATUALIZA TODO O DASHBOARD
// ============================================================

async function atualizarDashboard() {

    await carregarDadosAtuais();

    await carregarPotenciaTempoReal();

    await carregarConsumoDiario();

    await carregarConsumoMensal();
}


// ============================================================
// 15. INICIALIZAÇÃO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "Tô Ligado! iniciado."
        );


        // Primeira atualização

        atualizarDashboard();


        // Atualiza os dados a cada 10 segundos

        setInterval(
            atualizarDashboard,
            10000
        );

    }
);

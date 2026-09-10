const tarifa = 0.95;

// URL da API em produção.
// Exemplo: https://to-ligado-api.onrender.com
// Durante testes locais, use: http://127.0.0.1:5000
const API_BASE_URL = "COLOQUE_A_URL_DA_API_AQUI"; 

let consumoTempoReal = [];
let labelsTempoReal = [];
let listaAlertasDiarios = []; 

// Variáveis para a memória do histórico mensal
let dadosMensaisOriginais = { labels: [], valores: [] };
let filtroAtivo = false;

// Configuração Inicial do Limite no LocalStorage
const inputLimite = document.getElementById('limiteAlerta');
const limiteSalvo = localStorage.getItem('limiteAlertaUsuario');
if (limiteSalvo) {
    inputLimite.value = limiteSalvo;
} else {
    inputLimite.value = 14080; 
}
inputLimite.addEventListener('input', () => {
    localStorage.setItem('limiteAlertaUsuario', inputLimite.value);
});

// ==========================================
// INICIALIZAÇÃO DOS GRÁFICOS
const ctxRT = document.getElementById('realtimeChart').getContext('2d');
let realtimeChart = new Chart(ctxRT, {
    type: 'line',
    data: {
        labels: labelsTempoReal,
        datasets: [{
            label: 'Consumo Instantâneo (W)',
            data: consumoTempoReal,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            tension: 0.4,
            fill: true
        }]
    },
    options: { scales: { y: { beginAtZero: true } } }
});

const ctxDaily = document.getElementById('dailyChart').getContext('2d');
let dailyChart = new Chart(ctxDaily, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{ label: 'Consumo por Dia (kWh)', data: [], backgroundColor: '#2ecc71' }]
    },
    options: {
        scales: { y: { beginAtZero: true } },
        plugins: {
            tooltip: {
                callbacks: {
                    footer: function(tooltipItems) {
                        const indice = tooltipItems[0].dataIndex;
                        const kwhDia = tooltipItems[0].parsed.y; // Pega o valor de kWh da barra atual
                        const custoDia = (kwhDia * tarifa).toFixed(2);
                        const qtdAlertas = listaAlertasDiarios[indice] || 0;
                        
                        return `🚨 Alertas disparados: ${qtdAlertas}\n💰 Custo estimado: R$ ${custoDia}`;
                    }
                }
            },
            annotation: {
                annotations: {
                    linhaMedia: {
                        type: 'line',
                        yMin: 0,
                        yMax: 0,
                        borderColor: '#e74c3c',
                        borderWidth: 2,
                        borderDash: [6, 6],
                        label: {
                            display: true,
                            content: 'Média',
                            position: 'end',
                            backgroundColor: 'rgba(231, 76, 60, 0.8)',
                            font: { size: 11, weight: 'bold' }
                        }
                    }
                }
            }
        }
    }
});

const ctxMonthly = document.getElementById('monthlyChart').getContext('2d');
let monthlyChart = new Chart(ctxMonthly, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{ label: 'Consumo Mensal (kWh)', data: [], backgroundColor: '#e67e22' }]
    },
    options: { 
        scales: { y: { beginAtZero: true } },
        plugins: {
            tooltip: {
                callbacks: {
                    footer: function(tooltipItems) {
                        const kwhMes = tooltipItems[0].parsed.y; // Pega o valor de kWh da barra do mês atual
                        const custoMes = (kwhMes * tarifa).toFixed(2);
                        
                        return `💰 Custo estimado neste mês: R$ ${custoMes}`;
                    }
                }
            },
            annotation: {
                annotations: {
                    linhaMediaMensal: {
                        type: 'line',
                        yMin: 0,
                        yMax: 0,
                        borderColor: '#9b59b6',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        display: false,
                        label: {
                            display: true,
                            content: 'Média',
                            position: 'center',
                            backgroundColor: 'rgba(155, 89, 182, 0.9)',
                            font: { size: 11, weight: 'bold' }
                        }
                    }
                }
            }
        }
    }
});

// ==========================================
// CONTROLE VISUAL DE ACORDO COM O INPUT
function verificarAlertaVisual(potencia) {
    const limite = parseFloat(inputLimite.value) || 14080;
    const cardPotencia = document.getElementById('potencia').parentElement;
    
    if (potencia > limite) { 
        cardPotencia.style.backgroundColor = '#ff4d4d'; 
        cardPotencia.style.color = 'white';
    } else {
        cardPotencia.style.backgroundColor = 'white';
        cardPotencia.style.color = 'black';
    }
}

// ==========================================
//ATUALIZAÇÃO DOS KPIs E TEMPO REAL

function atualizarDashboard() {
    const limiteAtual = inputLimite.value || 14080;

    fetch(`${API_BASE_URL}/dados_atuais?limite=${limiteAtual}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('potencia').innerText = data.potencia + " W";
            document.getElementById('energiaDia').innerText = data.energiaDia + " kWh";
            document.getElementById('custo').innerText = "R$ " + (data.energiaDia * tarifa).toFixed(2);
            document.getElementById('pico').innerText = data.picoDia + " W";
            document.getElementById('contadorAlertas').innerText = data.alertasHoje;

            verificarAlertaVisual(data.potencia);

            const agora = new Date().toLocaleTimeString();
            if (consumoTempoReal.length > 20) {
                consumoTempoReal.shift();
                labelsTempoReal.shift();
            }
            consumoTempoReal.push(data.potencia);
            labelsTempoReal.push(agora);
            realtimeChart.update('none'); 
        })
        .catch(err => console.error('Erro nos dados atuais:', err));

    fetch(`${API_BASE_URL}/historico_diario`)
        .then(res => res.json())
        .then(data => {
            dailyChart.data.labels = data.labels;
            dailyChart.data.datasets[0].data = data.valores;
            listaAlertasDiarios = data.alertas;
            
            // PASSO 1: Adiciona o Custo Estimado Médio na linha de média de 7 dias
            if(dailyChart.options.plugins.annotation.annotations.linhaMedia) {
                dailyChart.options.plugins.annotation.annotations.linhaMedia.yMin = data.media;
                dailyChart.options.plugins.annotation.annotations.linhaMedia.yMax = data.media;
                
                const custoMedioDiario = (data.media * tarifa).toFixed(2);
                dailyChart.options.plugins.annotation.annotations.linhaMedia.label.content = `Média: ${data.media} kWh (R$ ${custoMedioDiario})`;
            }
            
            dailyChart.update();
        })
        .catch(err => console.error('Erro no histórico diário:', err));
}

// ==========================================
//HISTÓRICO MENSAL E FILTRAGEM AVANÇADA

function carregarDadosMensais() {
    if (filtroAtivo) return;

    fetch(`${API_BASE_URL}/historico_mensal`)
        .then(res => res.json())
        .then(data => {
            dadosMensaisOriginais.labels = data.labels.slice(-6);
            dadosMensaisOriginais.valores = data.valores.slice(-6);

            monthlyChart.data.labels = [...dadosMensaisOriginais.labels];
            monthlyChart.data.datasets[0].data = [...dadosMensaisOriginais.valores];
            
            const valores6Meses = dadosMensaisOriginais.valores;
            const media6Meses = valores6Meses.length > 0 ? (valores6Meses.reduce((a, b) => a + b, 0) / valores6Meses.length) : 0.0;
            const anotacaoMedia = monthlyChart.options.plugins.annotation.annotations.linhaMediaMensal;
            if (anotacaoMedia) {
                anotacaoMedia.display = true;
                anotacaoMedia.yMin = media6Meses;
                anotacaoMedia.yMax = media6Meses;
                
                const custoMedio6Meses = (media6Meses * tarifa).toFixed(2);
                anotacaoMedia.label.content = `Média (6 meses): ${media6Meses.toFixed(2)} kWh (R$ ${custoMedio6Meses})`;
            }

            monthlyChart.update();
        })
        .catch(err => console.error('Erro ao carregar histórico mensal:', err));
}

function filtrarGraficoMensal() {
    const anoSelecionado = document.getElementById('anoFiltro').value;
    const mesSelecionado = document.getElementById('mesFiltro').value;

    if (!anoSelecionado) {
        alert("Por favor, selecione obrigatoriamente o Ano para aplicar o filtro.");
        return;
    }

    fetch(`${API_BASE_URL}/filtrar_avancado?ano=${anoSelecionado}&mes=${mesSelecionado}`)
        .then(res => res.json())
        .then(data => {
            filtroAtivo = true;
            
            monthlyChart.data.labels = data.labels;
            monthlyChart.data.datasets[0].data = data.valores;
            
            const anotacaoMedia = monthlyChart.options.plugins.annotation.annotations.linhaMediaMensal;
            if (anotacaoMedia) {
                if (mesSelecionado !== "") {
                    anotacaoMedia.display = false;
                } else {
                    anotacaoMedia.display = true;
                    anotacaoMedia.yMin = data.media;
                    anotacaoMedia.yMax = data.media;
                    
                    const custoMedioAnual = (data.media * tarifa).toFixed(2);
                    anotacaoMedia.label.content = `Média Anual: ${data.media} kWh (R$ ${custoMedioAnual})`;
                }
            }
            
            monthlyChart.update();
        })
        .catch(err => console.error('Erro ao aplicar filtragem avançada:', err));
}

function limparFiltroMensal() {
    filtroAtivo = false;
    
    document.getElementById('anoFiltro').value = "2026";
    document.getElementById('mesFiltro').value = "";
    
    monthlyChart.data.labels = [...dadosMensaisOriginais.labels];
    monthlyChart.data.datasets[0].data = [...dadosMensaisOriginais.valores];
    
    const valores6Meses = dadosMensaisOriginais.valores;
    const media6Meses = valores6Meses.length > 0 ? (valores6Meses.reduce((a, b) => a + b, 0) / valores6Meses.length) : 0.0;

    const anotacaoMedia = monthlyChart.options.plugins.annotation.annotations.linhaMediaMensal;
    if (anotacaoMedia) {
        anotacaoMedia.display = true; // Força a exibição a voltar caso estivesse oculta pelo filtro mensal
        anotacaoMedia.yMin = media6Meses;
        anotacaoMedia.yMax = media6Meses;
        
        const custoMedio6Meses = (media6Meses * tarifa).toFixed(2);
        anotacaoMedia.label.content = `Média (6 meses): ${media6Meses.toFixed(2)} kWh (R$ ${custoMedio6Meses})`;
    }
    
    monthlyChart.update();
}

setInterval(atualizarDashboard, 2000);
setInterval(carregarDadosMensais, 10000);
carregarDadosMensais();
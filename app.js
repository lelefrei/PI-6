// TÔ LIGADO 2.0 — Dashboard demonstrativo com dados simulados
// Não utiliza API, Supabase ou banco de dados.

const TARIFA_KWH = 0.95;
let charts = {};
let historicoPotencia = [];
let consumoDiario = [];
let consumoMensal = [];
let ultimaPotencia = 620;
let contadorAlertas = 0;

const $ = (id) => document.getElementById(id);
const numero = (v, casas=1) => Number(v).toFixed(casas).replace(".", ",");

function gerarDadosIniciais() {
  historicoPotencia = Array.from({length: 18}, (_, i) => {
    const hora = new Date();
    hora.setMinutes(hora.getMinutes() - (17-i)*10);
    return {hora, potencia: Math.max(120, Math.round(450 + Math.random()*900 + 250*Math.sin(i/3)))};
  });
  consumoDiario = Array.from({length: 7}, (_, i) => ({
    data: new Date(Date.now() - (6-i)*86400000),
    consumo: +(5.2 + Math.random()*5.8).toFixed(2)
  }));
  consumoMensal = Array.from({length: 12}, (_, i) => ({
    mes: new Date(new Date().getFullYear(), i, 1),
    consumo: +(145 + Math.random()*95).toFixed(1)
  }));
}

function atualizarIndicadores() {
  ultimaPotencia = Math.max(100, Math.round(450 + Math.random()*1150));
  const energia = consumoDiario[consumoDiario.length-1].consumo;
  const pico = Math.max(...historicoPotencia.map(x => x.potencia));
  const limite = Number($("limiteAlerta")?.value || 1400);
  if (ultimaPotencia > limite) contadorAlertas++;
  $("potencia").textContent = `${ultimaPotencia.toLocaleString("pt-BR")} W`;
  $("energiaDia").textContent = `${numero(energia,2)} kWh`;
  $("custo").textContent = `R$ ${numero(energia*TARIFA_KWH,2)}`;
  $("pico").textContent = `${pico.toLocaleString("pt-BR")} W`;
  $("contadorAlertas").textContent = contadorAlertas;
  $("consumoStatus").textContent = ultimaPotencia > limite ? "Consumo elevado" : "Consumo normal";
  $("statusPill").classList.add("online");
  $("statusPill").classList.remove("offline");
  $("statusText").textContent = "Simulação ativa";
}

function criarGrafico(id, tipo, labels, datasets, opcoes={}) {
  const canvas = $(id);
  if (!canvas) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas.getContext("2d"), {
    type: tipo,
    data: {labels, datasets},
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: {intersect:false, mode:"index"},
      plugins: {legend:{display:true, labels:{usePointStyle:true, boxWidth:8}}},
      scales: tipo === "doughnut" ? {} : {
        y:{beginAtZero:true, grid:{color:"rgba(130,145,165,.13)"}},
        x:{grid:{display:false}}
      },
      ...opcoes
    }
  });
}

function desenharTempoReal() {
  criarGrafico("realtimeChart","line",
    historicoPotencia.map(x=>x.hora.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})),
    [{label:"Potência (W)",data:historicoPotencia.map(x=>x.potencia),borderColor:"#1769e0",
      backgroundColor:"rgba(23,105,224,.13)",fill:true,tension:.38,borderWidth:3,pointRadius:2}]
  );
}
function desenharDiario() {
  criarGrafico("dailyChart","bar", consumoDiario.map(x=>x.data.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})),
    [{label:"Consumo (kWh)",data:consumoDiario.map(x=>x.consumo),backgroundColor:"#20a464",borderRadius:7}]
  );
}
function desenharMensal() {
  const ano = Number($("anoFiltro")?.value || new Date().getFullYear());
  const mes = Number($("mesFiltro")?.value || 0);
  let dados = consumoMensal.map(x=>({...x}));
  if (mes) {
    const dias = new Date(ano,mes,0).getDate();
    dados = Array.from({length:dias},(_,i)=>({
      mes:new Date(ano,mes-1,i+1), consumo:+(0.15+Math.random()*0.45).toFixed(2)
    }));
  }
  criarGrafico("monthlyChart","bar",
    dados.map(x=>mes?x.mes.toLocaleDateString("pt-BR",{day:"2-digit"}):x.mes.toLocaleDateString("pt-BR",{month:"short"})),
    [{label:mes?"Consumo diário (kWh)":"Consumo mensal (kWh)",data:dados.map(x=>x.consumo),
      backgroundColor:"#8e5ad7",borderRadius:7}]
  );
}
function desenharCategorias() {
  criarGrafico("categoryChart","doughnut",
    ["Geladeira","Chuveiro","Iluminação","TV e eletrônicos","Outros"],
    [{label:"Participação (%)",data:[28,25,12,18,17],
      backgroundColor:["#1769e0","#20a464","#e67e22","#8e5ad7","#38a6b8"],borderWidth:0}],
    {plugins:{legend:{position:"bottom",labels:{usePointStyle:true,padding:16}}},cutout:"62%"}
  );
}
function atualizarGraficos() {
  desenharTempoReal(); desenharDiario(); desenharMensal(); desenharCategorias();
}
function atualizarDashboard(simular=true) {
  if (simular) {
    historicoPotencia.push({hora:new Date(),potencia:ultimaPotencia});
    if (historicoPotencia.length>18) historicoPotencia.shift();
    const hoje = consumoDiario[consumoDiario.length-1];
    hoje.consumo = +(hoje.consumo + Math.random()*0.015).toFixed(3);
  }
  atualizarIndicadores();
  atualizarGraficos();
}

document.addEventListener("DOMContentLoaded",()=>{
  gerarDadosIniciais();
  atualizarDashboard(false);
  $("refreshBtn")?.addEventListener("click",()=>atualizarDashboard(true));
  $("filterBtn")?.addEventListener("click",desenharMensal);
  $("clearBtn")?.addEventListener("click",()=>{
    $("anoFiltro").value=String(new Date().getFullYear());
    $("mesFiltro").value="";
    desenharMensal();
  });
  $("themeBtn")?.addEventListener("click",()=>{
    document.body.classList.toggle("dark");
    $("themeBtn").textContent=document.body.classList.contains("dark")?"☀️":"🌙";
  });
  $("limiteAlerta")?.addEventListener("change",atualizarIndicadores);
  setInterval(()=>atualizarDashboard(true),5000);
});

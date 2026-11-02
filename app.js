// TÔ LIGADO 2.0 — Dashboard demonstrativo com dados simulados
// Não utiliza API, Supabase ou banco de dados.

let TARIFA_KWH = 0.85;          // tarifa base (R$/kWh) — controlada pelo slider da calculadora
let ACRESCIMO_BANDEIRA = 0;     // acréscimo da bandeira (R$/kWh)

// Equivalência social (valores de referência — ajuste se quiser)
// Bandeira de cada mês do ano (dados fictícios, jan→dez)
const BANDEIRA_POR_MES = ["Verde","Verde","Amarela","Amarela","Verde","Vermelha 1","Vermelha 2","Vermelha 2","Vermelha 1","Amarela","Verde","Amarela"];
const POTENCIA_GELADEIRA_W = 350;
const POTENCIA_LED_W = 12;

// Bandeiras tarifárias: acréscimo em R$ por 100 kWh (confira os valores vigentes na ANEEL)
const BANDEIRAS = [
  {nome:"Verde",      valor:0,     cor:"#20a464"},
  {nome:"Amarela",    valor:1.885, cor:"#f1c40f"},
  {nome:"Vermelha 1", valor:4.463, cor:"#e67e22"},
  {nome:"Vermelha 2", valor:7.877, cor:"#e74c3c"}
];
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
  $("custo").textContent = `R$ ${numero(energia*(TARIFA_KWH+ACRESCIMO_BANDEIRA),2)}`;
  $("pico").textContent = `${pico.toLocaleString("pt-BR")} W`;
  $("contadorAlertas").textContent = contadorAlertas;
  $("consumoStatus").textContent = ultimaPotencia > limite ? "Consumo elevado" : "Consumo normal";
  $("statusPill").classList.add("online");
  $("statusPill").classList.remove("offline");
  $("statusText").textContent = "Simulação ativa";
  atualizarEquivalencia();
  atualizarCalculadora();
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

// ---------- Equivalência Social ----------
function atualizarEquivalencia() {
  if (!$("equivResultado")) return;
  const w = ultimaPotencia;
  const geladeiras = Math.floor(w / POTENCIA_GELADEIRA_W);
  const leds = Math.floor((w - geladeiras*POTENCIA_GELADEIRA_W) / POTENCIA_LED_W);
  const partes = [];
  if (geladeiras > 0) partes.push(`~${geladeiras} geladeira${geladeiras>1?"s":""} ligada${geladeiras>1?"s":""}`);
  if (leds > 0) partes.push(`${leds} lâmpada${leds>1?"s":""} LED acesa${leds>1?"s":""}`);
  if (!partes.length) partes.push("menos que uma lâmpada LED acesa");

  $("equivWatts").textContent = `${w.toLocaleString("pt-BR")} W`;
  $("equivResultado").textContent = partes.join(" + ");

  const maxIcones = 6;
  const g = "🧊".repeat(Math.min(geladeiras, maxIcones));
  const l = "💡".repeat(Math.min(leds, maxIcones));
  $("equivIcons").innerHTML =
    (g ? `<span>${g}</span>` : "") +
    (g && l ? `<span class="plus">+</span>` : "") +
    (l ? `<span class="icon-sm">${l}</span>` : "");

  const eq = historicoPotencia.map(x => +(x.potencia / POTENCIA_GELADEIRA_W).toFixed(2));
  const media = eq.reduce((s,v)=>s+v,0) / eq.length;
  $("equivMedia").textContent =
    `Nas últimas leituras, a média foi de ${numero(media,1)} geladeiras equivalentes (pico de ${numero(Math.max(...eq),1)}).`;
  criarGrafico("equivChart","line",
    historicoPotencia.map(x=>x.hora.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})),
    [{label:"Geladeiras equivalentes",data:eq,borderColor:"#1769e0",backgroundColor:"rgba(23,105,224,.13)",
      fill:true,tension:.38,borderWidth:3,pointRadius:3},
     {label:"Média",data:eq.map(()=>+media.toFixed(2)),borderColor:"#e67e22",borderDash:[6,6],borderWidth:2,pointRadius:0,fill:false}]
  );
}

// ---------- Calculadora de Tarifa e Bandeira ----------
function atualizarCalculadora() {
  if (!$("valorCalculado")) return;
  const energia = consumoDiario[consumoDiario.length-1].consumo;
  const total = energia * (TARIFA_KWH + ACRESCIMO_BANDEIRA);
  const texto = `R$ ${numero(TARIFA_KWH,2)}/kWh`;

  $("tarifaBadge").textContent = texto;
  $("tarifaLabel").textContent = texto;
  $("valorCalculado").textContent = `R$ ${numero(total,2)}`;
  $("valorDetalhe").textContent =
    `${numero(energia,2)} kWh × R$ ${numero(TARIFA_KWH+ACRESCIMO_BANDEIRA,4)}/kWh`;
  if ($("kpiTarifa")) $("kpiTarifa").textContent = `Tarifa: ${texto}`;
  if ($("infoTarifa")) $("infoTarifa").textContent = `R$ ${numero(TARIFA_KWH,2)} por kWh`;
  if ($("custo")) $("custo").textContent = `R$ ${numero(total,2)}`;

  const meses = consumoMensal.map(m => m.mes.toLocaleDateString("pt-BR",{month:"short"}).replace(".",""));
  const adic = (nome) => BANDEIRAS.find(x=>x.nome===nome).valor / 100;
  const comBandeira = consumoMensal.map((m,i)=>+(m.consumo*(TARIFA_KWH+adic(BANDEIRA_POR_MES[i]))).toFixed(2));
  const semBandeira = consumoMensal.map(m=>+(m.consumo*TARIFA_KWH).toFixed(2));
  const totalCom = comBandeira.reduce((s,v)=>s+v,0);
  const totalSem = semBandeira.reduce((s,v)=>s+v,0);
  $("bandeiraResumo").textContent =
    `Total em 12 meses: R$ ${numero(totalCom,2)} — R$ ${numero(totalCom-totalSem,2)} a mais por causa das bandeiras.`;
  criarGrafico("bandeiraChart","bar", meses,
    [{type:"bar",label:"Custo com a bandeira do mês (R$)",data:comBandeira,
      backgroundColor:BANDEIRA_POR_MES.map(n=>BANDEIRAS.find(x=>x.nome===n).cor),borderRadius:7},
     {type:"line",label:"Custo só com a tarifa (R$)",data:semBandeira,borderColor:"#172033",
      borderWidth:2,borderDash:[5,5],pointRadius:2,tension:.3}]
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
  $("tarifaRange")?.addEventListener("input",(e)=>{
    TARIFA_KWH = Number(e.target.value);
    atualizarCalculadora();
  });
  $("bandeiraSelect")?.addEventListener("change",(e)=>{
    ACRESCIMO_BANDEIRA = Number(e.target.value)/100;
    atualizarCalculadora();
  });
  setInterval(()=>atualizarDashboard(true),5000);
});

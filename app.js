const tarifa = 0.95;
const API_BASE_URL = "https://to-ligado-api.onrender.com";

let consumoTempoReal = [];
let labelsTempoReal = [];
let listaAlertasDiarios = [];
let dadosMensaisOriginais = {labels: [], valores: []};
let filtroAtivo = false;

const $ = id => document.getElementById(id);
const inputLimite = document.createElement("input");
inputLimite.type = "number";
inputLimite.id = "limiteAlerta";
inputLimite.min = "1";
inputLimite.value = localStorage.getItem("limiteAlertaUsuario") || 14080;
inputLimite.style.display = "none";
document.body.appendChild(inputLimite);

function limiteAtual(){ return Number(inputLimite.value) || 14080; }
function formatNumber(n, decimals=0){ return Number(n || 0).toLocaleString("pt-BR",{minimumFractionDigits:decimals,maximumFractionDigits:decimals}); }

const chartDefaults = {
  color: "#9fb6d7",
  borderColor: "rgba(120,165,215,.13)",
  font: {family: "Inter, Segoe UI, Arial", size: 10}
};
Chart.defaults.color = chartDefaults.color;
Chart.defaults.font = chartDefaults.font;

const realtimeChart = new Chart($("realtimeChart"), {
  type:"line",
  data:{labels:labelsTempoReal,datasets:[{
    label:"Potência (W)", data:consumoTempoReal,
    borderColor:"#18d6a5", backgroundColor:"rgba(24,214,165,.13)",
    tension:.38, fill:true, pointRadius:0, pointHoverRadius:5, borderWidth:2
  }]},
  options:{
    responsive:true, maintainAspectRatio:false, animation:false,
    interaction:{mode:"index",intersect:false},
    plugins:{legend:{display:false},tooltip:{displayColors:false}},
    scales:{
      y:{beginAtZero:true,grid:{color:chartDefaults.borderColor},ticks:{callback:v=>formatNumber(v)+" W"}},
      x:{grid:{color:"rgba(120,165,215,.06)"},ticks:{maxTicksLimit:8}}
    }
  }
});

const dailyChart = new Chart($("dailyChart"), {
  type:"bar",
  data:{labels:[],datasets:[{
    label:"Consumo (kWh)",data:[],backgroundColor:"#19cfa4",borderRadius:6,borderSkipped:false
  }]},
  options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{callbacks:{
      label:i=>` ${i.parsed.y} kWh`,
      footer:i=>`Custo: R$ ${((i[0].parsed.y||0)*tarifa).toFixed(2)}`
    }}},
    scales:{
      y:{beginAtZero:true,grid:{color:chartDefaults.borderColor},ticks:{callback:v=>v}},
      x:{grid:{display:false}}
    }
  }
});

const monthlyChart = new Chart($("monthlyChart"), {
  type:"bar",
  data:{labels:[],datasets:[{
    label:"Consumo (kWh)",data:[],backgroundColor:"#ff9638",borderRadius:6,borderSkipped:false
  }]},
  options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{callbacks:{
      label:i=>` ${i.parsed.y} kWh`,
      footer:i=>`Custo estimado: R$ ${((i[0].parsed.y||0)*tarifa).toFixed(2)}`
    }}},
    scales:{
      y:{beginAtZero:true,grid:{color:chartDefaults.borderColor}},
      x:{grid:{display:false}}
    }
  }
});

function setStatus(ok){
  const p=$("statusPill");
  p.classList.toggle("offline",!ok);
  $("statusText").textContent=ok?"API Online":"API Indisponível";
}

function atualizarStatusVisual(p){
  const limite=limiteAtual();
  const percentual=limite ? (p/limite)*100 : 0;
  const clamped=Math.min(100,Math.max(0,percentual));

  $("limiteAtual").textContent=formatNumber(limite)+" W";
  $("consumoAtual").textContent=formatNumber(p)+" W";
  $("percentLimite").textContent=`${Math.round(percentual)}% do limite`;
  $("limitProgress").style.width=clamped+"%";
  $("gauge").style.setProperty("--percent",Math.min(100,Math.max(3,clamped))+"%");

  const status=$("consumoStatus"), box=$("statusBox");
  if(p>limite){
    status.textContent="Alto";
    status.style.color="#ff6b72";
    box.className="success-box warning-box";
    box.innerHTML="<b>!</b><div><strong>Atenção!</strong><span>O consumo ultrapassou o limite estabelecido.</span></div>";
  }else if(p>limite*.8){
    status.textContent="Atenção";
    status.style.color="#ffc44d";
    box.className="success-box warning-box";
    box.innerHTML="<b>!</b><div><strong>Atenção!</strong><span>O consumo está próximo do limite estabelecido.</span></div>";
  }else{
    status.textContent="Normal";
    status.style.color="#2ce0c0";
    box.className="success-box";
    box.innerHTML="<b>✓</b><div><strong>Tudo certo!</strong><span>O consumo está dentro do limite estabelecido.</span></div>";
  }
}

async function atualizarDashboard(){
  try{
    const r=await fetch(`${API_BASE_URL}/dados_atuais?limite=${limiteAtual()}`);
    if(!r.ok) throw Error(r.status);
    const d=await r.json();
    setStatus(true);

    $("potencia").textContent=formatNumber(d.potencia)+" W";
    $("energiaDia").textContent=Number(d.energiaDia||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+" kWh";
    $("custo").textContent="R$ "+(Number(d.energiaDia||0)*tarifa).toFixed(2).replace(".",",");
    $("pico").textContent=formatNumber(d.picoDia)+" W";
    $("contadorAlertas").textContent=d.alertasHoje ?? 0;

    atualizarStatusVisual(Number(d.potencia||0));

    if(consumoTempoReal.length>=24){consumoTempoReal.shift();labelsTempoReal.shift();}
    consumoTempoReal.push(Number(d.potencia||0));
    labelsTempoReal.push(new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    realtimeChart.update("none");
  }catch(e){
    setStatus(false);
    console.error("API:",e);
  }

  try{
    const r=await fetch(`${API_BASE_URL}/historico_diario`);
    if(!r.ok) throw Error(r.status);
    const d=await r.json();
    dailyChart.data.labels=d.labels||[];
    dailyChart.data.datasets[0].data=d.valores||[];
    listaAlertasDiarios=d.alertas||[];
    dailyChart.update();
  }catch(e){ console.error("Histórico diário:",e); }
}

async function carregarDadosMensais(){
  if(filtroAtivo) return;
  try{
    const r=await fetch(`${API_BASE_URL}/historico_mensal`);
    if(!r.ok) throw Error(r.status);
    const d=await r.json();
    dadosMensaisOriginais.labels=(d.labels||[]).slice(-6);
    dadosMensaisOriginais.valores=(d.valores||[]).slice(-6);
    monthlyChart.data.labels=[...dadosMensaisOriginais.labels];
    monthlyChart.data.datasets[0].data=[...dadosMensaisOriginais.valores];
    monthlyChart.update();
  }catch(e){ console.error("Histórico mensal:",e); }
}

async function filtrarGraficoMensal(){
  const ano=$("anoFiltro").value, mes=$("mesFiltro").value;
  if(!ano) return;
  try{
    const r=await fetch(`${API_BASE_URL}/filtrar_avancado?ano=${ano}&mes=${mes}`);
    if(!r.ok) throw Error(r.status);
    const d=await r.json();
    filtroAtivo=true;
    monthlyChart.data.labels=d.labels||[];
    monthlyChart.data.datasets[0].data=d.valores||[];
    monthlyChart.update();
  }catch(e){ alert("Não foi possível carregar o filtro."); }
}

function limparFiltroMensal(){
  filtroAtivo=false;
  $("anoFiltro").value="2026";
  $("mesFiltro").value="";
  monthlyChart.data.labels=[...dadosMensaisOriginais.labels];
  monthlyChart.data.datasets[0].data=[...dadosMensaisOriginais.valores];
  monthlyChart.update();
}

$("filterBtn").onclick=filtrarGraficoMensal;
$("clearBtn").onclick=limparFiltroMensal;

$("refreshBtn").onclick=async e=>{
  e.currentTarget.disabled=true;
  e.currentTarget.innerHTML="↻ <span>Atualizando...</span>";
  await atualizarDashboard();
  await carregarDadosMensais();
  e.currentTarget.disabled=false;
  e.currentTarget.innerHTML="↻ <span>Atualizar</span>";
};

function alternarTema(){
  const light=document.body.classList.toggle("light");
  localStorage.setItem("toLigadoTema",light?"light":"dark");
  $("mobileThemeBtn").textContent=light?"☾":"☀";
  $("themeBtn").querySelector("span:nth-child(2)").textContent=light?"Modo claro":"Modo escuro";
}
if(localStorage.getItem("toLigadoTema")==="light") document.body.classList.add("light");
$("mobileThemeBtn").onclick=alternarTema;
$("themeBtn").onclick=alternarTema;

$("editLimitBtn").onclick=()=>{
  const novo=prompt("Defina o limite de potência (W):",limiteAtual());
  if(novo && Number(novo)>0){
    inputLimite.value=Number(novo);
    localStorage.setItem("limiteAlertaUsuario",inputLimite.value);
    atualizarDashboard();
  }
};

document.querySelectorAll(".nav-item").forEach(item=>{
  item.addEventListener("click",()=>{
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
    item.classList.add("active");
  });
});

atualizarDashboard();
carregarDadosMensais();
setInterval(atualizarDashboard,2000);
setInterval(carregarDadosMensais,10000);

let extras = [];
let compras = [];

/* COLE AQUI SUA URL DO WEB APP DO APPS SCRIPT */
const WEBAPP_URL = "https://projeto-controle-financeiro-b1ir.vercel.app/";

function lerNumero(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const texto = String(el.value).replace(",", ".");
  const n = parseFloat(texto);
  return isNaN(n) ? 0 : n;
}

function moeda(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function totalExtras() {
  return extras.reduce((s, e) => s + e.valor, 0);
}

function totalCompras() {
  return compras.reduce((s, c) => s + c.valor, 0);
}

/* Estado completo para enviar à planilha */
function montarEstado() {
  return {
    mesReferencia: document.getElementById("mesReferencia")?.value || "",
    salarios: {
      sal5: document.getElementById("sal5")?.value || "",
      sal15: document.getElementById("sal15")?.value || "",
      sal20: document.getElementById("sal20")?.value || "",
      sal30: document.getElementById("sal30")?.value || ""
    },
    contas: {
      aluguel: document.getElementById("aluguel")?.value || "",
      internet: document.getElementById("internet")?.value || "",
      vivo: document.getElementById("vivo")?.value || "",
      agua: document.getElementById("agua")?.value || "",
      luz: document.getElementById("luz")?.value || "",
      // cartao removido das contas fixas
      carro: document.getElementById("carro")?.value || "",
      seguro: document.getElementById("seguro")?.value || ""
    },
    extras,
    compras
  };
}

async function salvarNaPlanilha() {
  if (!WEBAPP_URL || WEBAPP_URL === "COLE_SUA_URL_AQUI") {
    alert("Configure a constante WEBAPP_URL com a URL do seu Web App.");
    return;
  }
  try {
    const estado = montarEstado();
    const resp = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(estado)
    });
    const data = await resp.json();
    console.log("Salvo na planilha:", data);
    alert("Dados sincronizados com a planilha.");

    // ATUALIZA O TEXTO "Última atualização"
    const span = document.getElementById("lastSync");
    if (span) {
      const agora = new Date();
      const texto = agora.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      span.textContent = "Última atualização: " + texto;
    }
  } catch (e) {
    console.error("Erro ao salvar na planilha:", e);
    alert("Erro ao salvar na planilha. Veja o console.");
  }
}

async function carregarDaPlanilha() {
  if (!WEBAPP_URL || WEBAPP_URL === "COLE_SUA_URL_AQUI") return;
  try {
    const resp = await fetch(WEBAPP_URL + "?t=" + Date.now());
    const data = await resp.json();
    if (!data || data.ok === false) {
      console.log("Nenhum estado na planilha ainda:", data);
      return;
    }
    const estado = data;

    if (estado.mesReferencia && document.getElementById("mesReferencia")) {
      document.getElementById("mesReferencia").value = estado.mesReferencia;
    }

    if (estado.salarios) {
      if (document.getElementById("sal5"))  document.getElementById("sal5").value  = estado.salarios.sal5  ?? "";
      if (document.getElementById("sal15")) document.getElementById("sal15").value = estado.salarios.sal15 ?? "";
      if (document.getElementById("sal20")) document.getElementById("sal20").value = estado.salarios.sal20 ?? "";
      if (document.getElementById("sal30")) document.getElementById("sal30").value = estado.salarios.sal30 ?? "";
    }

    if (estado.contas) {
      if (document.getElementById("aluguel"))  document.getElementById("aluguel").value  = estado.contas.aluguel  ?? "";
      if (document.getElementById("internet")) document.getElementById("internet").value = estado.contas.internet ?? "";
      if (document.getElementById("vivo"))     document.getElementById("vivo").value     = estado.contas.vivo     ?? "";
      if (document.getElementById("agua"))     document.getElementById("agua").value     = estado.contas.agua     ?? "";
      if (document.getElementById("luz"))      document.getElementById("luz").value      = estado.contas.luz      ?? "";
      // cartao não é mais carregado como conta fixa
      if (document.getElementById("carro"))    document.getElementById("carro").value    = estado.contas.carro    ?? "";
      if (document.getElementById("seguro"))   document.getElementById("seguro").value   = estado.contas.seguro   ?? "";
    }

    extras = Array.isArray(estado.extras) ? estado.extras : [];
    compras = Array.isArray(estado.compras) ? estado.compras : [];

    // garante forma padrão se vier de estados antigos
    compras.forEach(c => {
      if (!c.forma) c.forma = "debito";
    });

    renderExtras();
    renderCompras();
    recalcularTudo();

    const span = document.getElementById("lastSync");
    if (span) {
      const agora = new Date();
      const texto = agora.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      span.textContent = "Última atualização: " + texto;
    }
  } catch (e) {
    console.error("Erro ao carregar da planilha:", e);
  }
}

function atualizarMesReferenciaAutomatico() {
  const el = document.getElementById("mesReferencia");
  if (!el) return;
  const agora = new Date();
  const texto = agora.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
  const textoFormatado = texto.charAt(0).toUpperCase() + texto.slice(1);
  if (!el.value) el.value = textoFormatado;
}

function atualizarEscurecimentoScroll() {
  const overlay = document.getElementById("scrollOverlay");
  if (!overlay) return;
  const doc = document.documentElement;
  const maxScroll = doc.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) {
    overlay.style.opacity = 0;
    return;
  }
  const progresso = window.scrollY / maxScroll;
  const opacidade = Math.min(0.75, progresso * 0.9);
  overlay.style.opacity = opacidade;
}
window.addEventListener("scroll", atualizarEscurecimentoScroll);
window.addEventListener("resize", atualizarEscurecimentoScroll);

function desenharGrafico(resumo) {
  const canvas = document.getElementById("resumoChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { gastos, saldo } = resumo;

  const total = Math.max(gastos + saldo, 1);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const raioExterno = Math.min(cx, cy) - 4;
  const raioInterno = raioExterno * 0.55;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let inicio = -Math.PI / 2;

  const angGastos = (gastos / total) * Math.PI * 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, raioExterno, inicio, inicio + angGastos);
  ctx.closePath();
  ctx.fillStyle = "#f97373";
  ctx.fill();
  inicio += angGastos;

  const angSaldo = (saldo / total) * Math.PI * 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, raioExterno, inicio, inicio + angSaldo);
  ctx.closePath();
  ctx.fillStyle = "#22c55e";
  ctx.fill();

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, raioInterno, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "#e5e7eb";
  ctx.font = "500 12px Inter, system-ui, -apple-system";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Gastos x Saldo", cx, cy - 10);
  ctx.font = "600 13px Rubik, system-ui";
  ctx.fillText(moeda(saldo), cx, cy + 8);
}

function recalcularTudo() {
  const sal5 = lerNumero("sal5");
  const sal15 = lerNumero("sal15");
  const sal20 = lerNumero("sal20");
  const sal30 = lerNumero("sal30");

  const aluguel = lerNumero("aluguel");
  const internet = lerNumero("internet");
  const vivo = lerNumero("vivo");
  const agua = lerNumero("agua");
  const luz = lerNumero("luz");
  // cartao removido das contas fixas
  const carro = lerNumero("carro");
  const seguro = lerNumero("seguro");

  // separa compras débito x crédito
  const comprasDebito = compras.filter(c => !c.forma || c.forma === "debito");
  const comprasCredito = compras.filter(c => c.forma === "credito");

  const extrasTotal = totalExtras();
  const comprasDebitoTotal = comprasDebito.reduce((s, c) => s + c.valor, 0);
  const comprasCreditoTotal = comprasCredito.reduce((s, c) => s + c.valor, 0);
  const comprasTotal = comprasDebitoTotal + comprasCreditoTotal;

  const rendaTotal = sal5 + sal15 + sal20 + sal30 + extrasTotal;
  const gastosFixos = aluguel + internet + vivo + agua + luz + carro + seguro;
  const gastosGerais = gastosFixos + comprasTotal;
  const saldoPotencial = rendaTotal - gastosGerais;

  document.getElementById("kpiRenda").textContent = moeda(rendaTotal);
  // aqui continua mostrando “gastos fixos + cartão + compras”, mas cartão agora é comprasCreditoTotal
  document.getElementById("kpiFixos").textContent = moeda(gastosGerais);
  document.getElementById("kpiSaldo").textContent = moeda(saldoPotencial);
  document.getElementById("miniExtras").textContent = moeda(extrasTotal);
  document.getElementById("miniCompras").textContent = moeda(comprasTotal);
  // novo card de fatura
const kpiFatura = document.getElementById("kpiFatura");
if (kpiFatura) kpiFatura.textContent = moeda(comprasCreditoTotal);

// --- fatura: dias até o vencimento (dia 11) ---
const hoje = new Date();
const ano = hoje.getFullYear();
const mes = hoje.getMonth(); // 0-11

// vencimento deste mês (dia 11)
let vencimento = new Date(ano, mes, 11);

// se hoje já passou do dia 11, considera vencimento no próximo mês
if (hoje > vencimento) {
  vencimento = new Date(ano, mes + 1, 11);
}

const diffMs = vencimento - hoje;
const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

const countdownEl = document.getElementById("kpiFaturaCountdown");
const statusEl = document.getElementById("labelFaturaStatus");

if (countdownEl) {
  // limpa classes de cor, se você usa kpi-pos / kpi-neutral / kpi-neg
  countdownEl.classList.remove("kpi-pos", "kpi-neutral", "kpi-neg");

  if (comprasCreditoTotal <= 0) {
    countdownEl.textContent = "Sem fatura este mês";
    countdownEl.classList.add("kpi-neutral");
  } else if (diasRestantes === 0) {
    countdownEl.textContent = "Vence hoje";
    countdownEl.classList.add("kpi-neg");
  } else if (diasRestantes < 0) {
    countdownEl.textContent = "Vencida há " + Math.abs(diasRestantes) + " dia(s)";
    countdownEl.classList.add("kpi-neg");
  } else {
    countdownEl.textContent = diasRestantes + " dia(s) para vencer";
    // se faltam 3 dias ou menos, deixa vermelho; senão neutro
    if (diasRestantes <= 3) {
      countdownEl.classList.add("kpi-neg");
    } else {
      countdownEl.classList.add("kpi-neutral");
    }
  }
}

if (statusEl) {
  let txt = "";
  if (comprasCreditoTotal <= 0) {
    txt = "sem fatura aberta";
  } else if (diasRestantes <= 3) {
    txt = "atenção: perto do vencimento";
  } else {
    txt = "ok";
  }
  statusEl.textContent = txt;
}


const miniComprasDebito = document.getElementById("miniComprasDebito");
if (miniComprasDebito) miniComprasDebito.textContent = moeda(comprasDebitoTotal);

  // se você criar spans específicos pode usar:
  const spanFatura = document.getElementById("miniFaturaCartao");
  if (spanFatura) spanFatura.textContent = moeda(comprasCreditoTotal);

  desenharGrafico({ gastos: gastosGerais, saldo: Math.max(saldoPotencial, 0) });

  // fatura é tudo que foi comprado no crédito no mês
const gastosDia5 = aluguel + internet + vivo + agua + luz + comprasCreditoTotal;
const sobraDia5 = sal5 - gastosDia5;


  const gastosDia15 = 0;
  const sobraDia15 = sal15 - gastosDia15;

  const gastosDia20 = carro;
  const sobraDia20 = sal20 - gastosDia20;

  const gastosDia30 = seguro;
  const sobraDia30 = sal30 - gastosDia30;

  document.getElementById("fluxoDia5").innerHTML = `
    <div class="fluxo-header">
      <div><span style="color:#f97316;font-weight:600;">DIA 5</span> · Salário do Guilherme chega</div>
      <div class="kpi-neutral">${moeda(sal5)}</div>
    </div>
    <div class="fluxo-sub">Renda do titular</div>
      <div class="fluxo-sub">
    Gastos: Aluguel (${moeda(aluguel)}), Luz (${moeda(luz)}),
    Água (${moeda(agua)}), Internet (${moeda(internet)}),
    Vivo (${moeda(vivo)}), Fatura cartão (${moeda(comprasCreditoTotal)})
  </div>

    <div class="fluxo-valores">
      <span class="plus">+ ${moeda(sal5)}</span>
      &nbsp; | &nbsp;
      <span class="minus">- ${moeda(gastosDia5)}</span>
      &nbsp; | &nbsp;
      <span class="equal">= ${moeda(sobraDia5)}</span>
    </div>
  `;

  document.getElementById("fluxoDia15").innerHTML = `
    <div class="fluxo-header">
      <div><span style="color:#f97316;font-weight:600;">DIA 15</span> · Salário da Cindy chega</div>
      <div class="kpi-neutral">${moeda(sal15)}</div>
    </div>
    <div class="fluxo-sub">Mercado, transporte, dia a dia</div>
    <div class="fluxo-valores">
      <span class="plus">+ ${moeda(sal15)}</span>
      &nbsp; | &nbsp;
      <span class="minus">- ${moeda(gastosDia15)}</span>
      &nbsp; | &nbsp;
      <span class="equal">= ${moeda(sobraDia15)}</span>
    </div>
  `;

  document.getElementById("fluxoDia20").innerHTML = `
    <div class="fluxo-header">
      <div><span style="color:#f97316;font-weight:600;">DIA 20</span> · Salário do Guilherme</div>
      <div class="kpi-neutral">${moeda(sal20)}</div>
    </div>
    <div class="fluxo-sub">Parcela do carro</div>
    <div class="fluxo-valores">
      <span class="plus">+ ${moeda(sal20)}</span>
      &nbsp; | &nbsp;
      <span class="minus">- ${moeda(gastosDia20)}</span>
      &nbsp; | &nbsp;
      <span class="equal">= ${moeda(sobraDia20)}</span>
    </div>
  `;

  document.getElementById("fluxoDia30").innerHTML = `
    <div class="fluxo-header">
      <div><span style="color:#f97316;font-weight:600;">DIA 30</span> · Último salário da Cindy chega</div>
      <div class="kpi-neutral">${moeda(sal30)}</div>
    </div>
    <div class="fluxo-sub">Seguro da moto + reserva</div>
    <div class="fluxo-valores">
      <span class="plus">+ ${moeda(sal30)}</span>
      &nbsp; | &nbsp;
      <span class="minus">- ${moeda(gastosDia30)}</span>
      &nbsp; | &nbsp;
      <span class="equal">= ${moeda(sobraDia30)}</span>
    </div>
  `;

  atualizarEscurecimentoScroll();
}

function resetarPadrao() {
  document.getElementById("sal5").value = "2257.60";
  document.getElementById("sal20").value = "964.77";
  document.getElementById("sal15").value = "1132.00";
  document.getElementById("sal30").value = "1300.00";
  document.getElementById("aluguel").value = "600";
  document.getElementById("internet").value = "90";
  document.getElementById("vivo").value = "50";
  document.getElementById("agua").value = "80";
  document.getElementById("luz").value = "57";
  // cartao removido
  document.getElementById("carro").value = "840";
  document.getElementById("seguro").value = "103";
  recalcularTudo();
}

function mudarAba(nome) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === nome);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === "tab-" + nome);
  });
}

function renderExtras() {
  const cont = document.getElementById("listaExtras");
  if (!cont) return;
  cont.innerHTML = "";
  extras.forEach((e, idx) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div>
        <div>${e.desc || "Renda extra"}</div>
        <div class="small">${moeda(e.valor)}</div>
      </div>
      <button class="remove-btn" onclick="removerExtra(${idx})">remover</button>
    `;
    cont.appendChild(div);
  });
  const spanTotal = document.getElementById("totalExtras");
  if (spanTotal) spanTotal.textContent = moeda(totalExtras());
}

function adicionarExtra() {
  const desc = document.getElementById("extraDesc")?.value.trim() || "";
  const val = lerNumero("extraValor");
  if (!val || val <= 0) return;
  extras.push({ desc, valor: val });
  document.getElementById("extraDesc").value = "";
  document.getElementById("extraValor").value = "";
  renderExtras();
  recalcularTudo();
}

function removerExtra(idx) {
  extras.splice(idx, 1);
  renderExtras();
  recalcularTudo();
}

function renderCompras() {
  const cont = document.getElementById("listaCompras");
  if (!cont) return;
  cont.innerHTML = "";

  const filtroTexto = document.getElementById("filtroCompraTexto")?.value.toLowerCase() || "";
  const filtroCat = document.getElementById("filtroCompraCategoria")?.value || "";

  let totalFiltrado = 0;

  compras.forEach((c, idx) => {
    const desc = (c.desc || "Compra").toLowerCase();
    const matchTexto = !filtroTexto || desc.includes(filtroTexto);
    const matchCat = !filtroCat || c.categoria === filtroCat;
    if (!matchTexto || !matchCat) return;

    totalFiltrado += c.valor;

    const div = document.createElement("div");
    div.className = "list-item";
    const formaLabel = c.forma === "credito" ? "crédito" : "débito";
    div.innerHTML = `
      <div>
        <div>${c.desc || "Compra"} <span class="small">(${c.data})</span></div>
        <div class="small">
          <span class="pill">${c.categoria}</span>
          &nbsp; <span class="pill">${formaLabel}</span>
          &nbsp; <span class="valor-compra">- ${moeda(c.valor)}</span>
        </div>
      </div>
      <button class="remove-btn" onclick="removerCompra(${idx})">remover</button>
    `;
    cont.appendChild(div);
  });

  const spanTotal = document.getElementById("totalCompras");
  if (spanTotal) spanTotal.textContent = moeda(totalCompras());

  const spanFiltrado = document.getElementById("totalComprasFiltrado");
  if (spanFiltrado) spanFiltrado.textContent = moeda(totalFiltrado);
}

function adicionarCompra() {
  const desc = document.getElementById("compraDesc")?.value.trim() || "";
  const cat = document.getElementById("compraCategoria")?.value || "Outros";
  const val = lerNumero("compraValor");
  if (!val || val <= 0) return;
  const hoje = new Date();
  const data = hoje.toLocaleDateString("pt-BR");

  const formaEl = document.getElementById("compraForma");
  const forma = formaEl ? formaEl.value : "debito";

  compras.push({ desc, categoria: cat, valor: val, data, forma });
  document.getElementById("compraDesc").value = "";
  document.getElementById("compraValor").value = "";
  renderCompras();
  recalcularTudo();
}

function removerCompra(idx) {
  compras.splice(idx, 1);
  renderCompras();
  recalcularTudo();
}

function limparMovimentos() {
  const ok = confirm(
    "Tem certeza que deseja limpar TODAS as compras e rendas extras deste mês? Essa ação não pode ser desfeita."
  );
  if (!ok) return;

  extras = [];
  compras = [];
  renderExtras();
  renderCompras();
  recalcularTudo();
}

function exportarResumo() {
  const sal5 = lerNumero("sal5");
  const sal15 = lerNumero("sal15");
  const sal20 = lerNumero("sal20");
  const sal30 = lerNumero("sal30");

  const aluguel = lerNumero("aluguel");
  const internet = lerNumero("internet");
  const vivo = lerNumero("vivo");
  const agua = lerNumero("agua");
  const luz = lerNumero("luz");
  // cartao removido
  const carro = lerNumero("carro");
  const seguro = lerNumero("seguro");

  const extrasTotal = totalExtras();

  const comprasDebito = compras.filter(c => !c.forma || c.forma === "debito");
  const comprasCredito = compras.filter(c => c.forma === "credito");
  const comprasDebitoTotal = comprasDebito.reduce((s, c) => s + c.valor, 0);
  const comprasCreditoTotal = comprasCredito.reduce((s, c) => s + c.valor, 0);
  const comprasTotal = comprasDebitoTotal + comprasCreditoTotal;

  const rendaTotal = sal5 + sal15 + sal20 + sal30 + extrasTotal;
  const gastosFixos = aluguel + internet + vivo + agua + luz + carro + seguro;
  const gastosGerais = gastosFixos + comprasTotal;

  const categorias = [
    { nome: "Moradia", total: aluguel },
    { nome: "Contas Mensais", total: internet + vivo + agua + luz },
    { nome: "Transporte", total: carro },
    { nome: "Cartão de Crédito (compras no crédito)", total: comprasCreditoTotal },
    { nome: "Seguros", total: seguro },
    { nome: "Compras & Outros (débito/dinheiro)", total: comprasDebitoTotal }
  ];

  let texto = "Descrição,Valor\n";
  texto += `Total Entradas,${rendaTotal.toFixed(2)}\n`;
  texto += `Total Saidas,${gastosGerais.toFixed(2)}\n\n`;
  texto += "Gastos por Categoria,\nCategoria,Total\n";
  categorias.forEach(g => {
    texto += `${g.nome},${g.total.toFixed(2)}\n`;
  });

  const blob = new Blob([texto], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Resumo_Financeiro_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function toggleLancamentoRapido() {
  const p = document.getElementById("quickPanel");
  if (!p) return;
  const visible = p.style.display === "block";
  p.style.display = visible ? "none" : "block";
  if (!visible) {
    document.getElementById("qTipo").value = "compra";
    document.getElementById("qDesc").value = "";
    document.getElementById("qValor").value = "";
    document.getElementById("qCategoria").value = "Mercado";
    atualizarQuickTipo();
  }
}

function fecharLancamentoRapido() {
  const p = document.getElementById("quickPanel");
  if (p) p.style.display = "none";
}

function atualizarQuickTipo() {
  const tipo = document.getElementById("qTipo").value;
  const wrap = document.getElementById("qCategoriaWrap");
  wrap.style.display = tipo === "compra" ? "block" : "none";
}

function salvarLancamentoRapido() {
  const tipo = document.getElementById("qTipo").value;
  const desc = document.getElementById("qDesc").value.trim();
  const valText = String(document.getElementById("qValor").value).replace(",", ".");
  const val = parseFloat(valText);
  if (!val || val <= 0) return;

  if (tipo === "extra") {
    document.getElementById("extraDesc").value = desc;
    document.getElementById("extraValor").value = val.toString();
    adicionarExtra();
  } else {
    const cat = document.getElementById("qCategoria").value || "Outros";
    document.getElementById("compraDesc").value = desc;
    document.getElementById("compraValor").value = val.toString();
    document.getElementById("compraCategoria").value = cat;
    // forma padrão débito para lançamento rápido
    const formaEl = document.getElementById("compraForma");
    if (formaEl) formaEl.value = "debito";
    adicionarCompra();
  }

  fecharLancamentoRapido();
}

function toggleExpandCard(cardId, ev) {
  if (ev) ev.stopPropagation();
  const card = document.getElementById(cardId);
  const overlay = document.getElementById("cardExpandOverlay");
  if (!card || !overlay) return;

  const isExpanded = card.classList.contains("card-expanded");
  document.querySelectorAll(".card-expanded").forEach(c => c.classList.remove("card-expanded"));

  if (isExpanded) {
    overlay.style.display = "none";
    document.body.classList.remove("card-expanded-mode");
  } else {
    overlay.style.display = "block";
    document.body.classList.add("card-expanded-mode");
    card.classList.add("card-expanded");
  }
}

function fecharCardExpandido(ev) {
  if (ev) ev.stopPropagation();
  const overlay = document.getElementById("cardExpandOverlay");
  overlay.style.display = "none";
  document.body.classList.remove("card-expanded-mode");
  document.querySelectorAll(".card-expanded").forEach(c => c.classList.remove("card-expanded"));
}

window.addEventListener("load", () => {
  atualizarMesReferenciaAutomatico();
  carregarDaPlanilha();
  atualizarQuickTipo();
  renderExtras();
  renderCompras();
  recalcularTudo();
  mudarAba("resumo");
  atualizarEscurecimentoScroll();
});

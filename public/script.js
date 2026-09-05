/* ===========================================================
   WOJAKMETER — SCRIPT  v12
   Revisión completa. Cambios respecto a v11 al final del archivo.
   =========================================================== */

window.onerror = function (msg, url, line, col) {
  console.error("WojakMeter Error:", msg, url, line, col);
  return false;
};

const BRAND_X = "@wojakmeterx";

const TOP_COINS_REFRESH_MS    = 30000;
const GLOBAL_REFRESH_MS       = 45000;
const COIN_DETAILS_REFRESH_MS = 30000;
const TRENDING_REFRESH_MS     = 60000;
const MEMES_REFRESH_MS        = 90000;
const SENTIMENT_REFRESH_MS    = 60000;
const NEWS_REFRESH_MS = 120000; 

const ACTIVE_COIN_STORAGE_KEY = "wojakActiveCoin";
const STYLE_STORAGE_KEY       = "wojakStyle";
const MACRO_DRIVER_STORAGE_KEY = "wojakMacroDriver";
const DEFAULT_STYLE      = "classic";
const SHARED_ICON_STYLE  = "classic";
/* Solo dos estilos. Boyak y Minimal se retiraron de la interfaz;
   la lista tiene que reflejarlo o un valor guardado en
   localStorage de una sesion anterior seguiria siendo valido y
   pediria carpetas de assets que ya no se mantienen. */
const ALLOWED_STYLES     = ["classic", "synth"];

const PULSE_VOTE_STORAGE_KEY = "wmPulseLastVoteTime";
const PULSE_VOTER_ID_KEY     = "wmPulseVoterId";
const PULSE_MY_VOTE_KEY      = "wmPulseMyVote";

/* El cooldown era de 5 minutos porque el voto solo vivia en memoria y
   no habia forma de cambiarlo. Ahora el servidor guarda un unico voto
   vigente por votante dentro de la ventana, asi que 60s basta como
   anti-spam: si vuelves a votar, actualizas tu voto, no sumas otro. */
const PULSE_VOTE_COOLDOWN_MS = 60 * 1000;
const PULSE_REACTION_MS      = 1800;
const PULSE_REFRESH_MS       = 60 * 1000;
const PULSE_WINDOW_HOURS     = 24;

/* Con 3 votos, un solo click mueve el pulso 20 puntos. Por debajo de
   este numero el pulso se muestra en la UI pero entra al indice
   diluido hacia 50, proporcional a cuantos votos hay. */
const PULSE_MIN_VOTES_FOR_INDEX = 10;

const HERO_MODE_RAW       = "raw";
const HERO_MODE_COMPOSITE = "composite";
const HERO_MODE_CUSTOM    = "custom";

const HERO_ALLOWED_TIMEFRAMES  = ["1h", "4h", "24h", "7d", "30d"];
const CHART_ALLOWED_TIMEFRAMES = ["1h", "4h", "24h", "7d", "30d"];
const TOKEN_ALLOWED_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "24h"];

const VALID_MACRO_DRIVERS = [
  "market_flow", "etf_adoption", "rate_hike", "rate_cut",
  "regulation_crackdown", "crypto_hack", "war_escalation", "neutral_macro"
];

// ===============================
// MOOD TOKEN CONFIG
// ===============================
let MOOD_CA = "4JkeVbpKKjaLEWFk6tbUV9mLzYD6xmaPPGZwgRvkpump";
const MOOD_MAIN_CA           = "4JkeVbpKKjaLEWFk6tbUV9mLzYD6xmaPPGZwgRvkpump";
const MOOD_FIXED_DISPLAY_CA  = "4JkeVbpKKjaLEWFk6tbUV9mLzYD6xmaPPGZwgRvkpump";

let isUsingDefaultTrending = true;
let isUsingMoodToken = false;

let moodMarketSource = "Auto";
let moodTradesSource = "Waiting...";
let moodPairAddress = "";
let moodDexId = "";
let moodResolvedAddress = "";

let moodEventSource = null;
let moodStreamReconnectTimer = null;

let moodTrades = [];
let moodPrice = 0;
let moodPrevPrice = 0;
let moodLastAction = "Watching";
let moodBuyCount = 0;
let moodSellCount = 0;
let moodBuyVolume = 0;
let moodSellVolume = 0;
let moodLiveScore = 50;
let moodTokenTimeframe = "5m";
let isLoadingNews = false;
let newsData = [];

/* Market cap REAL del proveedor. Antes se calculaba como
   moodPrice * 1e9, o sea asumiendo mil millones de supply para
   CUALQUIER token que el usuario pegara. Para la mayoría es falso,
   y se mostraba bajo una etiqueta que decía "Market Cap" sin
   ningún asterisco. Si el proveedor no lo da, mostramos "--". */
let moodMarketCap = 0;
let moodMarketCapIsReal = false;
let moodVolume24h = 0;

let moodTokenMeta = {
  name: "Trending Solana Token",
  symbol: "---",
  image: "/assets/logo/wojakmeter_logo.png",
  source: "Auto"
};

function emptyMoodHistory() {
  return { "1m": [], "5m": [], "15m": [], "1h": [], "4h": [], "24h": [] };
}

let moodHistory = emptyMoodHistory();

// ===============================
// APP STATE
// ===============================
let heroMode = HERO_MODE_RAW;

let activeCoinSymbol = "BTC";
let globalTimeframe = "24h";
let chartTimeframe = "24h";
let chartMode = "line";
let activeMarketTab = "coins";

let topCoinsData = [];
let trendingCoinsData = [];
let topMemesData = [];

let currentGlobalChange = 0;
let currentGlobalScore = 50;

let currentMarketScore = 50;
let currentSocialScore = 50;
let currentPulseScore = 50;
let currentDriverScore = 50;

/* FIX #1 — FUENTE ÚNICA DEL MACRO DRIVER.
   Antes había dos variables (currentDominantDriver y activeMacroDriver)
   y dos listeners en #macroDriver escribiendo cada uno la suya. El panel
   leía una y el Studio la otra, así que podían mostrar drivers distintos.
   Ahora solo existe activeMacroDriver. */
let activeMacroDriver = "market_flow";

let currentBtcDominanceValue = 50;
let currentHeaderVolumeValue = 0;
let currentGlobalMarketCapValue = 0;

let currentNarrative = "Price action is leading sentiment with no major macro override.";
let currentRiskTone = "Balanced";

let socialPanelOpen = false;
let isPulsePreviewActive = false;
let pulsePreviewTimeout = null;

let activeHeroView = "mood";
let isBubbleMapExpanded = false;
let isHoveringBubble = false;
let bubbleCoins = [];
let activeBubbleSymbol = null;

/* Antes esto arrancaba con 38 votos inventados (2,4,6,10,8,5,3): el
   panel se veia vivo, pero nadie habia votado nunca y ese numero
   entraba igualmente al indice compuesto con peso 0.10. Ahora arranca
   en cero y solo se llena con lo que devuelve /api/emotion-pulse. */
let pulseVotes = {
  frustration: 0, concern: 0, doubt: 0, neutral: 0,
  optimism: 0, content: 0, euphoria: 0
};

let pulseLoaded        = false;
let pulseUnavailable   = false;
let pulseMyVote        = null;
let pulseIsSubmitting  = false;
let pulseRefreshTimer  = null;
let pulseServerCooldown = 0;

let activeLayers = { market: true, social: false, driver: false, pulse: false };

let isLoadingTopCoins = false;
/* ===========================================================
   TOKENS DE PETICION

   EL BUG: todas las cargas empezaban con `if (isLoadingX) return;`.
   Eso no encola la peticion nueva: LA TIRA. Como el sitio hace
   polling cada pocos segundos, pulsar una pill justo mientras
   habia una consulta en vuelo no hacia absolutamente nada. El
   boton se marcaba activo y el numero no cambiaba nunca. Ese es
   el "a veces no reacciona" y tambien parte del "se traba".

   Y al reves, cuando si entraban dos seguidas, la primera podia
   contestar la ultima y pisar a la segunda: pulsas 1H, luego 7D,
   y acabas viendo los datos de 1H con la pill de 7D encendida.

   SOLUCION: un contador por recurso. Cada carga se queda con su
   numero al empezar y, al volver de la red, comprueba si sigue
   siendo la ultima. Si no lo es, descarta su resultado en
   silencio. Nada se bloquea y nada obsoleto pisa lo nuevo. */
const _reqSeq = { global: 0, sentiment: 0, coin: 0, chart: 0 };

function nextRequest(key) {
  _reqSeq[key] = (_reqSeq[key] || 0) + 1;
  return _reqSeq[key];
}

function isStaleRequest(key, token) {
  return _reqSeq[key] !== token;
}

let isLoadingGlobal = false;
let isLoadingCoinDetails = false;
let isLoadingTrending = false;
let isLoadingMemes = false;
let isLoadingSentiment = false;
let hasBooted = false;

let topExchangeData = [];
let coinExchangeData = [];

let marketSortBy = "marketCap";
let marketEmotionFilter = "all";
const MARKET_MAX_ITEMS = 20;

/* Monedas en la tira superior. */
const TICKER_COIN_COUNT = 10;

// ===============================
// HELPERS
// ===============================
function byId(id) { return document.getElementById(id); }
function qs(sel)  { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

function clamp(num, min, max) { return Math.max(min, Math.min(max, num)); }

function roundScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(clamp(num, 0, 100));
}

function average(arr) {
  if (!Array.isArray(arr) || !arr.length) return 0;
  return arr.reduce((sum, n) => sum + Number(n || 0), 0) / arr.length;
}

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/* Los formatters de Intl son caros de construir. Antes se creaba uno
   nuevo en cada llamada — y formatCurrency se llama cientos de veces
   por render de grid. Cacheados. */
const _fmtCache = new Map();

function intlFmt(key, options) {
  if (!_fmtCache.has(key)) {
    _fmtCache.set(key, new Intl.NumberFormat("en-US", options));
  }
  return _fmtCache.get(key);
}

function formatCurrencyCompact(value) {
  const num = Number(value);
  if (value == null || !Number.isFinite(num)) return "--";
  return intlFmt("compact", {
    style: "currency", currency: "USD",
    notation: "compact", maximumFractionDigits: 2
  }).format(num);
}


function formatCurrency(value) {
  const num = Number(value);
  if (value == null || !Number.isFinite(num)) return "--";

  if (num >= 1000) {
    return intlFmt("big", {
      style: "currency", currency: "USD", maximumFractionDigits: 0
    }).format(num);
  }
  if (num >= 1) {
    return intlFmt("mid", {
      style: "currency", currency: "USD",
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(num);
  }
  if (num >= 0.01) {
    return intlFmt("small", {
      style: "currency", currency: "USD",
      minimumFractionDigits: 2, maximumFractionDigits: 4
    }).format(num);
  }
  if (num >= 0.0001) return `$${num.toFixed(4)}`;
  if (num > 0)       return `$${num.toFixed(6)}`;
  return "$0.00";
}

function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "--";
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

function formatCompactNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "--";
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9)  return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6)  return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3)  return `${(num / 1e3).toFixed(2)}K`;
  if (num >= 1)    return num.toFixed(2);
  if (num > 0)     return num.toFixed(6);
  return "0";
}

function shortenAddress(value) {
  const text = String(value || "");
  if (!text) return "--";
  if (text.length <= 10) return text;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function setText(id, value) {
  const el = byId(id);
  if (el) el.textContent = value;
}

function setImage(el, path, fallback = "") {
  if (!el) return;
  el.src = path;
  if (fallback) {
    el.onerror = () => { el.onerror = null; el.src = fallback; };
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyPolarityClass(el, value) {
  if (!el) return;
  const num = Number(value);
  el.classList.remove("positive", "negative", "neutral");
  if (!Number.isFinite(num) || num === 0) el.classList.add("neutral");
  else if (num > 0) el.classList.add("positive");
  else el.classList.add("negative");
}

/* Antipatrón que aparecía en cuatro sitios: leer un valor, quitar tres
   clases, añadir una. Centralizado. */
function setTextWithPolarity(id, text, value) {
  const el = byId(id);
  if (!el) return;
  el.textContent = text;
  applyPolarityClass(el, value);
}

// ===============================
// MOODS
// ===============================
function getMoodByScore(score) {
  if (score >= 85) return { key: "euphoria",    name: "Euphoria",    anim: "anim-pulse", range: "85-100" };
  if (score >= 70) return { key: "content",     name: "Content",     anim: "anim-float", range: "70-84"  };
  if (score >= 60) return { key: "optimism",    name: "Optimism",    anim: "anim-float", range: "60-69"  };
  if (score >= 45) return { key: "neutral",     name: "Neutral",     anim: "anim-blink", range: "45-59"  };
  if (score >= 35) return { key: "doubt",       name: "Doubt",       anim: "anim-tilt",  range: "35-44"  };
  if (score >= 20) return { key: "concern",     name: "Concern",     anim: "anim-shake", range: "20-34"  };
  return             { key: "frustration", name: "Frustration", anim: "anim-shake", range: "0-19"   };
}

/* Estas dos se declaraban con `let ... = getMoodByScore(50)` antes de
   que la función existiera en el orden del archivo. Funcionaba por
   hoisting, pero es frágil. Ahora se inicializan después. */
let currentGlobalMood = getMoodByScore(50);
let moodLiveMood      = getMoodByScore(50);

/* ===========================================================
   CALIBRACIÓN EMOCIONAL

   PROBLEMA QUE RESUELVE:
   La versión anterior era lineal y recortada:
     clamp(50 + change * sensibilidad, 0, 100)

   Dos defectos graves:

   1. SATURACIÓN DURA. Con sensibilidad 7.5, cualquier movimiento
      mayor a ±6.7% daba EXACTAMENTE el mismo score. Un -8% y un
      -54% eran indistinguibles: ambos 0. El índice dejaba de
      medir justo cuando más importaba.

   2. UNA SOLA VARA PARA TODO. Un -5% en Bitcoin es un día malo
      serio. Un -5% en una memecoin de $13K es un martes normal.
      La fórmula los trataba igual.

   SOLUCIÓN:
   · Curva tanh en vez de recorte lineal. Se aplana suavemente y
     nunca alcanza los extremos, así que 0 y 100 quedan
     reservados para movimientos verdaderamente históricos.
   · Escala adaptativa: el movimiento se mide contra la
     volatilidad PROPIA del activo, no contra una constante.
     Es un z-score, que es como se miden estas cosas de verdad.
   =========================================================== */

/* Cuántas "sigmas" hacen falta para llegar a cada nivel:
     1σ  → score ~69 / ~31   (movimiento normal)
     2σ  → score ~84 / ~16   (día notable)
     3σ  → score ~91 / ~9    (evento serio)
     6σ  → score ~99 / ~1    (histórico)
   El factor 2.5 sale de tanh(1/2.5) ≈ 0.38 → 50 + 19 = 69. */
const SIGMA_TO_SCALE = 2.5;

function tanh(x) {
  // Math.tanh existe en todos los navegadores objetivo, pero
  // esto evita depender de ello y es igual de rápido.
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

/* Convierte un cambio porcentual en score, dada la escala típica
   de movimiento del activo. `scale` es la magnitud que se
   considera "un movimiento normal" para ESE activo. */
function changeToScore(changePct, scale) {
  const change = Number(changePct || 0);
  const safeScale = Number(scale) > 0 ? Number(scale) : 1;

  /* El 0.97 deja un margen: el score nunca toca exactamente 0
     ni 100. Un índice que se clava en el extremo ha dejado de
     informar. */
  return clamp(50 + 50 * tanh(change / (safeScale * SIGMA_TO_SCALE)) * 0.97, 0, 100);
}

/* Volatilidad realizada: desviación típica de los retornos
   punto a punto de la serie. Esto es lo que define qué es
   "normal" para este activo en este timeframe. */
function realizedVolatility(prices) {
  if (!Array.isArray(prices) || prices.length < 3) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = Number(prices[i - 1]);
    const curr = Number(prices[i]);
    if (prev > 0 && Number.isFinite(curr)) {
      returns.push(((curr - prev) / prev) * 100);
    }
  }

  if (returns.length < 2) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  const stepSigma = Math.sqrt(variance);

  /* La volatilidad escala con la raíz del tiempo. Para juzgar el
     movimiento acumulado del periodo entero, no el de un paso. */
  return stepSigma * Math.sqrt(returns.length);
}

/* Escalas por defecto cuando no hay historia suficiente.
   Son la magnitud típica de movimiento en cada ventana. */
/* Calibradas con datos reales de cada clase de activo.
   Las de token son ALTAS a propósito: una memecoin que se mueve
   un 12% en cinco minutos está teniendo un rato normal, no una
   crisis. Con las escalas bajas de la primera versión, un -30% y
   un -54% daban el mismo score — seguía saturando. */
const DEFAULT_SCALES = {
  market: { "1h": 0.4, "4h": 0.9, "24h": 2.0, "7d": 5.0, "30d": 10.0 },
  coin:   { "1h": 1.0, "4h": 2.0, "24h": 4.5, "7d": 10.0, "30d": 20.0 },
  token:  { "1m": 6.0, "5m": 12.0, "15m": 18.0, "1h": 28.0, "4h": 45.0, "24h": 70.0 }
};

function getDefaultScale(kind, timeframe) {
  return DEFAULT_SCALES[kind]?.[timeframe] ?? 3;
}

/* COMPATIBILIDAD: se conserva la firma antigua porque hay
   llamadas repartidas por el archivo. Ahora traduce la vieja
   "sensibilidad" a la escala equivalente y pasa por la curva.
   Una sensibilidad S saturaba en 50/S, así que esa es la
   magnitud que consideraba extrema. */
function normalizeChangeToScore(changePct, sensitivity = 10) {
  const impliedScale = (50 / Math.max(sensitivity, 0.1)) / 3;
  return changeToScore(changePct, impliedScale);
}

function getMoodColor(key) {
  const map = {
    frustration: "#E4485C", concern: "#E8848F", doubt: "#E8B4BA",
    neutral: "#B8C0CB",
    optimism: "#A8E6BF", content: "#7FD9A0", euphoria: "#3BD97A"
  };
  return map[key] || "#B8C0CB";
}

function getCurrentStyle() {
  const value = String(byId("styleSelector")?.value || "").toLowerCase();
  return ALLOWED_STYLES.includes(value) ? value : DEFAULT_STYLE;
}

function getHeroImagePath(style, moodKey) {
  return `/assets/hero/${style}/${moodKey}.png`;
}

function getIconImagePath(style, moodKey) {
  return `/assets/icons/${SHARED_ICON_STYLE}/${moodKey}.png`;
}

// El ícono usa el mismo mapa de mood que ya tienes
function getNewsMoodColor(moodKey) {
  return getMoodColor(moodKey); // reutiliza tu función existente
}

function createNewsItem(item) {
  const mood = getMoodByScore(item.score ?? 50);
  const el = document.createElement("a");
  el.className = "news-item";
  el.href = item.url || "#";
  el.target = "_blank";
  el.rel = "noopener noreferrer";
  el.style.setProperty("--news-color", getNewsMoodColor(mood.key));

  el.innerHTML = `
    <img class="news-item-icon" src="${escapeHtml(getIconImagePath(getCurrentStyle(), mood.key))}" alt="${escapeHtml(mood.name)}" loading="lazy">
    <span class="news-item-headline">${escapeHtml(item.headline)}</span>`;

  return el;
}

function renderNewsBanner() {
  const track = byId("newsTrack");
  if (!track) return;

  if (!newsData.length) {
    track.innerHTML = `<span class="news-loading">No fresh headlines right now</span>`;
    return;
  }

  const frag = document.createDocumentFragment();
  const buildPass = () => {
    newsData.forEach((item, i) => {
      frag.appendChild(createNewsItem(item));
      if (i < newsData.length - 1) {
        const sep = document.createElement("span");
        sep.className = "news-item-sep";
        frag.appendChild(sep);
      }
    });
  };

  // Se duplica una vez para que el loop del marquee sea continuo (translateX -50%)
  buildPass();
  const midSep = document.createElement("span");
  midSep.className = "news-item-sep";
  frag.appendChild(midSep);
  buildPass();

  track.replaceChildren(frag);
}

async function loadNews() {
  if (isLoadingNews) return;
  isLoadingNews = true;
  try {
    const res = await fetchJson("/api/crypto-news", null);
    const items = Array.isArray(res?.items) ? res.items : [];
    if (items.length) {
      newsData = items.slice(0, 12);
      renderNewsBanner();
      renderRadarFeed();
    } else if (!newsData.length) {
      renderNewsBanner();
      renderRadarFeed();
    }
  } finally {
    isLoadingNews = false;
  }
}

// ===============================
// STORAGE
// ===============================
function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function saveActiveCoin(symbol) {
  if (symbol) lsSet(ACTIVE_COIN_STORAGE_KEY, String(symbol).toUpperCase());
}

function loadSavedActiveCoin() {
  const saved = lsGet(ACTIVE_COIN_STORAGE_KEY);
  return saved ? saved.toUpperCase() : null;
}

function saveSelectedStyle(style) {
  if (style) lsSet(STYLE_STORAGE_KEY, String(style).toLowerCase());
}

function loadSavedStyle() {
  const saved = String(lsGet(STYLE_STORAGE_KEY) || "").toLowerCase();
  return ALLOWED_STYLES.includes(saved) ? saved : DEFAULT_STYLE;
}

function applyStyleClass(style) {
  if (!document.body) return;
  ALLOWED_STYLES.forEach((s) => document.body.classList.remove(`style-${s}`));
  document.body.classList.add(`style-${style}`);
}

function loadSavedMacroDriver() {
  const saved = lsGet(MACRO_DRIVER_STORAGE_KEY);
  return VALID_MACRO_DRIVERS.includes(saved) ? saved : "market_flow";
}

/* FIX #1 (cont.) — un solo escritor del macro driver.
   Actualiza estado, storage y todo lo derivado de una vez. */
function setMacroDriver(value, { persist = true } = {}) {
  const key = VALID_MACRO_DRIVERS.includes(value) ? value : "market_flow";

  activeMacroDriver  = key;
  currentDriverScore = getDriverScoreFromKey(key);
  currentNarrative   = getDriverNarrative(key);
  currentRiskTone    = getRiskToneFromMood(currentGlobalMood?.key || "neutral");

  if (persist) lsSet(MACRO_DRIVER_STORAGE_KEY, key);

  const select = byId("macroDriver");
  if (select && select.value !== key) select.value = key;
}

// ===============================
// DRIVERS
// ===============================
function getDriverLabel(driverKey) {
  const labels = {
    market_flow:          "Market flow / price action",
    social_sentiment:     "Social sentiment",
    etf_adoption:         "ETF / institutional adoption",
    rate_cut:             "Rate cut hopes",
    rate_hike:            "Rate hike fears",
    regulation_crackdown: "Regulation crackdown",
    crypto_hack:          "Crypto hack / insolvency",
    war_escalation:       "War escalation",
    neutral_macro:        "Neutral macro environment"
  };
  return labels[driverKey] || labels.market_flow;
}

function getDriverNarrative(driverKey) {
  const n = {
    market_flow:          "Price action is leading sentiment with no major macro override.",
    social_sentiment:     "Social momentum and trending reactions are amplifying the market mood.",
    etf_adoption:         "Institutional-style strength is supporting confidence across major crypto assets.",
    rate_cut:             "Rate cut expectations improve liquidity narratives and help sentiment recover.",
    rate_hike:            "Higher rate fears pressure liquidity and weaken risk appetite across crypto.",
    regulation_crackdown: "Regulatory pressure increases uncertainty and creates hesitation across the market.",
    crypto_hack:          "Security concerns or insolvency headlines are damaging confidence quickly.",
    war_escalation:       "Geopolitical stress is pushing markets toward a more defensive and emotional state.",
    neutral_macro:        "No dominant macro shock; market mood is being shaped mostly by internal crypto flows."
  };
  return n[driverKey] || n.market_flow;
}

function getRiskToneFromMood(moodKey) {
  const map = {
    euphoria: "Risk-on", content: "Constructive", optimism: "Positive",
    neutral: "Balanced", doubt: "Cautious", concern: "Defensive",
    frustration: "High alert"
  };
  return map[moodKey] || "Balanced";
}

function getReactionLabel(timeframe) {
  const labels = {
    "1h":  "Balanced intraday reaction",
    "4h":  "Broader structural reaction",
    "24h": "Higher conviction reaction",
    "7d":  "Macro-leaning reaction",
    "30d": "Trend-cycle reaction"
  };
  return labels[timeframe] || "Balanced reaction";
}

function mapDriverLabelToKey(driverLabel) {
  const text = String(driverLabel || "").toLowerCase();
  if (text.includes("etf") || text.includes("institutional")) return "etf_adoption";
  if (text.includes("rate cut"))      return "rate_cut";
  if (text.includes("rate hike"))     return "rate_hike";
  if (text.includes("regulation"))    return "regulation_crackdown";
  if (text.includes("hack") || text.includes("insolvency")) return "crypto_hack";
  if (text.includes("war"))           return "war_escalation";
  if (text.includes("neutral macro")) return "neutral_macro";
  return "market_flow";
}

function getDriverScoreFromKey(driverKey) {
  const map = {
    market_flow: 50, social_sentiment: 56, etf_adoption: 74, rate_cut: 66,
    rate_hike: 36, regulation_crackdown: 30, crypto_hack: 22,
    war_escalation: 26, neutral_macro: 50
  };
  return map[driverKey] ?? 50;
}

// ===============================
// PULSE
// ===============================
const PULSE_WEIGHTS = {
  frustration: 10, concern: 25, doubt: 40, neutral: 50,
  optimism: 65, content: 75, euphoria: 90
};

function getPulseTotalVotes() {
  return Object.values(pulseVotes).reduce((sum, n) => sum + Number(n || 0), 0);
}

function getPulseScore() {
  const total = getPulseTotalVotes();
  if (!total) return 50;
  let sum = 0;
  Object.entries(pulseVotes).forEach(([mood, count]) => {
    sum += (PULSE_WEIGHTS[mood] || 50) * Number(count || 0);
  });
  return roundScore(sum / total);
}

function getLastPulseVoteTime() { return Number(lsGet(PULSE_VOTE_STORAGE_KEY) || 0); }
function setLastPulseVoteTime(ts) { lsSet(PULSE_VOTE_STORAGE_KEY, String(ts)); }
function canVotePulse() { return getPulseRemainingCooldownMs() <= 0; }
function getPulseRemainingCooldownMs() {
  const local = Math.max(0, PULSE_VOTE_COOLDOWN_MS - (Date.now() - getLastPulseVoteTime()));
  /* El servidor manda: el reloj local es falsificable y ademas puede
     ir desfasado. El local solo evita el doble click. */
  return Math.max(local, Math.max(0, pulseServerCooldown - Date.now()));
}

/* Identidad anonima y estable del votante.

   No es una cuenta ni identifica a nadie: es un UUID aleatorio que
   vive en este navegador. El servidor lo guarda hasheado con sal, de
   modo que la tabla no contiene ni el UUID ni la IP en claro. Sirve
   para una sola cosa: que un voto por persona valga uno, y que puedas
   cambiar el tuyo en vez de sumar otro. */
function getPulseVoterId() {
  let id = lsGet(PULSE_VOTER_ID_KEY);
  if (id && String(id).length >= 16) return String(id);

  id = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

  lsSet(PULSE_VOTER_ID_KEY, id);
  return id;
}

/* Confianza 0..1 segun cuantos votos hay en la ventana. */
function getPulseConfidence() {
  const total = getPulseTotalVotes();
  if (!total) return 0;
  return Math.min(1, total / PULSE_MIN_VOTES_FOR_INDEX);
}

/* El numero que entra al indice, NO el que se muestra.

   La UI ensena el pulso crudo, porque es lo que la gente voto y
   mentirle sobre eso seria el mismo error que los votos inventados.
   Pero el indice compuesto necesita que dos votos no muevan el
   mercado: con poca muestra, el pulso se acerca a 50. */
function getPulseIndexScore() {
  const raw = roundScore(currentPulseScore);
  const k = getPulseConfidence();
  return roundScore(50 + (raw - 50) * k);
}

/* Distancia entre lo que siente la gente y lo que dice el dato.
   Positivo = la comunidad esta mas optimista que el mercado. */
function getPulseVsMarketDelta() {
  if (!getPulseTotalVotes()) return null;
  return roundScore(currentPulseScore) - roundScore(currentMarketScore);
}

function applyPulsePayload(data) {
  if (!data || data.ok !== true) {
    pulseUnavailable = true;
    return false;
  }

  const counts = data.counts || {};
  Object.keys(PULSE_WEIGHTS).forEach((key) => {
    pulseVotes[key] = Math.max(0, Number(counts[key] || 0));
  });

  pulseMyVote = PULSE_WEIGHTS[data.myVote] ? data.myVote : null;
  if (pulseMyVote) lsSet(PULSE_MY_VOTE_KEY, pulseMyVote);

  if (Number(data.cooldownMs) > 0) {
    pulseServerCooldown = Date.now() + Number(data.cooldownMs);
  }

  pulseLoaded = true;
  pulseUnavailable = false;
  currentPulseScore = getPulseScore();
  return true;
}

async function loadPulse() {
  const data = await fetchJson(
    `/api/emotion-pulse?window=${PULSE_WINDOW_HOURS}h&voter=${encodeURIComponent(getPulseVoterId())}`,
    null
  );

  const ok = applyPulsePayload(data);
  if (!ok) pulseLoaded = true;

  renderPulseStats();
  if (!isPulsePreviewActive) recomputeHeroSystem();
  return ok;
}

/* El intervalo se guarda en una variable y se limpia antes de crear
   otro. Sin esto, cada llamada dejaba un timer vivo. */
function startPulseSync() {
  stopPulseSync();
  loadPulse();
  pulseRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    loadPulse();
  }, PULSE_REFRESH_MS);
}

function stopPulseSync() {
  if (pulseRefreshTimer) {
    clearInterval(pulseRefreshTimer);
    pulseRefreshTimer = null;
  }
}

function formatCooldownTime(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// ===============================
// SCORE SYSTEM
// ===============================
function getVolumeImpulseScore(volumeUsd) {
  if (!Number.isFinite(volumeUsd) || volumeUsd <= 0) return 50;
  if (volumeUsd >= 220e9) return 78;
  if (volumeUsd >= 170e9) return 70;
  if (volumeUsd >= 120e9) return 62;
  if (volumeUsd >= 80e9)  return 54;
  if (volumeUsd >= 50e9)  return 46;
  return 40;
}

function getBtcDominanceImpulseScore(btcDom) {
  if (!Number.isFinite(btcDom) || btcDom <= 0) return 50;
  if (btcDom >= 58) return 43;
  if (btcDom >= 55) return 46;
  if (btcDom >= 52) return 49;
  if (btcDom >= 49) return 53;
  if (btcDom >= 46) return 57;
  return 61;
}

function getTrendingMomentumScore() {
  if (!trendingCoinsData.length) return 50;
  return normalizeChangeToScore(
    average(trendingCoinsData.map((c) => Number(c.price_change_percentage_24h_in_currency || 0))),
    3.5
  );
}

function getMemeMomentumScore() {
  if (!topMemesData.length) return 50;
  return normalizeChangeToScore(
    average(topMemesData.map((c) => Number(c.price_change_percentage_24h_in_currency || 0))),
    3.2
  );
}

/* SE ELIMINARON LOS MULTIPLICADORES.

   Esta funcion tomaba el cambio de 24h y lo multiplicaba por
   0.25 / 0.5 / 1 / 2.2 / 4 segun la pill. Pulsar "7D" no leia
   siete dias de mercado: leia el mismo 24h escalado por 2.2. El
   grafico de fondo, en cambio, si dibujaba datos reales del rango
   —por eso el hero decia "EMOTION 7D" mientras el score venia de
   otra parte, y por eso los numeros nunca cuadraban entre si.

   Ahora /api/global mide el cambio sobre la serie real de cada
   ventana y lo devuelve ya listo. El cliente no lo toca. */
let currentChangeSource = "snapshot_24h";
let currentChangeSpanHours = null;

/* Correccion por historia: separa "48 neutral de verdad" de "48
   viniendo de 20". Es un ajuste, no un mando: +-6 puntos como
   maximo, para que el dato del momento siga siendo el que manda.

   Solo se aplica en rangos largos. En 1h el histórico de semanas
   no dice nada util sobre lo que esta pasando ahora mismo. */
function getHistoryAdjustment() {
  if (globalTimeframe !== "7d" && globalTimeframe !== "30d") return 0;

  const position = getHistoryRangePosition();
  if (position === null) return 0;

  return ((position - 50) / 50) * 6;
}

function computeCompositeScore() {
  return roundScore(
    roundScore(currentMarketScore) * 0.46 +
    roundScore(currentSocialScore) * 0.20 +
    getPulseIndexScore()           * 0.10 +
    roundScore(getVolumeImpulseScore(currentHeaderVolumeValue)) * 0.06 +
    roundScore(getBtcDominanceImpulseScore(currentBtcDominanceValue)) * 0.04 +
    roundScore(currentDriverScore) * 0.14 +
    getHistoryAdjustment()
  );
}

function computeCustomLayersScore() {
  const w = { market: 0.52, social: 0.18, driver: 0.18, pulse: 0.12 };
  const s = {
    market: roundScore(currentMarketScore),
    social: roundScore(currentSocialScore),
    driver: roundScore(currentDriverScore),
    pulse:  getPulseIndexScore()
  };

  let total = 0;
  let weight = 0;

  Object.keys(w).forEach((k) => {
    if (activeLayers[k]) { total += s[k] * w[k]; weight += w[k]; }
  });

  return weight ? roundScore(total / weight) : s.market;
}

/* ===========================================================
   EL ÍNDICE CANÓNICO, PUBLICADO PARA TODA LA PÁGINA

   Lo escribe public/hero-rig.js en cuanto responde
   /api/index-score. Mientras valga null, se usa la fórmula
   antigua: la página funciona igual el día que el endpoint falle
   o antes de que el cron haya guardado la primera lectura.

   POR QUÉ ESTA VARIABLE EXISTE:
   había DOS motores de score conviviendo. Este archivo calculaba
   el suyo y lo repartía por media página —gauge, barra superior,
   etiqueta de emoción, régimen, puntero del espectro, bubble
   maps—, mientras el índice nuevo decía otra cosa. El resultado
   eran hasta cuatro cifras distintas en la misma pantalla, y el
   parche consistía en que hero-rig.js interceptara once
   elementos uno por uno, comparando textContent en cada frame.

   Ese parche tenía un defecto de fondo: cada elemento NUEVO que
   se pintara aquí volvería a divergir, y solo se descubriría en
   producción. Publicando el índice en el origen, todo lo que
   dependa de currentGlobalScore queda bien de nacimiento.
   =========================================================== */
window.WM_CANONICAL_INDEX = null;

function getEffectiveHeroScore() {
  /* El índice manda cuando existe. Los modos Composite y Custom
     Layers se retiraron de la interfaz, así que solo queda RAW
     como respaldo. */
  const canon = Number(window.WM_CANONICAL_INDEX);
  if (Number.isFinite(canon)) return roundScore(canon);

  if (heroMode === HERO_MODE_RAW)       return roundScore(currentMarketScore);
  if (heroMode === HERO_MODE_COMPOSITE) return computeCompositeScore();
  return computeCustomLayersScore();
}

// ===============================
// WOJAKMETER CORE — subemociones + latido
// ===============================
const WM_SUBEMOTION_NARRATIVES = {
  frustration:              "The market feels exhausted after heavy emotional pressure.",
  frustration_capitulation: "Traders are giving up faster than price is stabilizing.",
  frustration_panic:        "Panic selling is dominating the emotional flow.",
  frustration_exhaustion:   "Fear may be reaching emotional exhaustion.",

  concern:            "Fear is spreading through the market.",
  concern_pressure:   "Defensive pressure is building across the market.",
  concern_fear_spike: "Fear is accelerating faster than price decline.",
  concern_breakdown:  "Confidence is breaking down under heavy pressure.",

  doubt:               "The market is unsure and hesitation is spreading.",
  doubt_confusion:     "Mixed signals are creating emotional confusion.",
  doubt_hesitation:    "Traders are waiting before committing direction.",
  doubt_fake_recovery: "The bounce feels weak and emotionally fragile.",

  neutral:                   "Market emotion is balanced for now.",
  neutral_compression:       "Emotion is compressed and waiting for direction.",
  neutral_pressure_building: "Market is calm, but pressure is building.",
  neutral_waiting:           "Traders are watching without strong conviction.",

  optimism:           "Positive sentiment is forming.",
  optimism_building:  "Optimism is building before full confirmation.",
  optimism_confident: "Confidence is strengthening across the market.",
  optimism_pullback:  "Optimism remains, but momentum is cooling.",

  content:              "The market feels confident and constructive.",
  content_strength:     "Strength is spreading across market sentiment.",
  content_confidence:   "Crowd confidence is steady and controlled.",
  content_overextended: "Confidence is strong, but may be getting stretched.",

  euphoria:           "Crowd confidence is reaching extreme levels.",
  euphoria_breakout:  "Euphoria is expanding with breakout energy.",
  euphoria_overheat:  "The crowd is overheating into dangerous confidence.",
  euphoria_weakening: "Euphoria is weakening despite elevated sentiment."
};

const WM_HEARTBEAT_CORE = {
  frustration: { speed: 1.65, intensity: 0.95, waveform: "chaotic"   },
  concern:     { speed: 1.45, intensity: 0.82, waveform: "irregular" },
  doubt:       { speed: 1.15, intensity: 0.55, waveform: "unstable"  },
  neutral:     { speed: 0.85, intensity: 0.35, waveform: "smooth"    },
  optimism:    { speed: 1.05, intensity: 0.55, waveform: "rising"    },
  content:     { speed: 1.15, intensity: 0.68, waveform: "strong"    },
  euphoria:    { speed: 1.55, intensity: 1.00, waveform: "explosive" }
};

/* FIX #2 — UNA SOLA DEFINICIÓN.
   Antes heartbeatPathForMood se declaraba dos veces: la segunda
   sobreescribía a la primera en silencio. Funcionaba por el orden
   del archivo; cualquier reordenamiento lo rompía. */
const HEARTBEAT_PATHS = {
  frustration: "M0 28 L28 28 L40 10 L56 46 L72 8 L86 50 L104 16 L126 28 L150 28 L170 12 L188 44 L206 8 L224 48 L244 20 L268 28 L320 28",
  concern:     "M0 28 L40 28 L56 18 L72 40 L88 14 L102 38 L124 28 L160 28 L176 18 L192 38 L208 16 L224 36 L248 28 L320 28",
  doubt:       "M0 28 L36 28 L52 22 L66 34 L82 20 L98 32 L120 28 L150 28 L168 22 L186 34 L202 24 L218 30 L250 28 L320 28",
  neutral:     "M0 28 L44 28 L56 24 L68 32 L82 24 L96 30 L120 28 L160 28 L180 26 L196 30 L214 26 L234 28 L320 28",
  optimism:    "M0 28 L36 28 L52 24 L66 20 L82 34 L98 16 L114 30 L138 28 L160 28 L178 22 L194 18 L210 30 L226 20 L246 28 L320 28",
  content:     "M0 28 L32 28 L46 20 L60 34 L74 12 L88 30 L104 18 L126 28 L150 28 L168 20 L184 34 L198 14 L214 28 L232 18 L254 28 L320 28",
  euphoria:    "M0 28 L28 28 L40 16 L52 40 L66 8 L78 46 L94 6 L108 42 L126 18 L148 28 L166 12 L182 44 L198 8 L214 42 L232 14 L252 28 L320 28",

  frustration_capitulation: "M0 30 L34 30 L46 8 L60 52 L76 10 L92 50 L110 18 L132 30 L160 30 L178 14 L194 46 L214 12 L236 50 L258 22 L284 30 L320 30",
  frustration_panic:        "M0 30 L20 30 L30 6 L42 54 L56 4 L70 56 L84 8 L100 52 L118 18 L142 30 L158 8 L174 54 L192 6 L210 52 L230 14 L252 48 L276 30 L320 30",
  frustration_exhaustion:   "M0 28 L50 28 L62 22 L74 34 L90 24 L108 30 L140 28 L178 28 L196 24 L214 32 L238 28 L320 28",

  concern_pressure:   "M0 28 L34 28 L48 16 L64 42 L82 14 L98 40 L118 28 L154 28 L172 16 L190 40 L208 14 L226 38 L250 28 L320 28",
  concern_fear_spike: "M0 28 L24 28 L38 12 L52 46 L66 8 L80 50 L98 14 L116 44 L138 28 L164 28 L180 12 L198 48 L214 10 L232 42 L258 28 L320 28",
  concern_breakdown:  "M0 28 L38 28 L54 18 L70 42 L88 16 L108 46 L126 34 L146 36 L166 44 L188 30 L210 42 L232 24 L254 36 L320 36",

  doubt_confusion:     "M0 28 L32 28 L48 20 L62 36 L78 18 L96 34 L118 26 L144 30 L166 22 L184 36 L204 24 L224 32 L250 27 L320 28",
  doubt_hesitation:    "M0 28 L48 28 L62 24 L76 32 L96 26 L120 28 L160 28 L180 24 L198 32 L220 27 L320 28",
  doubt_fake_recovery: "M0 30 L36 30 L54 24 L72 20 L90 34 L110 28 L142 28 L164 22 L184 18 L204 36 L224 30 L320 30",

  neutral_compression:       "M0 28 L56 28 L70 26 L84 30 L104 27 L132 28 L172 28 L194 27 L214 29 L240 28 L320 28",
  neutral_pressure_building: "M0 28 L42 28 L56 24 L70 34 L86 22 L102 32 L128 28 L160 28 L178 22 L196 34 L214 20 L234 32 L260 28 L320 28",
  neutral_waiting:           "M0 28 L60 28 L76 26 L92 30 L120 28 L180 28 L202 26 L224 30 L260 28 L320 28",

  optimism_building:  "M0 30 L40 30 L56 26 L72 22 L88 34 L106 18 L124 30 L150 28 L176 24 L194 18 L214 30 L234 20 L258 28 L320 28",
  optimism_confident: "M0 28 L34 28 L50 22 L66 18 L84 34 L102 14 L122 30 L150 28 L176 20 L194 16 L214 32 L234 18 L260 28 L320 28",
  optimism_pullback:  "M0 26 L36 26 L54 20 L72 18 L90 34 L110 28 L140 30 L170 30 L190 24 L210 22 L232 32 L254 28 L320 28",

  content_strength:     "M0 28 L30 28 L46 18 L62 36 L78 12 L96 30 L116 16 L140 28 L166 28 L184 18 L202 36 L218 12 L238 28 L260 18 L286 28 L320 28",
  content_confidence:   "M0 28 L36 28 L52 20 L68 34 L84 14 L102 30 L124 18 L150 28 L178 28 L196 20 L214 34 L232 14 L252 28 L276 20 L320 28",
  content_overextended: "M0 28 L26 28 L42 16 L58 40 L74 8 L90 34 L108 14 L132 30 L160 28 L178 16 L196 42 L214 10 L234 32 L258 20 L286 28 L320 28",

  euphoria_breakout:  "M0 28 L26 28 L38 14 L52 42 L68 6 L82 48 L100 4 L116 44 L136 16 L160 28 L178 10 L196 46 L214 6 L232 44 L254 12 L278 28 L320 28",
  euphoria_overheat:  "M0 30 L20 30 L32 10 L44 48 L58 4 L70 54 L84 2 L98 52 L112 8 L128 46 L148 18 L170 30 L186 8 L202 50 L218 4 L236 48 L256 12 L280 30 L320 30",
  euphoria_weakening: "M0 28 L34 28 L48 16 L62 38 L78 12 L94 36 L112 20 L136 30 L160 30 L178 18 L194 36 L212 20 L232 32 L256 28 L320 28"
};

function heartbeatPathForMood(moodKey) {
  return HEARTBEAT_PATHS[moodKey] || HEARTBEAT_PATHS.neutral;
}

function getEmotionShiftScore() {
  const market   = roundScore(currentMarketScore);
  const social   = roundScore(currentSocialScore);
  const driver   = roundScore(currentDriverScore);
  const pulse    = getPulseIndexScore();
  const volume   = roundScore(getVolumeImpulseScore(currentHeaderVolumeValue));
  const trending = roundScore(getTrendingMomentumScore());

  return roundScore(
    Math.abs(social   - market) * 0.24 +
    Math.abs(driver   - 50)     * 0.24 +
    Math.abs(pulse    - market) * 0.16 +
    Math.abs(volume   - 50)     * 0.18 +
    Math.abs(trending - 50)     * 0.18
  );
}

function getShiftLevel(shiftScore = getEmotionShiftScore()) {
  const s = roundScore(shiftScore);
  if (s >= 30) return "extreme";
  if (s >= 22) return "high";
  if (s >= 14) return "mid";
  return "low";
}

function detectSubemotion(moodKey, score) {
  const shift    = getEmotionShiftScore();
  const market   = roundScore(currentMarketScore);
  const social   = roundScore(currentSocialScore);
  const driver   = roundScore(currentDriverScore);
  const volume   = roundScore(getVolumeImpulseScore(currentHeaderVolumeValue));
  const trending = roundScore(getTrendingMomentumScore());

  if (moodKey === "frustration") {
    if (shift >= 26 && social < market) return "frustration_panic";
    if (score <= 10)                    return "frustration_capitulation";
    if (shift <= 10)                    return "frustration_exhaustion";
  }
  if (moodKey === "concern") {
    if (shift >= 24 && social < market) return "concern_fear_spike";
    if (driver <= 30 || volume >= 62)   return "concern_breakdown";
    if (shift >= 14)                    return "concern_pressure";
  }
  if (moodKey === "doubt") {
    if (shift >= 20)                    return "doubt_confusion";
    if (market > 50 && social < 45)     return "doubt_fake_recovery";
    return "doubt_hesitation";
  }
  if (moodKey === "neutral") {
    if (shift >= 18)                    return "neutral_pressure_building";
    if (volume <= 46)                   return "neutral_compression";
    return "neutral_waiting";
  }
  if (moodKey === "optimism") {
    if (market < social && social >= 64) return "optimism_building";
    if (market >= 64 && social >= 60)    return "optimism_confident";
    if (market < 58 || trending < 50)    return "optimism_pullback";
  }
  if (moodKey === "content") {
    if (score >= 80 && shift >= 18)      return "content_overextended";
    if (market >= 70 && social >= 70)    return "content_confidence";
    return "content_strength";
  }
  if (moodKey === "euphoria") {
    if (score >= 92 && shift >= 18)      return "euphoria_overheat";
    if (market >= 85 && social >= 85)    return "euphoria_breakout";
    if (market < social || trending < 60) return "euphoria_weakening";
  }

  return moodKey;
}

function getWojakCoreState(score, mood, style = getCurrentStyle()) {
  const moodKey    = mood?.key || "neutral";
  const subemotion = detectSubemotion(moodKey, score);
  const shiftScore = getEmotionShiftScore();

  return {
    score: roundScore(score),
    mood, moodKey, style, subemotion,
    subtitle: WM_SUBEMOTION_NARRATIVES[subemotion] || WM_SUBEMOTION_NARRATIVES[moodKey] || "",
    shiftScore,
    shiftLevel: getShiftLevel(shiftScore),
    heartbeat: WM_HEARTBEAT_CORE[moodKey] || WM_HEARTBEAT_CORE.neutral,
    visual: {
      base:     getHeroImagePath(style, moodKey),
      overlay:  style === "classic" && subemotion !== moodKey
        ? `/assets/overlays/classic/${subemotion}.png` : "",
      fallback: getHeroImagePath(DEFAULT_STYLE, moodKey)
    }
  };
}

function getCoreSubtitleEl() {
  return byId("heroSubtitle") || byId("heroMoodSubtitle") || byId("moodSubtitle");
}

// ===============================
// HERO UI
// ===============================
function updateGauge(score, mood) {
  const clamped = roundScore(score);
  const angle = -90 + (clamped / 100) * 180;

  const fill = byId("gaugeFill");
  if (fill) {
    const pathLength = 377;
    fill.style.strokeDasharray = `${(clamped / 100) * pathLength} ${pathLength}`;
    fill.style.stroke = getMoodColor(mood.key);
  }

  const needle = byId("gaugeNeedle");
  if (needle) needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;

  setText("gaugeScore", String(clamped));
  setText("gaugeScoreHead", String(clamped));

  const moodEl = byId("gaugeMood");
  if (moodEl) {
    moodEl.textContent = mood.name;
    moodEl.className = `mood-${mood.key}`;
  }
}

/* FIX #3 — UNA SOLA DEFINICIÓN DE updateHero.
   Antes existían tres: la versión básica, la versión con coreState, y
   un IIFE al final del archivo que volvía a reimplementarla entera.
   Ganaba la última por orden de ejecución. Tres cuerpos que mantener
   y dos que nunca se ejecutaban. */
function updateHero(score, mood, options = {}) {
  const { pulseMode = false } = options;
  const style = getCurrentStyle();
  const core  = getWojakCoreState(score, mood, style);

  const heroFaceWrap =
    byId("heroFaceWrap") || qs(".hero-face-wrap") || byId("heroFaceImg")?.parentElement;

  const heroFaceImg    = byId("heroFaceImg");
  const heroOverlayImg = byId("heroFaceOverlayImg");

  const heroStage =
    byId("heroStage") || qs(".wojak-stage") || heroFaceWrap || heroFaceImg?.parentElement;

  // --- Datasets de estado ---
  if (heroStage) {
    heroStage.classList.remove("wm-shift-low", "wm-shift-mid", "wm-shift-high", "wm-shift-extreme");
    heroStage.dataset.mood       = core.moodKey;
    heroStage.dataset.subemotion = core.subemotion;
    heroStage.dataset.style      = style;
    heroStage.dataset.shift      = core.shiftLevel;
    heroStage.classList.add(`wm-shift-${core.shiftLevel}`);
  }

  if (document.body) {
    const b = document.body;
    b.dataset.mood       = core.moodKey;
    b.dataset.subemotion = core.subemotion;
    b.dataset.style      = style;
    b.dataset.shift      = core.shiftLevel;
    b.style.setProperty("--heartbeat-speed", `${core.heartbeat.speed}s`);
    b.style.setProperty("--heartbeat-intensity", String(core.heartbeat.intensity));
  }

  // --- Texto ---
  const subtitleEl = getCoreSubtitleEl();
  if (subtitleEl) subtitleEl.textContent = core.subtitle;

  const heroMood = byId("heroMood");
  if (heroMood) {
    heroMood.textContent = mood.name;
    heroMood.className = `hero-mood mood-${mood.key}`;
  }

  const heroScoreWrap = byId("heroScoreWrap");
  if (heroScoreWrap) {
    heroScoreWrap.innerHTML = `
      <span class="score-label">Score</span><span class="score-colon">:</span>
      <span id="heroScore" class="mood-${mood.key}">${roundScore(score)}</span>
      <span class="score-divider">/</span>
      <span class="score-max">100</span>
    `;
  }

  // --- Animación en el wrapper, no en la imagen.
  //     Si se anima la imagen, se separa del overlay. ---
  if (heroFaceWrap) {
    heroFaceWrap.className = "hero-face-wrap";
    if (mood.anim) heroFaceWrap.classList.add(mood.anim);

    if (pulseMode) {
      heroFaceWrap.classList.add("hero-face-pulse");
      clearTimeout(heroFaceWrap.__pulseTimer);
      heroFaceWrap.__pulseTimer = setTimeout(() => {
        heroFaceWrap.classList.remove("hero-face-pulse");
      }, 700);
    }
  }

  if (heroFaceImg) {
    heroFaceImg.className = "hero-face-img";
    setImage(heroFaceImg, core.visual.base, core.visual.fallback);
  }

  // --- Overlay de subemoción ---
  if (heroOverlayImg) {
    heroOverlayImg.className = "hero-face-overlay hidden";
    heroOverlayImg.style.display = "none";
    heroOverlayImg.onerror = null;
    heroOverlayImg.onload  = null;
    heroOverlayImg.removeAttribute("src");

    if (core.visual.overlay) {
      heroOverlayImg.onload = () => {
        heroOverlayImg.classList.remove("hidden");
        heroOverlayImg.style.display = "block";
      };
      heroOverlayImg.onerror = () => {
        heroOverlayImg.classList.add("hidden");
        heroOverlayImg.style.display = "none";
        heroOverlayImg.removeAttribute("src");
      };
      heroOverlayImg.src = core.visual.overlay;
    }
  }

  // --- Puntero del espectro ---
  const pointer = byId("emotionPointer");
  if (pointer) pointer.style.left = `${clamp(roundScore(score), 0, 100)}%`;

  const pointerImg = byId("emotionPointerImg");
  if (pointerImg) {
    setImage(pointerImg, getIconImagePath(style, mood.key), getIconImagePath(DEFAULT_STYLE, mood.key));
  }

  // --- Latido ---
  const hbWrap = byId("heartbeatWrap");
  const hbPath = byId("heartbeatPath");
  if (hbWrap && hbPath) {
    hbWrap.className = `heartbeat-wrap heartbeat-${mood.key} heartbeat-wave-${core.heartbeat.waveform}`;
    hbPath.setAttribute("d", heartbeatPathForMood(core.subemotion || mood.key));
  }

  updateGauge(score, mood);
}

function setLayerCard(scoreId, barId, impactId, score, impactText, moodKey) {
  const safeScore = roundScore(score);

  setText(scoreId, safeScore);

  const barEl = byId(barId);
  if (barEl) {
    barEl.style.width = `${safeScore}%`;
    barEl.style.background = getMoodColor(moodKey);
  }

  const impactEl = byId(impactId);
  if (impactEl) {
    impactEl.textContent = impactText;
    impactEl.className = "layer-impact";
    if (impactText.startsWith("+"))      impactEl.classList.add("positive");
    else if (impactText.startsWith("-")) impactEl.classList.add("negative");
    else                                 impactEl.classList.add("neutral");
  }
}

function updateLayerUI() {
  const market = roundScore(currentMarketScore);
  const inComposite = heroMode === HERO_MODE_COMPOSITE;

  const impact = (score, active) => {
    if (!active && !inComposite) return "+0";
    const diff = Math.abs(roundScore(score) - market);
    return `${roundScore(score) >= market ? "+" : "-"}${diff}`;
  };

  setLayerCard("layerScoreMarket", "layerBarMarket", "layerImpactMarket",
    currentMarketScore, "Base", getMoodByScore(currentMarketScore).key);
  setLayerCard("layerScoreSocial", "layerBarSocial", "layerImpactSocial",
    currentSocialScore, impact(currentSocialScore, activeLayers.social), getMoodByScore(currentSocialScore).key);
  setLayerCard("layerScoreDriver", "layerBarDriver", "layerImpactDriver",
    currentDriverScore, impact(currentDriverScore, activeLayers.driver), getMoodByScore(currentDriverScore).key);
  setLayerCard("layerScorePulse", "layerBarPulse", "layerImpactPulse",
    currentPulseScore, impact(currentPulseScore, activeLayers.pulse), getMoodByScore(currentPulseScore).key);

  const shell = byId("wmLayers");
  if (shell) shell.classList.toggle("disabled-layers", heroMode !== HERO_MODE_CUSTOM);

  qsa(".layer-btn").forEach((btn) => {
    btn.classList.toggle("active", !!activeLayers[btn.dataset.layer]);
    btn.disabled = heroMode !== HERO_MODE_CUSTOM;
  });

  qsa(".hero-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.heroMode === heroMode);
  });
}

function updateSocialPanel(score, socialMood) {
  const rounded = roundScore(score);

  const interactions = Math.max(1200, Math.round(
    3500 +
    Math.abs(currentGlobalChange) * 2200 +
    average(trendingCoinsData.map((c) => Number(c.price_change_percentage_24h_in_currency || 0))) * 180
  ));

  const bullish = clamp(Math.round(rounded * 0.82), 0, 100);
  const bearish = clamp(Math.round((100 - rounded) * 0.82), 0, 100);
  const neutral = clamp(100 - Math.round((bullish + bearish) * 0.55), 0, 100);

  const moodNode = byId("socialExpandMood");
  if (moodNode) {
    moodNode.textContent = socialMood.name;
    moodNode.className = `mood-${socialMood.key}`;
  }

  setText("socialExpandScore", String(rounded));
  setText("socialExpandEngagement", interactions.toLocaleString("en-US"));
  setText("socialExpandWindow", globalTimeframe);

  const set = (id, val, cls) => {
    const el = byId(id);
    if (el) { el.textContent = `${val}%`; el.className = cls; }
  };

  set("socialExpandBullish", bullish, "positive");
  set("socialExpandBearish", bearish, "negative");
  set("socialExpandNeutral", neutral, "neutral");
}

function updateSocial(socialScore) {
  const style = getCurrentStyle();
  const socialMood = getMoodByScore(socialScore);

  const mini = byId("socialMoodMini");
  if (mini) { mini.textContent = socialMood.name; mini.className = `mood-${socialMood.key}`; }

  const miniScore = byId("socialScoreMini");
  if (miniScore) {
    miniScore.textContent = String(roundScore(socialScore));
    miniScore.className = `mood-${socialMood.key}`;
  }

  const badge = byId("socialBubble");
  if (badge) {
    ["euphoria","content","optimism","neutral","doubt","concern","frustration"]
      .forEach((k) => badge.classList.remove(`social-${k}`));
    badge.classList.add(`social-${socialMood.key}`);
  }

  const icon = byId("socialIconImg");
  if (icon) {
    icon.className = `mood-icon-img ${socialMood.anim}`;
    setImage(icon, getIconImagePath(style, socialMood.key), getIconImagePath(DEFAULT_STYLE, socialMood.key));
  }

  updateSocialPanel(socialScore, socialMood);
  return socialMood;
}

function updateDriverPanel() {
  const key = activeMacroDriver;
  const macroLabel = getDriverLabel(key);

  setText("driverMacro", macroLabel);
  setText("driverNarrative", currentNarrative || getDriverNarrative(key));
  setText("driverTimeframeReaction", `${getReactionLabel(globalTimeframe)} (${globalTimeframe})`);
  setText("driverRiskTone", currentRiskTone || getRiskToneFromMood(currentGlobalMood?.key));

  const select = byId("macroDriver");
  if (select && select.value !== key) select.value = key;

  /* El driver ya no vive entre paréntesis dentro del <h2>: ahora es
     el eyebrow del hero. Sin paréntesis. */
  setText("heroDriverLabel", macroLabel);
}

/* ===========================================================
   FONDO DEL HERO

   ANTES: dibujaba la serie de PRECIO como una línea gris fina,
   sin eje ni referencia, y tapada por la cara. El usuario no
   podía saber si esa curva era buena o mala, ni de qué periodo.
   Leía como garabato decorativo.

   AHORA: dibuja la serie de EMOCIÓN cuando hay histórico
   disponible (que es de lo que va la sección), con línea de
   referencia en 50 y degradado que se desvanece hacia el centro
   para no pelear con la cara.
   =========================================================== */
function buildHeroTimeline(series) {
  const wrapper = byId("heroTimelineBackdrop");
  const line    = byId("heroTimelineLine");
  const area    = byId("heroTimelineArea");
  const mid     = byId("heroTimelineMid");
  if (!wrapper || !line || !area) return;

  const clear = () => {
    wrapper.classList.add("hidden");
    line.setAttribute("d", "");
    area.setAttribute("d", "");
    if (mid) mid.setAttribute("d", "");
  };

  const w = 900, h = 280, pad = 34;

  /* Si hay histórico de emoción, manda ese: cuenta la historia
     correcta y usa escala fija 0-100, así que la altura SIGNIFICA
     algo (arriba = eufórico) en vez de ser relativa al rango. */
  const emotionSeries = historyData?.series;
  const useEmotion = Array.isArray(emotionSeries) && emotionSeries.length >= 4;

  let points;

  if (useEmotion) {
    const pts = emotionSeries.slice(-60);
    points = pts.map((p, i) => [
      (i / (pts.length - 1)) * w,
      pad + (1 - clamp(p.score, 0, 100) / 100) * (h - pad * 2)
    ]);
  } else {
    // Fallback al precio mientras el histórico se llena.
    if (!Array.isArray(series) || series.length < 2) return clear();

    const values = series
      .map((e) => Array.isArray(e) ? Number(e[1]) : Number(e?.value ?? e?.marketCap ?? e))
      .filter((v) => Number.isFinite(v));

    if (values.length < 2) return clear();

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    points = values.map((value, i) => [
      (i / (values.length - 1)) * w,
      pad + (1 - ((value - min) / range)) * (h - pad * 2)
    ]);
  }

  /* Curva suavizada con Catmull-Rom. Los segmentos rectos entre
     muchos puntos producen ese aspecto de garabato nervioso; la
     interpolación lo convierte en una línea que se lee. */
  const smooth = (pts) => {
    if (pts.length < 3) {
      return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };

  const linePath = smooth(points);

  line.setAttribute("d", linePath);
  area.setAttribute("d", `${linePath} L ${w} ${h} L 0 ${h} Z`);

  /* Línea de referencia en 50. Sin ella la curva no tiene arriba
     ni abajo: es la diferencia entre un dato y un adorno. */
  if (mid && useEmotion) {
    const y50 = pad + 0.5 * (h - pad * 2);
    mid.setAttribute("d", `M 0 ${y50.toFixed(1)} L ${w} ${y50.toFixed(1)}`);
  } else if (mid) {
    mid.setAttribute("d", "");
  }

  const color = useEmotion
    ? getMoodColor(getMoodByScore(points.length ? emotionSeries[emotionSeries.length - 1].score : 50).key)
    : getMoodColor(currentGlobalMood?.key || "neutral");

  line.style.stroke = color;
  area.style.fill = `${color}1f`;

  wrapper.dataset.mode = useEmotion ? "emotion" : "price";
  wrapper.classList.remove("hidden");
}

function recomputeHeroSystem() {
  if (isPulsePreviewActive) return;

  currentGlobalScore = getEffectiveHeroScore();
  currentGlobalMood  = getMoodByScore(currentGlobalScore);
  currentRiskTone    = getRiskToneFromMood(currentGlobalMood.key);

  updateHero(currentGlobalScore, currentGlobalMood);
  updateSocial(currentSocialScore);
  updateDriverPanel();
  updateLayerUI();

  setTextWithPolarity("globalMarketChange", formatPercent(currentGlobalChange), currentGlobalChange);
  setText("globalMarketTimeframe", globalTimeframe);

  updateHeaderMetrics();
  renderStudio();

  if (activeHeroView === "bubble" && !isHoveringBubble) scheduleBubbleRender();
}

// ===============================
// DATA
// ===============================
async function fetchJson(url, fallback = null) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return fallback;
  }
}

function normalizeCoinMarketItem(item) {
  if (!item) return null;
  return {
    id:     item.id || item.coin_id || item.api_symbol || item.symbol?.toLowerCase?.() || "",
    name:   item.name || item.symbol?.toUpperCase?.() || "Unknown",
    symbol: item.symbol || item.name || "--",
    image:  item.image || item.thumb || item.large || "",
    current_price: item.current_price ?? item.price ?? null,
    market_cap:    item.market_cap ?? null,
    total_volume:  item.total_volume ?? null,
    price_change_percentage_1h_in_currency:
      item.price_change_percentage_1h_in_currency ?? item.change_1h ?? 0,
    price_change_percentage_24h_in_currency:
      item.price_change_percentage_24h_in_currency ??
      item.data?.price_change_percentage_24h?.usd ??
      item.change ?? item.change_24h ?? 0,
    price_change_percentage_7d_in_currency:
      item.price_change_percentage_7d_in_currency ?? item.change_7d ?? 0
  };
}

function getSocialScoreFromMarket(change, trending = 50, memes = 50, newsScore = 50) {
  return roundScore(clamp(
    50 + change * 5 +
    (trending - 50) * 0.12 +
    (memes    - 50) * 0.10 +
    (Number(newsScore || 50) - 50) * 0.55,
    0, 100
  ));
}

/* ===========================================================
   MOTOR DE MERCADO

   DOS COSAS QUE ESTABAN MAL:

   - EL 16% MUERTO. El cuarto argumento se llamaba `fearGreed` y
      SIEMPRE llegaba como 50, porque el unico sitio que llamaba a
      esta funcion pasaba el literal 50. No existe ningun indice
      externo de Fear & Greed en el proyecto: el "Fear / Greed"
      del header es una ETIQUETA derivada del propio score, no una
      entrada. Asi que el 16% del peso era la constante 50 tirando
      del resultado hacia el centro en todo momento.

      Eso, con un mercado en -0.14%, produce exactamente lo que se
      veia en pantalla: 48, Neutral, siempre. El motor no estaba
      leyendo mal el mercado; estaba anclado por diseno.

      Ese 16% se reparte ahora entre senales que SI existen.

   - LA SENSIBILIDAD ERA FIJA. `normalizeChangeToScore(change, 12)`
      usaba la misma escala para 1h que para 30 dias. Un -2% en una
      hora es una sacudida; en un mes es ruido. Con escala unica,
      los rangos largos parecian siempre tranquilos.
   =========================================================== */

/* Sensibilidad por ventana. Espejo de CHANGE_SCALE_BY_TIMEFRAME
   en pages/api/global.js — si cambia alli, cambia aqui. */
const MARKET_SENSITIVITY = {
  "1h": 26, "4h": 18, "24h": 12, "7d": 6.5, "30d": 4
};

function getMarketSensitivity(timeframe) {
  return MARKET_SENSITIVITY[String(timeframe || "24h")] || 12;
}

/* POSICION EN EL RANGO RECIENTE.

   Esto es lo que faltaba para que el score fuera fiel al timeline
   y no solo al ultimo tick. 50 no significa lo mismo si el mes
   entero se movio entre 45 y 55 que si vienes de 20: en el primer
   caso es de verdad neutral, en el segundo es un alivio.

   Sale de /api/history, que ya guarda min, max y media reales.
   Devuelve 0..100, o null si aun no hay histórico suficiente. */
function getHistoryRangePosition() {
  const stats = historyData?.stats;
  if (!stats) return null;

  const min = Number(stats.min);
  const max = Number(stats.max);
  const samples = Number(stats.samples || 0);

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (samples < 12) return null;

  /* Un rango estrecho no informa: si el mes entero cabe en seis
     puntos, la "posicion" es ruido amplificado. */
  const span = max - min;
  if (span < 8) return null;

  const current = roundScore(currentMarketScore);
  return clamp(((current - min) / span) * 100, 0, 100);
}

function computeMarketScoreFromInputs(change, trendingScore, memeScore) {
  const base = normalizeChangeToScore(change, getMarketSensitivity(globalTimeframe));

  /* Si el servidor no pudo medir la ventana pedida y presto el
     24h, el movimiento pesa menos: el numero no es del rango que
     el usuario esta mirando y no debe mandar como si lo fuera. */
  const borrowed = currentChangeSource === "snapshot_24h" && globalTimeframe !== "24h";

  const wChange   = borrowed ? 0.58 : 0.70;
  const wTrending = 0.18;
  const wMemes    = 0.12;

  return roundScore(
    base * wChange +
    Number(trendingScore || 50) * wTrending +
    Number(memeScore || 50) * wMemes
  );
}

function getCoinBySymbol(symbol) {
  const norm = String(symbol || "").toUpperCase();
  if (!norm) return null;
  const match = (c) => c.symbol?.toUpperCase?.() === norm;
  return topCoinsData.find(match) || trendingCoinsData.find(match) || topMemesData.find(match) || null;
}

function getCoinChangeForTimeframe(coin, timeframe) {
  const h1  = Number(coin.price_change_percentage_1h_in_currency  ?? 0);
  const h24 = Number(coin.price_change_percentage_24h_in_currency ?? 0);
  const d7  = Number(coin.price_change_percentage_7d_in_currency  ?? 0);
  const map = { "1h": h1, "4h": h24 / 6, "24h": h24, "7d": d7, "30d": d7 * 2.8 };
  return map[timeframe] ?? h24;
}

function renderTicker(coins) {
  const ticker = byId("tickerBar");
  if (!ticker) return;

  if (!Array.isArray(coins) || !coins.length) {
    ticker.innerHTML = `<span>Reading market…</span>`;
    return;
  }

  const style = getCurrentStyle();

  /* Diez monedas explicitas. Si en pantalla salen menos, el
     recorte lo hace el ancho del contenedor en CSS, no esto. */
  const items = coins.slice(0, TICKER_COIN_COUNT).map((coin) => {
    const symbol = coin.symbol?.toUpperCase?.() || "--";
    const change = Number(coin.price_change_percentage_24h_in_currency ?? 0);
    const cls = change > 0 ? "pos" : change < 0 ? "neg" : "neu";

    /* LO QUE LE FALTABA AL TICKER: emoción.

       Antes mostraba precio y porcentaje — exactamente lo mismo
       que cualquier ticker de cualquier sitio cripto. En una
       página que se llama "The Crypto Emotion Index", la tira
       superior no decía nada sobre emoción.

       Ahora cada moneda lleva su cara y una barra de color con
       su score. Es lo que hace la tira reconociblemente tuya. */
    const { score, mood } = getCoinEmotionData(coin);

    /* CLICKEABLE.

       La tira mostraba diez monedas y ninguna llevaba a ningun
       sitio: el usuario veia una cara con un score y no tenia
       forma de abrir el grafico de esa moneda. Era el atajo mas
       obvio de la pagina y no existia.

       Es un <button> de verdad, no un div con onclick: se puede
       tabular y responde a Enter sin codigo extra. */
    return `
      <button type="button" class="ticker-item" data-mood="${mood.key}"
              data-symbol="${escapeHtml(symbol)}"
              title="Open ${escapeHtml(symbol)} chart">
        <div class="ticker-top">
          <img class="ticker-logo" src="${escapeHtml(coin.image || "")}" alt="" loading="lazy">
          <span class="ticker-price">${escapeHtml(formatCurrency(coin.current_price))}</span>
          <img class="ticker-mood" src="${escapeHtml(getIconImagePath(style, mood.key))}"
               alt="${escapeHtml(mood.name)}" title="${escapeHtml(mood.name)} · ${score}/100"
               loading="lazy">
        </div>
        <div class="ticker-bottom">
          <span class="ticker-symbol">${escapeHtml(symbol)}</span>
          <span class="${cls}">${change > 0 ? "+" : ""}${change.toFixed(1)}%</span>
        </div>
        <div class="ticker-bar"><span style="width:${score}%"></span></div>
      </button>`;
  }).join("");

  ticker.innerHTML = `<div class="ticker-track">${items}</div>`;

  /* Delegado en el contenedor y con bindOnce: renderTicker se
     llama en cada refresco, y enganchar un listener por moneda
     cada vez apilaria cientos de handlers a lo largo de una
     sesion. */
  bindOnce(ticker, "boundTickerClick", "click", (e) => {
    const btn = e.target.closest("[data-symbol]");
    if (!btn) return;
    const symbol = btn.dataset.symbol;
    if (symbol && symbol !== "--") selectCoin(symbol);
  });
}

/* Métricas de cabecera. Antes solo había tres cifras sueltas;
   ninguna decía en qué estado está el mercado, que es de lo que
   va el sitio entero. */
function updateHeaderMetrics() {
  const score = roundScore(currentGlobalScore);
  const mood = getMoodByScore(score);

  const label = byId("headerMoodLabel");
  if (label) {
    label.textContent = mood.name;
    label.className = `mood-${mood.key}`;
  }

  setText("headerScore", String(score));

  /* Régimen en lenguaje de mercado. "Neutral 45" es el dato;
     "Balanced" es lo que significa. */
  const regime =
    score >= 80 ? "Extreme greed" :
    score >= 62 ? "Greed" :
    score >= 45 ? "Balanced" :
    score >= 30 ? "Fear" : "Extreme fear";

  const regimeEl = byId("headerRegime");
  if (regimeEl) {
    regimeEl.textContent = regime;
    regimeEl.className = `mood-${mood.key}`;
  }

  /* Anillo de dominancia. Un porcentaje sobre un total se lee
     mejor como proporción que como número suelto. */
  const ring = byId("btcDominanceRing");
  if (ring) {
    const pct = clamp(currentBtcDominanceValue, 0, 100);
    const circumference = 2 * Math.PI * 15.5;
    ring.style.strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
  }
}

async function loadSentiment() {
  const token = nextRequest("sentiment");
  isLoadingSentiment = true;
  try {
    const res = await fetchJson("/api/sentiment", null);
    if (isStaleRequest("sentiment", token)) return;
    if (!res || typeof res !== "object") { updateDriverPanel(); return; }

    /* El sentiment del servidor solo manda si el usuario no ha elegido
       driver a mano. Antes lo pisaba siempre, así que la selección del
       usuario se perdía sola cada 60 segundos. */
    const serverKey = mapDriverLabelToKey(res.driver);
    if (!lsGet(MACRO_DRIVER_STORAGE_KEY)) {
      setMacroDriver(serverKey, { persist: false });
    }

    if (res.narrative) currentNarrative = res.narrative;
    if (res.risk)      currentRiskTone  = res.risk;

    currentSocialScore = getSocialScoreFromMarket(
      currentGlobalChange,
      getTrendingMomentumScore(),
      getMemeMomentumScore(),
      res.newsScore ?? 50
    );

    updateDriverPanel();
    recomputeHeroSystem();
  } finally {
    isLoadingSentiment = false;
  }
}

async function loadGlobalMarket() {
  const token = nextRequest("global");

  /* El timeframe se congela aqui: si el usuario pulsa otra pill
     mientras esto viaja, la variable global ya habra cambiado y
     al volver estariamos etiquetando datos viejos con la ventana
     nueva. */
  const requestedTimeframe = globalTimeframe;

  isLoadingGlobal = true;
  try {
    const res = await fetchJson(
      `/api/global?timeframe=${encodeURIComponent(requestedTimeframe)}`, null
    );

    /* Llego tarde: hay una peticion mas nueva en curso. */
    if (isStaleRequest("global", token)) return;
    if (requestedTimeframe !== globalTimeframe) return;

    if (!res || typeof res !== "object") { setTimeframeBusy(false); return; }

    const raw = res.raw || {};

    const btcDom = res.btcDominance && res.btcDominance !== "--"
      ? parseFloat(String(res.btcDominance).replace("%", ""))
      : safeNum(raw.market_cap_percentage?.btc, 50);

    currentBtcDominanceValue = btcDom;
    setText("btcDominance", `${btcDom.toFixed(1)}%`);

    const marketCapValue = safeNum(res.marketCapUsd ?? raw.total_market_cap?.usd, 0);
    currentGlobalMarketCapValue = marketCapValue;
    setText("headerMarketCap",
      res.marketCap && res.marketCap !== "--" ? res.marketCap : formatCurrencyCompact(marketCapValue));

    const volumeUsd = safeNum(res.volumeUsd ?? raw.total_volume?.usd, 0);
    currentHeaderVolumeValue = volumeUsd;
    const volumeText = res.volume && res.volume !== "--" ? res.volume : formatCurrencyCompact(volumeUsd);
    setText("headerVolume", volumeText);
    setText("globalMarketVolume", volumeText);

    currentGlobalChange = safeNum(res.change, 0);
    currentChangeSource = res.changeSource || "snapshot_24h";
    currentChangeSpanHours = Number.isFinite(res.changeSpanHours) ? res.changeSpanHours : null;

    currentMarketScore  = computeMarketScoreFromInputs(
      currentGlobalChange, getTrendingMomentumScore(), getMemeMomentumScore()
    );
    currentPulseScore = getPulseScore();

    buildHeroTimeline(res.timeline || []);
    recomputeHeroSystem();
    setTimeframeBusy(false);
  } finally {
    isLoadingGlobal = false;
  }
}

// ===============================
// GRIDS
// ===============================
function getCoinEmotionData(coin) {
  const change = Number(coin.price_change_percentage_24h_in_currency ?? 0);
  const score  = roundScore(normalizeChangeToScore(change, 6));
  return { score, mood: getMoodByScore(score), change };
}

function getEmotionRank(moodKey) {
  const rank = { frustration: 1, concern: 2, doubt: 3, neutral: 4, optimism: 5, content: 6, euphoria: 7 };
  return rank[moodKey] || 4;
}

const MARKET_COMPARATORS = {
  name:      (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
  marketCap: (a, b) => Number(b.market_cap || 0) - Number(a.market_cap || 0),
  volume:    (a, b) => Number(b.total_volume || 0) - Number(a.total_volume || 0),
  change24h: (a, b) => Number(b.wmChange || 0) - Number(a.wmChange || 0),
  emotion:   (a, b) => getEmotionRank(b.wmMood.key) - getEmotionRank(a.wmMood.key),
  score:     (a, b) => Number(b.wmScore || 0) - Number(a.wmScore || 0)
};

function prepareMarketCoins(data) {
  if (!Array.isArray(data)) return [];

  let coins = data.map((coin) => {
    const e = getCoinEmotionData(coin);
    return { ...coin, wmScore: e.score, wmMood: e.mood, wmChange: e.change };
  });

  if (marketEmotionFilter !== "all") {
    coins = coins.filter((c) => c.wmMood.key === marketEmotionFilter);
  }

  coins.sort(MARKET_COMPARATORS[marketSortBy] || MARKET_COMPARATORS.marketCap);
  return coins.slice(0, MARKET_MAX_ITEMS);
}

/* Antes cada tarjeta llevaba su propio addEventListener. Con tres grids
   de 20 monedas y re-render cada 30s, eso son 60 listeners nuevos por
   ciclo. Ahora hay UNO por grid, delegado. */
function createCoinCard(coin, isActive = false) {
  const style  = getCurrentStyle();
  const symbol = coin.symbol?.toUpperCase?.() || "--";
  const e      = getCoinEmotionData(coin);
  const change = e.change;
  const score  = coin.wmScore ?? e.score;
  const mood   = coin.wmMood  ?? e.mood;

  const card = document.createElement("button");
  card.type = "button";
  card.className = `coin-card coin-card-button ${isActive ? "active-coin-card" : ""}`;
  card.dataset.mood   = mood.key;
  card.dataset.score  = String(score);
  card.dataset.symbol = symbol;

  card.innerHTML = `
    <div class="coin-card-top">
      <div class="coin-main">
        <img class="coin-logo" src="${escapeHtml(coin.image || "")}" alt="" loading="lazy">
        <div class="price">${escapeHtml(formatCurrency(coin.current_price))}</div>
      </div>
    </div>
    <div class="coin-card-bottom">
      <div class="symbol">${escapeHtml(symbol)}</div>
      <div class="change ${change >= 0 ? "positive" : "negative"}">${formatPercent(change)}</div>
    </div>
    <div class="coin-card-meta">
      <span class="coin-mood-badge mood-${mood.key}">${escapeHtml(mood.name)}</span>
      <span class="coin-score">${score}/100</span>
    </div>
    <div class="coin-emoji">
      <img src="${escapeHtml(getIconImagePath(style, mood.key))}" alt="" loading="lazy">
    </div>`;

  return card;
}

function createFallbackCard(title = "Unavailable") {
  const card = document.createElement("div");
  card.className = "coin-card";
  card.innerHTML = `
    <div class="coin-card-top"><div class="coin-main"><div class="price">--</div></div></div>
    <div class="coin-card-bottom">
      <div class="symbol">${escapeHtml(title)}</div>
      <div class="change neutral">--</div>
    </div>`;
  return card;
}

async function selectCoin(symbol) {
  if (!symbol) return;

  activeCoinSymbol = String(symbol).toUpperCase();
  saveActiveCoin(activeCoinSymbol);
  resetChartView();

  coinExchangeData = [];
  renderCoinExchanges();
  renderCoinSections();

  /* EL SCROLL VA PRIMERO.

     Antes era la ultima linea de la funcion, detras de DOS awaits
     de red en serie. Pulsabas una moneda y no pasaba nada durante
     un segundo largo; despues la pagina saltaba de golpe. Se
     sentia trabado porque, desde el punto de vista del usuario,
     lo estaba: su click no producia ningun efecto visible.

     Ahora la pagina se mueve al instante y los datos llegan
     mientras tanto. */
  qs(".chart-card")?.scrollIntoView({ behavior: "smooth", block: "start" });

  /* Cabecera provisional con lo que ya se sabe de la lista, para
     que el hueco no muestre la moneda anterior mientras carga. */
  const known = getCoinBySymbol(activeCoinSymbol);
  if (known) {
    setText("chartTitle", `${activeCoinSymbol} / ${known.name}`);
    setText("chartCoinPrice", formatCurrency(known.current_price));
    const icon = byId("chartCoinIcon");
    if (icon) icon.src = known.image || "";
  }

  /* En paralelo: el grafico y la lista de exchanges no dependen
     el uno del otro. */
  await Promise.all([loadCoinDetails(), loadCoinExchanges()]);

  renderStudio();
}

/* ===========================================================
   ESQUELETOS DE CARGA

   Antes la pagina mostraba la palabra "Reading" en una docena de
   sitios. Eso informa menos que un hueco con forma: el usuario no
   distingue "esta cargando" de "fallo y se quedo ahi".

   Un esqueleto comunica tres cosas a la vez: que viene contenido,
   que forma tendra y cuanto ocupara. Ademas evita el salto de
   maquetacion cuando los datos llegan, que es lo que hace que una
   pagina se sienta inestable.
   =========================================================== */

function setLoadingState(active) {
  document.body?.classList.toggle("wm-loading", Boolean(active));
}

function skeletonCard() {
  return `
    <div class="sk-card" aria-hidden="true">
      <div class="sk-card-top">
        <span class="sk sk-dot"></span>
        <span class="sk sk-line w-40"></span>
      </div>
      <span class="sk sk-line w-70"></span>
      <div class="sk-card-foot">
        <span class="sk sk-line w-30"></span>
        <span class="sk sk-line w-20"></span>
      </div>
    </div>`;
}

function skeletonRow() {
  return `
    <div class="sk-row" aria-hidden="true">
      <span class="sk sk-dot sm"></span>
      <div class="sk-row-copy">
        <span class="sk sk-line w-90"></span>
        <span class="sk sk-line w-40"></span>
      </div>
    </div>`;
}

function skeletonChip() {
  return `<span class="sk sk-chip" aria-hidden="true"></span>`;
}

/* Se rellena solo si el contenedor esta vacio: si ya hay datos de
   un refresco anterior, mostrar esqueletos encima seria un
   parpadeo gratuito. */
function fillSkeletons(id, count, builder) {
  const el = byId(id);
  if (!el || el.children.length > 0) return;
  el.innerHTML = Array.from({ length: count }, builder).join("");
  el.dataset.skeleton = "1";
}

function clearSkeletons(id) {
  const el = byId(id);
  if (el?.dataset.skeleton) delete el.dataset.skeleton;
}

function mountSkeletons() {
  setLoadingState(true);

  fillSkeletons("coinsGrid",         9, skeletonCard);
  fillSkeletons("trendingGrid",      6, skeletonCard);
  fillSkeletons("memesGrid",         6, skeletonCard);
  fillSkeletons("radarNewsList",     5, skeletonRow);
  fillSkeletons("coinExchangeList",  4, skeletonRow);
  fillSkeletons("topExchangeList",   4, skeletonRow);
  fillSkeletons("moodTrendingStrip", 7, skeletonChip);

  /* El ticker es una fila horizontal: sus esqueletos son
     tarjetas estrechas, no filas. */
  const ticker = byId("tickerBar");
  if (ticker && !ticker.querySelector(".ticker-item")) {
    ticker.innerHTML = Array.from({ length: 8 }, () =>
      `<div class="sk-ticker" aria-hidden="true">
         <span class="sk sk-dot sm"></span>
         <span class="sk sk-line w-60"></span>
       </div>`
    ).join("");
  }
}

function renderGrid(targetId, data, emptyLabel = "Unavailable") {
  const grid = byId(targetId);
  if (!grid) return;

  // Un solo listener delegado por grid, atado una vez.
  if (!grid.dataset.delegated) {
    grid.dataset.delegated = "1";
    grid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-symbol]");
      if (card && grid.contains(card)) selectCoin(card.dataset.symbol);
    });
  }

  const coins = prepareMarketCoins(data);
  const frag = document.createDocumentFragment();

  if (!coins.length) {
    frag.appendChild(createFallbackCard(emptyLabel));
  } else {
    coins.forEach((coin) => {
      frag.appendChild(createCoinCard(coin, activeCoinSymbol === coin.symbol?.toUpperCase?.()));
    });
  }

  grid.replaceChildren(frag);
}

function renderCoinSections() {
  /* Primer dato real: se apaga el estado de carga global. Los
     refrescos posteriores son silenciosos: volver a mostrar
     esqueletos cada 60 segundos seria un parpadeo. */
  if (topCoinsData.length) {
    setLoadingState(false);
    ["coinsGrid", "trendingGrid", "memesGrid"].forEach(clearSkeletons);
  }

  renderGrid("coinsGrid",    topCoinsData,      "Top coins unavailable");
  renderGrid("trendingGrid", trendingCoinsData, "Trending unavailable");
  renderGrid("memesGrid",    topMemesData,      "Memes unavailable");

  if (activeHeroView === "bubble" && !isHoveringBubble) scheduleBubbleRender();
}

async function loadTopCoins() {
  if (isLoadingTopCoins) return;
  isLoadingTopCoins = true;
  try {
    const res = await fetchJson("/api/top-coins", []);
    const coins = (Array.isArray(res) ? res : []).map(normalizeCoinMarketItem).filter(Boolean);

    if (coins.length) {
      topCoinsData = coins.slice(0, MARKET_MAX_ITEMS);
      renderTicker(topCoinsData);

      if (!getCoinBySymbol(activeCoinSymbol)) {
        const saved = loadSavedActiveCoin();
        if (getCoinBySymbol(saved)) {
          activeCoinSymbol = saved;
        } else if (topCoinsData[0]?.symbol) {
          activeCoinSymbol = topCoinsData[0].symbol.toUpperCase();
          saveActiveCoin(activeCoinSymbol);
        }
      }
      renderCoinSections();
    } else if (!topCoinsData.length) {
      renderTicker([]);
      renderCoinSections();
    }
  } finally {
    isLoadingTopCoins = false;
  }
}

async function loadTrendingCoins() {
  if (isLoadingTrending) return;
  isLoadingTrending = true;
  try {
    const res = await fetchJson("/api/trending", []);
    trendingCoinsData = (Array.isArray(res) ? res : [])
      .map(normalizeCoinMarketItem).filter(Boolean).slice(0, MARKET_MAX_ITEMS);
    renderCoinSections();
  } finally {
    isLoadingTrending = false;
  }
}

async function loadTopMemes() {
  if (isLoadingMemes) return;
  isLoadingMemes = true;
  try {
    const res = await fetchJson("/api/top-memes", []);
    topMemesData = (Array.isArray(res) ? res : [])
      .map(normalizeCoinMarketItem).filter(Boolean).slice(0, MARKET_MAX_ITEMS);
    renderCoinSections();
  } finally {
    isLoadingMemes = false;
  }
}

// ===============================
// CHART
// ===============================
/* ===========================================================
   MOTOR DE GRÁFICOS  —  reemplaza drawLineChart/drawCandleChart

   POR QUÉ EL ANTERIOR SE VEÍA BÁSICO:

   1. preserveAspectRatio="none" en el SVG. Estiraba el lienzo de
      900x280 hasta el ancho real del contenedor sin respetar
      proporciones. Las velas no estaban dibujadas gordas: se
      deformaban. Esa era la causa principal del aspecto de
      juguete.

   2. Sin ejes. Ni fechas ni niveles de precio. El usuario veía
      una forma, no un dato: no podía saber CUÁNDO pasó nada ni
      a QUÉ precio.

   3. Sin crosshair ni tooltip. Es lo que separa un gráfico
      decorativo de una herramienta.

   4. El relleno verde cubría también los tramos de caída.
      Señalización incorrecta.

   5. Sin volumen. Precio sin volumen es media historia.

   AHORA: viewBox que sigue el tamaño real del contenedor,
   márgenes para ejes, crosshair con tooltip OHLC, barras de
   volumen, arrastre para desplazar y rueda para hacer zoom.
   =========================================================== */

const CHART = {
  candles: [],
  prices: [],
  /* Ventana visible como fracción del total [0..1]. Así el zoom
     sobrevive a los refrescos de datos: si llegan velas nuevas,
     la vista no salta. */
  view: { start: 0, end: 1 },
  hoverIndex: null,
  dragging: false,
  dragStartX: 0,
  dragStartView: null,
  width: 900,
  height: 340,
  mode: "line"
};

/* Márgenes. El eje de precio va a la DERECHA, como en todas las
   plataformas de trading: la vista se ancla al último precio,
   que es el dato que se consulta. */
const CM = { top: 14, right: 62, bottom: 26, left: 8 };
const VOLUME_RATIO = 0.18;   // fracción de altura para el volumen

function chartPlotWidth()  { return CHART.width - CM.left - CM.right; }
function chartPlotHeight() { return (CHART.height - CM.top - CM.bottom) * (1 - VOLUME_RATIO); }
function chartVolumeTop()  { return CM.top + chartPlotHeight() + 8; }
function chartVolumeHeight() { return (CHART.height - CM.top - CM.bottom) * VOLUME_RATIO - 8; }

/* --------------------------------------------------------
   DATOS VISIBLES
-------------------------------------------------------- */
function getChartPoints() {
  return CHART.mode === "candle" ? CHART.candles : CHART.prices;
}

function getVisibleSlice() {
  const all = getChartPoints();
  if (!all.length) return { items: [], from: 0 };

  const from = Math.floor(CHART.view.start * all.length);
  const to = Math.ceil(CHART.view.end * all.length);

  /* Mínimo de puntos visibles: sin esto, un zoom agresivo deja
     el gráfico en un solo punto y no hay forma de volver. */
  const items = all.slice(from, Math.max(to, from + 4));
  return { items, from };
}

/* --------------------------------------------------------
   ESCALAS
-------------------------------------------------------- */
function buildScales(items) {
  const isCandle = CHART.mode === "candle";

  const highs = isCandle ? items.map((c) => c.high) : items.map((p) => p.value);
  const lows  = isCandle ? items.map((c) => c.low)  : items.map((p) => p.value);

  let min = Math.min(...lows);
  let max = Math.max(...highs);

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  /* Margen del 6% arriba y abajo: una serie pegada al borde
     superior se lee como si estuviera cortada. */
  const span = (max - min) || Math.abs(max) * 0.01 || 1;
  min -= span * 0.06;
  max += span * 0.06;

  const w = chartPlotWidth();
  const h = chartPlotHeight();
  const step = w / Math.max(items.length, 1);

  return {
    min, max,
    step,
    x: (i) => CM.left + i * step + step / 2,
    y: (v) => CM.top + (1 - (v - min) / (max - min)) * h
  };
}

/* --------------------------------------------------------
   FORMATEO DE EJES
-------------------------------------------------------- */
function formatAxisPrice(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "";
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}K`;
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toPrecision(3);
}

/* El formato de fecha depende del rango: en 1h las horas
   importan y el día no; en 30d al revés. Mostrar siempre lo
   mismo obliga al usuario a traducir mentalmente. */
function formatAxisTime(ts, timeframe) {
  const d = new Date(Number(ts) || Date.now());
  if (!Number.isFinite(d.getTime())) return "";

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = d.getDate();
  const mon = d.toLocaleString("en-US", { month: "short" });

  if (timeframe === "1h" || timeframe === "4h") return `${hh}:${mm}`;
  if (timeframe === "24h") return `${hh}:${mm}`;
  return `${dd} ${mon}`;
}

function formatTooltipTime(ts) {
  const d = new Date(Number(ts) || Date.now());
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
}

/* --------------------------------------------------------
   RENDER
-------------------------------------------------------- */
function renderChart() {
  const svg = byId("coinChartSvg");
  if (!svg) return;

  const { items } = getVisibleSlice();

  const grid    = byId("chartGrid");
  const axisY   = byId("chartAxisY");
  const axisX   = byId("chartAxisX");
  const body    = byId("chartBody");
  const volume  = byId("chartVolume");
  const crossEl = byId("chartCrosshair");

  if (!items.length || items.length < 2) {
    [grid, axisY, axisX, body, volume, crossEl].forEach((g) => { if (g) g.innerHTML = ""; });
    return;
  }

  const s = buildScales(items);
  if (!s) return;

  const w = CHART.width;
  const plotRight = CM.left + chartPlotWidth();

  // ---------- Retícula + eje de precio ----------
  const LEVELS = 5;
  let gridHtml = "";
  let axisYHtml = "";

  for (let i = 0; i <= LEVELS; i++) {
    const value = s.min + (s.max - s.min) * (i / LEVELS);
    const y = s.y(value);
    gridHtml += `<line x1="${CM.left}" y1="${y.toFixed(1)}" x2="${plotRight}" y2="${y.toFixed(1)}"></line>`;
    axisYHtml += `<text x="${plotRight + 8}" y="${(y + 3.5).toFixed(1)}">${formatAxisPrice(value)}</text>`;
  }
  if (grid) grid.innerHTML = gridHtml;
  if (axisY) axisY.innerHTML = axisYHtml;

  // ---------- Eje de tiempo ----------
  /* Número de etiquetas según el ancho real, no fijo. En móvil
     seis fechas se solapan hasta ser ilegibles. */
  const labelCount = clamp(Math.floor(chartPlotWidth() / 110), 2, 6);
  let axisXHtml = "";

  for (let i = 0; i <= labelCount; i++) {
    const idx = Math.min(items.length - 1, Math.round((i / labelCount) * (items.length - 1)));
    const item = items[idx];
    const x = s.x(idx);
    axisXHtml += `<text x="${x.toFixed(1)}" y="${(CHART.height - 8).toFixed(1)}" text-anchor="middle">${
      formatAxisTime(item.ts, chartTimeframe)
    }</text>`;
  }
  if (axisX) axisX.innerHTML = axisXHtml;

  // ---------- Cuerpo ----------
  if (CHART.mode === "candle") {
    renderCandles(body, items, s);
  } else {
    renderLine(body, items, s);
  }

  // ---------- Volumen ----------
  renderVolume(volume, items, s);

  // ---------- Última cotización ----------
  renderLastPrice(items, s, plotRight);

  renderCrosshair(items, s);
}

function renderLine(body, items, s) {
  if (!body) return;

  const path = items
    .map((p, i) => `${i === 0 ? "M" : "L"} ${s.x(i).toFixed(2)} ${s.y(p.value).toFixed(2)}`)
    .join(" ");

  const first = items[0].value;
  const last = items[items.length - 1].value;
  const up = last >= first;
  const color = up ? "var(--pos-hard)" : "var(--neg-hard)";

  const baseY = CM.top + chartPlotHeight();

  /* El relleno usa un degradado que se desvanece hacia abajo.
     Antes era un color plano que además seguía siendo verde
     durante las caídas — señalización incorrecta. */
  body.innerHTML = `
    <defs>
      <linearGradient id="chartFillGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${up ? "rgba(59,217,122,0.22)" : "rgba(228,72,92,0.22)"}"/>
        <stop offset="100%" stop-color="${up ? "rgba(59,217,122,0)" : "rgba(228,72,92,0)"}"/>
      </linearGradient>
    </defs>
    <path class="chart-area" d="${path} L ${s.x(items.length - 1).toFixed(2)} ${baseY} L ${s.x(0).toFixed(2)} ${baseY} Z"
          fill="url(#chartFillGrad)"></path>
    <path class="chart-line" d="${path}" stroke="${color}"></path>`;
}

function renderCandles(body, items, s) {
  if (!body) return;

  /* Ancho de vela con separación proporcional. El 0.7 es la
     proporción estándar en plataformas de trading: suficiente
     cuerpo para leer, suficiente aire para contar. */
  const bodyW = Math.max(1.5, Math.min(s.step * 0.7, 26));
  const wickW = Math.max(1, Math.min(bodyW * 0.16, 2));

  body.innerHTML = items.map((c, i) => {
    const x = s.x(i);
    const up = c.close >= c.open;
    const color = up ? "var(--pos-hard)" : "var(--neg-hard)";

    const yHigh = s.y(c.high);
    const yLow = s.y(c.low);
    const yOpen = s.y(c.open);
    const yClose = s.y(c.close);

    const top = Math.min(yOpen, yClose);
    /* Altura mínima 1px: una vela doji (apertura = cierre) sin
       esto desaparecería por completo. */
    const h = Math.max(Math.abs(yClose - yOpen), 1);

    return `
      <rect class="candle-wick" x="${(x - wickW / 2).toFixed(2)}" y="${yHigh.toFixed(2)}"
            width="${wickW.toFixed(2)}" height="${Math.max(yLow - yHigh, 0.5).toFixed(2)}"
            fill="${color}"></rect>
      <rect class="candle-body" x="${(x - bodyW / 2).toFixed(2)}" y="${top.toFixed(2)}"
            width="${bodyW.toFixed(2)}" height="${h.toFixed(2)}"
            fill="${color}"></rect>`;
  }).join("");
}

function renderVolume(group, items, s) {
  if (!group) return;

  const vols = items.map((it) => Number(it.volume || 0));
  const maxVol = Math.max(...vols);

  if (!Number.isFinite(maxVol) || maxVol <= 0) {
    group.innerHTML = "";
    return;
  }

  const vTop = chartVolumeTop();
  const vH = chartVolumeHeight();
  const barW = Math.max(1, Math.min(s.step * 0.7, 26));

  group.innerHTML = items.map((it, i) => {
    const v = Number(it.volume || 0);
    if (v <= 0) return "";

    const h = Math.max((v / maxVol) * vH, 0.6);
    const x = s.x(i) - barW / 2;

    /* El volumen se colorea según la dirección de SU vela, no
       del conjunto. Así se ve si el volumen acompañó a la
       subida o a la bajada — que es toda la utilidad de mostrarlo. */
    const isCandle = CHART.mode === "candle";
    const up = isCandle
      ? it.close >= it.open
      : (i > 0 ? it.value >= items[i - 1].value : true);

    return `<rect x="${x.toFixed(2)}" y="${(vTop + vH - h).toFixed(2)}"
                  width="${barW.toFixed(2)}" height="${h.toFixed(2)}"
                  class="${up ? "vol-up" : "vol-down"}"></rect>`;
  }).join("");
}

function renderLastPrice(items, s, plotRight) {
  const group = byId("chartLastPrice");
  if (!group) return;

  const last = items[items.length - 1];
  const value = CHART.mode === "candle" ? last.close : last.value;
  const y = s.y(value);

  const prev = items.length > 1 ? items[items.length - 2] : last;
  const prevValue = CHART.mode === "candle" ? prev.close : prev.value;
  const up = value >= prevValue;

  /* La etiqueta de última cotización pegada al eje derecho es
     el elemento que más rápido identifica un gráfico como
     "de trading". Cuesta seis líneas. */
  group.innerHTML = `
    <line x1="${CM.left}" y1="${y.toFixed(1)}" x2="${plotRight}" y2="${y.toFixed(1)}"
          class="last-price-line ${up ? "up" : "down"}"></line>
    <rect x="${(plotRight + 2).toFixed(1)}" y="${(y - 9).toFixed(1)}"
          width="${(CM.right - 6).toFixed(1)}" height="18" rx="3"
          class="last-price-tag ${up ? "up" : "down"}"></rect>
    <text x="${(plotRight + CM.right / 2 - 1).toFixed(1)}" y="${(y + 4).toFixed(1)}"
          text-anchor="middle" class="last-price-text">${formatAxisPrice(value)}</text>`;
}

function renderCrosshair(items, s) {
  const group = byId("chartCrosshair");
  const tip = byId("chartTooltip");
  if (!group) return;

  if (CHART.hoverIndex == null || !items[CHART.hoverIndex]) {
    group.innerHTML = "";
    if (tip) tip.classList.add("hidden");
    return;
  }

  const i = CHART.hoverIndex;
  const item = items[i];
  const x = s.x(i);
  const value = CHART.mode === "candle" ? item.close : item.value;
  const y = s.y(value);

  group.innerHTML = `
    <line x1="${x.toFixed(1)}" y1="${CM.top}" x2="${x.toFixed(1)}"
          y2="${(CM.top + chartPlotHeight()).toFixed(1)}" class="crosshair-v"></line>
    <line x1="${CM.left}" y1="${y.toFixed(1)}" x2="${(CM.left + chartPlotWidth()).toFixed(1)}"
          y2="${y.toFixed(1)}" class="crosshair-h"></line>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" class="crosshair-dot"></circle>`;

  if (!tip) return;

  const rows = CHART.mode === "candle"
    ? [
        ["O", formatCurrency(item.open)],
        ["H", formatCurrency(item.high)],
        ["L", formatCurrency(item.low)],
        ["C", formatCurrency(item.close)]
      ]
    : [["Price", formatCurrency(item.value)]];

  if (item.volume > 0) rows.push(["Vol", formatCurrencyCompact(item.volume)]);

  /* Cambio respecto a la vela anterior: sin esto el usuario
     tiene que restar mentalmente. */
  const prev = items[i - 1];
  if (prev) {
    const prevVal = CHART.mode === "candle" ? prev.close : prev.value;
    const chg = prevVal > 0 ? ((value - prevVal) / prevVal) * 100 : 0;
    rows.push(["Δ", formatPercent(chg)]);
  }

  tip.innerHTML = `
    <div class="chart-tooltip-time">${escapeHtml(formatTooltipTime(item.ts))}</div>
    ${rows.map(([k, v]) => `
      <div class="chart-tooltip-row"><span>${k}</span><strong>${escapeHtml(v)}</strong></div>
    `).join("")}`;

  /* El tooltip salta al otro lado cuando se acerca al borde
     derecho, para no salirse del contenedor. */
  const ratio = x / CHART.width;
  tip.classList.remove("hidden");
  tip.style.left = ratio > 0.62 ? "auto" : `${(ratio * 100).toFixed(1)}%`;
  tip.style.right = ratio > 0.62 ? `${((1 - ratio) * 100).toFixed(1)}%` : "auto";
}

/* --------------------------------------------------------
   INTERACCIÓN
-------------------------------------------------------- */
function chartPointerToIndex(clientX) {
  const svg = byId("coinChartSvg");
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  const relX = ((clientX - rect.left) / rect.width) * CHART.width;

  const { items } = getVisibleSlice();
  if (!items.length) return null;

  const s = buildScales(items);
  if (!s) return null;

  const idx = Math.round((relX - CM.left - s.step / 2) / s.step);
  return clamp(idx, 0, items.length - 1);
}

function setupChartInteraction() {
  const svg = byId("coinChartSvg");
  const wrap = byId("chartPlot");
  if (!svg || svg.dataset.boundChart) return;
  svg.dataset.boundChart = "1";

  // --- Crosshair ---
  svg.addEventListener("pointermove", (e) => {
    if (CHART.dragging) {
      /* Arrastre: desplaza la ventana visible. Se mueve en
         fracción del ancho para que el gesto se sienta igual
         de directo a cualquier nivel de zoom. */
      const rect = svg.getBoundingClientRect();
      const deltaFrac = ((e.clientX - CHART.dragStartX) / rect.width);
      const span = CHART.dragStartView.end - CHART.dragStartView.start;
      let start = CHART.dragStartView.start - deltaFrac * span;
      start = clamp(start, 0, 1 - span);
      CHART.view = { start, end: start + span };
      renderChart();
      return;
    }

    CHART.hoverIndex = chartPointerToIndex(e.clientX);
    const { items } = getVisibleSlice();
    const s = buildScales(items);
    if (s) renderCrosshair(items, s);
  }, { passive: true });

  svg.addEventListener("pointerleave", () => {
    CHART.hoverIndex = null;
    const { items } = getVisibleSlice();
    const s = buildScales(items);
    if (s) renderCrosshair(items, s);
  });

  // --- Arrastre ---
  svg.addEventListener("pointerdown", (e) => {
    CHART.dragging = true;
    CHART.dragStartX = e.clientX;
    CHART.dragStartView = { ...CHART.view };
    svg.setPointerCapture?.(e.pointerId);
    wrap?.classList.add("chart-dragging");
  });

  const endDrag = (e) => {
    if (!CHART.dragging) return;
    CHART.dragging = false;
    try { svg.releasePointerCapture?.(e.pointerId); } catch {}
    wrap?.classList.remove("chart-dragging");
  };

  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);

  // --- Zoom con rueda ---
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();

    const rect = svg.getBoundingClientRect();
    /* El zoom se ancla en el cursor, no en el centro. Si no,
       el punto que estás mirando se te escapa al ampliar. */
    const anchor = clamp((e.clientX - rect.left) / rect.width, 0, 1);

    const span = CHART.view.end - CHART.view.start;
    const factor = e.deltaY > 0 ? 1.18 : 0.85;

    /* Mínimo 4% del total visible: por debajo quedan tres velas
       y el gráfico deja de informar. */
    const newSpan = clamp(span * factor, 0.04, 1);

    const focus = CHART.view.start + anchor * span;
    let start = clamp(focus - anchor * newSpan, 0, 1 - newSpan);

    CHART.view = { start, end: start + newSpan };
    renderChart();
  }, { passive: false });

  // --- Doble clic: volver a la vista completa ---
  svg.addEventListener("dblclick", () => {
    CHART.view = { start: 0, end: 1 };
    renderChart();
  });

  // --- Resize ---
  const applySize = () => {
    const rect = svg.getBoundingClientRect();
    if (rect.width < 10) return;
    /* viewBox igual al tamaño real en píxeles: es lo que evita
       la deformación que achataba las velas. */
    CHART.width = Math.round(rect.width);
    CHART.height = Math.round(rect.height);
    svg.setAttribute("viewBox", `0 0 ${CHART.width} ${CHART.height}`);
    renderChart();
  };

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(applySize).observe(svg);
  } else {
    window.addEventListener("resize", applySize, { passive: true });
  }

  applySize();
}

/* --------------------------------------------------------
   ENTRADA DE DATOS
-------------------------------------------------------- */
function drawChart(payload) {
  const rawPrices = Array.isArray(payload?.prices) ? payload.prices : [];
  const rawCandles = Array.isArray(payload?.candles) ? payload.candles : [];
  const hasCandles = Boolean(payload?.hasCandles) && rawCandles.length >= 2;

  /* Las series llegan como pares [ts, valor] o como objetos.
     Se normalizan aquí para que el resto del motor no tenga que
     saber de qué forma vinieron. */
  CHART.prices = rawPrices.map((p, i) => {
    if (Array.isArray(p)) return { ts: Number(p[0]), value: Number(p[1]), volume: 0 };
    return {
      ts: Number(p?.ts ?? p?.[0] ?? Date.now()),
      value: Number(p?.value ?? p?.price ?? p),
      volume: Number(p?.volume || 0)
    };
  }).filter((p) => Number.isFinite(p.value));

  CHART.candles = rawCandles.map((c) => ({
    ts: Number(c.ts),
    open: Number(c.open), high: Number(c.high),
    low: Number(c.low), close: Number(c.close),
    volume: Number(c.volume || 0)
  })).filter((c) => Number.isFinite(c.close));

  const candleBtn = qs('.chart-mode-btn[data-mode="candle"]');
  if (candleBtn) {
    candleBtn.disabled = !hasCandles;
    candleBtn.title = hasCandles ? "" : "OHLC unavailable for this range";
  }

  if (chartMode === "candle" && !hasCandles) chartMode = "line";
  CHART.mode = chartMode;

  qsa(".chart-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === chartMode);
  });

  setupChartInteraction();
  renderChart();

  setText("chartRenderMode", chartMode === "candle" ? "Candle chart" : "Line chart");
  setText("chartTimeLabel", `${chartTimeframe} · drag to pan, scroll to zoom`);
}

/* Al cambiar de moneda o timeframe la vista vuelve al completo:
   conservar el zoom de otra serie desorienta. */
function resetChartView() {
  CHART.view = { start: 0, end: 1 };
  CHART.hoverIndex = null;
}

const _chartCache = new Map();
const CHART_CACHE_MS = 60000;

async function fetchCoinChart(coinId, timeframe) {
  const key = `${coinId}:${timeframe}`;
  const hit = _chartCache.get(key);
  if (hit && Date.now() - hit.ts < CHART_CACHE_MS) return hit.data;

  const res = await fetchJson(
    `/api/coin-chart?coin=${encodeURIComponent(coinId)}&timeframe=${encodeURIComponent(timeframe)}`,
    null
  );

  /* NO se cachea un fallo. Antes bastaba con que `res` no fuera
     null, asi que una respuesta vacia por limite de cuota se
     guardaba 60 segundos: volver a pulsar el boton no reintentaba
     nada y el grafico seguia en negro un minuto entero. Ahora solo
     entra en cache lo que trae algo que dibujar. */
  const util = res && res.ok !== false &&
    ((res.prices?.length || 0) >= 2 || (res.candles?.length || 0) >= 2);

  if (util) _chartCache.set(key, { ts: Date.now(), data: res });
  return res;
}

async function loadCoinDetails() {
  const token = nextRequest("coin");
  const requestedSymbol = activeCoinSymbol;
  const requestedTf = chartTimeframe;

  isLoadingCoinDetails = true;
  try {
    const coin = getCoinBySymbol(requestedSymbol);

    /* ANTES: `if (!coin || !coin.id) return;` — salida muda.

       getCoinBySymbol busca en topCoinsData, trendingCoinsData y
       topMemesData. Si pulsabas una moneda del ticker antes de
       que esas listas terminaran de cargar, o una que solo esta
       en trending, la funcion se iba sin dibujar y sin decir
       nada: el grafico se quedaba con la moneda anterior. Ese es
       el "a veces no la muestra".

       Ahora se avisa en el titulo y se limpia el lienzo, para que
       el usuario vea que paso algo. */
    if (!coin || !coin.id) {
      setText("chartTitle", `${requestedSymbol} · loading…`);
      return;
    }

    const value = getCoinChangeForTimeframe(coin, chartTimeframe);
    const technicalMood = getMoodByScore(
      normalizeChangeToScore(value, chartTimeframe === "30d" ? 5 : 10)
    );
    const socialMood = getMoodByScore(currentSocialScore);
    const style = getCurrentStyle();

    setText("chartTitle", `${activeCoinSymbol} / ${coin.name}`);
    setText("chartCoinPrice", formatCurrency(coin.current_price));
    setText("chartCoinVolume", formatCurrencyCompact(coin.total_volume));
    setText("chartCoinMarketCap", formatCurrencyCompact(coin.market_cap));
    setText("selectedTimeframe", chartTimeframe);

    const icon = byId("chartCoinIcon");
    if (icon) icon.src = coin.image || "";

    setTextWithPolarity("selectedPerformance", formatPercent(value), value);

    setText("coinMoodLabel", technicalMood.name);
    setText("detailSocialLabel", socialMood.name);

    const setChipIcon = (id, mood) => {
      const el = byId(id);
      if (!el) return;
      el.className = `chart-mood-chip-icon mood-icon-img ${mood.anim}`;
      setImage(el, getIconImagePath(style, mood.key), getIconImagePath(DEFAULT_STYLE, mood.key));
    };

    setChipIcon("coinMoodIconImg", technicalMood);
    setChipIcon("detailSocialIconImg", socialMood);

    Object.entries({ "1h":"perf1h", "4h":"perf4h", "24h":"perf24h", "7d":"perf7d", "30d":"perf30d" })
      .forEach(([tf, id]) => {
        const v = getCoinChangeForTimeframe(coin, tf);
        setTextWithPolarity(id, formatPercent(v), v);
      });

    qsa("#chartTimeframes button").forEach((btn) => {
      btn.classList.toggle("active",  btn.dataset.timeframe === chartTimeframe);
      btn.classList.toggle("hidden", !CHART_ALLOWED_TIMEFRAMES.includes(btn.dataset.timeframe));
    });

    qsa(".chart-mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === chartMode);
    });

    const chartRes = await fetchCoinChart(coin.id, requestedTf);

    /* Descarta si el usuario ya cambio de moneda o de ventana
       mientras esto viajaba. Sin esta comprobacion, pulsar dos
       monedas rapido dejaba el grafico de la primera bajo el
       titulo de la segunda. */
    if (isStaleRequest("coin", token)) return;
    if (requestedSymbol !== activeCoinSymbol || requestedTf !== chartTimeframe) return;

    /* BUG QUE ARREGLA — las horas del eje X se repetian.

       Este .map se quedaba SOLO con el precio (e[1]) y tiraba la
       marca de tiempo (e[0]). drawChart sabe leer pares
       [ts, precio], pero al recibir numeros sueltos caia en su
       rama de respaldo `Number(p?.ts ?? p?.[0] ?? Date.now())`:
       sin ts, TODOS los puntos quedaban fechados AHORA.

       Por eso el eje mostraba la misma hora tres veces ("07:15,
       07:15") en 24H y "18 Aug, 18 Aug" en 7D: no eran fechas del
       dato, era la hora de abrir la pagina repetida.

       Ahora se conserva el par entero. drawChart normaliza. */
    const prices = (Array.isArray(chartRes?.prices) ? chartRes.prices : [])
      .filter((e) => Array.isArray(e)
        ? Number.isFinite(Number(e[1]))
        : Number.isFinite(Number(e)));

    /* Un lienzo vacio hace pensar que la pagina esta rota. Un
       aviso dice que paso y en que ventana. El titulo es el unico
       sitio donde el usuario ya esta mirando cuando pulsa el
       boton. */
    const vacio = prices.length < 2 && (chartRes?.candles?.length || 0) < 2;

    if (vacio) {
      setText("chartTitle",
        `${activeCoinSymbol} · no data for ${String(requestedTf).toUpperCase()}`);
      console.warn("WM: /api/coin-chart sin datos",
        { coin: coin.id, timeframe: requestedTf, error: chartRes?.error });
    }

    drawChart({
      prices,
      candles: chartRes?.candles || [],
      hasCandles: chartRes?.hasCandles
    });

    renderStudio();
  } finally {
    isLoadingCoinDetails = false;
  }
}

// ===============================
// PULSE UI
// ===============================
function renderPulseStats() {
  const container = byId("pulseStats");
  if (!container) return;

  const style = getCurrentStyle();
  const totalVotes = getPulseTotalVotes();
  const denom = totalVotes || 1;

  /* Los estilos de las lineas nuevas van inline a proposito: globals.css
     ya arrastra selectores duplicados y anadir mas reglas para tres
     elementos no compensa el riesgo. */
  const meta = pulseUnavailable
    ? `<div style="font-size:11px;opacity:.55;margin-bottom:8px;">Live votes unavailable right now</div>`
    : `<div style="font-size:11px;opacity:.55;margin-bottom:8px;">Rolling ${PULSE_WINDOW_HOURS}h window${
        pulseMyVote ? ` &middot; your vote: ${escapeHtml(getMoodByScore(PULSE_WEIGHTS[pulseMyVote]).name)}` : ""
      }</div>`;

  const rows = Object.keys(PULSE_WEIGHTS).map((key) => {
    const votes = pulseVotes[key] || 0;
    const pct = totalVotes ? Math.round((votes / denom) * 100) : 0;
    const color = getMoodColor(key);
    const mine = pulseMyVote === key;
    return `
      <div class="pulse-row"${mine ? ' style="opacity:1;"' : ""}>
        <img src="${escapeHtml(getIconImagePath(style, key))}" width="18" height="18" alt="" loading="lazy">
        <div class="pulse-bar">
          <div class="pulse-bar-fill" style="width:${pct}%; background:${color};"></div>
        </div>
        <span>${pct}% (${votes})${mine ? " &bull;" : ""}</span>
      </div>`;
  }).join("");

  /* Estado vacio honesto. Un panel de barras a cero comunica mejor que
     unos porcentajes inventados: dice que el dato existe y esta vacio. */
  const empty = (!totalVotes && !pulseUnavailable)
    ? `<div style="font-size:11px;opacity:.6;margin-top:8px;">No votes yet in this window &mdash; yours starts it.</div>`
    : "";

  /* El delta es la metrica que hace util este panel: no importa tanto
     como se siente la gente, sino cuanto se despega del dato. */
  const delta = getPulseVsMarketDelta();
  const deltaHtml = (delta === null || !pulseLoaded) ? "" : `
    <div style="font-size:11px;opacity:.7;margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08);">
      Community vs market:
      <strong style="color:${delta === 0 ? "inherit" : getMoodColor(getMoodByScore(delta > 0 ? 75 : 25).key)};">
        ${delta > 0 ? "+" : ""}${delta}
      </strong>
      ${delta === 0 ? "in line" : (delta > 0 ? "more optimistic" : "more bearish")}
      ${totalVotes < PULSE_MIN_VOTES_FOR_INDEX ? ` &middot; low sample (${totalVotes}/${PULSE_MIN_VOTES_FOR_INDEX})` : ""}
    </div>`;

  container.innerHTML = meta + rows + empty + deltaHtml;

  currentPulseScore = getPulseScore();
  const pulseMood = getMoodByScore(currentPulseScore);

  const moodEl = byId("pulseMood");
  if (moodEl) {
    moodEl.textContent = totalVotes ? pulseMood.name : "--";
    moodEl.className = totalVotes ? `mood-${pulseMood.key}` : "";
  }

  setText("pulseTotalVotes", String(totalVotes));
  setText("pulseScore", totalVotes ? String(currentPulseScore) : "--");
}

function showPulseMessage(text, isError = false) {
  const msg = byId("pulseMsg");
  if (!msg) return;
  msg.textContent = text;
  msg.classList.toggle("error", isError);
  msg.classList.add("show");
  clearTimeout(msg.__timer);
  msg.__timer = setTimeout(() => msg.classList.remove("show", "error"), isError ? 2600 : 1800);
}

function triggerPulseReaction(moodKey) {
  const score = PULSE_WEIGHTS[moodKey] || 50;
  const mood = getMoodByScore(score);

  isPulsePreviewActive = true;
  clearTimeout(pulsePreviewTimeout);

  updateHero(score, mood, { pulseMode: true });
  updateSocial(score);

  pulsePreviewTimeout = setTimeout(() => {
    isPulsePreviewActive = false;
    recomputeHeroSystem();
  }, PULSE_REACTION_MS);
}

async function handlePulseVote(moodKey) {
  if (!moodKey || !PULSE_WEIGHTS[moodKey]) return;
  if (pulseIsSubmitting) return;

  if (!canVotePulse()) {
    showPulseMessage(
      `You can change your vote in ${formatCooldownTime(getPulseRemainingCooldownMs())}`,
      true
    );
    return;
  }

  /* Optimista: la cara reacciona al instante porque esa reaccion es
     media razon para votar. Si el servidor rechaza, se revierte con
     los numeros reales que devuelve la respuesta. */
  const previousVotes = { ...pulseVotes };
  const previousMine = pulseMyVote;

  if (previousMine && pulseVotes[previousMine] > 0) pulseVotes[previousMine] -= 1;
  pulseVotes[moodKey] = (pulseVotes[moodKey] || 0) + 1;
  pulseMyVote = moodKey;
  currentPulseScore = getPulseScore();

  renderPulseStats();
  triggerPulseReaction(moodKey);

  pulseIsSubmitting = true;

  let data = null;
  try {
    const res = await fetch("/api/emotion-pulse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        emotion: moodKey,
        voter: getPulseVoterId(),
        /* Se guarda el score que el votante tenia delante. Sin esto no
           se puede reconstruir despues si la gente acerto o no. */
        marketScore: roundScore(currentMarketScore),
        marketMood: getMoodByScore(currentMarketScore).key
      })
    });
    data = await res.json();
  } catch {
    data = null;
  }

  pulseIsSubmitting = false;

  if (!data || data.ok !== true) {
    pulseVotes = previousVotes;
    pulseMyVote = previousMine;
    currentPulseScore = getPulseScore();
    renderPulseStats();

    const reason = data?.error === "cooldown"
      ? `You can change your vote in ${formatCooldownTime(Number(data.cooldownMs || 0))}`
      : data?.error === "rate_limited"
        ? "Too many votes from this network today"
        : "Vote could not be saved. Try again.";

    showPulseMessage(reason, true);
    if (Number(data?.cooldownMs) > 0) pulseServerCooldown = Date.now() + Number(data.cooldownMs);
    return;
  }

  setLastPulseVoteTime(Date.now());
  applyPulsePayload(data);
  renderPulseStats();

  showPulseMessage(
    data.updated
      ? `Vote updated: ${getMoodByScore(PULSE_WEIGHTS[moodKey]).name}`
      : `Vote registered: ${getMoodByScore(PULSE_WEIGHTS[moodKey]).name}`
  );
}

// ===============================
// EXCHANGES
// ===============================
function createExchangeItem(exchange, type = "pair") {
  const style = getCurrentStyle();
  const mood  = exchange.mood || getMoodByScore(exchange.score || 50);
  const score = Number(exchange.score || 50);
  const logo  = exchange.exchangeLogo || exchange.image || "/assets/logo/wojakmeter_logo.png";
  const url   = exchange.tradeUrl || exchange.url || "#";
  const name  = exchange.name || exchange.exchange || "Exchange";
  const volume = exchange.volume || exchange.volumeBtc24h || 0;

  const item = document.createElement("div");
  item.className = "exchange-item";
  item.dataset.mood = mood.key;

  item.innerHTML = `
    <div class="exchange-left">
      <img class="exchange-logo" src="${escapeHtml(logo)}" alt="" loading="lazy">
      <div class="exchange-copy">
        <div class="exchange-name">${escapeHtml(name)}</div>
        <div class="exchange-pair">${escapeHtml(exchange.pair || "Global Market")}</div>
        <div class="exchange-meta">
          <span class="exchange-volume">${type === "pair" ? "24H Volume" : "Liquidity"} · ${escapeHtml(formatCurrencyCompact(volume))}</span>
          ${exchange.trustScore ? `<span class="exchange-trust">Trust ${escapeHtml(String(exchange.trustScore))}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="exchange-right">
      <div class="exchange-mood">
        <img src="${escapeHtml(getIconImagePath(style, mood.key))}" alt="" loading="lazy">
        <div class="exchange-mood-label">
          <strong class="mood-${mood.key}">${escapeHtml(mood.name)}</strong>
          <span class="exchange-score">${score}/100</span>
        </div>
      </div>
      <a class="exchange-trade-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Trade</a>
    </div>`;

  return item;
}

function renderExchangeList(containerId, data, type, emptyText) {
  const container = byId(containerId);
  if (!container) return;

  if (!Array.isArray(data) || !data.length) {
    container.innerHTML = `<div class="exchange-loading">${escapeHtml(emptyText)}</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  data.forEach((ex) => frag.appendChild(createExchangeItem(ex, type)));
  container.replaceChildren(frag);
}

function renderTopExchanges() {
  renderExchangeList("topExchangeList", topExchangeData, "exchange",
    "Exchange flow is temporarily unavailable");
}

function renderCoinExchanges() {
  renderExchangeList("coinExchangeList", coinExchangeData, "pair",
    "Active pair data is temporarily unavailable");
}

async function loadTopExchanges() {
  const container = byId("topExchangeList");
  if (container && !topExchangeData.length) {
    container.innerHTML = `<div class="exchange-loading">Reading exchanges…</div>`;
  }

  const res = await fetchJson("/api/top-exchanges", null);
  if (Array.isArray(res) && res.length) {
    topExchangeData = res;
    renderTopExchanges();
  } else if (!topExchangeData.length) {
    renderTopExchanges();
  }
}

async function loadCoinExchanges() {
  const coin = getCoinBySymbol(activeCoinSymbol);
  if (!coin?.id) return;

  const container = byId("coinExchangeList");
  if (container) {
    container.innerHTML =
      `<div class="exchange-loading">Reading pairs for ${escapeHtml(activeCoinSymbol)}…</div>`;
  }

  const res = await fetchJson(`/api/coin-exchanges?coin=${encodeURIComponent(coin.id)}`, null);
  if (Array.isArray(res) && res.length) {
    coinExchangeData = res;
    renderCoinExchanges();
  } else if (!coinExchangeData.length) {
    renderCoinExchanges();
  }
}

// ===============================
// STUDIO
// ===============================
function getStudioContext() {
  const activeCoin = getCoinBySymbol(activeCoinSymbol);
  return {
    globalMood:     currentGlobalMood?.name || "Neutral",
    globalScore:    roundScore(currentGlobalScore),
    marketScore:    roundScore(currentMarketScore),
    socialScore:    roundScore(currentSocialScore),
    pulseScore:     roundScore(currentPulseScore),
    driverScore:    roundScore(currentDriverScore),
    globalTimeframe,
    globalChange:   currentGlobalChange ?? 0,
    globalVolume:   byId("globalMarketVolume")?.textContent || "--",
    macroLabel:     getDriverLabel(activeMacroDriver),
    macroNarrative: currentNarrative || getDriverNarrative(activeMacroDriver),
    activeCoin:     activeCoinSymbol || "BTC",
    activeCoinName: activeCoin?.name || activeCoinSymbol || "Bitcoin",
    coinTimeframe:  chartTimeframe,
    coinPerformance: byId("selectedPerformance")?.textContent || "--",
    technicalMood:  byId("coinMoodLabel")?.textContent || "Neutral",
    socialMood:     byId("detailSocialLabel")?.textContent || "Neutral"
  };
}

function buildMemePrompt(ctx) {
  return [
    "Create a high-quality crypto meme image based on the current market context.",
    "",
    `Selected visual style: ${getCurrentStyle()}`,
    `Global mood: ${ctx.globalMood}`,
    `Global timeframe: ${ctx.globalTimeframe}`,
    `Global market move: ${formatPercent(ctx.globalChange)}`,
    `Global volume: ${ctx.globalVolume}`,
    `Coin focus: ${ctx.activeCoin}`,
    `Coin timeframe: ${ctx.coinTimeframe}`,
    `Technical mood: ${ctx.technicalMood}`,
    `Social mood: ${ctx.socialMood}`,
    `Macro driver: ${ctx.macroLabel}`,
    `Macro narrative: ${ctx.macroNarrative}`,
    "",
    "Main scene:",
    `- A large Wojak hero reacting in ${ctx.globalMood} mode`,
    `- ${ctx.activeCoin} should be the main coin on screen`,
    "- A crypto trading dashboard in the background",
    `- Emotional expression must match ${ctx.globalMood}`,
    `- Visual hints of ${ctx.macroLabel}`,
    "- Composition should feel native to crypto Twitter / X",
    "- Image should be dramatic, clean and shareable",
    "",
    "Branding:",
    '- Add the website text: "wojakmeter.com"',
    `- Add the X account text: "${BRAND_X}"`,
    "- Put branding in the bottom-right corner"
  ].join("\n");
}

function buildMemeScene(ctx) {
  return `
<strong>Scene:</strong> A ${getCurrentStyle()} Wojak hero reacts to a ${ctx.globalMood.toLowerCase()} market while ${escapeHtml(ctx.activeCoin)} leads the visual focus. The dashboard shows ${escapeHtml(ctx.coinPerformance)} on the ${ctx.coinTimeframe} chart, and the atmosphere is shaped by ${ctx.macroLabel.toLowerCase()}.

<strong>Signal mix:</strong> Market ${ctx.marketScore}/100 &bull; Social ${ctx.socialScore}/100 &bull; Driver ${ctx.driverScore}/100 &bull; Pulse ${ctx.pulseScore}/100

<strong>Visual tone:</strong> Premium, dramatic and native to crypto X, with clear emotional readability.`.trim();
}

function buildDailyMeme(ctx) {
  return `
<strong>Today's market setup:</strong> The crypto market is sitting in <strong>${ctx.globalMood}</strong> on the <strong>${ctx.globalTimeframe}</strong> view, with overall performance at <strong>${formatPercent(ctx.globalChange)}</strong>.

<strong>Signal blend:</strong> Market <strong>${ctx.marketScore}</strong> &bull; Social <strong>${ctx.socialScore}</strong> &bull; Driver <strong>${ctx.driverScore}</strong> &bull; Pulse <strong>${ctx.pulseScore}</strong>

<strong>Daily meme angle:</strong> Focus on ${escapeHtml(ctx.activeCoin)} as the emotional anchor, use ${ctx.macroLabel.toLowerCase()} as the macro backdrop, and make the reaction instantly readable for traders scrolling X.`.trim();
}

function buildXPost(ctx) {
  const caption =
`MARKET MOOD: ${ctx.globalMood.toUpperCase()} (${ctx.globalScore}/100)

Market: ${ctx.marketScore}
Social: ${ctx.socialScore}
Driver: ${ctx.driverScore}
Pulse: ${ctx.pulseScore}

Macro: ${ctx.macroLabel}
Timeframe: ${ctx.globalTimeframe}
Move: ${formatPercent(ctx.globalChange)}
Volume: ${ctx.globalVolume}

${ctx.macroNarrative}

Live sentiment by WojakMeter`;

  return {
    caption,
    alt: `A ${getCurrentStyle()} Wojak-style crypto market meme showing ${ctx.globalMood} sentiment for ${ctx.activeCoin}, with a trading dashboard tied to ${ctx.macroLabel.toLowerCase()}.`,
    hashtags: `#Crypto #Bitcoin #${ctx.activeCoin} #WojakMeter`
  };
}

function buildStoryMode(ctx) {
  return `
<div class="story-block"><strong>Market context</strong><br>The market is trading with <strong>${ctx.globalMood}</strong> on the <strong>${ctx.globalTimeframe}</strong> timeframe, with overall performance at <strong>${formatPercent(ctx.globalChange)}</strong>.</div>

<div class="story-block"><strong>Signal blend</strong><br>The emotion index is built from <strong>market (${ctx.marketScore})</strong>, <strong>social (${ctx.socialScore})</strong>, <strong>driver (${ctx.driverScore})</strong> and <strong>community pulse (${ctx.pulseScore})</strong>.</div>

<div class="story-block"><strong>Technical confirmation</strong><br>${escapeHtml(ctx.activeCoin)} shows <strong>${escapeHtml(ctx.technicalMood)}</strong> conditions on the <strong>${ctx.coinTimeframe}</strong> structure, at <strong>${escapeHtml(ctx.coinPerformance)}</strong>.</div>`.trim();
}

function setStudioHtml(id, value) {
  const el = byId(id);
  if (el) el.innerHTML = value;
}

function renderStudio() {
  const ctx = getStudioContext();
  const xPost = buildXPost(ctx);

  setText("memePromptOutput", buildMemePrompt(ctx));
  setStudioHtml("memeSceneOutput", buildMemeScene(ctx));
  setStudioHtml("dailyMemeOutput", buildDailyMeme(ctx));
  setStudioHtml("xPostCaptionOutput", escapeHtml(xPost.caption));
  setStudioHtml("xPostAltOutput", escapeHtml(xPost.alt));
  setStudioHtml("xPostTagsOutput", escapeHtml(xPost.hashtags));
  setStudioHtml("storyModeOutput", buildStoryMode(ctx));
}

async function copyStudioTarget(targetId) {
  const el = byId(targetId);
  if (!el) return false;
  const text = el.innerText || el.textContent || "";
  if (!text.trim()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function shareMoodOnX() {
  const ctx = getStudioContext();
  const mood = String(ctx.globalMood || "Neutral");
  const score = roundScore(ctx.globalScore);

  const subtitle =
    byId("heroSubtitle")?.textContent ||
    ctx.macroNarrative ||
    "Market emotion is updating in real time.";

  const emojiMap = {
    Euphoria: "🚀", Content: "😌", Optimism: "🙂",
    Neutral: "😐", Doubt: "🤔", Concern: "😟", Frustration: "😤"
  };

  const text =
`${emojiMap[mood] || "🧠"} MARKET MOOD: ${mood.toUpperCase()} (${score}/100)

${subtitle}

Macro: ${ctx.macroLabel}
Timeframe: ${ctx.globalTimeframe}
Move: ${formatPercent(ctx.globalChange)}
Volume: ${ctx.globalVolume}

Emotion Shift: ${getShiftLevel().toUpperCase()}

Track the emotion`;

  const params = new URLSearchParams({
    mood, score: String(score),
    tf: ctx.globalTimeframe || "24h",
    change: String(Number(ctx.globalChange || 0)),
    volume: ctx.globalVolume || "--",
    driver: ctx.macroLabel,
    risk: currentRiskTone || "Balanced",
    coin: "MARKET",
    style: getCurrentStyle(),
    v: String(Date.now())
  });

  const url =
    "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) +
    "&url=" + encodeURIComponent(`https://wojakmeter.com/share?${params}`);

  window.open(url, "_blank", "noopener,noreferrer");
}

// ===============================
// MOOD TOKEN
// ===============================

/* Antes esta función construía un objeto con ~24 getElementById en CADA
   llamada, y se llama en cada update del token (varias veces por
   segundo con el stream activo). Cacheada. */
let _moodEls = null;

function getMoodTokenElements() {
  if (_moodEls) return _moodEls;
  _moodEls = {
    section:      byId("moodSection"),
    ca:           byId("moodContractAddress"),
    copyBtn:      byId("copyMoodCaBtn"),
    price:        byId("moodTokenPrice"),
    marketCap:    byId("moodTokenMarketCap"),
    volume:       byId("moodTokenVolume"),
    flow:         byId("moodTokenFlow"),
    change:       byId("moodChange"),
    heroImg:      byId("moodHeroImg"),
    heroScore:    byId("moodTokenScore"),
    heroMoodNodes:[byId("moodHeroMood"), byId("moodTokenMood")].filter(Boolean),
    volatility:   byId("moodTokenVolatility"),
    lastAction:   byId("moodTokenLastAction"),
    badge:        byId("moodTokenBadge"),
    name:         byId("moodTokenName"),
    symbol:       byId("moodTokenSymbol"),
    image:        byId("moodTokenImg"),
    input:        byId("tokenSearchInput"),
    searchBtn:    byId("tokenSearchBtn"),
    loadMoodBtn:  byId("loadMoodMain"),
    source:       byId("moodTokenSource"),
    feed:         byId("moodTradesFeed"),
    stage:        byId("moodStage"),
    glow:         byId("moodStageGlow"),
    backdrop:     byId("moodChartBackdrop"),
    backdropLine: byId("moodChartLine"),
    backdropArea: byId("moodChartArea")
  };
  return _moodEls;
}

function invalidateMoodEls() { _moodEls = null; }

function getMoodTradeBucket(usdValue = 0, marketCapUsd = 0) {
  const usd = Number(usdValue || 0);
  const mc  = Number(marketCapUsd || 0);
  const ratio = mc > 0 ? usd / mc : 0;
  if (usd >= 10000 || ratio >= 0.01)  return "strong";
  if (usd >= 2500  || ratio >= 0.003) return "medium";
  return "light";
}

function getMoodTradeIntensity(usdValue, marketCapUsd = 0) {
  const usd = Number(usdValue || 0);
  const mc  = Number(marketCapUsd || 0);
  const ratio = mc > 0 ? usd / mc : 0;
  if (usd >= 100000 || ratio >= 0.03)   return 1;
  if (usd >= 50000  || ratio >= 0.015)  return 0.85;
  if (usd >= 10000  || ratio >= 0.006)  return 0.65;
  if (usd >= 2500   || ratio >= 0.0025) return 0.45;
  if (usd >= 500    || ratio >= 0.001)  return 0.25;
  return 0.12;
}

function getImpulseMoodFromTrade(side, usdValue = 0, marketCapUsd = 0) {
  const bucket = getMoodTradeBucket(usdValue, marketCapUsd);
  if (side === "buy") {
    return getMoodByScore(bucket === "strong" ? 92 : bucket === "medium" ? 76 : 64);
  }
  return getMoodByScore(bucket === "strong" ? 12 : bucket === "medium" ? 26 : 40);
}

function getMoodCombinedSourceLabel() {
  const market = moodMarketSource || "Auto";
  const trades = moodTradesSource || "Waiting...";
  /* "DexScreener + No recent trades" leía como un error. Si no
     hay stream, basta con nombrar la fuente que sí funciona. */
  if (trades === "Waiting..." || trades === "No live trades" ||
      trades === "No recent trades" || trades === "Live feed unavailable") {
    return market;
  }
  if (market === trades) return market;
  return `${market} + ${trades}`;
}

/* ENLACES AL TOKEN ACTUAL

   El botón "DEXSCREENER" llevaba a la portada del sitio, que no
   sirve de nada. Ahora apunta al token concreto que se está
   mirando, y se añaden Pump.fun y Solscan. */
function updateMoodTokenLinks() {
  const address = moodResolvedAddress || MOOD_CA;
  if (!address) return;

  const links = {
    moodLinkDex:     `https://dexscreener.com/solana/${encodeURIComponent(moodPairAddress || address)}`,
    moodLinkPump:    `https://pump.fun/coin/${encodeURIComponent(address)}`,
    moodLinkSolscan: `https://solscan.io/token/${encodeURIComponent(address)}`
  };

  Object.entries(links).forEach(([id, href]) => {
    const el = byId(id);
    if (el) el.href = href;
  });

  /* Pump.fun solo tiene página si el token nació ahí. Para el
     resto el enlace daría 404, así que se oculta. */
  const pumpBtn = byId("moodLinkPump");
  if (pumpBtn) {
    const isPumpToken = String(moodDexId || "").toLowerCase().includes("pump") ||
                        String(address).toLowerCase().endsWith("pump");
    pumpBtn.classList.toggle("hidden", !isPumpToken);
  }

  // El CA que se muestra es el del token cargado, no uno fijo.
  const caEl = byId("moodContractAddress");
  if (caEl) caEl.textContent = address;

  const caLabel = byId("moodCaLabel");
  if (caLabel) {
    caLabel.textContent = isUsingMoodToken
      ? "MOOD contract address"
      : `${moodTokenMeta.symbol ? "$" + String(moodTokenMeta.symbol).toUpperCase() : "Token"} contract address`;
  }
}

function updateMoodTokenMeta(meta = {}) {
  moodTokenMeta = { ...moodTokenMeta, ...meta };
  const els = getMoodTokenElements();

  if (els.name) {
    els.name.textContent = moodTokenMeta.name || (isUsingMoodToken ? "MOOD" : "Trending Solana Token");
  }
  if (els.symbol) {
    els.symbol.textContent = moodTokenMeta.symbol
      ? `$${String(moodTokenMeta.symbol).toUpperCase()}`
      : (isUsingMoodToken ? "$MOOD" : "$---");
  }
  if (els.image)  els.image.src = moodTokenMeta.image || "/assets/logo/wojakmeter_logo.png";
  if (els.source) els.source.textContent = getMoodCombinedSourceLabel();

  updateMoodTokenLinks();

  /* Sin esta marca no hay forma de saber si ya estás viendo
     MOOD o si el botón sigue disponible. */
  const moodBtn = byId("loadMoodMain");
  if (moodBtn) {
    const isMood = String(moodResolvedAddress || "").toLowerCase() ===
                   String(MOOD_MAIN_CA).toLowerCase();
    moodBtn.classList.toggle("active", isMood);
  }
}

/* BUG DE FONDO QUE ARREGLA ESTA FUNCION:

   El grafico dibujaba las velas reales del proveedor (moodOhlcv,
   horas de historia) pero el personaje leia moodHistory[tf], que
   son los ticks que este navegador ha recogido DESDE QUE ABRISTE
   LA PESTANA. Dos series distintas para la misma pregunta.

   El sintoma era exactamente el que se ve en BULLWHALE: grafico
   rojo desplomandose toda la sesion y la cara en 74 CONTENT,
   porque en los ultimos minutos capturados el precio habia subido.
   No estaba roto: estaba mirando otra cosa.

   Ahora la prioridad es la misma que la del grafico: si hay velas
   reales de ESTE timeframe, esas mandan. */
function getMoodTimeframeSeries(tf) {
  const wantsOhlcv = tf === moodTokenTimeframe
    && moodOhlcvTimeframe === moodTokenTimeframe
    && Array.isArray(moodOhlcv)
    && moodOhlcv.length >= 2;

  if (wantsOhlcv) {
    const closes = moodOhlcv.map((c) => Number(c.close)).filter(Number.isFinite);
    if (closes.length >= 2) {
      /* El ultimo precio en vivo va por delante del cierre de la
         ultima vela, que puede tener hasta 45s de retraso. */
      if (moodPrice > 0) closes[closes.length - 1] = moodPrice;
      return closes;
    }
  }

  const bucket = moodHistory[tf];
  if (Array.isArray(bucket) && bucket.length >= 2) {
    return bucket.map((i) => Number(i.price)).filter(Number.isFinite);
  }
  const all = moodTrades.map((t) => Number(t.price)).filter(Number.isFinite);
  return all.length >= 2 ? all.slice(-40) : [];
}

function getMoodTimeframeChange(tf) {
  const prices = getMoodTimeframeSeries(tf);
  if (prices.length < 2) return 0;
  const first = prices[0];
  if (first <= 0) return 0;
  return ((prices[prices.length - 1] - first) / first) * 100;
}

/* Escala adaptativa del token: se calcula de su propia serie de
   precios. Si el token se mueve un 30% cada cinco minutos, un
   -30% no es pánico: es su comportamiento normal, y el score
   debe reflejarlo. */
function getMoodTokenScale() {
  const prices = getMoodTimeframeSeries(moodTokenTimeframe);
  const measured = realizedVolatility(prices);

  const fallback = getDefaultScale("token", moodTokenTimeframe);

  /* Si hay pocos puntos, la medición no es fiable: se mezcla con
     el valor por defecto en proporción a los datos disponibles.
     Así el score no da bandazos en los primeros segundos. */
  if (prices.length < 8 || measured <= 0) {
    const confidence = clamp(prices.length / 8, 0, 1);
    return fallback * (1 - confidence) + (measured || fallback) * confidence;
  }

  /* Suelo y techo. El rango es ancho a propósito: si el token
     realmente se mueve un 40% cada cinco minutos, el score debe
     saberlo. Un clamp estrecho anulaba la adaptación, que es
     justo el objetivo del cambio. */
  return clamp(measured, fallback * 0.2, fallback * 6);
}

/* ===========================================================
   MOTOR DE FLUJO DEL TOKEN

   QUE ESTABA MAL:
   computeMoodTradeScore se llamaba "TradeScore" pero no miraba
   un solo trade: era changeToScore(cambio de precio) y nada mas.
   Las compras y ventas solo disparaban applyMoodHeroImpulse, que
   cambiaba la cara 900ms y despues llamaba a updateMoodUI(), que
   la devolvia al score de precio. Es decir: cada operacion daba
   un parpadeo y se borraba. Ninguna compra dejaba huella.

   Y moodBuyVolume / moodSellVolume eran acumulados desde que
   cargaste la pagina, sin olvido: por eso FLOW se quedaba clavado
   en "Buy pressure" mientras el precio caia toda la tarde.

   QUE HACE AHORA:
   Una ventana rodante de operaciones con decaimiento exponencial.
   Una compra grande empuja la cara hacia arriba y la SOSTIENE
   mientras siga siendo reciente; si el flujo se apaga, el efecto
   se desvanece solo y la cara vuelve al precio. Eso es lo que
   hace que mirar la pantalla tenga sentido: el estado de animo
   tiene inercia, como el de una persona.
   =========================================================== */

/* 3 minutos de memoria, 45s de vida media. Con una vida media
   corta la cara es epileptica; con una larga se queda pasmada
   media hora despues del ultimo trade. */
const MOOD_FLOW_WINDOW_MS   = 180000;
const MOOD_FLOW_HALFLIFE_MS = 45000;

/* Cuanto peso maximo puede robarle el flujo al precio. El precio
   nunca deja de mandar del todo: si el token cae un 40%, tres
   compras pequenas no deben pintar una cara feliz. */
const MOOD_FLOW_MAX_WEIGHT = 0.55;

let moodFlowEvents = [];

function pruneMoodFlow(now = Date.now()) {
  if (!moodFlowEvents.length) return;
  let cut = 0;
  while (cut < moodFlowEvents.length && now - moodFlowEvents[cut].ts > MOOD_FLOW_WINDOW_MS) cut++;
  if (cut > 0) moodFlowEvents.splice(0, cut);
  if (moodFlowEvents.length > 120) moodFlowEvents.splice(0, moodFlowEvents.length - 120);
}

/* El peso de una operacion es su intensidad, la misma escala que
   ya usa la animacion. Asi una ballena y un polvo de 20 dolares
   no cuentan igual, ni en el movimiento ni en el score. */
function pushMoodFlowEvent(side, usdValue, marketCapUsd = 0, count = 1) {
  const weight = getMoodTradeIntensity(usdValue || 0, marketCapUsd || 0) * Math.max(1, Number(count) || 1);
  moodFlowEvents.push({
    ts: Date.now(),
    dir: side === "sell" ? -1 : 1,
    weight
  });
  pruneMoodFlow();
}

/* Presion de compra/venta en -1..+1, con las operaciones viejas
   pesando cada vez menos. */
function getMoodFlowPressure() {
  const now = Date.now();
  pruneMoodFlow(now);
  if (!moodFlowEvents.length) return 0;

  let net = 0;
  let mass = 0;

  moodFlowEvents.forEach((e) => {
    const age = now - e.ts;
    const decay = Math.pow(0.5, age / MOOD_FLOW_HALFLIFE_MS);
    const w = e.weight * decay;
    net += e.dir * w;
    mass += w;
  });

  if (mass <= 0) return 0;
  return clamp(net / mass, -1, 1);
}

/* Cuanta actividad hay ahora mismo, 0..1. Con dos trades sueltos
   el flujo apenas pesa; con veinte manda casi del todo. */
function getMoodFlowActivity() {
  const now = Date.now();
  pruneMoodFlow(now);
  if (!moodFlowEvents.length) return 0;

  let mass = 0;
  moodFlowEvents.forEach((e) => {
    mass += e.weight * Math.pow(0.5, (now - e.ts) / MOOD_FLOW_HALFLIFE_MS);
  });

  /* Se satura en 3 unidades de masa: unas seis operaciones
     medianas recientes, o una ballena sola. */
  return clamp(mass / 3, 0, 1);
}

/* Volumen comprador y vendedor DENTRO DE LA VENTANA, para la fila
   FLOW. El acumulado eterno decia "Buy pressure" para siempre. */
function getMoodFlowBalance() {
  const now = Date.now();
  pruneMoodFlow(now);

  let buy = 0;
  let sell = 0;
  moodFlowEvents.forEach((e) => {
    const w = e.weight * Math.pow(0.5, (now - e.ts) / MOOD_FLOW_HALFLIFE_MS);
    if (e.dir > 0) buy += w; else sell += w;
  });

  return { buy, sell, delta: buy - sell, active: (buy + sell) > 0.15 };
}

function getMoodPriceScore() {
  return roundScore(
    changeToScore(getMoodTimeframeChange(moodTokenTimeframe), getMoodTokenScale())
  );
}

/* El score que ve el usuario: precio de base, flujo encima.

   El flujo se expresa como un desplazamiento sobre el score de
   precio, no como un score propio. Un torrente de compras sobre
   un token que cae no lo pinta eufórico: lo sube de Frustration a
   Doubt, que es exactamente lo que significa. */
function computeMoodTradeScore() {
  const priceScore = getMoodPriceScore();

  const pressure = getMoodFlowPressure();
  const activity = getMoodFlowActivity();
  if (!activity) return priceScore;

  const weight = MOOD_FLOW_MAX_WEIGHT * activity;

  /* El empuje maximo es de 40 puntos a plena presion y plena
     actividad; ponderado por weight, en la practica se queda en
     unos 22. Suficiente para cruzar un estado o dos. */
  return roundScore(priceScore + pressure * 40 * weight);
}

/* ===========================================================
   GRÁFICO DEL TOKEN

   ANTES: una línea suelta al 34% de opacidad, sin referencia
   alguna, cortada por la cara del personaje. Parecía un adorno.

   AHORA: retícula, eje de precio a la derecha, etiqueta de
   última cotización y relleno degradado según dirección. Con
   una máscara radial que lo aparta del centro para que no pelee
   con el personaje — el mismo recurso que en el hero.
   =========================================================== */
/* ===========================================================
   GRÁFICO DEL TOKEN — VERSIÓN CON MÉTRICAS

   ANTES: una línea de fondo con retícula, sin ejes de tiempo,
   sin volumen y sin interacción. El personaje encima con
   pointer-events:none. Un gráfico que no se puede tocar no es
   un gráfico: es papel pintado.

   AHORA: ejes de precio y tiempo, velas reales, barras de
   volumen, crosshair y tooltip. El personaje se aparta a un
   lado — sigue reaccionando a cada operación, pero deja de
   tapar la lectura.

   SOBRE LAS VELAS:
   Aquí SÍ son reales. moodHistory guarda precios tick a tick, y
   agrupar ticks en velas es la operación estándar con la que se
   construyen. Es distinto del caso del chart de monedas, donde
   el problema era derivar OHLC de cierres ya agregados —eso sí
   era inventárselas.
   =========================================================== */

/* Velas reales del proveedor, separadas de la serie de ticks
   que se construye en el navegador. Antes solo existía la
   segunda, y con ella un gráfico de 5m tenía tres puntos unidos
   por rectas. */
let moodOhlcv = [];
let moodOhlcvTimeframe = null;
let isLoadingOhlcv = false;

/* Petición encolada mientras otra está en vuelo, y contador de
   generación para descartar respuestas que llegan tarde.
   Ver la nota larga en loadMoodOhlcv(). */
let pendingOhlcvReload = false;
let ohlcvRequestId = 0;

const MOOD_CHART = {
  mode: "line",
  hoverIndex: null,
  width: 900,
  height: 320
};

const MC = { top: 16, right: 58, bottom: 24, left: 10 };
const MOOD_VOL_RATIO = 0.2;

function moodPlotW() { return MOOD_CHART.width - MC.left - MC.right; }
function moodPlotH() { return (MOOD_CHART.height - MC.top - MC.bottom) * (1 - MOOD_VOL_RATIO); }
function moodVolTop() { return MC.top + moodPlotH() + 6; }
function moodVolH() { return (MOOD_CHART.height - MC.top - MC.bottom) * MOOD_VOL_RATIO - 6; }

/* Agrupa la serie de ticks en velas. Cuántos ticks por vela
   depende del timeframe: en 1m cada vela son pocos segundos, en
   24h son minutos. Sin esto, en 24h saldrían miles de velas de
   un píxel. */
function buildMoodCandles(series, targetCount = 40) {
  if (!Array.isArray(series) || series.length < 4) return [];

  const first = Number(series[0].ts);
  const last = Number(series[series.length - 1].ts);
  const span = last - first;

  /* AGRUPACIÓN POR TIEMPO, no por número de ticks.

     Antes se partía la serie en trozos de N puntos. Eso tenía
     dos consecuencias malas:

     · Todas las velas contenían los mismos ticks, así que las
       barras de volumen salían TODAS IGUALES — un muro uniforme
       que no informaba de nada. Era información falsa.
     · Una vela podía abarcar 3 segundos y la siguiente 20
       minutos, sin que nada lo indicara.

     Con cubos de tiempo iguales, el número de ticks por vela SÍ
     significa actividad: es lo que hace útil al volumen. */
  if (!(span > 0)) return [];

  /* DENSIDAD MÍNIMA POR VELA.

     Con 40 cubos fijos y una serie de 60 puntos salía UN tick
     por vela: apertura, máximo, mínimo y cierre eran el mismo
     número, así que las velas se dibujaban como rayitas sin
     cuerpo y el volumen salía uniforme.

     Una vela necesita varios ticks para existir. Se reduce el
     número de velas hasta que cada una agrupe al menos 4. */
  const MIN_TICKS_PER_CANDLE = 4;
  const maxCandles = Math.floor(series.length / MIN_TICKS_PER_CANDLE);
  const count = clamp(Math.min(targetCount, maxCandles), 3, targetCount);

  const bucketMs = Math.max(1000, Math.floor(span / count));
  const buckets = new Map();

  series.forEach((p) => {
    const price = Number(p.price);
    if (!Number.isFinite(price) || price <= 0) return;

    const key = Math.floor((Number(p.ts) - first) / bucketMs);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(price);
  });

  const candles = [];

  [...buckets.keys()].sort((a, b) => a - b).forEach((key) => {
    const prices = buckets.get(key);
    if (!prices.length) return;

    candles.push({
      ts: first + key * bucketMs,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      ticks: prices.length
    });
  });

  return candles;
}

/* La serie con marcas de tiempo, no solo precios: el eje
   temporal las necesita. getMoodTimeframeSeries devuelve solo
   números y perdía el cuándo. */
function getMoodSeriesWithTime(tf) {
  const bucket = moodHistory[tf];
  if (Array.isArray(bucket) && bucket.length >= 2) {
    /* Ordenada por tiempo y sin marcas duplicadas. El histórico
       de la API y los ticks en vivo se escriben en el mismo
       array desde sitios distintos, así que podían llegar
       desordenados — y una serie desordenada dibuja zigzags que
       nunca ocurrieron. */
    const seen = new Set();
    return bucket
      .filter((b) => {
        const price = Number(b.price);
        const ts = Number(b.ts);
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(ts)) return false;
        if (seen.has(ts)) return false;
        seen.add(ts);
        return true;
      })
      .map((b) => ({ ts: Number(b.ts), price: Number(b.price) }))
      .sort((a, b) => a.ts - b.ts);
  }

  return moodTrades
    .filter((t) => Number(t.price) > 0)
    .slice(-40)
    .reverse()
    .map((t) => ({ ts: Number(t.ts || Date.now()), price: Number(t.price) }));
}

function formatMoodAxisTime(ts, tf) {
  const d = new Date(Number(ts) || Date.now());
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (tf === "24h" || tf === "4h") return `${hh}:${mm}`;
  return `${hh}:${mm}:${String(d.getSeconds()).padStart(2, "0")}`;
}

/* ===========================================================
   CARGA DE VELAS REALES

   GeckoTerminal da OHLCV de pools de Solana sin clave de API.
   Es lo que permite mostrar el mismo tipo de gráfico que
   DexScreener en vez de interpolar entre tres lecturas.
   =========================================================== */
async function loadMoodOhlcv(force = false) {
  if (!moodResolvedAddress) return;

  /* BUG QUE ARREGLA — "pulso MOOD y no carga el gráfico".

     Antes esto era `if (isLoadingOhlcv) return;`: si había otra
     petición en vuelo, la nueva se DESCARTABA en silencio y nadie
     volvía a intentarlo.

     Y eso pasaba justo al pulsar MOOD, porque al abrir la página
     ya se está cargando el token de trending por defecto. Si
     pulsabas dentro de esa ventana —que es lo normal, son unos
     segundos— tu petición moría ahí: el gráfico se quedaba con el
     token anterior o en blanco, sin error ni reintento.

     Ahora la petición se ENCOLA en vez de perderse, y al terminar
     la que estaba en curso se relanza. */
  if (isLoadingOhlcv) {
    pendingOhlcvReload = true;
    return;
  }

  /* Si ya están las velas de este timeframe y no se fuerza, no se
     vuelve a pedir: el límite del proveedor es 30 peticiones por
     minuto y el precio en vivo ya lo cubre el polling. */
  if (!force && moodOhlcvTimeframe === moodTokenTimeframe && moodOhlcv.length) return;

  isLoadingOhlcv = true;

  /* Se anota QUÉ se está pidiendo. Si cuando vuelva la respuesta
     el usuario ya ha cambiado de token o de timeframe, se tira:
     sin esto, las velas de un token podían acabar dibujadas bajo
     el nombre de otro — el mismo fallo que ya se arregló en el
     gráfico de monedas con isStaleRequest. */
  const reqId = ++ohlcvRequestId;
  const reqAddress = moodResolvedAddress;
  const reqTimeframe = moodTokenTimeframe;

  try {
    const params = new URLSearchParams({
      address: reqAddress,
      timeframe: reqTimeframe
    });
    if (moodPairAddress) params.set("pool", moodPairAddress);

    const data = await fetchJson(`/api/token-ohlcv?${params}`, { candles: [] });

    /* Llegó tarde: el usuario ya está mirando otra cosa. */
    if (reqId !== ohlcvRequestId
        || reqAddress !== moodResolvedAddress
        || reqTimeframe !== moodTokenTimeframe) {
      return;
    }

    const candles = Array.isArray(data?.candles) ? data.candles : [];

    if (candles.length >= 2) {
      moodOhlcv = candles;
      moodOhlcvTimeframe = reqTimeframe;
    } else {
      /* Sin velas del proveedor se cae a la serie local. Es peor,
         pero es mejor que un gráfico vacío — y el usuario lo ve
         etiquetado. */
      moodOhlcv = [];
      moodOhlcvTimeframe = null;
      console.warn("WM: sin OHLCV para", moodResolvedAddress, data?.error);
    }

    drawMoodBackdrop();
  } finally {
    isLoadingOhlcv = false;

    /* Si alguien pidió una recarga mientras esta estaba en vuelo,
       se atiende ahora. Siempre con force: quien pulsó quería
       datos nuevos, no la caché de lo que ya había. */
    if (pendingOhlcvReload) {
      pendingOhlcvReload = false;
      loadMoodOhlcv(true);
    }
  }
}

function drawMoodBackdrop() {
  const els = getMoodTokenElements();
  const svg = byId("moodChartSvg");
  if (!els.backdrop || !svg) return;

  /* PRIORIDAD: velas reales del proveedor. La serie local de
     ticks solo se usa si no hay OHLCV — antes era la única
     fuente, y por eso el gráfico eran tres puntos interpolados. */
  const hasReal = moodOhlcv.length >= 2 && moodOhlcvTimeframe === moodTokenTimeframe;

  const series = hasReal
    ? moodOhlcv.map((c) => ({ ts: c.ts, price: c.close }))
    : getMoodSeriesWithTime(moodTokenTimeframe);

  const groups = {
    grid:   byId("moodChartGrid"),
    axisY:  byId("moodChartAxis"),
    axisX:  byId("moodChartAxisX"),
    body:   byId("moodChartBody"),
    vol:    byId("moodChartVolume"),
    last:   byId("moodChartLast"),
    cross:  byId("moodChartCrosshair")
  };

  if (series.length < 2) {
    Object.values(groups).forEach((g) => { if (g) g.innerHTML = ""; });
    els.backdrop.classList.add("hidden");
    return;
  }

  els.backdrop.classList.remove("hidden");

  const useCandles = MOOD_CHART.mode === "candle";

  /* Con datos del proveedor las velas ya vienen agregadas: no hay
     que construirlas agrupando ticks. Ese agrupado era una
     aproximación; esto es el dato. */
  const candles = useCandles
    ? (hasReal ? moodOhlcv : buildMoodCandles(series))
    : [];

  /* Con menos de 12 puntos no hay material para velas honestas.
     Se avisa en vez de dibujar rayitas que parecen un fallo. */
  const candleBtn = qs('[data-mood-chart-mode="candle"]');
  if (candleBtn) {
    const enough = hasReal || series.length >= 12;
    candleBtn.disabled = !enough;
    candleBtn.title = enough ? "" : "Not enough price updates yet";
  }
  const items = useCandles && candles.length >= 2 ? candles : series;

  const highs = useCandles && candles.length >= 2
    ? candles.map((c) => c.high) : series.map((p) => p.price);
  const lows = useCandles && candles.length >= 2
    ? candles.map((c) => c.low) : series.map((p) => p.price);

  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const span = (max - min) || Math.abs(max) * 0.01 || 1;

  /* El margen inferior NUNCA baja de cero. Antes el 8% de
     holgura cruzaba el cero con precios muy pequeños y el eje
     llegaba a mostrar "-0.000356": un precio negativo, que es
     imposible y destruye la credibilidad del resto. */
  const vMin = Math.max(0, min - span * 0.08);
  const vMax = max + span * 0.08;

  /* El margen derecho se calcula con la etiqueta MÁS LARGA.
     Con 58px fijos, un precio como 0.0000402 se cortaba contra
     el borde. Los tokens de baja capitalización tienen precios
     con muchos decimales: el margen tiene que adaptarse. */
  const sampleStep = (vMax - vMin) / 4;
  const sampleDec = sampleStep > 0
    ? clamp(Math.ceil(-Math.log10(sampleStep)) + 1, 2, 12) : 2;
  const sampleLabel = vMax >= 1000 ? "999.9K" : vMax.toFixed(sampleDec);
  MC.right = clamp(sampleLabel.length * 7 + 14, 52, 96);

  const plotW = moodPlotW();
  const plotH = moodPlotH();

  /* ESCALA X POR TIEMPO, no por índice.

     Antes cada punto se colocaba a distancia fija sin importar
     cuándo ocurrió. Con una serie que mezcla el histórico de la
     API y ticks en vivo, los huecos temporales se dibujaban como
     si fueran regulares: de ahí el arco suave y la caída
     vertical al final —un salto de minutos comprimido en un solo
     paso. La forma que veía el usuario no era la del mercado. */
  const tFirst = Number(items[0].ts);
  const tLast = Number(items[items.length - 1].ts);
  const tSpan = (tLast - tFirst) || 1;

  const step = plotW / Math.max(items.length, 1);

  const y = (v) => MC.top + (1 - (v - vMin) / (vMax - vMin)) * plotH;

  /* Las velas conservan posición por índice —ya están agrupadas
     en cubos de tiempo iguales, así que el índice YA es tiempo—
     pero la línea se posiciona por marca temporal real. */
  const x = useCandles
    ? (i) => MC.left + i * step + step / 2
    : (i) => MC.left + ((Number(items[i].ts) - tFirst) / tSpan) * plotW;

  // ---------- Retícula y eje de precio ----------
  const LEVELS = 4;

  /* DECIMALES SEGÚN EL RANGO, no según la magnitud.

     formatAxisPrice redondea por el tamaño del número, así que
     en un rango estrecho —0.000358 a 0.000360— los cinco niveles
     caían en el mismo valor redondeado y el eje mostraba
     "0.000360" dos veces seguidas. Un eje con etiquetas
     repetidas no informa de nada.

     Se calculan los decimales necesarios para que los niveles
     adyacentes SIEMPRE se distingan. */
  const stepValue = (vMax - vMin) / LEVELS;
  const decimals = stepValue > 0
    ? clamp(Math.ceil(-Math.log10(stepValue)) + 1, 2, 12)
    : 2;

  const formatLevel = (v) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toFixed(decimals);
  };

  let gridHtml = "", axisYHtml = "";
  for (let i = 0; i <= LEVELS; i++) {
    const value = vMin + (vMax - vMin) * (i / LEVELS);
    const yy = y(value);
    gridHtml += `<line x1="${MC.left}" y1="${yy.toFixed(1)}" x2="${(MC.left + plotW).toFixed(1)}" y2="${yy.toFixed(1)}"></line>`;
    axisYHtml += `<text x="${(MC.left + plotW + 7).toFixed(1)}" y="${(yy + 3.5).toFixed(1)}">${escapeHtml(formatLevel(value))}</text>`;
  }
  if (groups.grid) groups.grid.innerHTML = gridHtml;
  if (groups.axisY) groups.axisY.innerHTML = axisYHtml;

  // ---------- Eje de tiempo ----------
  /* Faltaba por completo: el usuario veía una forma sin saber a
     qué momento correspondía nada. */
  const labels = clamp(Math.floor(plotW / 120), 2, 5);
  let axisXHtml = "";
  for (let i = 0; i <= labels; i++) {
    const idx = Math.min(items.length - 1, Math.round((i / labels) * (items.length - 1)));
    axisXHtml += `<text x="${x(idx).toFixed(1)}" y="${(MOOD_CHART.height - 7).toFixed(1)}" text-anchor="middle">${
      escapeHtml(formatMoodAxisTime(items[idx].ts, moodTokenTimeframe))
    }</text>`;
  }
  if (groups.axisX) groups.axisX.innerHTML = axisXHtml;

  // ---------- Cuerpo ----------
  const first = useCandles && candles.length >= 2 ? candles[0].open : series[0].price;
  const last = useCandles && candles.length >= 2
    ? candles[candles.length - 1].close : series[series.length - 1].price;
  const up = last >= first;
  const color = up ? "#3BD97A" : "#E4485C";

  if (groups.body) {
    if (useCandles && candles.length >= 2) {
      const bodyW = Math.max(2, Math.min(step * 0.66, 20));
      const wickW = Math.max(1, bodyW * 0.16);

      groups.body.innerHTML = candles.map((c, i) => {
        const cx = x(i);
        const cUp = c.close >= c.open;
        const col = cUp ? "#3BD97A" : "#E4485C";
        const top = Math.min(y(c.open), y(c.close));
        const h = Math.max(Math.abs(y(c.close) - y(c.open)), 1);

        return `
          <rect x="${(cx - wickW / 2).toFixed(2)}" y="${y(c.high).toFixed(2)}"
                width="${wickW.toFixed(2)}" height="${Math.max(y(c.low) - y(c.high), 0.5).toFixed(2)}"
                fill="${col}"></rect>
          <rect x="${(cx - bodyW / 2).toFixed(2)}" y="${top.toFixed(2)}"
                width="${bodyW.toFixed(2)}" height="${h.toFixed(2)}" fill="${col}"></rect>`;
      }).join("");
    } else {
      /* Los huecos de datos se rompen en vez de unirse con una
         recta. Una línea recta cruzando veinte minutos sin
         operaciones afirma un movimiento que nadie observó. */
      const medianGap = (() => {
        const gaps = [];
        for (let i = 1; i < series.length; i++) gaps.push(series[i].ts - series[i - 1].ts);
        gaps.sort((a, b) => a - b);
        return gaps[Math.floor(gaps.length / 2)] || 1;
      })();

      /* Umbral relativo al ritmo real de la serie. El mínimo de
         30s era arbitrario: en 1M con consultas cada 5s dejaba
         pasar huecos de medio minuto como si fueran continuos. */
      const gapLimit = Math.max(medianGap * 4, 12000);

      const path = series.map((p, i) => {
        const cmd = (i === 0 || (p.ts - series[i - 1].ts) > gapLimit) ? "M" : "L";
        return `${cmd} ${x(i).toFixed(2)} ${y(p.price).toFixed(2)}`;
      }).join(" ");

      const baseY = MC.top + plotH;

      /* EL RELLENO TAMBIÉN RESPETA LOS HUECOS.

         Antes la línea se partía pero el área se trazaba continua
         por debajo. Sobre el tramo sin datos quedaba una región
         vacía delimitada por una recta, que se leía como un
         RECTÁNGULO NEGRO en mitad del gráfico. Era el hueco, no
         un fallo de render.

         Ahora el área se corta en segmentos: donde no hay datos,
         no hay nada. */
      const segments = [];
      let current = [];

      series.forEach((p, i) => {
        const isGap = i > 0 && (p.ts - series[i - 1].ts) > gapLimit;
        if (isGap && current.length) {
          segments.push(current);
          current = [];
        }
        current.push({ i, p });
      });
      if (current.length) segments.push(current);

      const areaPaths = segments
        .filter((seg) => seg.length >= 2)
        .map((seg) => {
          const d = seg
            .map((n, k) => `${k === 0 ? "M" : "L"} ${x(n.i).toFixed(2)} ${y(n.p.price).toFixed(2)}`)
            .join(" ");
          const xa = x(seg[0].i).toFixed(2);
          const xb = x(seg[seg.length - 1].i).toFixed(2);
          return `<path d="${d} L ${xb} ${baseY} L ${xa} ${baseY} Z"
                        fill="${up ? "url(#moodGradUp)" : "url(#moodGradDown)"}"
                        opacity="0.5"></path>`;
        })
        .join("");

      /* Marca discreta en cada hueco: sin ella el usuario ve un
         salto y no sabe si faltan datos o el precio no se movió. */
      const gapMarks = segments.slice(1).map((seg) => {
        const xg = x(seg[0].i);
        return `<line x1="${xg.toFixed(1)}" y1="${MC.top}" x2="${xg.toFixed(1)}"
                      y2="${(MC.top + plotH).toFixed(1)}" class="mood-gap-mark"></line>`;
      }).join("");

      groups.body.innerHTML = areaPaths + gapMarks +
        `<path class="mood-chart-line" d="${path}" stroke="${color}"></path>`;
    }
  }

  // ---------- Volumen ----------
  /* Número de operaciones registradas en cada cubo de tiempo.
     Con cubos temporales iguales esto SÍ mide actividad: antes,
     al agrupar por número de ticks, todas las barras salían
     idénticas y no informaban de nada. */
  if (groups.vol && useCandles && candles.length >= 2) {
    /* Volumen en dólares cuando viene del proveedor; número de
       actualizaciones cuando se construye en local. Son cosas
       distintas y se etiquetan distinto en el tooltip. */
    const volKey = hasReal ? "volume" : "ticks";
    const maxTicks = Math.max(...candles.map((c) => safeNum(c[volKey])));
    const barW = Math.max(1, Math.min(step * 0.66, 20));
    const vTop = moodVolTop(), vH = moodVolH();

    groups.vol.innerHTML = candles.map((c, i) => {
      const h = maxTicks > 0
        ? Math.max((safeNum(c[volKey]) / maxTicks) * vH, 0.6) : 0.6;
      return `<rect x="${(x(i) - barW / 2).toFixed(2)}" y="${(vTop + vH - h).toFixed(2)}"
                    width="${barW.toFixed(2)}" height="${h.toFixed(2)}"
                    class="${c.close >= c.open ? "vol-up" : "vol-down"}"></rect>`;
    }).join("");
  } else if (groups.vol) {
    groups.vol.innerHTML = "";
  }

  // ---------- Última cotización ----------
  if (groups.last) {
    const ly = y(last);
    groups.last.innerHTML = `
      <line x1="${MC.left}" y1="${ly.toFixed(1)}" x2="${(MC.left + plotW).toFixed(1)}" y2="${ly.toFixed(1)}"
            stroke="${color}" class="mood-last-line"></line>
      <rect x="${(MC.left + plotW + 2).toFixed(1)}" y="${(ly - 9).toFixed(1)}"
            width="${(MC.right - 6).toFixed(1)}" height="18" rx="3" fill="${color}"></rect>
      <text x="${(MC.left + plotW + MC.right / 2 - 1).toFixed(1)}" y="${(ly + 4).toFixed(1)}"
            text-anchor="middle" fill="#05080C" class="mood-last-text">${
              escapeHtml(formatAxisPrice(last))
            }</text>`;
  }

  drawMoodCrosshair(items, { x, y, step, useCandles });
}

function drawMoodCrosshair(items, s) {
  const group = byId("moodChartCrosshair");
  const tip = byId("moodChartTooltip");
  if (!group) return;

  const i = MOOD_CHART.hoverIndex;
  if (i == null || !items[i]) {
    group.innerHTML = "";
    if (tip) tip.classList.add("hidden");
    return;
  }

  const item = items[i];
  const value = s.useCandles ? item.close : item.price;
  const px = s.x(i), py = s.y(value);

  group.innerHTML = `
    <line x1="${px.toFixed(1)}" y1="${MC.top}" x2="${px.toFixed(1)}"
          y2="${(MC.top + moodPlotH()).toFixed(1)}" class="crosshair-v"></line>
    <line x1="${MC.left}" y1="${py.toFixed(1)}" x2="${(MC.left + moodPlotW()).toFixed(1)}"
          y2="${py.toFixed(1)}" class="crosshair-h"></line>
    <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" class="crosshair-dot"></circle>`;

  if (!tip) return;

  const rows = s.useCandles
    ? [["O", formatCurrency(item.open)], ["H", formatCurrency(item.high)],
       ["L", formatCurrency(item.low)], ["C", formatCurrency(item.close)],
       item.volume != null
         ? ["Vol", formatCurrencyCompact(item.volume)]
         : ["Updates", String(item.ticks || 0)]]
    : [["Price", formatCurrency(item.price)]];

  const d = new Date(item.ts);
  tip.innerHTML = `
    <div class="chart-tooltip-time">${escapeHtml(d.toLocaleTimeString("en-US", { hour12: false }))}</div>
    ${rows.map(([k, v]) => `<div class="chart-tooltip-row"><span>${k}</span><strong>${escapeHtml(v)}</strong></div>`).join("")}`;

  const ratio = px / MOOD_CHART.width;
  tip.classList.remove("hidden");
  tip.style.left = ratio > 0.6 ? "auto" : `${(ratio * 100).toFixed(1)}%`;
  tip.style.right = ratio > 0.6 ? `${((1 - ratio) * 100).toFixed(1)}%` : "auto";
}

function setupMoodChartInteraction() {
  const svg = byId("moodChartSvg");
  if (!svg || svg.dataset.boundMoodChart) return;
  svg.dataset.boundMoodChart = "1";

  svg.addEventListener("pointermove", (e) => {
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * MOOD_CHART.width;

    /* PRIORIDAD: velas reales del proveedor. La serie local de
     ticks solo se usa si no hay OHLCV — antes era la única
     fuente, y por eso el gráfico eran tres puntos interpolados. */
  const hasReal = moodOhlcv.length >= 2 && moodOhlcvTimeframe === moodTokenTimeframe;

  const series = hasReal
    ? moodOhlcv.map((c) => ({ ts: c.ts, price: c.close }))
    : getMoodSeriesWithTime(moodTokenTimeframe);
    const items = MOOD_CHART.mode === "candle" ? buildMoodCandles(series) : series;
    if (items.length < 2) return;

    const step = moodPlotW() / items.length;
    MOOD_CHART.hoverIndex = clamp(
      Math.round((relX - MC.left - step / 2) / step), 0, items.length - 1
    );
    drawMoodBackdrop();
  }, { passive: true });

  svg.addEventListener("pointerleave", () => {
    MOOD_CHART.hoverIndex = null;
    drawMoodBackdrop();
  });

  const modeRow = byId("moodChartModes");
  bindOnce(modeRow, "boundMoodMode", "click", (e) => {
    const btn = e.target.closest("[data-mood-chart-mode]");
    if (!btn) return;
    MOOD_CHART.mode = btn.dataset.moodChartMode === "candle" ? "candle" : "line";
    qsa("[data-mood-chart-mode]").forEach((b) => {
      b.classList.toggle("active", b.dataset.moodChartMode === MOOD_CHART.mode);
    });
    drawMoodBackdrop();
  });

  const applySize = () => {
    const rect = svg.getBoundingClientRect();
    if (rect.width < 10) return;
    /* viewBox igual al tamaño real: sin esto el lienzo se estira
       y las velas se achatan, el mismo fallo que tenía el chart
       de monedas. */
    MOOD_CHART.width = Math.round(rect.width);
    MOOD_CHART.height = Math.round(rect.height);
    svg.setAttribute("viewBox", `0 0 ${MOOD_CHART.width} ${MOOD_CHART.height}`);
    drawMoodBackdrop();
  };

  if (typeof ResizeObserver === "function") new ResizeObserver(applySize).observe(svg);
  else window.addEventListener("resize", applySize, { passive: true });

  applySize();
}

function updateMoodHero(mood, score) {
  const els = getMoodTokenElements();
  const style = getCurrentStyle();

  if (els.heroImg) {
    els.heroImg.className = `mood-hero-img ${mood.anim}`;
    setImage(els.heroImg, getHeroImagePath(style, mood.key), getHeroImagePath(DEFAULT_STYLE, mood.key));
  }

  if (els.heroScore) {
    els.heroScore.textContent = String(roundScore(score));
    els.heroScore.classList.remove("positive", "negative", "neutral");
    const pos = ["euphoria", "content", "optimism"];
    const neg = ["frustration", "concern", "doubt"];
    els.heroScore.classList.add(
      pos.includes(mood.key) ? "positive" : neg.includes(mood.key) ? "negative" : "neutral"
    );
  }

  /* ANILLO DE SCORE alrededor del personaje.

     Mismo recurso que el anillo de dominancia del header: una
     proporción se lee mejor como proporción que como cifra. Aquí
     además hace de marco — el score deja de necesitar una caja
     propia y pasa a formar parte del retrato. */
  const ring = byId("moodScoreRing");
  if (ring) {
    const pct = clamp(roundScore(score), 0, 100);
    const r = 46;
    const circumference = 2 * Math.PI * r;
    ring.style.strokeDasharray = `${((pct / 100) * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
    ring.style.stroke = getMoodColor(mood.key);
  }

  /* El halo detrás del retrato toma el color del mood: es lo que
     hace que el cambio emocional se note aunque no mires el
     número. */
  const portrait = byId("moodHeroPortrait");
  if (portrait) {
    portrait.style.setProperty("--mood-ring-color", getMoodColor(mood.key));
    portrait.dataset.mood = mood.key;
  }

  els.heroMoodNodes.forEach((node) => {
    node.textContent = mood.name;
    node.className = `mood-${mood.key}`;
  });

  /* La insignia SENTIMENT se eliminó del marcado: repetía la
     etiqueta del anillo y tapaba el eje de precio. La escritura
     queda condicionada por si alguien la reintroduce. */
  if (els.badge) {
    els.badge.className = `mood-token-badge mood-${mood.key}`;
    const strong = els.badge.querySelector("strong");
    if (strong) strong.textContent = mood.name;
  }

  /* La etiqueta bajo el anillo es ahora la única lectura del
     mood en el escenario. */
  const heroLabel = byId("moodHeroMood");
  if (heroLabel) {
    heroLabel.textContent = mood.name;
    heroLabel.className = `mood-hero-label mood-${mood.key}`;
  }

  if (els.stage) {
    ["euphoria","content","optimism","neutral","doubt","concern","frustration"]
      .forEach((k) => els.stage.classList.remove(k));
    els.stage.classList.add(mood.key);
  }

  if (els.glow) {
    const c = getMoodColor(mood.key);
    els.glow.style.background =
      `radial-gradient(circle, ${c}33 0%, ${c}18 35%, rgba(0,0,0,0) 72%)`;
  }
}

function renderMoodTradesFeed() {
  const els = getMoodTokenElements();
  if (!els.feed) return;

  if (!moodTrades.length) {
    /* Estado vacío honesto: distingue "esperando" de "esta fuente
       no tiene nada". Antes siempre decía lo mismo y el usuario no
       sabía si el sistema estaba roto o el token estaba muerto. */
    const msg =
      moodTradesSource === "No recent trades"     ? "Watching order flow…" :
      moodTradesSource === "Live feed unavailable" ? "Live trade feed unavailable"  :
      moodTradesSource === "Switching source…"     ? "Switching to backup feed…"    :
      "Waiting for live trades…";

    els.feed.innerHTML = `<div class="mood-empty-feed">${escapeHtml(msg)}</div>`;
    return;
  }

  els.feed.innerHTML = moodTrades.slice(0, 16).map((trade) => {
    const usd = Number(trade.usdValue || 0);
    const tokens = Number(trade.tokenAmount || 0);
    const mc = Number(trade.marketCapUsd || 0);

    let amount = "--";
    if (usd > 0)         amount = formatCurrency(usd);
    else if (tokens > 0) amount = `${formatCompactNumber(tokens)} TOKENS`;
    else if (mc > 0)     amount = `MC ${formatCurrencyCompact(mc)}`;

    /* Se marca visiblemente lo que es flujo agregado. El
       usuario merece saber si está viendo una operación real o
       una estimación. */
    const when = trade.ts
      ? new Date(trade.ts).toLocaleTimeString("en-US",
          { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      : "";

    return `
      <div class="mood-trade ${trade.side}${trade.derived ? " derived" : ""}">
        <strong>${trade.side === "buy" ? "BUY" : "SELL"}</strong>
        <span class="trade-amount">${escapeHtml(amount)}</span>
        <span class="trade-meta">${
          trade.derived
            ? `${trade.count || 1}x flow`
            : escapeHtml(shortenAddress(trade.trader))
        }</span>
        <span class="trade-time">${escapeHtml(when)}</span>
      </div>`;
  }).join("");
}

function renderMoodTimeframeButtons() {
  qsa("[data-token-timeframe]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tokenTimeframe === moodTokenTimeframe);
  });
}

function updateMoodUI() {
  const els = getMoodTokenElements();
  if (!els.section) return;

  const changePct = getMoodTimeframeChange(moodTokenTimeframe);

  /* Volumen: el 24h del proveedor manda. El acumulado del stream
     solo se usa si aún no hay snapshot — es parcial por definición,
     ya que solo cuenta desde que abriste la página. */
  const totalVolume = moodVolume24h > 0
    ? moodVolume24h
    : (moodBuyVolume + moodSellVolume);

  /* VOLATILIDAD REAL, no |change| * 4.2.
     Aquella fórmula saturaba a partir del 23.8% de cambio, por
     eso marcaba 99.99% constantemente en memecoins. Y medía el
     movimiento, no la volatilidad: son cosas distintas. Un
     activo puede caer 50% en línea recta con volatilidad baja.

     Ahora es la desviación típica real de los retornos,
     expresada como porcentaje del propio periodo. */
  const volatility = realizedVolatility(getMoodTimeframeSeries(moodTokenTimeframe));

  moodLiveScore = computeMoodTradeScore();
  moodLiveMood  = getMoodByScore(moodLiveScore);

  if (els.price) {
    els.price.textContent = moodPrice > 0 ? formatCurrency(moodPrice) : "Reading";
    applyPolarityClass(els.price, changePct);
  }

  if (els.marketCap) {
    /* Solo se muestra si es real. Nunca un número derivado de un
       supply inventado. */
    els.marketCap.textContent = moodMarketCapIsReal
      ? formatCurrencyCompact(moodMarketCap)
      : (moodPrice > 0 ? "--" : "Reading");
    applyPolarityClass(els.marketCap, moodMarketCapIsReal ? changePct : 0);
  }

  if (els.volume) {
    els.volume.textContent = totalVolume > 0 ? formatCurrencyCompact(totalVolume) : "Reading";
    /* El volumen NO es positivo ni negativo: es solo volumen.
       Antes se pintaba siempre verde, y en el resto del sitio
       verde significa "bien" — el usuario leía una señal que no
       existe. */
    els.volume.className = "neutral";
  }

  if (els.flow) {
    /* Ventana rodante, no acumulado de toda la sesion. El
       acumulado no olvidaba nunca: bastaba una compra grande al
       abrir la pagina para que dijera "Buy pressure" el resto de
       la tarde mientras el token se desangraba. */
    const flow = getMoodFlowBalance();

    if (flow.active) {
      const strong = Math.abs(flow.delta) > (flow.buy + flow.sell) * 0.5;
      els.flow.textContent = flow.delta > 0
        ? (strong ? "Heavy buying" : "Buy pressure")
        : flow.delta < 0
          ? (strong ? "Heavy selling" : "Sell pressure")
          : "Balanced";
      applyPolarityClass(els.flow, flow.delta);
    } else {
      /* Sin operaciones recientes se cae al balance de 24h del
         proveedor, etiquetado como tal para no confundirlo con
         flujo en vivo. */
      const delta = moodBuyVolume - moodSellVolume;
      els.flow.textContent = (moodBuyVolume + moodSellVolume) > 0
        ? (delta > 0 ? "Buy-led · 24h" : delta < 0 ? "Sell-led · 24h" : "Balanced · 24h")
        : "Quiet";
      applyPolarityClass(els.flow, 0);
    }
  }

  if (els.change) {
    els.change.textContent = formatPercent(changePct);
    applyPolarityClass(els.change, changePct);
  }

  if (els.volatility) {
    /* Se muestra relativa a lo normal del token, que es lo que
       de verdad informa. "2.4x normal" dice más que "87%". */
    const scale = getMoodTokenScale();
    const ratio = scale > 0 ? volatility / scale : 0;

    els.volatility.textContent = volatility > 0
      ? `${volatility.toFixed(1)}% · ${ratio.toFixed(1)}x`
      : "Reading";

    /* La volatilidad alta no es "mala" en sentido moral, pero
       tampoco es buena: es riesgo. Nunca verde. Neutro cuando es
       normal, ámbar/rojo cuando se dispara. */
    els.volatility.className = ratio >= 2 ? "negative" : "neutral";
  }

  if (els.lastAction) {
    els.lastAction.textContent = moodLastAction;
    const lower = moodLastAction.toLowerCase();
    applyPolarityClass(els.lastAction, lower.includes("buy") ? 1 : lower.includes("sell") ? -1 : 0);
  }

  if (els.source) els.source.textContent = getMoodCombinedSourceLabel();

  updateMoodHero(moodLiveMood, moodLiveScore);
  renderMoodTradesFeed();
  drawMoodBackdrop();
  renderMoodTimeframeButtons();
}

function applyMoodHeroImpulse(side, usdValue, marketCapUsd = 0, options = {}) {
  const { register = true, count = 1 } = options;

  /* PRIMERO se registra en el flujo, DESPUES se anima.

     Antes esto solo animaba. La reaccion era pura decoracion: a
     los 900ms updateMoodUI() devolvia la cara al score de precio
     y de la compra no quedaba nada. Ahora la operacion entra en
     la ventana de flujo, asi que cuando la animacion termina la
     cara NO vuelve a donde estaba: vuelve a un score que ya
     incorpora lo que acaba de pasar, y se va calmando sola. */
  if (register) pushMoodFlowEvent(side, usdValue || 0, marketCapUsd || 0, count);

  const els = getMoodTokenElements();
  const heroImg = els.heroImg;
  const stage = els.stage;
  if (!heroImg || !stage) return;

  const intensity = getMoodTradeIntensity(usdValue || 250, marketCapUsd || 0);
  const mood = getImpulseMoodFromTrade(side, usdValue || 0, marketCapUsd || 0);

  stage.style.setProperty("--token-react-scale", String(1 + intensity * 0.12));
  stage.style.setProperty("--token-react-shift", `${Math.max(6, Math.round(intensity * 16))}px`);

  stage.classList.remove("token-buy-burst", "token-sell-shake");
  heroImg.classList.remove("token-buy-burst", "token-sell-shake");
  void stage.offsetWidth;

  heroImg.className = `mood-hero-img ${mood.anim}`;
  setImage(heroImg, getHeroImagePath(getCurrentStyle(), mood.key), getHeroImagePath(DEFAULT_STYLE, mood.key));

  const cls = side === "buy" ? "token-buy-burst" : "token-sell-shake";
  stage.classList.add(cls);
  heroImg.classList.add(cls);

  clearTimeout(stage.__reactTimer);
  stage.__reactTimer = setTimeout(() => {
    stage.classList.remove("token-buy-burst", "token-sell-shake");
    heroImg.classList.remove("token-buy-burst", "token-sell-shake");

    /* Antes aqui se llamaba a updateMoodUI(), que repinta el
       grafico entero, el feed y el backdrop. Con trades llegando
       cada segundo eso era un redibujado completo por operacion,
       y el motivo de que la seccion se sintiera pesada. Ahora
       solo se recalcula la cara. */
    settleMoodHero();
  }, 900);
}

/* Devuelve la cara al score combinado, sin repintar el resto. */
function settleMoodHero() {
  moodLiveScore = computeMoodTradeScore();
  moodLiveMood  = getMoodByScore(moodLiveScore);
  updateMoodHero(moodLiveMood, moodLiveScore);
}

/* LATIDO DEL FLUJO

   Sin esto, entre una operacion y la siguiente no pasaba
   absolutamente nada: el decaimiento solo se notaria en el
   siguiente evento. Un tick cada 2s hace que la cara BAJE sola
   cuando el flujo se apaga, que es justo la mitad del efecto que
   se buscaba: ver el animo enfriarse en tiempo real.

   Cuelga de setTimer, el mismo registro que el resto de timers,
   asi que se limpia con stopAllTimers() al ocultar la pestana. */
function tickMoodFlow() {
  const els = getMoodTokenElements();
  if (!els.section || !moodResolvedAddress) return;

  /* No se pisa una animacion en curso. */
  if (els.stage?.classList.contains("token-buy-burst")) return;
  if (els.stage?.classList.contains("token-sell-shake")) return;

  const next = computeMoodTradeScore();
  if (Math.abs(next - moodLiveScore) < 1) return;

  moodLiveScore = next;
  moodLiveMood  = getMoodByScore(next);
  updateMoodHero(moodLiveMood, moodLiveScore);

  const flowEl = getMoodTokenElements().flow;
  if (flowEl) {
    const flow = getMoodFlowBalance();
    if (flow.active) {
      const strong = Math.abs(flow.delta) > (flow.buy + flow.sell) * 0.5;
      flowEl.textContent = flow.delta > 0
        ? (strong ? "Heavy buying" : "Buy pressure")
        : flow.delta < 0
          ? (strong ? "Heavy selling" : "Sell pressure")
          : "Balanced";
      applyPolarityClass(flowEl, flow.delta);
    }
  }
}

function parseMoodTradePayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const sideText = String(
    payload.txType || payload.side || payload.type || payload.tradeType ||
    payload.eventType || payload.tx_type || payload.action || ""
  ).toLowerCase();

  const side = sideText.includes("sell") ? "sell" : "buy";

  const pick = (...keys) => {
    for (const k of keys) {
      const v = safeNum(payload[k], 0);
      if (v) return v;
    }
    return 0;
  };

  const marketCapUsd = pick("marketCapUsd", "market_cap_usd", "usd_market_cap", "marketCap");
  const price        = pick("priceUsd", "price_usd", "price", "tokenPrice", "usdPrice");
  const tokenAmount  = pick("tokenAmount", "amount", "baseAmount", "tokens", "token_quantity", "quantity");
  let   usdValue     = pick("vUsd", "volumeUsd", "usdVolume", "notionalUsd", "totalUsd", "amountUsd");

  let resolvedPrice = price;
  if (resolvedPrice <= 0 && marketCapUsd > 0) resolvedPrice = marketCapUsd / 1e9;
  if (usdValue <= 0 && resolvedPrice > 0 && tokenAmount > 0) usdValue = resolvedPrice * tokenAmount;
  if (usdValue <= 0 && marketCapUsd > 0) usdValue = marketCapUsd * 0.0000025;

  if (!sideText && !resolvedPrice && !usdValue && !marketCapUsd) return null;

  return {
    side,
    price: resolvedPrice,
    usdValue,
    tokenAmount,
    trader: payload.traderPublicKey || payload.wallet || payload.user ||
            payload.owner || payload.maker || payload.trader || payload.publicKey || "",
    name:   payload.name   || payload.tokenName || payload.token_name  || "",
    symbol: payload.symbol || payload.ticker    || payload.tokenSymbol || "",
    image:  payload.image  || payload.imageUrl  || payload.logo || payload.uri || payload.image_uri || "",
    marketCapUsd,
    ts: Date.now()
  };
}

const MOOD_TF_LIMITS = {
  "1m": 60e3, "5m": 5 * 60e3, "15m": 15 * 60e3,
  "1h": 60 * 60e3, "4h": 4 * 60 * 60e3, "24h": 24 * 60 * 60e3
};

function registerPriceIntoTimeframes(price) {
  if (!Number.isFinite(price) || price <= 0) return;
  const now = Date.now();

  Object.entries(MOOD_TF_LIMITS).forEach(([tf, ms]) => {
    const bucket = moodHistory[tf];
    bucket.push({ ts: now, price });

    // Poda por ventana y por tamaño en una sola pasada.
    let cut = 0;
    while (cut < bucket.length && now - bucket[cut].ts > ms) cut++;
    if (cut > 0) bucket.splice(0, cut);
    if (bucket.length > 240) bucket.splice(0, bucket.length - 240);
  });
}

/* REACCIÓN A CAMBIOS DE PRECIO

   applyMoodHeroImpulse solo se disparaba desde registerMoodTrade,
   es decir desde el WebSocket. Con un token graduado de pump.fun
   el stream está mudo ("No recent trades"), así que el personaje
   NUNCA reaccionaba — aunque el polling actualizara el precio
   cada 15 segundos y el score cambiara.

   Reaccionaba a una fuente muerta e ignoraba la viva. */
function reactToPriceMove(oldPrice, newPrice) {
  if (!(oldPrice > 0) || !(newPrice > 0)) return;

  const deltaPct = ((newPrice - oldPrice) / oldPrice) * 100;

  /* Umbral relativo a la volatilidad del token: en uno tranquilo
     un 0.5% ya es noticia; en una memecoin es ruido. Sin esto,
     el personaje o no se movería nunca o temblaría sin parar. */
  const scale = getMoodTokenScale();
  const threshold = Math.max(scale * 0.12, 0.15);

  if (Math.abs(deltaPct) < threshold) return;

  /* Se sintetiza un valor USD proporcional al movimiento para
     que applyMoodHeroImpulse module la intensidad igual que lo
     haría con un trade real. */
  const magnitude = clamp(Math.abs(deltaPct) / Math.max(scale, 0.1), 0, 3);
  const syntheticUsd = 500 + magnitude * 40000;

  applyMoodHeroImpulse(
    deltaPct >= 0 ? "buy" : "sell",
    syntheticUsd,
    moodMarketCapIsReal ? moodMarketCap : 0
  );
}

function setMoodPrice(newPrice) {
  if (!Number.isFinite(newPrice) || newPrice <= 0) return false;
  moodPrevPrice = moodPrice > 0 ? moodPrice : newPrice;
  moodPrice = newPrice;
  registerPriceIntoTimeframes(newPrice);
  return true;
}

/* ===========================================================
   FLUJO DERIVADO

   PROBLEMA: PumpPortal solo emite operaciones de tokens que
   siguen en la bonding curve. En cuanto uno gradúa a Raydium el
   stream enmudece, y el feed se quedaba en "No trades" para
   siempre — justo con los tokens que más se miran.

   Los datos de operaciones individuales para tokens graduados no
   son gratis (Birdeye de pago, Helius, RPC propio).

   SOLUCIÓN SIN COSTE: DexScreener da contadores de compras y
   ventas por ventana. Restándolos entre dos consultas seguidas
   se sabe cuántas ocurrieron en ese intervalo, y con el delta de
   volumen se estima el tamaño medio.

   NO son operaciones individuales, y el feed lo etiqueta como
   flujo agregado. Fingir que son trades reales sería mentir
   sobre la precisión del dato.
   =========================================================== */
let lastFlowSnapshot = null;

function deriveFlowEvents(flow) {
  if (!flow) return [];

  const current = {
    buys: safeNum(flow.m5Buys),
    sells: safeNum(flow.m5Sells),
    volume: safeNum(flow.m5Volume),
    ts: Date.now()
  };

  const prev = lastFlowSnapshot;
  lastFlowSnapshot = current;

  // Primera lectura: no hay con qué comparar.
  if (!prev) return [];

  const newBuys = Math.max(0, current.buys - prev.buys);
  const newSells = Math.max(0, current.sells - prev.sells);

  /* Los contadores de ventana deslizante también BAJAN cuando
     salen operaciones antiguas. Un delta negativo no significa
     nada, solo que la ventana se movió. */
  if (newBuys + newSells === 0) return [];

  const volumeDelta = Math.max(0, current.volume - prev.volume);
  const totalNew = newBuys + newSells;

  /* Tamaño medio estimado. Si el volumen no subió (porque la
     ventana también soltó operaciones), se usa un valor pequeño
     para que el evento exista sin exagerar su peso. */
  const avgSize = volumeDelta > 0 ? volumeDelta / totalNew : 0;

  const events = [];

  for (let i = 0; i < Math.min(newBuys, 6); i++) {
    events.push({ side: "buy", usdValue: avgSize, derived: true, ts: current.ts });
  }
  for (let i = 0; i < Math.min(newSells, 6); i++) {
    events.push({ side: "sell", usdValue: avgSize, derived: true, ts: current.ts });
  }

  /* Antes esto era `sort(() => Math.random() - 0.5)` para que el
     feed no mostrara bloques uniformes. Barajar al azar un dato
     derivado es inventarse el orden de las operaciones: el feed
     mentia sobre la secuencia. Se intercalan de forma
     determinista, alternando compra y venta, que produce el mismo
     efecto visual sin fabricar nada. */
  const buys  = events.filter((e) => e.side === "buy");
  const sells = events.filter((e) => e.side === "sell");
  const mixed = [];
  const max = Math.max(buys.length, sells.length);
  for (let i = 0; i < max; i++) {
    if (buys[i])  mixed.push(buys[i]);
    if (sells[i]) mixed.push(sells[i]);
  }
  return mixed;
}

function applyFlowEvents(flow) {
  const events = deriveFlowEvents(flow);
  if (!events.length) return;

  /* UNA ENTRADA POR LOTE, no una por evento.

     Antes se insertaba una fila por cada compra y venta
     estimada, todas con el MISMO importe y la MISMA hora —
     porque salen de repartir el volumen del intervalo entre el
     número de operaciones. El feed mostraba cuatro líneas
     idénticas seguidas y parecía inventado.

     Como el dato real es "en estos segundos hubo N compras y M
     ventas por X dólares", eso es exactamente lo que se muestra. */
  const buyCount = events.filter((e) => e.side === "buy").length;
  const sellCount = events.length - buyCount;
  const totalUsd = events.reduce((sum, e) => sum + Number(e.usdValue || 0), 0);

  if (buyCount > 0) {
    moodTrades.unshift({
      side: "buy",
      usdValue: totalUsd * (buyCount / events.length),
      count: buyCount,
      derived: true,
      ts: Date.now(),
      marketCapUsd: moodMarketCapIsReal ? moodMarketCap : 0
    });
  }

  if (sellCount > 0) {
    moodTrades.unshift({
      side: "sell",
      usdValue: totalUsd * (sellCount / events.length),
      count: sellCount,
      derived: true,
      ts: Date.now(),
      marketCapUsd: moodMarketCapIsReal ? moodMarketCap : 0
    });
  }

  if (moodTrades.length > 24) moodTrades.length = 24;

  /* El personaje reacciona al evento más fuerte del lote, no a
     cada uno: con seis eventos seguidos se vería un espasmo.
     buyCount y sellCount ya se calcularon arriba. */
  const dominant = events.reduce((a, b) => (b.usdValue > a.usdValue ? b : a), events[0]);

  const label = buyCount === sellCount ? dominant.side
              : buyCount > sellCount ? "buy" : "sell";

  moodLastAction = `${events.length} ${label === "buy" ? "buys" : "sells"} · 5m`;

  renderMoodTradesFeed();

  /* El lote entero cuenta como un evento de peso proporcional al
     numero de operaciones, no como una sola. Antes un intervalo
     con 14 compras pesaba lo mismo que uno con una. */
  applyMoodHeroImpulse(label, dominant.usdValue || 300,
    moodMarketCapIsReal ? moodMarketCap : 0,
    { count: Math.max(buyCount, sellCount) });
}

function registerMoodTrade(rawTrade) {
  const trade = parseMoodTradePayload(rawTrade);
  if (!trade) return;

  if (trade.name || trade.symbol || trade.image) {
    updateMoodTokenMeta({
      name:   trade.name   || moodTokenMeta.name,
      symbol: trade.symbol || moodTokenMeta.symbol,
      image:  trade.image  || moodTokenMeta.image
    });
  }

  if (!setMoodPrice(trade.price) && trade.marketCapUsd > 0) {
    setMoodPrice(trade.marketCapUsd / 1e9);
  }

  const bucket = getMoodTradeBucket(trade.usdValue || 0, trade.marketCapUsd || 0);
  const label  = { strong: "Strong", medium: "Medium", light: "Light" }[bucket];

  if (trade.side === "buy") {
    moodBuyCount += 1;
    moodBuyVolume += trade.usdValue;
    moodLastAction = `${label} buy`;
  } else {
    moodSellCount += 1;
    moodSellVolume += trade.usdValue;
    moodLastAction = `${label} sell`;
  }

  /* Un trade del stream trae marketCapUsd real de pump.fun.
     Si el snapshot aún no ha dado market cap, este vale. */
  if (trade.marketCapUsd > 0) {
    moodMarketCap = trade.marketCapUsd;
    moodMarketCapIsReal = true;
  }

  moodTrades.unshift(trade);
  if (moodTrades.length > 24) moodTrades.length = 24;

  updateMoodUI();
  applyMoodHeroImpulse(trade.side, trade.usdValue || 0, trade.marketCapUsd || 0);
}

function cleanupMoodStream() {
  clearTimeout(moodStreamReconnectTimer);
  moodStreamReconnectTimer = null;
  try { moodEventSource?.close(); } catch {}
  moodEventSource = null;
}

/* Backoff exponencial. Antes reintentaba cada 3s indefinidamente: con
   el endpoint caído eso es un reintento cada 3 segundos para siempre. */
let _moodReconnectAttempt = 0;

function connectMoodStream() {
  if (!moodResolvedAddress) return;
  cleanupMoodStream();

  const url = `/api/token-stream?address=${encodeURIComponent(moodResolvedAddress)}&source=auto`;

  try {
    moodEventSource = new EventSource(url);

    moodEventSource.addEventListener("open", () => { _moodReconnectAttempt = 0; });

    moodEventSource.addEventListener("source", (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        const map = { birdeye: "Birdeye Live", pumpportal: "Pump.fun Live" };
        moodTradesSource = map[payload?.source] || "Live";
        updateMoodTokenMeta({});
        updateMoodUI();
      } catch {}
    });

    moodEventSource.addEventListener("trade", (event) => {
      try { registerMoodTrade(JSON.parse(event.data || "{}")); }
      catch (err) { console.error("Mood stream parse error:", err); }
    });

    /* El servidor avisa cuando una fuente conecta pero se queda
       muda (token graduado fuera de pump.fun). No es un error:
       está cambiando de fuente, así que no cerramos el stream. */
    moodEventSource.addEventListener("source_silent", (event) => {
      try {
        const p = JSON.parse(event.data || "{}");
        console.info("WM stream: fuente muda", p);
      } catch {}
      moodTradesSource = "Switching source…";
      updateMoodTokenMeta({});
      updateMoodUI();
    });

    moodEventSource.addEventListener("fallback", (event) => {
      let reason = "";
      try { reason = JSON.parse(event.data || "{}")?.reason || ""; } catch {}

      /* Se distingue "no hay clave de API" de "no hay trades".
         Antes ambos decían lo mismo y no había forma de saber
         si faltaba configuración o si el token estaba inactivo. */
      moodTradesSource = reason === "no_birdeye_api_key"
        ? "Live feed unavailable"
        : "No recent trades";

      updateMoodTokenMeta({});
      updateMoodUI();
      cleanupMoodStream();
    });

    moodEventSource.onerror = () => {
      cleanupMoodStream();
      _moodReconnectAttempt += 1;

      if (_moodReconnectAttempt > 6) {
        moodTradesSource = "No live trades";
        updateMoodTokenMeta({});
        updateMoodUI();
        return;
      }

      moodTradesSource = "Reconnecting…";
      updateMoodTokenMeta({});
      updateMoodUI();

      const delay = Math.min(30000, 2000 * Math.pow(2, _moodReconnectAttempt - 1));
      moodStreamReconnectTimer = setTimeout(() => {
        if (moodResolvedAddress) connectMoodStream();
      }, delay);
    };
  } catch (err) {
    console.error("Mood stream connection error:", err);
  }
}

function resetMoodTokenState() {
  cleanupMoodStream();
  _moodReconnectAttempt = 0;
  moodTrades = [];
  moodPrice = 0;
  moodPrevPrice = 0;
  moodLastAction = "Watching";
  moodBuyCount = 0;
  moodSellCount = 0;
  moodBuyVolume = 0;
  moodSellVolume = 0;
  moodLiveScore = 50;
  moodLiveMood = getMoodByScore(50);
  moodMarketCap = 0;
  moodMarketCapIsReal = false;
  moodVolume24h = 0;
  moodTradesSource = "Waiting...";
  moodHistory = emptyMoodHistory();
  moodFlowEvents = [];
  lastFlowSnapshot = null;
}

async function loadMoodMarketSnapshot() {
  if (!moodResolvedAddress) return null;

  const market = await fetchJson(
    `/api/token-data?address=${encodeURIComponent(moodResolvedAddress)}`, null
  );
  if (!market || typeof market !== "object") return null;

  moodMarketSource = market?.meta?.source || "Auto";

  updateMoodTokenMeta({
    name:   market?.meta?.name   || moodTokenMeta.name,
    symbol: market?.meta?.symbol || moodTokenMeta.symbol,
    image:  market?.meta?.image  || moodTokenMeta.image
  });

  /* El snapshot NO pisa el precio si el stream está vivo: el stream
     es más reciente. Antes ambos escribían moodPrice y el número
     parpadeaba entre los dos cada 15 segundos. */
  const snapshotPrice = safeNum(market?.price, 0);
  const streamIsLive = moodEventSource && moodTrades.length > 0;

  const priceBefore = moodPrice;

  if (snapshotPrice > 0 && !streamIsLive) {
    setMoodPrice(snapshotPrice);
  } else if (snapshotPrice > 0 && moodPrice <= 0) {
    setMoodPrice(snapshotPrice);
  }

  // Market cap y volumen reales del proveedor.
  moodMarketCap       = safeNum(market?.marketCap, 0);
  moodMarketCapIsReal = Boolean(market?.marketCapIsReal) && moodMarketCap > 0;
  moodVolume24h       = safeNum(market?.volume, 0);

  moodBuyCount  = safeNum(market?.buys,  moodBuyCount);
  moodSellCount = safeNum(market?.sells, moodSellCount);

  /* El reparto compra/venta ahora sale del conteo real de
     transacciones del proveedor, no de lo poco que haya visto el
     stream desde que abriste la pestaña. */
  if (moodVolume24h > 0) {
    const totalTx = moodBuyCount + moodSellCount;
    if (totalTx > 0) {
      moodBuyVolume  = moodVolume24h * (moodBuyCount / totalTx);
      moodSellVolume = moodVolume24h * (moodSellCount / totalTx);
    }
  }

  if (market?.lastAction) moodLastAction = market.lastAction;

  /* Con el stream mudo, ESTA es la única señal viva del token.
     Se reacciona después de actualizar la UI para que el impulso
     se vea sobre el estado nuevo. */
  if (!streamIsLive) reactToPriceMove(priceBefore, moodPrice);

  /* Solo si el stream está mudo: con operaciones reales
     llegando, este flujo derivado sería ruido duplicado. */
  if (!streamIsLive) applyFlowEvents(market?.flow);

  recordTokenReaction();

  updateMoodUI();
  return market;
}

async function loadMoodChartSnapshot() {
  if (!moodResolvedAddress) return null;

  const chart = await fetchJson(
    `/api/token-chart?address=${encodeURIComponent(moodResolvedAddress)}&timeframe=${encodeURIComponent(moodTokenTimeframe)}`,
    null
  );

  if (!chart || !Array.isArray(chart?.prices) || chart.prices.length < 2) {
    drawMoodBackdrop();
    updateMoodUI();
    return null;
  }

  /* token-chart también devuelve token.{name,symbol,image,marketCap}.
     Antes se ignoraba entero. Lo usamos como refuerzo cuando
     token-data no ha resuelto todavía. */
  if (chart.token) {
    updateMoodTokenMeta({
      name:   chart.token.name   || moodTokenMeta.name,
      symbol: chart.token.symbol || moodTokenMeta.symbol,
      image:  chart.token.image  || moodTokenMeta.image
    });

    const chartCap = safeNum(chart.token.marketCap, 0);
    if (chartCap > 0 && !moodMarketCapIsReal) {
      moodMarketCap = chartCap;
      moodMarketCapIsReal = true;
    }
  }

  moodHistory[moodTokenTimeframe] = chart.prices.map((p) => ({
    ts: Number(p.ts || Date.now()),
    price: Number(p.price || 0)
  }));

  const last = chart.prices[chart.prices.length - 1];
  if (last?.price > 0) {
    moodPrevPrice = moodPrice > 0 ? moodPrice : Number(last.price);
    moodPrice = Number(last.price);
  }

  drawMoodBackdrop();
  updateMoodUI();
  return chart;
}

async function loadMoodTokenAddress(newAddress, meta = {}) {
  const cleaned = String(newAddress || "").trim();

  if (!cleaned) {
    resetMoodTokenState();
    updateMoodTokenMeta(meta);
    updateMoodUI();
    return;
  }

  MOOD_CA = cleaned;
  moodResolvedAddress = cleaned;

  resetMoodTokenState();
  updateMoodTokenMeta(meta);
  updateMoodUI();

  const resolved = await fetchJson(
    `/api/token-resolve?address=${encodeURIComponent(cleaned)}`, null
  );

  /* Si no se resuelve, se DICE. Antes se seguia adelante en
     silencio y la tarjeta se quedaba con "Live Token", "$---" y
     todas las filas en "Reading" indefinidamente, que se lee como
     que la pagina esta rota en vez de como que el token no esta
     disponible. */
  if (!resolved?.ok) {
    console.warn("WM: /api/token-resolve no resolvió", cleaned, resolved);
    setText("moodTokenSource", "Unavailable");
  }

  if (resolved?.ok) {
    moodResolvedAddress = resolved?.token?.address || cleaned;
    moodPairAddress     = resolved?.pair?.pairAddress || "";
    moodDexId           = resolved?.pair?.dexId || "";
    updateMoodTokenMeta({
      name:   resolved?.token?.name   || meta?.name,
      symbol: resolved?.token?.symbol || meta?.symbol,
      image:  resolved?.token?.image  || meta?.image
    });
  }

  await loadMoodMarketSnapshot();
  await loadMoodChartSnapshot();
  loadMoodOhlcv(true);
  connectMoodStream();
  renderTrendingTokens();
}

/* ===========================================================
   HISTÓRICO DE REACCIONES

   Guarda los tokens que el usuario ha mirado, con el mood que
   tenían. Dos usos:

   1. Volver a uno con un toque, sin buscar la dirección otra vez.
   2. Ver cómo ha cambiado desde entonces — que es lo que hace
      que quieras volver mañana.

   Vive en localStorage: no necesita backend y el dato es del
   usuario, no del sitio.
   =========================================================== */
const TOKEN_HISTORY_KEY = "wojakTokenHistory";
const TOKEN_HISTORY_MAX = 12;

let tokenHistory = [];

function loadTokenHistory() {
  try {
    const saved = lsGet(TOKEN_HISTORY_KEY);
    tokenHistory = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(tokenHistory)) tokenHistory = [];
  } catch {
    tokenHistory = [];
  }
}

function saveTokenHistory() {
  try { lsSet(TOKEN_HISTORY_KEY, JSON.stringify(tokenHistory)); } catch {}
}

/* Se registra cuando el token ya tiene datos reales, no al
   pincharlo: si se guardara antes, quedarían entradas con score
   50 y precio 0 que no dicen nada. */
function recordTokenReaction() {
  const address = moodResolvedAddress;
  if (!address || !(moodPrice > 0)) return;

  const entry = {
    address,
    symbol: String(moodTokenMeta.symbol || "---").toUpperCase(),
    name: moodTokenMeta.name || "",
    image: moodTokenMeta.image || "",
    score: roundScore(moodLiveScore),
    mood: moodLiveMood?.key || "neutral",
    price: moodPrice,
    ts: Date.now()
  };

  const existingIdx = tokenHistory.findIndex(
    (t) => String(t.address).toLowerCase() === address.toLowerCase()
  );

  if (existingIdx >= 0) {
    /* Se conserva el precio de la PRIMERA vez para poder mostrar
       cuánto ha cambiado desde que lo viste. Ese delta es todo el
       valor del histórico. */
    entry.firstPrice = tokenHistory[existingIdx].firstPrice || tokenHistory[existingIdx].price;
    entry.firstSeen = tokenHistory[existingIdx].firstSeen || tokenHistory[existingIdx].ts;
    tokenHistory.splice(existingIdx, 1);
  } else {
    entry.firstPrice = moodPrice;
    entry.firstSeen = Date.now();
  }

  tokenHistory.unshift(entry);
  if (tokenHistory.length > TOKEN_HISTORY_MAX) {
    tokenHistory.length = TOKEN_HISTORY_MAX;
  }

  saveTokenHistory();
  renderTokenHistory();
}

function renderTokenHistory() {
  const wrap = byId("moodHistoryStrip");
  const section = byId("moodHistorySection");
  if (!wrap || !section) return;

  if (!tokenHistory.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  const current = String(moodResolvedAddress || "").toLowerCase();

  wrap.innerHTML = tokenHistory.map((t) => {
    const active = String(t.address).toLowerCase() === current ? " active" : "";

    /* Cambio desde que lo viste por primera vez. Es el dato que
       convierte una lista de visitados en algo que se consulta. */
    const since = (t.firstPrice > 0 && t.price > 0)
      ? ((t.price - t.firstPrice) / t.firstPrice) * 100 : 0;
    const cls = since > 1 ? "positive" : since < -1 ? "negative" : "neutral";
    const txt = Math.abs(since) >= 0.1
      ? `${since > 0 ? "+" : ""}${since.toFixed(0)}%` : "";

    return `
      <button type="button" class="mood-trending-chip${active}"
              data-token-address="${escapeHtml(t.address)}"
              data-token-name="${escapeHtml(t.name || t.symbol)}"
              data-token-symbol="${escapeHtml(t.symbol)}"
              data-token-image="${escapeHtml(t.image)}">
        <img src="${escapeHtml(t.image || "/assets/logo/wojakmeter_logo.png")}" alt="" loading="lazy">
        <span class="chip-symbol">${escapeHtml(t.symbol)}</span>
        <span class="chip-mood mood-${escapeHtml(t.mood)}">${t.score}</span>
        ${txt ? `<span class="chip-change ${cls}">${txt}</span>` : ""}
      </button>`;
  }).join("");
}

function setupTokenHistory() {
  loadTokenHistory();
  renderTokenHistory();

  const wrap = byId("moodHistoryStrip");
  bindOnce(wrap, "boundHistory", "click", async (e) => {
    const chip = e.target.closest("[data-token-address]");
    if (!chip) return;

    isUsingDefaultTrending = false;
    isUsingMoodToken = false;

    await loadMoodTokenAddress(chip.dataset.tokenAddress, {
      name: chip.dataset.tokenName,
      symbol: chip.dataset.tokenSymbol,
      image: chip.dataset.tokenImage || "/assets/logo/wojakmeter_logo.png",
      source: "History"
    });
  });

  bindOnce(byId("moodHistoryClear"), "boundHistClear", "click", () => {
    tokenHistory = [];
    try { localStorage.removeItem(TOKEN_HISTORY_KEY); } catch {}
    renderTokenHistory();
  });
}

/* ===========================================================
   COMPARTIR EL MOOD DE UN TOKEN

   Distribución orgánica: la gente comparte SU memecoin, no tu
   sitio — pero tu marca y tu lectura viajan con ella.
   =========================================================== */
function shareTokenMoodOnX() {
  const symbol = String(moodTokenMeta.symbol || "TOKEN").toUpperCase();
  const mood = moodLiveMood?.name || "Neutral";
  const score = roundScore(moodLiveScore);
  const change = getMoodTimeframeChange(moodTokenTimeframe);

  const emoji = {
    Euphoria: "🚀", Content: "😌", Optimism: "🙂", Neutral: "😐",
    Doubt: "🤔", Concern: "😟", Frustration: "😤"
  }[mood] || "🧠";

  const lines = [
    `${emoji} $${symbol} is feeling ${mood.toUpperCase()} (${score}/100)`,
    "",
    `Price: ${formatCurrency(moodPrice)}`,
    `${moodTokenTimeframe}: ${formatPercent(change)}`
  ];

  if (moodMarketCapIsReal) lines.push(`Market Cap: ${formatCurrencyCompact(moodMarketCap)}`);
  if (moodVolume24h > 0) lines.push(`Volume: ${formatCurrencyCompact(moodVolume24h)}`);

  lines.push("", "Live token sentiment by WojakMeter");

  /* Se pasa el estado por query para que la imagen de
     previsualización muestre ESTE token, no el mercado global. */
  const params = new URLSearchParams({
    mood: moodLiveMood?.key || "neutral",
    score: String(score),
    coin: symbol,
    tf: moodTokenTimeframe,
    change: String(Number(change || 0).toFixed(2)),
    style: getCurrentStyle(),
    token: moodResolvedAddress || "",
    v: String(Date.now())
  });

  const url =
    "https://twitter.com/intent/tweet?text=" + encodeURIComponent(lines.join("\n")) +
    "&url=" + encodeURIComponent(`https://wojakmeter.com/share?${params}`);

  window.open(url, "_blank", "noopener,noreferrer");
}

/* ===========================================================
   TOKENS EN TENDENCIA

   Convierte el módulo de "mira este token" en "juega con el
   mercado". Sin esto, para probar otro token había que ir a
   buscar una dirección fuera del sitio y pegarla — fricción
   suficiente para que nadie lo haga.
   =========================================================== */
let trendingTokens = [];

function renderTrendingTokens() {
  const strip = byId("moodTrendingStrip");
  if (!strip) return;

  if (!trendingTokens.length) {
    strip.innerHTML = `<div class="mood-trending-empty">Loading trending tokens…</div>`;
    return;
  }

  const current = String(moodResolvedAddress || "").toLowerCase();

  strip.innerHTML = trendingTokens.map((t, i) => {
    const address = String(t.address || t.mint || "");
    const symbol = String(t.symbol || "---").toUpperCase();
    const active = address.toLowerCase() === current ? " active" : "";

    /* El cambio se muestra en el chip: es lo que decide en qué
       token pinchar. Un chip sin dato es solo un logo. */
    const change = Number(t.change ?? t.priceChange ?? 0);
    const changeCls = change > 0 ? "positive" : change < 0 ? "negative" : "neutral";
    const changeTxt = Number.isFinite(change) && change !== 0
      ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : "";

    return `
      <button type="button" class="mood-trending-chip${active}" data-token-address="${escapeHtml(address)}"
              data-token-name="${escapeHtml(t.name || symbol)}"
              data-token-symbol="${escapeHtml(symbol)}"
              data-token-image="${escapeHtml(t.image || "")}">
        <span class="chip-rank">${i + 1}</span>
        ${t.image
          ? `<img src="${escapeHtml(t.image)}" alt="" loading="lazy" onerror="this.remove()">`
          : ""}
        <span class="chip-symbol">${escapeHtml(symbol)}</span>
        ${changeTxt ? `<span class="chip-change ${changeCls}">${changeTxt}</span>` : ""}
      </button>`;
  }).join("");
}

/* Los proveedores de tendencias no se ponen de acuerdo en cómo
   llamar a los campos: symbol/ticker/tokenSymbol, image/logo/uri/
   image_uri... Con una sola forma esperada, los chips salían
   vacíos ("1 | ---"). Se normaliza aquí. */
function normalizeTrendingToken(t) {
  if (!t || typeof t !== "object") return null;

  const address = t.address || t.mint || t.tokenAddress || t.ca || t.id || "";
  if (!address) return null;

  const symbol = t.symbol || t.ticker || t.tokenSymbol || t.baseToken?.symbol || "";
  const name = t.name || t.tokenName || t.baseToken?.name || symbol || "Token";

  const image =
    t.image || t.logo || t.logoURI || t.icon ||
    t.image_uri || t.imageUrl || t.uri || t.info?.imageUrl || "";

  const change = Number(
    t.change ?? t.priceChange ?? t.priceChange24h ??
    t.priceChange?.h24 ?? t.change24h ?? 0
  );

  return {
    address: String(address),
    symbol: String(symbol || address.slice(0, 4)).toUpperCase(),
    name: String(name),
    image: String(image),
    change: Number.isFinite(change) ? change : 0
  };
}

async function loadTrendingTokens() {
  const api = await fetchJson("/api/token-trending", { tokens: [] });

  /* La respuesta puede venir como {tokens:[...]}, {data:[...]}
     o como array pelado. */
  const raw = Array.isArray(api?.tokens) ? api.tokens
            : Array.isArray(api?.data) ? api.data
            : Array.isArray(api) ? api
            : [];

  trendingTokens = raw.map(normalizeTrendingToken).filter(Boolean).slice(0, 10);

  if (!trendingTokens.length) {
    console.warn("WM: /api/token-trending sin tokens utilizables", api);
    /* "Loading…" eterno es la peor de las tres opciones: promete
       algo que no va a llegar. */
    const strip = byId("moodTrendingStrip");
    if (strip && !strip.querySelector("[data-token-address]")) {
      strip.textContent = "No trending tokens right now";
    }
  }

  renderTrendingTokens();
  return trendingTokens;
}

function setupTrendingStrip() {
  const strip = byId("moodTrendingStrip");
  bindOnce(strip, "boundTrending", "click", async (e) => {
    const chip = e.target.closest("[data-token-address]");
    if (!chip) return;

    const address = chip.dataset.tokenAddress;
    if (!address) return;

    isUsingDefaultTrending = false;
    isUsingMoodToken = false;

    await loadMoodTokenAddress(address, {
      name: chip.dataset.tokenName || "Trending Token",
      symbol: chip.dataset.tokenSymbol || "---",
      image: chip.dataset.tokenImage || "/assets/logo/wojakmeter_logo.png",
      source: "Trending"
    });

    renderTrendingTokens();
  });
}

async function tryLoadDefaultTrendingToken() {
  const tokens = await loadTrendingTokens();

  isUsingDefaultTrending = true;
  isUsingMoodToken = false;

  if (tokens.length) {
    const top = tokens[0];
    await loadMoodTokenAddress(top.address || top.mint, {
      name:   top.name   || "Trending Token",
      symbol: top.symbol || "---",
      image:  top.image  || "/assets/logo/wojakmeter_logo.png",
      source: "Auto"
    });
  } else {
    await loadMoodTokenAddress("So11111111111111111111111111111111111111112", {
      name: "SOL", symbol: "SOL",
      image: "/assets/logo/wojakmeter_logo.png", source: "Fallback"
    });
  }
}

// ===============================
// BAG MOOD
// ===============================
const BAG_STORAGE_KEY       = "wojakBagMoodHoldings";
const BAG_STYLE_STORAGE_KEY = "wojakBagMoodStyle";

let bagMoodHoldings  = [];
let bagMoodMode      = "portfolio";
let bagMoodStyle     = DEFAULT_STYLE;
let bagSearchResults = [];
let bagSelectedIndex = 0;

const BAG_MAJORS = [
  "BTC","ETH","SOL","BNB","XRP","ADA","AVAX","LINK",
  "DOGE","TRX","DOT","MATIC","POL","LTC","BCH"
];

const MOOD_KEY_SCORE = {
  euphoria: 90, content: 75, optimism: 64,
  neutral: 50, doubt: 40, concern: 25, frustration: 10
};

function getBagMoodStyle() {
  return ALLOWED_STYLES.includes(bagMoodStyle) ? bagMoodStyle : DEFAULT_STYLE;
}

function loadBagMoodStyle() {
  const saved = lsGet(BAG_STYLE_STORAGE_KEY);
  return ALLOWED_STYLES.includes(saved) ? saved : getCurrentStyle();
}

function saveBagMoodHoldings() {
  try { lsSet(BAG_STORAGE_KEY, JSON.stringify(bagMoodHoldings)); } catch {}
}

function loadBagMoodHoldings() {
  try {
    const saved = lsGet(BAG_STORAGE_KEY);
    bagMoodHoldings = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(bagMoodHoldings)) bagMoodHoldings = [];
  } catch {
    bagMoodHoldings = [];
  }
}

function normalizeBagCoin(item) {
  if (!item) return null;
  return {
    id:       item.id || item.coinId || item.address || "",
    symbol:   String(item.symbol || "---").toUpperCase(),
    name:     item.name || item.symbol || "Unknown",
    image:    item.image || item.thumb || item.large || "/assets/logo/wojakmeter_logo.png",
    source:   item.source || "local",
    network:  item.network || item.chain || "",
    contract: item.contract || item.address || "",
    current_price: Number(item.current_price ?? item.price ?? 0),
    market_cap:    Number(item.market_cap ?? item.marketCap ?? 0)
  };
}

function findLocalBagCoin(query) {
  const q = String(query || "").toLowerCase();
  const match = (c) => c.symbol?.toLowerCase?.() === q || c.name?.toLowerCase?.() === q;
  return topCoinsData.find(match) || trendingCoinsData.find(match) || topMemesData.find(match) || null;
}

async function searchBagCoins(query) {
  const clean = String(query || "").trim();
  if (!clean) return [];

  const local = findLocalBagCoin(clean);
  const localResults = local ? [{ ...normalizeBagCoin(local), source: "WojakMeter" }] : [];

  /* DOS FUENTES REMOTAS EN PARALELO.

     /api/bag-search cubría lo que ya estaba cargado en la página
     y tokens de Solana. Quedaban fuera miles de monedas
     listadas: quien tuviera KAS, TIA o RENDER no podía añadirlas.

     /api/coin-search usa el catálogo completo de CoinGecko. Van
     en paralelo para no encadenar dos esperas. */
  const [remote, wide] = await Promise.all([
    fetchJson(`/api/bag-search?q=${encodeURIComponent(clean)}`, { results: [] }),
    fetchJson(`/api/coin-search?q=${encodeURIComponent(clean)}`, { coins: [] })
  ]);

  const remoteResults = Array.isArray(remote?.results)
    ? remote.results.map(normalizeBagCoin).filter(Boolean) : [];

  const wideResults = Array.isArray(wide?.coins)
    ? wide.coins.map(normalizeBagCoin).filter(Boolean) : [];

  const seen = new Set();
  /* El orden importa: primero lo local (ya tiene precio en vivo),
     luego lo específico de Solana, y al final el catálogo amplio.
     La deduplicación conserva la primera aparición. */
  return [...localResults, ...remoteResults, ...wideResults].filter((coin) => {
    /* La clave ya no incluye `source`: BTC de WojakMeter y BTC de
       CoinGecko son la MISMA moneda, y salían dos veces en los
       resultados. Se queda la primera, que es la local. */
    const key = `${coin.contract || coin.id || coin.symbol}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 14);
}

function getBagCurrentPrice(holding) {
  const local = Number(getCoinBySymbol(holding.symbol)?.current_price || 0);
  if (local > 0) return local;
  const own = Number(holding.current_price || 0);
  return own > 0 ? own : 0;
}

function isVolatileBagCoin(holding) {
  const symbol = String(holding.symbol || "").toUpperCase();
  const name   = String(holding.name || "").toLowerCase();
  const source = String(holding.source || "").toLowerCase();
  const cap    = Number(holding.market_cap || 0);

  if (topMemesData.some((c) => c.symbol?.toUpperCase?.() === symbol)) return true;
  if (source.includes("pump") || source.includes("meme")) return true;
  if (["meme","inu","pepe","dog"].some((w) => name.includes(w))) return true;
  if (!BAG_MAJORS.includes(symbol)) return true;
  if (cap > 0 && cap < 1e9) return true;
  return false;
}

function getBagMoodByPnlPercent(pnlPercent, holding = null) {
  const pct = Number(pnlPercent || 0);
  const volatile = holding ? isVolatileBagCoin(holding) : false;

  const bands = volatile
    ? [[80, 90], [35, 75], [12, 64], [-8, 50], [-20, 40], [-40, 25]]
    : [[18, 90], [9, 75], [3, 64], [-3, 50], [-7, 40], [-12, 25]];

  for (const [threshold, score] of bands) {
    if (threshold >= 0 ? pct >= threshold : pct > threshold) return getMoodByScore(score);
  }
  return getMoodByScore(10);
}

/* Unidades compradas = dinero invertido / precio de entrada. */
/* Las cantidades de token varían en muchos órdenes de magnitud:
   0.42 BTC frente a 38.000.000 de una memecoin. Un formato fijo
   deja lo uno ilegible o lo otro truncado. */
function formatTokenAmount(units) {
  const n = Number(units);
  if (!Number.isFinite(n) || n <= 0) return "--";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toPrecision(3);
}

function getHoldingUnits(holding) {
  const invested = Number(holding.usdValue || 0);
  const entryPrice = Number(holding.entryPrice || 0);
  if (!(invested > 0) || !(entryPrice > 0)) return 0;
  return invested / entryPrice;
}

/* Valor actual = unidades x precio de mercado.

   Estas dos se perdieron al reescribir la sección de la bolsa y
   provocaban ReferenceError en renderBagMood: la cabecera se
   pintaba con cifras y la lista quedaba vacía, indistinguible de
   "no tienes nada". */
function getHoldingValue(holding) {
  const units = getHoldingUnits(holding);
  const price = getBagCurrentPrice(holding);
  if (units <= 0 || price <= 0) return 0;
  return units * price;
}

function getHoldingPnlData(holding) {
  const invested   = Number(holding.usdValue   || 0);
  const entryPrice = Number(holding.entryPrice || 0);
  const currentPrice = getBagCurrentPrice(holding);

  const units = (invested > 0 && entryPrice > 0) ? invested / entryPrice : 0;
  const currentValue = (units > 0 && currentPrice > 0) ? units * currentPrice : 0;

  return {
    invested, entryPrice, currentPrice, currentValue,
    pnlUsd: currentValue - invested,
    pnlPercent: (entryPrice > 0 && currentPrice > 0)
      ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0
  };
}

function calculateBagMood() {
  if (!bagMoodHoldings.length) {
    return {
      invested: 0, value: 0, pnlUsd: 0, pnlPercent: 0,
      score: 50, mood: getMoodByScore(50), selected: null
    };
  }

  if (bagMoodMode === "single") {
    const selected = bagMoodHoldings[bagSelectedIndex] || bagMoodHoldings[0];
    const data = getHoldingPnlData(selected);
    const mood = getBagMoodByPnlPercent(data.pnlPercent, selected);
    return {
      ...data, value: data.currentValue,
      score: roundScore(MOOD_KEY_SCORE[mood.key] ?? 50), mood, selected
    };
  }

  let invested = 0;
  let value = 0;
  bagMoodHoldings.forEach((h) => {
    const d = getHoldingPnlData(h);
    invested += d.invested;
    value += d.currentValue;
  });

  const pnlUsd = value - invested;
  const pnlPercent = invested > 0 ? (pnlUsd / invested) * 100 : 0;
  const mood = getBagMoodByPnlPercent(pnlPercent);

  return {
    invested, value, pnlUsd, pnlPercent,
    score: roundScore(MOOD_KEY_SCORE[mood.key] ?? 50), mood, selected: null
  };
}

function addBagHolding(coin, usdValue, entryPrice = 0) {
  const normalized = normalizeBagCoin(coin);
  if (!normalized) return;

  const value = Number(usdValue || 0);
  const entry = Number(entryPrice || 0) || Number(normalized.current_price || 0);
  if (!(value > 0) || !(entry > 0)) return;

  const existing = bagMoodHoldings.find((h) =>
    (normalized.contract && h.contract)
      ? h.contract === normalized.contract
      : h.symbol === normalized.symbol
  );

  if (existing) {
    Object.assign(existing, normalized, { usdValue: value, entryPrice: entry });
  } else {
    bagMoodHoldings.push({ ...normalized, usdValue: value, entryPrice: entry });
    bagSelectedIndex = bagMoodHoldings.length - 1;
  }

  saveBagMoodHoldings();
  renderBagMood();
}

function removeBagHolding(index) {
  bagMoodHoldings.splice(index, 1);
  if (bagSelectedIndex >= bagMoodHoldings.length) {
    bagSelectedIndex = Math.max(0, bagMoodHoldings.length - 1);
  }
  saveBagMoodHoldings();
  renderBagMood();
}

function renderBagSearchResults() {
  const box = byId("bagSearchResults");
  if (!box) return;

  if (!bagSearchResults.length) {
    box.innerHTML = "";
    box.classList.remove("open");
    return;
  }

  /* Capa flotante. Antes se insertaba en el flujo y empujaba la
     lista de posiciones hacia abajo: parecía que la página se
     rompía al buscar. */
  box.classList.add("open");

  box.innerHTML = bagSearchResults.map((coin, i) => `
    <div class="bag-result">
      <div class="bag-coin">
        <img src="${escapeHtml(coin.image)}" alt="" loading="lazy">
        <div>
          <strong>${escapeHtml(coin.symbol)}</strong>
          <span>${escapeHtml(coin.name)}${coin.network ? " · " + escapeHtml(coin.network) : ""}</span>
        </div>
      </div>
      <span>${escapeHtml(coin.source || "source")}</span>
      <button class="bag-add-btn" type="button" data-bag-result-index="${i}">Add</button>
    </div>`).join("");
}

function renderBagMood() {
  const section = byId("bagMoodSection");
  if (!section) return;

  const result = calculateBagMood();
  const mood = result.mood;
  const bagStyle = getBagMoodStyle();

  const title = byId("bagMoodTitle");
  if (title) { title.textContent = mood.name; title.className = `mood-${mood.key}`; }

  setText("bagMoodScore", `${result.score}/100`);
  setTextWithPolarity("bagMoodChange", formatPercent(result.pnlPercent), result.pnlPercent);
  setText("bagPortfolioValue", formatCurrency(result.value));
  setText("bagTotalInvested", formatCurrency(result.invested));
  setTextWithPolarity("bagPortfolioPnl", formatCurrency(result.pnlUsd), result.pnlUsd);
  setTextWithPolarity("bagPortfolioPnlPercent", formatPercent(result.pnlPercent), result.pnlPercent);
  setText("bagMoodModeLabel", bagMoodMode === "single" ? "Coin Mood" : "Portfolio Mood");

  const heroImg = byId("bagMoodHeroImg");
  if (heroImg) {
    heroImg.className = `bag-mood-hero-img ${mood.anim}`;
    setImage(heroImg, getHeroImagePath(bagStyle, mood.key), getHeroImagePath(DEFAULT_STYLE, mood.key));
  }

  qsa("[data-bag-mode]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.bagMode === bagMoodMode);
  });

  const selector = byId("bagStyleSelector");
  if (selector && selector.value !== bagStyle) selector.value = bagStyle;

  const list = byId("bagMoodList");
  if (!list) return;

  if (!bagMoodHoldings.length) {
    list.innerHTML = `<div class="bag-empty">Build your bag to see what it feels like.</div>`;
    return;
  }

  /* PESO DE CADA POSICIÓN.

     Faltaba lo que hace útil a un portafolio: saber cuánto pesa
     cada cosa. Sin esto no puedes distinguir si BTC es el 90% de
     tu bolsa o el 10%, y esa diferencia lo cambia todo. */
  const totalValue = bagMoodHoldings.reduce(
    (sum, h) => sum + getHoldingValue(h), 0
  ) || 1;

  /* Ordenadas por valor: lo que más pesa, primero. Antes salían
     en orden de inserción, que no significa nada. */
  const sorted = bagMoodHoldings
    .map((holding, index) => ({ holding, index }))
    .sort((a, b) => getHoldingValue(b.holding) - getHoldingValue(a.holding));

  /* UNA FILA por posición en vez de seis.

     Antes cada moneda mostraba Invested, Value, Entry, Now, PNL
     y Mood en filas separadas: unos 400px para UNA posición. Con
     cinco monedas eran 2.000px de scroll. Ahora son 64px. */
  list.innerHTML = sorted.map(({ holding, index }) => {
    const d = getHoldingPnlData(holding);
    const coinMood = getBagMoodByPnlPercent(d.pnlPercent, holding);
    const cls = d.pnlPercent > 0 ? "positive" : d.pnlPercent < 0 ? "negative" : "neutral";
    const active = bagMoodMode === "single" && bagSelectedIndex === index ? " active-bag-row" : "";
    const weight = (d.currentValue / totalValue) * 100;
    const units = getHoldingUnits(holding);

    return `
      <div class="bag-row${active}" data-select-bag="${index}">
        <div class="bag-row-coin">
          <img src="${escapeHtml(holding.image || "/assets/logo/wojakmeter_logo.png")}" alt="" loading="lazy">
          <div class="bag-row-id">
            <strong>${escapeHtml(holding.symbol)}</strong>
            <span>${weight.toFixed(0)}% of bag</span>
          </div>
        </div>

        <div class="bag-row-value">
          <strong>${formatCurrency(d.currentValue)}</strong>
          <span>from ${formatCurrency(d.invested)}</span>
        </div>

        <div class="bag-row-detail">
          <div><span>Qty</span><strong>${formatTokenAmount(units)}</strong></div>
          <div><span>Entry</span><strong>${formatCurrency(holding.entryPrice)}</strong></div>
          <div><span>Now</span><strong>${formatCurrency(getBagCurrentPrice(holding))}</strong></div>
        </div>

        <div class="bag-row-pnl ${cls}">
          <strong>${formatPercent(d.pnlPercent)}</strong>
          <span>${d.pnlUsd >= 0 ? "+" : "−"}${formatCurrency(Math.abs(d.pnlUsd))}</span>
        </div>

        <div class="bag-row-mood mood-${coinMood.key}">
          <img src="${escapeHtml(getIconImagePath(getBagMoodStyle(), coinMood.key))}"
               alt="${escapeHtml(coinMood.name)}" title="${escapeHtml(coinMood.name)}" loading="lazy">
        </div>

        <button class="bag-remove-btn" type="button" data-remove-bag="${index}"
                aria-label="Remove ${escapeHtml(holding.symbol)}">×</button>

        <div class="bag-row-weight"><span style="width:${weight.toFixed(1)}%"></span></div>
      </div>`;
  }).join("");

  renderBagAllocation(sorted, totalValue);
}

/* Barra de asignación: una sola línea que muestra la composición
   entera. Responde "¿qué tengo?" sin leer una tabla. Cada tramo
   va coloreado por el mood de esa posición, así que cuenta a la
   vez cuánto pesa cada cosa y cómo va. */
function renderBagAllocation(sorted, totalValue) {
  const bar = byId("bagAllocationBar");
  if (!bar) return;

  if (!sorted.length || totalValue <= 0) {
    bar.innerHTML = "";
    return;
  }

  bar.innerHTML = sorted.map(({ holding }) => {
    const value = getHoldingValue(holding);
    const pct = (value / totalValue) * 100;
    if (pct < 0.5) return "";

    const d = getHoldingPnlData(holding);
    const mood = getBagMoodByPnlPercent(d.pnlPercent, holding);

    return `<span class="bag-alloc-seg" style="width:${pct.toFixed(2)}%; background:${
      getMoodColor(mood.key)
    }" title="${escapeHtml(holding.symbol)} · ${pct.toFixed(1)}%"></span>`;
  }).join("");
}

function shareBagMoodOnX() {
  const r = calculateBagMood();
  const text = `My Bag Mood is ${r.mood.name} (${r.score}/100)

Portfolio Value: ${formatCurrency(r.value)}
Invested: ${formatCurrency(r.invested)}
PNL: ${formatCurrency(r.pnlUsd)} (${formatPercent(r.pnlPercent)})

Track the emotion of your bags`;

  const url = new URL("https://twitter.com/intent/tweet");
  url.searchParams.set("text", text);
  url.searchParams.set("url", "https://wojakmeter.com");
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function refreshBagMoodPricesFromMarket() {
  if (!bagMoodHoldings.length) return;
  let changed = false;

  bagMoodHoldings = bagMoodHoldings.map((holding) => {
    const local = getCoinBySymbol(holding.symbol);
    if (!local?.current_price) return holding;
    if (Number(local.current_price) === Number(holding.current_price)) return holding;
    changed = true;
    return {
      ...holding,
      current_price: Number(local.current_price || 0),
      market_cap:    Number(local.market_cap || holding.market_cap || 0),
      image: local.image || holding.image,
      name:  local.name  || holding.name
    };
  });

  if (changed) { saveBagMoodHoldings(); renderBagMood(); }
}

// ===============================
// BUBBLE MAPS
// ===============================
function isMobileBubbleMap() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function getBubbleCoinScore(coin) {
  return roundScore(normalizeChangeToScore(getCoinChangeForTimeframe(coin, globalTimeframe), 6));
}

function getBubbleSize(marketCap) {
  const mobile = isMobileBubbleMap();
  const minSize = mobile ? 32 : 42;
  const maxSize = mobile ? 82 : 126;

  const cap = Number(marketCap || 0);
  if (!Number.isFinite(cap) || cap <= 0) return minSize;

  const minCap = 5e8, maxCap = 1.5e12;
  const norm = (Math.log10(Math.max(cap, minCap)) - Math.log10(minCap)) /
               (Math.log10(maxCap) - Math.log10(minCap));

  return Math.round(minSize + clamp(norm, 0, 1) * (maxSize - minSize));
}

function getBubbleY(score, height, size) {
  const pad = size / 2 + 24;
  return (height - pad) - (clamp(score, 0, 100) / 100) * ((height - pad) - pad);
}

/* Antes usaba Date.now() dentro de un sin(), así que cada render movía
   todas las burbujas aunque los datos fueran idénticos. Ahora la
   posición depende solo del índice y de la semilla estable. */
function getBubbleX(index, width, size, seed = 0.5) {
  const cols = width < 480 ? 5 : width < 700 ? 7 : 10;
  const col = index % cols;
  const cellWidth = width / cols;
  const baseX = col * cellWidth + cellWidth / 2;
  const jitter = (seed - 0.5) * cellWidth * 0.55;
  return clamp(baseX + jitter, size / 2 + 14, width - size / 2 - 14);
}

function getBubbleGlowFromVolume(volume) {
  const norm = clamp((Number(volume || 0) - 3e7) / (3e9 - 3e7), 0, 1);
  return Math.round(10 + norm * 22);
}

/* Antes: 95 iteraciones × 1225 pares = ~116.000 comparaciones por
   render, y se llamaba en cada carga de datos. Bajado a 26 iteraciones
   y con salida temprana cuando ya no hay solapes. */
function resolveBubbleCollisions(items, width, height) {
  const padding = 8;
  const MAX_ITERATIONS = 26;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let moved = false;

    for (let a = 0; a < items.length; a++) {
      for (let b = a + 1; b < items.length; b++) {
        const A = items[a], B = items[b];
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const distSq = dx * dx + dy * dy;
        const minDist = A.size / 2 + B.size / 2 + padding;

        if (distSq >= minDist * minDist) continue;

        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist, ny = dy / dist;

        A.x -= nx * overlap; A.y -= ny * overlap;
        B.x += nx * overlap; B.y += ny * overlap;
        moved = true;
      }
    }

    items.forEach((item) => {
      const r = item.size / 2 + 12;
      item.x = clamp(item.x, r, width - r);
      item.y = clamp(item.y, r, height - r);
      item.y += (item.targetY - item.y) * 0.09;
      item.x += (item.targetX - item.x) * 0.04;
    });

    if (!moved) break;
  }

  return items;
}

function getBubbleSourceCoins() {
  const seen = new Set();
  return [...topCoinsData, ...trendingCoinsData, ...topMemesData]
    .filter((coin) => {
      const s = String(coin.symbol || "").toUpperCase();
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    })
    .sort((a, b) => Number(b.market_cap || 0) - Number(a.market_cap || 0))
    .slice(0, 50);
}

function closeActiveBubbleTooltip() {
  activeBubbleSymbol = null;
  qsa(".bubble-coin").forEach((b) => b.classList.remove("bubble-active"));
}

function setActiveBubbleTooltip(symbol) {
  activeBubbleSymbol = symbol;
  qsa(".bubble-coin").forEach((b) => {
    b.classList.toggle("bubble-active", b.dataset.symbol === symbol);
  });
}

function createBubbleElement(coin) {
  const symbol = coin.symbol?.toUpperCase?.() || "---";

  const bubble = document.createElement("button");
  bubble.type = "button";
  bubble.className = "bubble-coin";
  bubble.dataset.symbol = symbol;
  bubble.setAttribute("aria-label", `${symbol} — open chart`);

  bubble.innerHTML = `
    <div class="bubble-motion">
      <div class="bubble-inner">
        <img src="${escapeHtml(coin.image || "")}" alt="" loading="lazy" onerror="this.style.display='none'">
      </div>
    </div>
    <div class="bubble-tooltip tooltip-top">
      <div class="tooltip-head">
        <img src="${escapeHtml(coin.image || "")}" alt="" loading="lazy" onerror="this.style.display='none'">
        <div>
          <b>${escapeHtml(symbol)}</b>
          <span class="tooltip-name">${escapeHtml(coin.name || symbol)}</span>
        </div>
      </div>
      <div class="tooltip-row"><span>Mood</span><strong class="tooltip-mood">--</strong></div>
      <div class="tooltip-row"><span>Score</span><strong class="tooltip-score">--</strong></div>
      <div class="tooltip-row"><span class="tooltip-tf-label">${escapeHtml(globalTimeframe)}</span><strong class="tooltip-change">--</strong></div>
      <div class="tooltip-row"><span>Volume</span><strong class="tooltip-volume">--</strong></div>
      <div class="tooltip-row"><span>Market Cap</span><strong class="tooltip-cap">--</strong></div>
    </div>`;

  bubble.addEventListener("mouseenter", () => { isHoveringBubble = true; });
  bubble.addEventListener("mouseleave", () => { isHoveringBubble = false; });

  bubble.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!symbol) return;

    // Móvil: primer toque muestra info, segundo abre el chart.
    if (isMobileBubbleMap() && activeBubbleSymbol !== symbol) {
      setActiveBubbleTooltip(symbol);
      return;
    }

    if (isBubbleMapExpanded) toggleBubbleMapExpanded(false);
    await selectCoin(symbol);
  });

  return bubble;
}

function ensureBubbleElements() {
  const stage = byId("bubbleMapStage");
  if (!stage) return;

  const source = getBubbleSourceCoins();
  const nextSymbols = new Set(source.map((c) => c.symbol?.toUpperCase?.()));

  bubbleCoins = bubbleCoins.filter((item) => {
    if (nextSymbols.has(item.symbol)) return true;
    item.el?.remove();
    return false;
  });

  const existing = new Map(bubbleCoins.map((i) => [i.symbol, i]));

  source.forEach((coin) => {
    const symbol = coin.symbol?.toUpperCase?.() || "";
    if (!symbol) return;

    const found = existing.get(symbol);
    if (found) { found.coin = coin; return; }

    const item = {
      symbol, coin,
      el: createBubbleElement(coin),
      xSeed: Math.random(),
      x: 0, y: 0, size: 0
    };
    bubbleCoins.push(item);
    stage.appendChild(item.el);
  });
}

function calculateBubbleMapPositions() {
  const stage = byId("bubbleMapStage");
  if (!stage || !bubbleCoins.length) return;

  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const layout = bubbleCoins.map((item, index) => {
    const size = getBubbleSize(item.coin.market_cap);
    const targetX = getBubbleX(index, rect.width, size, item.xSeed);
    const targetY = getBubbleY(getBubbleCoinScore(item.coin), rect.height, size);
    return {
      item, size,
      x: item.x || targetX,
      y: item.y || targetY,
      targetX, targetY
    };
  });

  resolveBubbleCollisions(layout, rect.width, rect.height).forEach((l) => {
    l.item.x = l.x;
    l.item.y = l.y;
    l.item.size = l.size;
  });
}

function renderBubbleMaps() {
  const stage = byId("bubbleMapStage");
  if (!stage) return;

  ensureBubbleElements();
  calculateBubbleMapPositions();

  const stageHeight = stage.getBoundingClientRect().height;

  bubbleCoins.forEach((item) => {
    const el = item.el;
    if (!el) return;

    const coin = item.coin;
    const score = getBubbleCoinScore(coin);
    const mood = getMoodByScore(score);
    const change = getCoinChangeForTimeframe(coin, globalTimeframe);
    const polarity = change > 0 ? "positive" : change < 0 ? "negative" : "neutral";
    const tooltipPos = item.y < 150 ? "tooltip-bottom" : "tooltip-top";

    el.className = `bubble-coin mood-${mood.key}${
      activeBubbleSymbol === item.symbol ? " bubble-active" : ""
    }`;
    el.style.width  = `${item.size}px`;
    el.style.height = `${item.size}px`;
    el.style.left   = `${item.x}px`;
    el.style.top    = `${item.y}px`;
    el.style.setProperty("--bubble-color", getMoodColor(mood.key));
    el.style.setProperty("--bubble-glow", getBubbleGlowFromVolume(coin.total_volume));

    /* INTENSIDAD REAL, no solo clase de mood.

       Antes todas las burbujas neutrales se movían idénticas: la
       animación dependía únicamente de la categoría. Un activo
       que cae 0.3% y otro que cae 4% flotaban igual, así que el
       mapa parecía una cuadrícula estática.

       Ahora la amplitud y la velocidad salen de la MAGNITUD del
       movimiento. Lo que se agita, se agita porque se está
       moviendo de verdad. */
    /* El divisor define cuánto movimiento hace falta para llegar
       a la agitación máxima. Con 8 casi nada llegaba: en un día
       normal la mayoría de monedas se mueve 1-3%, así que el mapa
       quedaba dormido.

       Con 5.5 se conserva resolución arriba (un 5% y un 10% aún
       se distinguen) y el resto del aumento se hace subiendo la
       AMPLITUD en CSS, que es lo que de verdad se percibe como
       agitación.

       El suelo sube de 0.12 a 0.28: hasta lo neutro respira. Un
       mapa de mercado en vivo nunca debería verse congelado. */
    const intensity = clamp(Math.abs(change) / 5.5, 0.28, 1);
    el.style.setProperty("--bubble-intensity", intensity.toFixed(3));

    /* Rango de velocidad más ancho y más rápido: de 2.4s (calma)
       a 0.5s (frenesí). Antes el mínimo era 0.7s y el máximo
       2.8s, un rango demasiado estrecho para leerse como
       diferencia. */
    el.style.setProperty("--bubble-speed", `${(2.4 - intensity * 1.9).toFixed(2)}s`);

    /* Desfase estable por burbuja: sin él todas laten al unísono
       y parece una animación, no un enjambre. */
    el.style.setProperty("--bubble-delay", `${(item.xSeed * -3).toFixed(2)}s`);

    /* Cuánto se aleja del centro emocional: alimenta la saturación
       del color, para que los extremos destaquen sobre el ruido. */
    el.style.setProperty("--bubble-extremity", (Math.abs(score - 50) / 50).toFixed(3));

    const q = (sel) => el.querySelector(sel);

    const tooltip = q(".bubble-tooltip");
    if (tooltip) tooltip.className = `bubble-tooltip mood-${mood.key} ${tooltipPos}`;

    const moodEl = q(".tooltip-mood");
    if (moodEl) { moodEl.textContent = mood.name; moodEl.className = `tooltip-mood mood-${mood.key}`; }

    const scoreEl = q(".tooltip-score");
    if (scoreEl) { scoreEl.textContent = `${score}/100`; scoreEl.className = `tooltip-score mood-${mood.key}`; }

    const changeEl = q(".tooltip-change");
    if (changeEl) { changeEl.textContent = formatPercent(change); changeEl.className = `tooltip-change ${polarity}`; }

    const tfLabel = q(".tooltip-tf-label");
    if (tfLabel) tfLabel.textContent = globalTimeframe;

    const vol = q(".tooltip-volume");
    if (vol) vol.textContent = formatCurrencyCompact(coin.total_volume);

    const cap = q(".tooltip-cap");
    if (cap) cap.textContent = formatCurrencyCompact(coin.market_cap);
  });

  const moodEl = byId("bubbleGlobalMood");
  if (moodEl) {
    moodEl.textContent = currentGlobalMood?.name || "Neutral";
    moodEl.className = `mood-${currentGlobalMood?.key || "neutral"}`;
  }

  setText("bubbleGlobalScore", String(roundScore(currentGlobalScore)));
  setText("bubbleAssetCount", `Top ${bubbleCoins.length || 0}`);
}

/* El render de burbujas es lo más caro del sitio. Antes se disparaba
   directamente desde renderCoinSections y desde el resize sin
   debounce. Ahora pasa por rAF y como mucho corre una vez por frame. */
let _bubbleRenderQueued = false;

function scheduleBubbleRender() {
  if (_bubbleRenderQueued) return;
  _bubbleRenderQueued = true;
  requestAnimationFrame(() => {
    _bubbleRenderQueued = false;
    if (activeHeroView === "bubble") renderBubbleMaps();
  });
}

function setHeroView(view) {
  activeHeroView = view === "bubble" ? "bubble" : "mood";

  byId("heroMoodView")?.classList.toggle("hidden", activeHeroView !== "mood");
  byId("bubbleMapsView")?.classList.toggle("hidden", activeHeroView !== "bubble");

  qsa(".hero-view-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.heroView === activeHeroView);
  });

  if (activeHeroView === "bubble") setTimeout(scheduleBubbleRender, 80);
  else toggleBubbleMapExpanded(false);
}

function toggleBubbleMapExpanded(force) {
  isBubbleMapExpanded = typeof force === "boolean" ? force : !isBubbleMapExpanded;
  document.body.classList.toggle("bubble-map-expanded", isBubbleMapExpanded);

  const btn = byId("bubbleExpandBtn");
  if (btn) btn.textContent = isBubbleMapExpanded ? "Collapse map" : "Expand map";

  setTimeout(scheduleBubbleRender, 120);
}

// ===============================
// EMOTION RADAR
// ===============================
const RADAR_LEXICON = {
  positive:   ["approved","approval","bullish","pump","pumping","breakout","ath","all time high","adoption","partnership","rate cut","etf approved","accumulation","strong","recovery","green","send it","moon","rally","surge"],
  negative:   ["delayed","delay","hack","hacked","exploit","scam","crash","dump","dumping","lawsuit","sec","ban","outage","liquidation","collapse","bankrupt","red","fear","panic","rug","dead","selloff"],
  sarcasm:    ["lol","lmao","clown","🤡","😂","yeah right","sure","again","classic","nothing burger","cope"],
  hopium:     ["moon","send","send it","100x","million","rocket","🚀","diamond hands","wagmi","supercycle"],
  exhaustion: ["again","tired","exhausted","same thing","waiting","delayed again","not again","fatigue"],
  chaos:      ["war","breaking","emergency","panic","massive","urgent","insane","crazy","wild"]
};

const RADAR_INTERPRETATIONS = {
  euphoria:    "The crowd is emotionally chasing the narrative. Confidence is high, but the reaction may be overheating.",
  content:     "The crowd feels confident and constructive. The narrative has strength without looking irrational yet.",
  optimism:    "The crowd is leaning positive. Conviction is building, but people still want confirmation.",
  neutral:     "The crowd is undecided. The narrative is being watched, but emotion hasn't committed either way.",
  doubt:       "The crowd is hesitant. People are questioning the narrative before believing it.",
  concern:     "The crowd is turning defensive. Confidence is weakening and the reaction feels cautious.",
  frustration: "The crowd is emotionally stressed. The narrative feels heavy and close to panic or exhaustion."
};

function analyzeEmotionRadarText(text) {
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return {
      score: 50, mood: getMoodByScore(50), modifier: "Waiting",
      intensity: 0, momentum: "Idle",
      interpretation: "Paste a narrative to read its emotional temperature."
    };
  }

  const hits = {};
  Object.entries(RADAR_LEXICON).forEach(([key, words]) => {
    hits[key] = words.filter((w) => lower.includes(w)).length;
  });

  let score = 50 + hits.positive * 9 - hits.negative * 9;
  if (hits.hopium >= 2) score += 12;
  if (hits.sarcasm >= 2 && hits.negative > 0) score -= 6;
  if (hits.chaos >= 2) score -= 8;

  score = roundScore(score);
  const mood = getMoodByScore(score);

  const totalHits = hits.positive + hits.negative + hits.sarcasm + hits.hopium + hits.chaos;
  const intensity = clamp(Math.round(Math.abs(score - 50) * 1.45 + totalHits * 6), 12, 100);

  let modifier;
  if (hits.sarcasm > 0 && hits.negative > 0)       modifier = "Sarcastic Disbelief";
  else if (hits.exhaustion > 0 && hits.negative > 0) modifier = "Emotional Fatigue";
  else if (hits.hopium > 0 && score >= 60)         modifier = "Hopium Spike";
  else if (hits.chaos > 0)                         modifier = "Chaos Pressure";
  else if (score >= 85) modifier = "Overheated Confidence";
  else if (score >= 70) modifier = "Strong Conviction";
  else if (score >= 60) modifier = "Building Optimism";
  else if (score >= 45) modifier = "Narrative Balance";
  else if (score >= 35) modifier = "Hesitation";
  else if (score >= 20) modifier = "Defensive Pressure";
  else                  modifier = "Panic Stress";

  const momentum =
    intensity >= 80 ? "Explosive" :
    intensity >= 62 ? "Accelerating" :
    intensity >= 40 ? "Building" : "Soft";

  const overrides = {
    "Sarcastic Disbelief": "The crowd isn't reacting seriously anymore. The dominant response is sarcasm and disbelief.",
    "Emotional Fatigue":   "The crowd is tired of the same narrative repeating. Less panic, more exhaustion.",
    "Hopium Spike":        "The crowd is leaning into hope, projecting upside faster than certainty is forming."
  };

  return {
    score, mood, modifier, intensity, momentum,
    interpretation: overrides[modifier] || RADAR_INTERPRETATIONS[mood.key] || RADAR_INTERPRETATIONS.neutral
  };
}

function updateEmotionRadarUI(result) {
  const style = getCurrentStyle();

  const card = byId("emotionRadarResult");
  if (card) card.dataset.mood = result.mood.key;

  const img = byId("radarMoodImg");
  if (img) {
    img.className = result.mood.anim || "";
    setImage(img, getHeroImagePath(style, result.mood.key), getHeroImagePath(DEFAULT_STYLE, result.mood.key));
  }

  const label = byId("radarMoodLabel");
  if (label) { label.textContent = result.mood.name; label.className = `mood-${result.mood.key}`; }

  setText("radarScore", String(result.score));

  const fill = byId("radarMeterFill");
  if (fill) fill.style.width = `${result.score}%`;

  setText("radarModifier", result.modifier);
  setText("radarIntensity", `${result.intensity}%`);
  setText("radarMomentum", result.momentum);
  setText("radarInterpretation", result.interpretation);
}

/* ===========================================================
   RADAR — TITULARES EN VIVO

   EL PROBLEMA: el radar pedía al usuario que ESCRIBIERA algo,
   mientras tus noticias reales pasaban por el ticker sin que
   nadie las mirara. Dos piezas desconectadas: una pidiendo
   contenido, la otra tirándolo.

   AHORA: el radar muestra los titulares reales con la cara de
   cómo reacciona el mercado a cada uno. La caja de texto pasa a
   ser lo secundario — para probar tu propio texto, no la única
   forma de usar la sección.
   =========================================================== */
let radarNewsIndex = 0;

function renderRadarFeed() {
  const list = byId("radarNewsList");
  if (!list) return;

  if (!newsData.length) {
    list.innerHTML = `<div class="radar-news-empty">Loading live headlines…</div>`;
    return;
  }

  const style = getCurrentStyle();

  list.innerHTML = newsData.slice(0, 8).map((item, i) => {
    const score = roundScore(item.score ?? 50);
    const mood = getMoodByScore(score);
    const active = i === radarNewsIndex ? " active" : "";

    return `
      <button type="button" class="radar-news-item${active}" data-news-index="${i}">
        <img class="radar-news-face" src="${escapeHtml(getIconImagePath(style, mood.key))}"
             alt="${escapeHtml(mood.name)}" loading="lazy">
        <div class="radar-news-copy">
          <span class="radar-news-headline">${escapeHtml(item.headline || "")}</span>
          <span class="radar-news-meta">
            <span class="radar-news-source">${escapeHtml(item.source || "")}</span>
            <span class="radar-news-mood mood-${mood.key}">${escapeHtml(mood.name)} ${score}</span>
          </span>
        </div>
      </button>`;
  }).join("");
}

/* Al pulsar un titular se analiza de verdad, con el mismo motor
   que el texto libre. No es una vista previa: es el análisis. */
async function analyzeRadarHeadline(index) {
  const item = newsData[index];
  if (!item) return;

  radarNewsIndex = index;
  renderRadarFeed();

  const input = byId("emotionRadarInput");
  if (input) input.value = item.headline || "";

  await translateEmotionRadar();

  /* La fuente y el enlace del titular se muestran junto al
     resultado: sin eso el usuario no puede verificar de dónde
     salió la lectura. */
  const srcEl = byId("radarSourceLink");
  if (srcEl) {
    if (item.url) {
      srcEl.href = item.url;
      srcEl.textContent = `Read on ${item.source || "source"}`;
      srcEl.classList.remove("hidden");
    } else {
      srcEl.classList.add("hidden");
    }
  }
}

function setupRadarFeed() {
  const list = byId("radarNewsList");
  bindOnce(list, "boundRadarNews", "click", async (e) => {
    const btn = e.target.closest("[data-news-index]");
    if (!btn) return;
    await analyzeRadarHeadline(Number(btn.dataset.newsIndex));
  });
}

async function translateEmotionRadar() {
  const input = byId("emotionRadarInput");
  const btn = byId("translateEmotionBtn");
  const text = String(input?.value || "").trim();

  if (!text) { updateEmotionRadarUI(analyzeEmotionRadarText("")); return; }

  const originalLabel = btn?.textContent || "Translate Emotion";

  try {
    if (btn) { btn.disabled = true; btn.textContent = "Analyzing…"; }

    const res = await fetch("/api/emotion-radar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "Emotion Radar failed");

    updateEmotionRadarUI({
      score: data.score,
      mood: getMoodByScore(data.score),
      modifier: data.modifier,
      intensity: data.intensity,
      momentum: data.momentum,
      interpretation: data.interpretation
    });

    /* El contexto de mercado va APARTE del score. Antes el Fear &
       Greed movía el número, así que el mismo titular puntuaba
       distinto según el día y la lectura no era verificable. */
    const ctxEl = byId("radarContext");
    if (ctxEl) {
      const lines = data.context?.lines || [];
      if (lines.length) {
        ctxEl.innerHTML = lines.map((l) => `<span>${escapeHtml(l)}</span>`).join("");
        ctxEl.classList.remove("hidden");
      } else {
        ctxEl.classList.add("hidden");
      }
    }

    /* Desglose de señales: convierte una caja negra en algo que
       se puede cuestionar. */
    const sigEl = byId("radarSignals");
    if (sigEl && data.signals) {
      const s = data.signals;
      const parts = [];
      if (s.positive) parts.push(`<span class="sig pos">+${s.positive} positive</span>`);
      if (s.negative) parts.push(`<span class="sig neg">−${s.negative} negative</span>`);
      if (s.chaos)    parts.push(`<span class="sig neu">${s.chaos} urgency</span>`);
      if (s.hopium)   parts.push(`<span class="sig pos">${s.hopium} hopium</span>`);
      if (s.negated)  parts.push(`<span class="sig neg">${s.negated} negated</span>`);

      sigEl.innerHTML = parts.length
        ? parts.join("")
        : `<span class="sig neu">no strong signals detected</span>`;
    }
  } catch (err) {
    console.error("Emotion Radar error:", err);
    const fallback = analyzeEmotionRadarText(text);
    fallback.interpretation =
      "Live sources are unavailable, so this reading comes from the local emotion engine.";
    updateEmotionRadarUI(fallback);
  } finally {
    /* Antes se restauraba con un literal fijo. Si el botón se
       renombraba en el HTML, el texto cambiaba al primer uso. */
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}

function clearEmotionRadar() {
  const input = byId("emotionRadarInput");
  if (input) input.value = "";
  updateEmotionRadarUI(analyzeEmotionRadarText(""));
}

// ===============================
// ESCALA
// ===============================
function renderScale() {
  const grid = byId("scaleGrid");
  if (!grid) return;

  const style = getCurrentStyle();
  const frag = document.createDocumentFragment();

  [10, 25, 40, 50, 64, 75, 90].forEach((score) => {
    const mood = getMoodByScore(score);
    const item = document.createElement("div");
    item.className = "scale-item";
    item.innerHTML = `
      <div class="scale-face">
        <img src="${escapeHtml(getIconImagePath(style, mood.key))}" alt="" loading="lazy">
      </div>
      <strong>${escapeHtml(mood.name)}</strong>`;
    frag.appendChild(item);
  });

  grid.replaceChildren(frag);
}

// ===============================
// HISTÓRICO DE EMOCIÓN
// ===============================
/* Lo que convierte el índice en producto. Un velocímetro dice a
   qué velocidad vas; una serie temporal dice de dónde vienes.
   El 90% del valor del Fear & Greed de CNN está en su gráfico
   histórico, no en la aguja. */

let historyRange = "7d";
let historyData = null;
let isLoadingHistory = false;

const HISTORY_RANGES = ["24h", "7d", "30d", "90d"];

function formatStreak(seconds) {
  const s = Number(seconds || 0);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

/* La frase de contexto. "Neutral 52" no dice nada; "Neutral 52,
   llevas 3 días aquí" es una razón para volver mañana. */
function buildStreakSentence(stats) {
  if (!stats?.current) return "Building history…";

  const moodName = getMoodByScore(stats.current.score).name;
  const duration = formatStreak(stats.streakSeconds);

  if (stats.streakSeconds < 1800) {
    return `Just moved into ${moodName}.`;
  }

  const dominant = stats.distribution?.[0];
  const extra = dominant && dominant.pct >= 40
    ? ` The market has spent ${dominant.pct}% of this period in ${getMoodByScore(
        { frustration: 10, concern: 25, doubt: 40, neutral: 50,
          optimism: 64, content: 75, euphoria: 90 }[dominant.mood] ?? 50
      ).name}.`
    : "";

  return `${duration} in ${moodName}.${extra}`;
}

/* ===========================================================
   HISTÓRICO DE EMOCIÓN — VERSIÓN CON MÉTRICAS

   ANTES: una línea con bandas de referencia y tres cifras
   (mínimo, media, máximo). Faltaba lo esencial para leer una
   serie temporal: no había EJE DE TIEMPO, así que el usuario
   veía una forma sin saber cuándo pasó nada.

   AHORA: eje de fechas adaptado al rango, eje de score, retícula,
   crosshair con tooltip, y métricas que sí dicen algo de un
   índice emocional — no solo estadística descriptiva.
   =========================================================== */

const HIST = {
  width: 900,
  height: 300,
  hoverIndex: null,
  series: []
};

const HM = { top: 16, right: 44, bottom: 26, left: 10 };

function histPlotW() { return HIST.width - HM.left - HM.right; }
function histPlotH() { return HIST.height - HM.top - HM.bottom; }

/* El formato de fecha depende del rango. En 24h las horas
   importan y el día no; en 90d al revés. Mostrar siempre lo
   mismo obliga al usuario a traducir mentalmente. */
function formatHistoryDate(ts, range) {
  const d = new Date(Number(ts) || Date.now());
  if (!Number.isFinite(d.getTime())) return "";

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const day = d.getDate();
  const mon = d.toLocaleString("en-US", { month: "short" });

  if (range === "24h") return `${hh}:${mm}`;
  if (range === "7d") return `${day} ${mon}`;
  return `${day} ${mon}`;
}

function formatHistoryFull(ts) {
  const d = new Date(Number(ts) || Date.now());
  return d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
}

/* ---------------------------------------------------------
   MÉTRICAS

   Mínimo, media y máximo describen la distribución pero no
   cuentan nada sobre el COMPORTAMIENTO del mercado. Estas sí:

   · Cambio en el periodo — la dirección, que es lo primero que
     se pregunta cualquiera.
   · Volatilidad emocional — cuánto oscila el ánimo. Un mercado
     que va de 40 a 60 constantemente es distinto de uno clavado
     en 50, aunque la media sea idéntica.
   · Cambios de régimen — cuántas veces cruzó de un estado
     emocional a otro. Mide inestabilidad, no dirección.
   · Racha más larga — el periodo seguido en un mismo estado.
   · Cobertura — cuánto del periodo hay realmente medido. Sin
     esto, 6 lecturas y 600 se presentan igual de fiables.
--------------------------------------------------------- */
function computeHistoryMetrics(series, range) {
  if (!Array.isArray(series) || series.length < 2) return null;

  const scores = series.map((p) => Number(p.score)).filter(Number.isFinite);
  if (scores.length < 2) return null;

  const n = scores.length;
  const first = scores[0];
  const last = scores[n - 1];
  const avg = scores.reduce((a, b) => a + b, 0) / n;

  const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);

  /* Cambios de régimen: cuántas veces la serie pasó de un estado
     emocional a otro. Alto = mercado indeciso. */
  let flips = 0;
  let longestStreak = 1;
  let currentStreak = 1;
  let streakMood = getMoodByScore(scores[0]).key;
  let bestMood = streakMood;

  for (let i = 1; i < n; i++) {
    const moodKey = getMoodByScore(scores[i]).key;
    const prevKey = getMoodByScore(scores[i - 1]).key;

    if (moodKey !== prevKey) {
      flips++;
      currentStreak = 1;
      streakMood = moodKey;
    } else {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        bestMood = streakMood;
      }
    }
  }

  /* Cobertura: lecturas reales frente a las esperadas con una
     cada 15 minutos. Es el dato que dice cuánto fiarse del resto. */
  const rangeMs = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6, "90d": 7776e6 }[range] || 6048e5;
  const expected = Math.max(1, Math.round(rangeMs / 900000));
  const coverage = clamp((n / expected) * 100, 0, 100);

  /* Duración media de cada estado, en tiempo real y no en número
     de lecturas: es lo que la gente entiende. */
  const spanMs = Number(series[n - 1].ts) - Number(series[0].ts);
  const perSample = n > 1 ? spanMs / (n - 1) : 900000;

  return {
    current: last,
    change: last - first,
    avg,
    min: Math.min(...scores),
    max: Math.max(...scores),
    stdev,
    flips,
    longestStreakMs: longestStreak * perSample,
    longestStreakMood: bestMood,
    coverage,
    samples: n
  };
}

function formatDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/* ---------------------------------------------------------
   DIBUJO
--------------------------------------------------------- */
function drawHistoryChart(series) {
  const wrap = byId("historyChart");
  const svg = byId("historySvg");
  if (!wrap || !svg) return;

  const groups = {
    bands: byId("historyBands"),
    grid:  byId("historyGrid"),
    area:  byId("historyArea"),
    line:  byId("historyLine"),
    axisY: byId("historyAxisY"),
    axisX: byId("historyAxisX"),
    cross: byId("historyCrosshair")
  };

  if (!Array.isArray(series) || series.length < 2) {
    Object.values(groups).forEach((g) => {
      if (!g) return;
      if (g.tagName === "path") g.setAttribute("d", "");
      else g.innerHTML = "";
    });
    wrap.classList.add("history-empty");
    return;
  }

  wrap.classList.remove("history-empty");
  HIST.series = series;

  const w = HIST.width;
  const plotW = histPlotW();
  const plotH = histPlotH();

  /* ESCALA SEMI-ADAPTATIVA.
     El eje fijo 0-100 dejaba la línea plana con rangos estrechos;
     el autoescalado convierte una franja de 48-52 en una montaña
     rusa. La ventana se centra en los datos pero nunca baja de
     22 puntos de recorrido. */
  const scores = series.map((p) => clamp(Number(p.score) || 50, 0, 100));
  const dataMin = Math.min(...scores);
  const dataMax = Math.max(...scores);
  const center = (dataMin + dataMax) / 2;

  const MIN_WINDOW = 22;
  const windowSpan = Math.max((dataMax - dataMin) * 1.8, MIN_WINDOW);

  let vMin = center - windowSpan / 2;
  let vMax = center + windowSpan / 2;
  if (vMin < 0) { vMax -= vMin; vMin = 0; }
  if (vMax > 100) { vMin -= (vMax - 100); vMax = 100; }
  vMin = Math.max(0, vMin);

  const y = (s) => HM.top + (1 - (clamp(s, 0, 100) - vMin) / (vMax - vMin)) * plotH;

  /* Eje X por TIEMPO real: con lecturas irregulares (huecos del
     cron, reinicios) el índice miente sobre cuándo pasó cada
     cosa. */
  const tFirst = Number(series[0].ts);
  const tLast = Number(series[series.length - 1].ts);
  const tSpan = (tLast - tFirst) || 1;
  const x = (i) => HM.left + ((Number(series[i].ts) - tFirst) / tSpan) * plotW;

  // ---------- Bandas emocionales ----------
  const BANDS = [
    { at: 85, label: "Euphoria" },
    { at: 70, label: "Content" },
    { at: 60, label: "Optimism" },
    { at: 45, label: "Neutral" },
    { at: 35, label: "Doubt" },
    { at: 20, label: "Concern" }
  ];

  if (groups.bands) {
    groups.bands.innerHTML = BANDS
      .filter((b) => b.at >= vMin + 2 && b.at <= vMax - 2)
      .map((b) => `
        <line x1="${HM.left}" y1="${y(b.at).toFixed(1)}" x2="${(HM.left + plotW).toFixed(1)}" y2="${y(b.at).toFixed(1)}"></line>
        <text x="${HM.left + 6}" y="${(y(b.at) - 5).toFixed(1)}">${b.label}</text>
      `).join("");
  }

  // ---------- Eje de score ----------
  if (groups.axisY) {
    const levels = 4;
    let html = "";
    for (let i = 0; i <= levels; i++) {
      const value = vMin + (vMax - vMin) * (i / levels);
      html += `<text x="${(HM.left + plotW + 8).toFixed(1)}" y="${(y(value) + 3.5).toFixed(1)}">${Math.round(value)}</text>`;
    }
    groups.axisY.innerHTML = html;
  }

  // ---------- Eje de fechas ----------
  /* Faltaba por completo. Sin él la sección se llama "Emotion
     over time" y no dice qué tiempo. */
  if (groups.axisX) {
    const labels = clamp(Math.floor(plotW / 110), 2, 6);
    let html = "";
    for (let i = 0; i <= labels; i++) {
      const idx = Math.min(series.length - 1, Math.round((i / labels) * (series.length - 1)));
      html += `<text x="${x(idx).toFixed(1)}" y="${(HIST.height - 8).toFixed(1)}" text-anchor="middle">${
        escapeHtml(formatHistoryDate(series[idx].ts, historyRange))
      }</text>`;
    }
    groups.axisX.innerHTML = html;
  }

  // ---------- Serie ----------
  const path = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p.score).toFixed(2)}`)
    .join(" ");

  const baseY = HM.top + plotH;
  const lastMood = getMoodByScore(series[series.length - 1].score);

  if (groups.line) {
    groups.line.setAttribute("d", path);
    groups.line.style.stroke = getMoodColor(lastMood.key);
  }
  if (groups.area) {
    groups.area.setAttribute("d", `${path} L ${x(series.length - 1).toFixed(2)} ${baseY} L ${x(0).toFixed(2)} ${baseY} Z`);
    groups.area.style.fill = `${getMoodColor(lastMood.key)}1a`;
  }

  drawHistoryCrosshair({ x, y });
}

function drawHistoryCrosshair(scale) {
  const group = byId("historyCrosshair");
  const tip = byId("historyTooltip");
  if (!group) return;

  const i = HIST.hoverIndex;
  const point = HIST.series[i];

  if (i == null || !point) {
    group.innerHTML = "";
    if (tip) tip.classList.add("hidden");
    return;
  }

  const px = scale.x(i);
  const py = scale.y(point.score);
  const mood = getMoodByScore(point.score);

  group.innerHTML = `
    <line x1="${px.toFixed(1)}" y1="${HM.top}" x2="${px.toFixed(1)}"
          y2="${(HM.top + histPlotH()).toFixed(1)}" class="crosshair-v"></line>
    <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4"
            fill="${getMoodColor(mood.key)}" stroke="var(--ink-000)" stroke-width="2"></circle>`;

  if (!tip) return;

  tip.innerHTML = `
    <div class="chart-tooltip-time">${escapeHtml(formatHistoryFull(point.ts))}</div>
    <div class="chart-tooltip-row"><span>Score</span><strong>${Math.round(point.score)}</strong></div>
    <div class="chart-tooltip-row"><span>Mood</span><strong class="mood-${mood.key}">${escapeHtml(mood.name)}</strong></div>`;

  const ratio = px / HIST.width;
  tip.classList.remove("hidden");
  tip.style.left = ratio > 0.6 ? "auto" : `${(ratio * 100).toFixed(1)}%`;
  tip.style.right = ratio > 0.6 ? `${((1 - ratio) * 100).toFixed(1)}%` : "auto";
}

function setupHistoryInteraction() {
  const svg = byId("historySvg");
  if (!svg || svg.dataset.boundHistory) return;
  svg.dataset.boundHistory = "1";

  svg.addEventListener("pointermove", (e) => {
    if (!HIST.series.length) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * HIST.width;

    /* Se busca el punto más cercano EN TIEMPO, no por índice: con
       lecturas irregulares el índice no corresponde a la posición. */
    const tFirst = Number(HIST.series[0].ts);
    const tSpan = (Number(HIST.series[HIST.series.length - 1].ts) - tFirst) || 1;
    const targetTs = tFirst + ((relX - HM.left) / histPlotW()) * tSpan;

    let best = 0, bestDist = Infinity;
    HIST.series.forEach((p, idx) => {
      const dist = Math.abs(Number(p.ts) - targetTs);
      if (dist < bestDist) { bestDist = dist; best = idx; }
    });

    HIST.hoverIndex = best;
    drawHistoryChart(HIST.series);
  }, { passive: true });

  svg.addEventListener("pointerleave", () => {
    HIST.hoverIndex = null;
    drawHistoryChart(HIST.series);
  });

  const applySize = () => {
    const rect = svg.getBoundingClientRect();
    if (rect.width < 10) return;
    HIST.width = Math.round(rect.width);
    HIST.height = Math.round(rect.height);
    svg.setAttribute("viewBox", `0 0 ${HIST.width} ${HIST.height}`);
    if (HIST.series.length) drawHistoryChart(HIST.series);
  };

  if (typeof ResizeObserver === "function") new ResizeObserver(applySize).observe(svg);
  else window.addEventListener("resize", applySize, { passive: true });

  applySize();
}

function renderHistory() {
  const section = byId("historySection");
  if (!section) return;

  const stats = historyData?.stats;
  const series = historyData?.series || [];

  setupHistoryInteraction();
  drawHistoryChart(series);
  setText("historyStreak", buildStreakSentence(stats));

  /* MÉTRICAS CALCULADAS EN CLIENTE.

     Mínimo, media y máximo describen la distribución pero no
     dicen nada del COMPORTAMIENTO. Estas sí, y salen de la misma
     serie sin tocar el endpoint. */
  const m = computeHistoryMetrics(series, historyRange);

  const setStat = (id, value, cls) => {
    const el = byId(id);
    if (!el) return;
    el.textContent = value == null ? "--" : String(value);
    if (cls !== undefined) el.className = cls;
  };

  if (m) {
    const mood = getMoodByScore(m.current);

    setStat("historyCurrent", Math.round(m.current), `mood-${mood.key}`);
    setStat("historyCurrentMood", mood.name, `mood-${mood.key}`);

    /* El cambio del periodo es lo primero que pregunta cualquiera
       al ver una serie temporal. No estaba. */
    const chg = Math.round(m.change);
    setStat(
      "historyChange",
      `${chg > 0 ? "+" : ""}${chg}`,
      chg > 2 ? "positive" : chg < -2 ? "negative" : "neutral"
    );

    setStat("historyRange2", `${Math.round(m.min)} – ${Math.round(m.max)}`);
    setStat("historyAvg", Math.round(m.avg));

    /* Volatilidad emocional: un mercado que oscila entre 40 y 60
       constantemente es MUY distinto de uno clavado en 50, aunque
       la media sea idéntica. La media sola oculta eso. */
    const vol = m.stdev;
    setStat(
      "historyVolatility",
      `${vol.toFixed(1)}`,
      vol >= 12 ? "negative" : vol >= 6 ? "neutral" : "positive"
    );
    setStat("historyVolatilityLabel",
      vol >= 12 ? "Erratic" : vol >= 6 ? "Moving" : "Stable");

    /* Cambios de régimen: mide inestabilidad, no dirección. */
    setStat("historyFlips", String(m.flips));

    setStat("historyStreakLen", formatDuration(m.longestStreakMs));
    setStat("historyStreakMood",
      getMoodByScore(
        { euphoria: 90, content: 76, optimism: 64, neutral: 52,
          doubt: 40, concern: 27, frustration: 10 }[m.longestStreakMood] || 50
      ).name,
      `mood-${m.longestStreakMood}`);

    /* Cobertura: sin este dato, 6 lecturas y 600 se presentan
       igual de fiables. Es lo que dice cuánto fiarse del resto. */
    setStat("historyCoverage", `${Math.round(m.coverage)}%`,
      m.coverage >= 80 ? "positive" : m.coverage >= 40 ? "neutral" : "negative");

    setText("historySamples", `${m.samples} readings`);
  } else {
    ["historyCurrent", "historyChange", "historyRange2", "historyAvg",
     "historyVolatility", "historyFlips", "historyStreakLen",
     "historyCoverage"].forEach((id) => setStat(id, null));
    setText("historySamples", "Collecting…");
  }

  qsa("[data-history-range]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.historyRange === historyRange);
  });

  /* Honestidad con datos escasos: mejor decir que aún se está
     acumulando que dibujar una línea de dos puntos como si fuera
     una tendencia. */
  const samples = m?.samples || 0;
  section.classList.toggle("history-thin", samples < 6);
}

async function loadHistory() {
  if (isLoadingHistory) return;
  isLoadingHistory = true;
  try {
    const res = await fetchJson(
      `/api/history?range=${encodeURIComponent(historyRange)}`, null
    );
    if (res?.ok) historyData = res;
    renderHistory();
  } finally {
    isLoadingHistory = false;
  }
}

function setupHistory() {
  const controls = byId("historyRanges");
  if (!controls) return;

  bindOnce(controls, "boundHistory", "click", async (e) => {
    const btn = e.target.closest("[data-history-range]");
    if (!btn) return;
    const range = btn.dataset.historyRange;
    if (!HISTORY_RANGES.includes(range)) return;
    historyRange = range;
    renderHistory();
    await loadHistory();
  });
}

// ===============================
// INIT STYLE
// ===============================
function initStyle() {
  const style = loadSavedStyle();

  const selector = byId("styleSelector");
  if (selector) selector.value = style;

  applyStyleClass(style);

  [
    ["heroFaceImg",         getHeroImagePath],
    ["socialIconImg",       getIconImagePath],
    ["emotionPointerImg",   getIconImagePath],
    ["detailSocialIconImg", getIconImagePath],
    ["coinMoodIconImg",     getIconImagePath],
    ["moodHeroImg",         getHeroImagePath],
    ["bagMoodHeroImg",      getHeroImagePath],
    ["radarMoodImg",        getHeroImagePath]
  ].forEach(([id, pathFn]) => {
    const el = byId(id);
    if (el) setImage(el, pathFn(style, "neutral"), pathFn(DEFAULT_STYLE, "neutral"));
  });

  const hbWrap = byId("heartbeatWrap");
  const hbPath = byId("heartbeatPath");
  if (hbWrap && hbPath) {
    hbWrap.className = "heartbeat-wrap heartbeat-neutral";
    hbPath.setAttribute("d", heartbeatPathForMood("neutral"));
  }

  const gaugeFill = byId("gaugeFill");
  if (gaugeFill) gaugeFill.style.strokeDasharray = "188 377";

  byId("heroTimelineBackdrop")?.classList.add("hidden");
}

// ===============================
// LISTENERS
// ===============================

/* Helper contra doble binding. Antes varias funciones de setup se
   llamaban más de una vez y apilaban listeners duplicados. */
function bindOnce(el, key, type, handler, options) {
  if (!el || el.dataset[key]) return;
  el.dataset[key] = "1";
  el.addEventListener(type, handler, options);
}

function setupHeroTimeframes() {
  const container = byId("heroTimeframes");
  if (!container) return;

  qsa("#heroTimeframes button").forEach((btn) => {
    btn.classList.toggle("hidden", !HERO_ALLOWED_TIMEFRAMES.includes(btn.dataset.timeframe));
  });

  bindOnce(container, "boundTf", "click", async (e) => {
    const btn = e.target.closest("button[data-timeframe]");
    if (!btn) return;

    const tf = btn.dataset.timeframe;
    if (!HERO_ALLOWED_TIMEFRAMES.includes(tf)) return;

    if (tf === globalTimeframe) return;

    globalTimeframe = tf;

    /* PRIMERO la respuesta visual, DESPUES la red.

       Antes el orden era: marcar el boton, esperar dos viajes de
       red en serie, y solo entonces repintar. Un segundo largo en
       el que la pill decia una cosa y el score seguia mostrando
       la ventana anterior. */
    qsa("#heroTimeframes button").forEach((b) => {
      b.classList.toggle("active", b.dataset.timeframe === globalTimeframe);
    });

    setText("globalMarketTimeframe", globalTimeframe);
    setTimeframeBusy(true);

    /* En paralelo, no en serie: son dos endpoints independientes
       y encadenarlos doblaba la espera sin ninguna razon. */
    await Promise.all([loadGlobalMarket(), loadSentiment()]);
    setTimeframeBusy(false);
  });
}

/* Marca visual mientras se mide la ventana nueva.

   Sin esto, entre el click y la respuesta no pasa nada en
   pantalla: el usuario no sabe si el sitio le hizo caso. Es la
   diferencia entre "lento" y "roto", y cuesta una clase CSS.

   Se apoya en atributos de datos en vez de exigir CSS nuevo: si
   globals.css no define nada, no se rompe nada. */
function setTimeframeBusy(busy) {
  const container = byId("heroTimeframes");
  if (container) container.classList.toggle("tf-measuring", Boolean(busy));

  const changeEl = byId("globalMarketChange");
  if (changeEl) changeEl.style.opacity = busy ? "0.45" : "";

  const tfEl = byId("globalMarketTimeframe");
  if (tfEl) tfEl.style.opacity = busy ? "0.45" : "";
}

function setupChartControls() {
  const tfContainer = byId("chartTimeframes");
  if (tfContainer) {
    qsa("#chartTimeframes button").forEach((btn) => {
      btn.classList.toggle("hidden", !CHART_ALLOWED_TIMEFRAMES.includes(btn.dataset.timeframe));
    });

    bindOnce(tfContainer, "boundTf", "click", async (e) => {
      const btn = e.target.closest("button[data-timeframe]");
      if (!btn) return;
      const tf = btn.dataset.timeframe;
      if (!CHART_ALLOWED_TIMEFRAMES.includes(tf)) return;
      chartTimeframe = tf;
      resetChartView();
      await loadCoinDetails();
    });
  }

  const modeSwitch = byId("chartModeSwitch");
  bindOnce(modeSwitch, "boundMode", "click", async (e) => {
    const btn = e.target.closest(".chart-mode-btn");
    if (!btn) return;
    chartMode = btn.dataset.mode;
    await loadCoinDetails();
  });
}

function setupMarketTabs() {
  const tabs = byId("marketTabs");
  bindOnce(tabs, "boundTabs", "click", (e) => {
    const btn = e.target.closest(".tab-btn[data-tab]");
    if (!btn) return;

    activeMarketTab = btn.dataset.tab;
    qsa(".tab-btn[data-tab]").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === activeMarketTab);
    });
    qsa(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${activeMarketTab}`);
    });
  });
}

function setupStudioTabs() {
  const tabs = byId("studioTabs");
  bindOnce(tabs, "boundStudio", "click", (e) => {
    const btn = e.target.closest("[data-studio-tab]");
    if (!btn) return;

    const tab = btn.dataset.studioTab;
    qsa("[data-studio-tab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    qsa(".studio-panel").forEach((p) => p.classList.remove("active"));
    byId(`studio-${tab}`)?.classList.add("active");
  });

  qsa(".studio-copy-btn").forEach((btn) => {
    bindOnce(btn, "boundCopy", "click", async () => {
      const original = btn.textContent;
      const ok = await copyStudioTarget(btn.dataset.copyTarget);
      btn.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(() => { btn.textContent = original; }, 1200);
    });
  });
}

function setupHeroModes() {
  const container = byId("heroModes");
  bindOnce(container, "boundModes", "click", (e) => {
    const btn = e.target.closest(".hero-mode-btn");
    if (!btn) return;

    heroMode = btn.dataset.heroMode || HERO_MODE_RAW;

    if (heroMode === HERO_MODE_RAW) {
      activeLayers = { market: true, social: false, driver: false, pulse: false };
    } else if (heroMode === HERO_MODE_COMPOSITE) {
      activeLayers = { market: true, social: true, driver: true, pulse: true };
    }

    recomputeHeroSystem();
  });
}

function setupLayerButtons() {
  const container = byId("layerButtons");
  bindOnce(container, "boundLayers", "click", (e) => {
    const btn = e.target.closest(".layer-btn");
    if (!btn || heroMode !== HERO_MODE_CUSTOM) return;

    const layer = btn.dataset.layer;
    if (!layer) return;

    // Market siempre activo: es la base del cálculo.
    if (layer === "market") activeLayers.market = true;
    else activeLayers[layer] = !activeLayers[layer];

    recomputeHeroSystem();
  });
}

function setupMarketControls() {
  const sort = byId("marketSortSelect");
  if (sort) {
    sort.value = marketSortBy;
    bindOnce(sort, "boundSort", "change", () => {
      marketSortBy = sort.value || "marketCap";
      renderCoinSections();
    });
  }

  const filter = byId("marketEmotionFilter");
  if (filter) {
    filter.value = marketEmotionFilter;
    bindOnce(filter, "boundFilter", "change", () => {
      marketEmotionFilter = filter.value || "all";
      renderCoinSections();
    });
  }
}

/* FIX #1 (cont.) — UN SOLO LISTENER en #macroDriver.
   Antes había dos: uno en setupButtons y otro en
   setupMacroDriverPersistence, cada uno escribiendo su propia
   variable. Ahora hay uno y llama a setMacroDriver. */
function setupMacroDriver() {
  const select = byId("macroDriver");
  if (!select) return;

  const saved = loadSavedMacroDriver();
  if (select.querySelector(`option[value="${saved}"]`)) {
    setMacroDriver(saved, { persist: false });
  }

  bindOnce(select, "boundDriver", "change", () => {
    setMacroDriver(select.value);
    updateDriverPanel();
    recomputeHeroSystem();
  });
}

function setupStyleSelector() {
  const selector = byId("styleSelector");
  bindOnce(selector, "boundStyle", "change", async () => {
    const style = getCurrentStyle();
    saveSelectedStyle(style);
    applyStyleClass(style);

    renderScale();
    renderPulseStats();
    recomputeHeroSystem();
    updateMoodHero(moodLiveMood, moodLiveScore);
    drawMoodBackdrop();
    renderBagMood();
    await loadCoinDetails();
  });
}

function setupSocialExpand() {
  const bubble  = byId("socialBubble");
  const expand  = byId("socialExpand");
  const wrapper = byId("socialWrapper");
  if (!bubble || !expand || !wrapper) return;

  const close = () => {
    socialPanelOpen = false;
    expand.classList.add("hidden");
    bubble.classList.remove("expanded");
  };

  const toggle = () => {
    socialPanelOpen = !socialPanelOpen;
    expand.classList.toggle("hidden", !socialPanelOpen);
    bubble.classList.toggle("expanded", socialPanelOpen);
  };

  bindOnce(bubble, "boundSocial", "click", (e) => { e.stopPropagation(); toggle(); });

  bindOnce(bubble, "boundSocialKey", "keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    if (e.key === "Escape") close();
  });

  document.addEventListener("click", (e) => {
    if (socialPanelOpen && !wrapper.contains(e.target)) close();
  });
}

function setupPulsePanel() {
  const toggle = byId("pulseToggle");
  const panel  = byId("pulsePanel");
  if (!toggle || !panel) return;

  const close = () => { panel.classList.add("hidden"); toggle.classList.remove("open"); };
  const open  = () => { panel.classList.remove("hidden"); toggle.classList.add("open"); };
  const flip  = (e) => {
    e?.stopPropagation();
    panel.classList.contains("hidden") ? open() : close();
  };

  bindOnce(toggle, "boundPulse", "click", flip);

  bindOnce(toggle, "boundPulseKey", "keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(e); }
    if (e.key === "Escape") close();
  });

  bindOnce(panel, "boundPulsePanel", "click", (e) => {
    e.stopPropagation();
    const voteBtn = e.target.closest("[data-vote]");
    if (voteBtn) handlePulseVote(voteBtn.dataset.vote);
  });

  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !panel.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

function setupBagMoodControls() {
  const searchBtn   = byId("bagSearchBtn");
  const searchInput = byId("bagSearchInput");

  if (searchBtn && searchInput) {
    bindOnce(searchBtn, "boundBagSearch", "click", async () => {
      const q = String(searchInput.value || "").trim();
      if (!q) return;

      const original = searchBtn.textContent;
      searchBtn.disabled = true;
      searchBtn.textContent = "Searching…";

      bagSearchResults = await searchBagCoins(q);

      searchBtn.disabled = false;
      searchBtn.textContent = original;
      renderBagSearchResults();
    });

    bindOnce(searchInput, "boundBagEnter", "keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); searchBtn.click(); }
    });
  }

  // Delegación: los resultados se re-renderizan constantemente.
  const results = byId("bagSearchResults");

  /* Cerrar al pulsar fuera: una capa flotante que no se cierra
     sola es una trampa. */
  document.addEventListener("click", (e) => {
    if (!results?.classList.contains("open")) return;
    if (results.contains(e.target)) return;
    if (e.target.closest("#bagSearchBtn, #bagSearchInput")) return;
    bagSearchResults = [];
    renderBagSearchResults();
  });

  bindOnce(results, "boundBagResults", "click", (e) => {
    const btn = e.target.closest("[data-bag-result-index]");
    if (!btn) return;

    const coin = bagSearchResults[Number(btn.dataset.bagResultIndex)];
    if (!coin) return;

    const usd   = Number(byId("bagValueInput")?.value || 0);
    const entry = Number(byId("bagEntryPriceInput")?.value || 0);

    addBagHolding(coin, usd > 0 ? usd : 100, entry);

    bagSearchResults = [];
    renderBagSearchResults();
    ["bagSearchInput", "bagValueInput", "bagEntryPriceInput"].forEach((id) => {
      const el = byId(id);
      if (el) el.value = "";
    });
  });

  const list = byId("bagMoodList");
  bindOnce(list, "boundBagList", "click", (e) => {
    const removeBtn = e.target.closest("[data-remove-bag]");
    if (removeBtn) {
      e.stopPropagation();
      removeBagHolding(Number(removeBtn.dataset.removeBag));
      return;
    }

    const row = e.target.closest("[data-select-bag]");
    if (row && bagMoodMode === "single") {
      bagSelectedIndex = Number(row.dataset.selectBag);
      renderBagMood();
    }
  });

  const tabs = qs(".bag-mode-tabs");
  bindOnce(tabs, "boundBagMode", "click", (e) => {
    const btn = e.target.closest("[data-bag-mode]");
    if (!btn) return;
    bagMoodMode = btn.dataset.bagMode || "portfolio";
    renderBagMood();
  });

  const styleSelector = byId("bagStyleSelector");
  if (styleSelector) {
    styleSelector.value = getBagMoodStyle();
    bindOnce(styleSelector, "boundBagStyle", "change", () => {
      const selected = String(styleSelector.value || "").toLowerCase();
      if (!ALLOWED_STYLES.includes(selected)) return;
      bagMoodStyle = selected;
      lsSet(BAG_STYLE_STORAGE_KEY, selected);
      renderBagMood();
      renderNewsBanner();
    });
  }

  bindOnce(byId("bagResetBtn"), "boundBagReset", "click", () => {
    bagMoodHoldings = [];
    bagSelectedIndex = 0;
    try { localStorage.removeItem(BAG_STORAGE_KEY); } catch {}
    renderBagMood();
  });

  bindOnce(byId("bagShareBtn"), "boundBagShare", "click", shareBagMoodOnX);
}

function setupMoodTokenControls() {
  const els = getMoodTokenElements();

  bindOnce(els.copyBtn, "boundCopyCa", "click", async () => {
    try {
      await navigator.clipboard.writeText(moodResolvedAddress || MOOD_FIXED_DISPLAY_CA);
      const original = els.copyBtn.textContent;
      els.copyBtn.textContent = "Copied";
      setTimeout(() => { els.copyBtn.textContent = original; }, 1200);
    } catch {}
  });

  if (els.searchBtn && els.input) {
    bindOnce(els.searchBtn, "boundTokenSearch", "click", async () => {
      const ca = String(els.input.value || "").trim();
      if (!ca) return;
      isUsingDefaultTrending = false;
      isUsingMoodToken = false;
      await loadMoodTokenAddress(ca, {
        name: "Custom Token", symbol: "---",
        image: "/assets/logo/wojakmeter_logo.png", source: "Custom"
      });
    });

    bindOnce(els.input, "boundTokenEnter", "keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); els.searchBtn.click(); }
    });
  }

  bindOnce(els.loadMoodBtn, "boundLoadMood", "click", async () => {
    if (!MOOD_MAIN_CA) return;
    isUsingMoodToken = true;
    isUsingDefaultTrending = false;
    await loadMoodTokenAddress(MOOD_MAIN_CA, {
      name: "MOOD", symbol: "MOOD",
      image: "/assets/logo/wojakmeter_logo.png", source: "MOOD"
    });
  });

  const tfRow = byId("moodTokenTimeframes");
  bindOnce(tfRow, "boundTokenTf", "click", async (e) => {
    const btn = e.target.closest("[data-token-timeframe]");
    if (!btn) return;
    const tf = btn.dataset.tokenTimeframe;
    if (!TOKEN_ALLOWED_TIMEFRAMES.includes(tf)) return;
    moodTokenTimeframe = tf;
    renderMoodTimeframeButtons();

    /* Cada timeframe es un intervalo de vela distinto, así que
       necesita su propia petición de OHLCV. Sin esto, cambiar de
       5m a 1h mostraba las velas de 5m con etiqueta de 1h. */
    moodOhlcv = [];
    moodOhlcvTimeframe = null;
    MOOD_CHART.hoverIndex = null;

    await loadMoodChartSnapshot();
    loadMoodOhlcv(true);
  });
}

function setupEmotionRadar() {
  if (!byId("emotionRadarSection")) return;

  bindOnce(byId("translateEmotionBtn"), "boundRadar", "click", translateEmotionRadar);
  bindOnce(byId("clearEmotionRadarBtn"), "boundRadarClear", "click", clearEmotionRadar);

  const input = byId("emotionRadarInput");
  bindOnce(input, "boundRadarKey", "keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      translateEmotionRadar();
    }
  });

  const examples = qs(".emotion-radar-examples");
  bindOnce(examples, "boundRadarEx", "click", (e) => {
    const btn = e.target.closest("[data-radar-example]");
    if (!btn) return;
    if (input) input.value = btn.dataset.radarExample || "";
    translateEmotionRadar();
  });

  updateEmotionRadarUI(analyzeEmotionRadarText(""));
}

function setupBubbleMaps() {
  const toggle = byId("heroViewToggle");
  bindOnce(toggle, "boundHeroView", "click", (e) => {
    const btn = e.target.closest(".hero-view-btn");
    if (btn) setHeroView(btn.dataset.heroView || "mood");
  });

  bindOnce(byId("bubbleExpandBtn"), "boundExpand", "click", () => toggleBubbleMapExpanded());

  /* Antes el resize llamaba a renderBubbleMaps sin debounce: durante
     un arrastre de ventana eso son decenas de layouts completos por
     segundo. Ahora pasa por rAF. */
  window.addEventListener("resize", () => {
    if (activeHeroView !== "bubble") return;
    closeActiveBubbleTooltip();
    scheduleBubbleRender();
  }, { passive: true });

  document.addEventListener("click", (e) => {
    if (!isMobileBubbleMap() || !activeBubbleSymbol) return;
    if (!e.target.closest(".bubble-coin") && !e.target.closest(".bubble-tooltip")) {
      closeActiveBubbleTooltip();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isBubbleMapExpanded) toggleBubbleMapExpanded(false);
  });
}

function setupStickyHeaderNav() {
  const updateScrollState = () => {
    document.body.classList.toggle("header-scrolled", window.scrollY > 40);
  };

  window.addEventListener("scroll", updateScrollState, { passive: true });
  updateScrollState();

  const toggle = byId("wmMenuToggle");
  const menu = byId("wmMobileMenu");
  if (!toggle || !menu) return;

  bindOnce(toggle, "boundMenu", "click", (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  bindOnce(menu, "boundMenuLinks", "click", (e) => {
    if (e.target.closest("a")) {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function setupButtons() {
  setupHeroTimeframes();
  setupChartControls();
  setupMarketTabs();
  setupStudioTabs();
  setupHeroModes();
  setupLayerButtons();
  setupMarketControls();
  setupMacroDriver();
  setupStyleSelector();
  setupBubbleMaps();

  bindOnce(byId("shareMoodBtn"), "boundShare", "click", shareMoodOnX);
}

// ===============================
// MOOD TOKEN INIT
// ===============================
async function initMoodToken() {
  const els = getMoodTokenElements();
  if (!els.section) return;

  if (els.ca) els.ca.textContent = MOOD_FIXED_DISPLAY_CA;

  setupMoodTokenControls();
  setupMoodChartInteraction();
  setupTrendingStrip();
  setupTokenHistory();

  bindOnce(byId("shareTokenMoodBtn"), "boundShareToken", "click", shareTokenMoodOnX);
  await tryLoadDefaultTrendingToken();
  startMoodPolling();

  /* Las tendencias cambian mucho más despacio que el precio:
     cada 3 minutos sobra. */
  setTimer("trendingTokens", loadTrendingTokens, 180000);
}

function initBagMood() {
  if (!byId("bagMoodSection")) return;
  bagMoodStyle = loadBagMoodStyle();
  loadBagMoodHoldings();
  setupBagMoodControls();
  renderBagMood();
}

// ===============================
// TIMERS
// ===============================

/* FIX — todos los intervalos guardados y pausables.
   Antes se creaban sueltos con setInterval y no había forma de
   detenerlos. Con la pestaña oculta seguían pidiendo a la API
   indefinidamente. */
const _timers = {};

function setTimer(name, fn, ms) {
  clearInterval(_timers[name]);
  _timers[name] = setInterval(fn, ms);
}

function startAutoRefresh() {
  setTimer("topCoins",    loadTopCoins,      TOP_COINS_REFRESH_MS);
  setTimer("global",      loadGlobalMarket,  GLOBAL_REFRESH_MS);
  setTimer("coinDetails", loadCoinDetails,   COIN_DETAILS_REFRESH_MS);
  setTimer("trending",    loadTrendingCoins, TRENDING_REFRESH_MS);
  setTimer("memes",       loadTopMemes,      MEMES_REFRESH_MS);
  setTimer("sentiment",   loadSentiment,     SENTIMENT_REFRESH_MS);
  /* El cron guarda cada 15 min; recargar cada 5 basta de sobra
     para que el gráfico se sienta vivo sin martillear la BD. */
  setTimer("history",     loadHistory,       300000);
  setTimer("news", loadNews, NEWS_REFRESH_MS);
}

function startMoodPolling() {
  /* 5 segundos en vez de 15: el flujo derivado se calcula
     restando contadores entre consultas, así que la frecuencia
     de consulta ES la resolución del feed. */
  setTimer("moodMarket", loadMoodMarketSnapshot, 5000);

  /* Las velas se refrescan cada 45s: el proveedor limita a 30
     peticiones por minuto y el precio en vivo ya viene del
     polling de 5s. */
  setTimer("moodOhlcv", () => loadMoodOhlcv(true), 45000);
  setTimer("moodChart",  loadMoodChartSnapshot,  12000);

  /* El latido del flujo: hace que la cara se enfrie sola cuando
     dejan de llegar operaciones. 2s es el punto donde el cambio
     se percibe como vivo sin parecer nervioso. */
  setTimer("moodFlow", tickMoodFlow, 2000);
}

function startBagMoodLiveRefresh() {
  setTimer("bagMood", refreshBagMoodPricesFromMarket, 10000);
}

function stopAllTimers() {
  Object.keys(_timers).forEach((k) => clearInterval(_timers[k]));
}

/* Pestaña oculta: se paran los timers y el stream. Al volver, se
   refresca una vez y se reanuda. Ahorra API calls y batería. */
function setupVisibilityHandling() {
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) {
      stopAllTimers();
      cleanupMoodStream();
      return;
    }

    startAutoRefresh();
    startMoodPolling();
    startBagMoodLiveRefresh();

    await loadGlobalMarket();
    if (moodResolvedAddress) connectMoodStream();
  });
}

// ===============================
// LOAD ALL
// ===============================
async function loadAll() {
  await Promise.allSettled([
    loadTopCoins(),
    loadTrendingCoins(),
    loadTopMemes(),
    loadTopExchanges(),
    loadNews()
  ]);

  currentPulseScore = getPulseScore();

  await loadGlobalMarket();
  await loadSentiment();
  await loadCoinDetails();
  await loadCoinExchanges();

  renderPulseStats();
  renderStudio();
}

// ===============================
// BOOT
// ===============================
async function boot() {
  if (hasBooted) return;
  hasBooted = true;

  initStyle();

  const savedCoin = loadSavedActiveCoin();
  if (savedCoin) activeCoinSymbol = savedCoin;

  setMacroDriver(loadSavedMacroDriver(), { persist: false });
  currentPulseScore = getPulseScore();

  renderScale();
  renderPulseStats();
  startPulseSync();
  updateDriverPanel();
  updateGauge(50, getMoodByScore(50));

  /* El anillo de dominancia salía vacío hasta la primera carga
     de /api/global, y parecía roto. Se pinta neutro de entrada. */
  updateHeaderMetrics();
  updateLayerUI();

  qsa("#heroTimeframes button").forEach((btn) => {
    btn.classList.toggle("active",  btn.dataset.timeframe === globalTimeframe);
    btn.classList.toggle("hidden", !HERO_ALLOWED_TIMEFRAMES.includes(btn.dataset.timeframe));
  });

  qsa("#chartTimeframes button").forEach((btn) => {
    btn.classList.toggle("active",  btn.dataset.timeframe === chartTimeframe);
    btn.classList.toggle("hidden", !CHART_ALLOWED_TIMEFRAMES.includes(btn.dataset.timeframe));
  });

  setText("selectedTimeframe", chartTimeframe);
  setText("chartTimeLabel", `Viewing ${chartTimeframe} structure`);
  setText("globalMarketTimeframe", globalTimeframe);

  setupButtons();
  setupStickyHeaderNav();
  setupSocialExpand();
  setupPulsePanel();
  setupEmotionRadar();
  setupRadarFeed();
  setupHistory();
  setupVisibilityHandling();

  /* ===========================================================
     EL PANEL DEL TOKEN YA NO BLOQUEA EL ARRANQUE.

     Esto era `await initMoodToken()` ANTES de `loadAll()`, y esa
     linea encadenaba cinco peticiones a DexScreener —tendencias,
     resolucion, mercado, grafico y velas— con siete segundos de
     tiempo de espera cada una, antes de pedir el primer dato del
     MERCADO, que es de lo que va la pagina.

     Si DexScreener iba lento, la portada entera se quedaba en
     "Reading" esperando a una seccion secundaria. Y si alguna de
     esas llamadas lanzaba, `boot()` moria ahi: sin `loadAll`, sin
     Bag Mood, sin historico, sin refresco automatico.

     Ahora el mercado va primero y el token se carga por su cuenta.
     Que tarde o falle solo afecta a su propia tarjeta. El `catch`
     esta a proposito: es la frontera entre una seccion y el resto
     de la pagina. */
  await loadAll();

  initBagMood();
  await loadHistory();

  initMoodToken().catch((err) => {
    console.warn("WM: el panel del token no arrancó", err);
    setText("moodTokenSource", "Unavailable");
    const hint = qs(".mood-strip-hint");
    if (hint) hint.textContent = "Token feed unavailable";
  });

  startAutoRefresh();
  startBagMoodLiveRefresh();
}

/* Los esqueletos se montan ANTES de boot(), no dentro: tienen que
   estar en pantalla desde el primer fotograma, mientras las
   peticiones vuelan. Montarlos dentro del arranque los pondría
   después de que ya se hubieran pedido los datos. */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    mountSkeletons();
    boot();
  });
} else {
  mountSkeletons();
  boot();
}

/* ===========================================================
   RESUMEN DE CAMBIOS  v11 → v12

   BUGS
   1. #macroDriver tenía dos listeners escribiendo variables
      distintas (currentDominantDriver / activeMacroDriver).
      El panel leía una y el Studio la otra. Ahora hay una sola
      variable y un solo escritor: setMacroDriver().
   2. heartbeatPathForMood estaba definida dos veces; la segunda
      pisaba a la primera en silencio. Ahora es un objeto único.
   3. updateHero estaba definida TRES veces (básica, con coreState,
      y un IIFE al final que la reimplementaba entera). Solo se
      ejecutaba la última. Queda una.
   4. loadSentiment pisaba cada 60s el driver que el usuario había
      elegido a mano. Ahora solo lo aplica si no hay elección
      guardada.
   5. El botón del Emotion Radar restauraba su texto con un literal
      fijo en vez del original.

   RENDIMIENTO
   6. getMoodTokenElements hacía ~24 getElementById por llamada, y
      se llama varias veces por segundo con el stream activo.
      Cacheado.
   7. Los Intl.NumberFormat se construían en cada formateo.
      Cacheados.
   8. Cada tarjeta de moneda llevaba su propio listener: 60 nuevos
      cada 30 segundos. Ahora hay uno delegado por grid.
   9. resolveBubbleCollisions hacía ~116.000 comparaciones por
      render. Bajado a 26 iteraciones con salida temprana.
  10. getBubbleX usaba Date.now(): las burbujas se movían en cada
      render aunque los datos fueran idénticos. Ahora es estable.
  11. El resize del bubble map no tenía debounce. Ahora va por rAF.
  12. El chart de moneda se re-pedía cada 30s sin haber cambiado.
      Caché de 60s.
  13. El stream reintentaba cada 3s para siempre. Backoff
      exponencial con tope de 6 intentos.
  14. Con la pestaña oculta todo seguía corriendo. Ahora se pausa
      y se reanuda con un refresco.

   PENDIENTE (necesita decisión tuya)
   · .style-synth y .style-boyak siguen sin tratamiento visual:
     solo cambian de carpeta de imágenes.
   =========================================================== */

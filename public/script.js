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

const ACTIVE_COIN_STORAGE_KEY = "wojakActiveCoin";
const STYLE_STORAGE_KEY       = "wojakStyle";
const MACRO_DRIVER_STORAGE_KEY = "wojakMacroDriver";
const DEFAULT_STYLE      = "classic";
const SHARED_ICON_STYLE  = "classic";
const ALLOWED_STYLES     = ["classic", "synth", "boyak", "minimal"];

const PULSE_VOTE_STORAGE_KEY = "wmPulseLastVoteTime";
const PULSE_VOTE_COOLDOWN_MS = 5 * 60 * 1000;
const PULSE_REACTION_MS      = 1800;

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

let pulseVotes = {
  frustration: 2, concern: 4, doubt: 6, neutral: 10,
  optimism: 8, content: 5, euphoria: 3
};

let activeLayers = { market: true, social: false, driver: false, pulse: false };

let isLoadingTopCoins = false;
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

function normalizeChangeToScore(changePct, sensitivity = 10) {
  return clamp(50 + Number(changePct || 0) * sensitivity, 0, 100);
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
function canVotePulse() { return Date.now() - getLastPulseVoteTime() >= PULSE_VOTE_COOLDOWN_MS; }
function getPulseRemainingCooldownMs() {
  return Math.max(0, PULSE_VOTE_COOLDOWN_MS - (Date.now() - getLastPulseVoteTime()));
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

function getMarketBaseChangeForTimeframe(change24h, timeframe) {
  const mult = { "1h": 0.25, "4h": 0.5, "24h": 1, "7d": 2.2, "30d": 4 };
  return Number(change24h || 0) * (mult[timeframe] ?? 1);
}

function computeCompositeScore() {
  return roundScore(
    roundScore(currentMarketScore) * 0.46 +
    roundScore(currentSocialScore) * 0.20 +
    roundScore(currentPulseScore)  * 0.10 +
    roundScore(getVolumeImpulseScore(currentHeaderVolumeValue)) * 0.06 +
    roundScore(getBtcDominanceImpulseScore(currentBtcDominanceValue)) * 0.04 +
    roundScore(currentDriverScore) * 0.14
  );
}

function computeCustomLayersScore() {
  const w = { market: 0.52, social: 0.18, driver: 0.18, pulse: 0.12 };
  const s = {
    market: roundScore(currentMarketScore),
    social: roundScore(currentSocialScore),
    driver: roundScore(currentDriverScore),
    pulse:  roundScore(currentPulseScore)
  };

  let total = 0;
  let weight = 0;

  Object.keys(w).forEach((k) => {
    if (activeLayers[k]) { total += s[k] * w[k]; weight += w[k]; }
  });

  return weight ? roundScore(total / weight) : s.market;
}

function getEffectiveHeroScore() {
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
  const pulse    = roundScore(currentPulseScore);
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

function buildHeroTimeline(series) {
  const wrapper = byId("heroTimelineBackdrop");
  const line    = byId("heroTimelineLine");
  const area    = byId("heroTimelineArea");
  if (!wrapper || !line || !area) return;

  const clear = () => {
    wrapper.classList.add("hidden");
    line.setAttribute("d", "");
    area.setAttribute("d", "");
  };

  if (!Array.isArray(series) || series.length < 2) return clear();

  const values = series
    .map((e) => Array.isArray(e) ? Number(e[1]) : Number(e?.value ?? e?.marketCap ?? e))
    .filter((v) => Number.isFinite(v));

  if (values.length < 2) return clear();

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const w = 900, h = 280, topPad = 16, bottomPad = 18;
  const usableH = h - topPad - bottomPad;

  const linePath = values.map((value, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = topPad + (1 - ((value - min) / range)) * usableH;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");

  const first = values[0];
  const last  = values[values.length - 1];
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
  const color = getMoodColor(
    getMoodByScore(normalizeChangeToScore(changePct, globalTimeframe === "30d" ? 5 : 8)).key
  );

  line.setAttribute("d", linePath);
  area.setAttribute("d", `${linePath} L ${w} ${h} L 0 ${h} Z`);
  line.style.stroke = color;
  line.style.fill = "none";
  area.style.fill = `${color}14`;

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

function computeMarketScoreFromInputs(change, trendingScore, memeScore, fearGreed = 50) {
  return roundScore(
    normalizeChangeToScore(change, 12) * 0.62 +
    trendingScore * 0.14 +
    memeScore * 0.08 +
    Number(fearGreed || 50) * 0.16
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

  const items = coins.slice(0, 8).map((coin) => {
    const symbol = coin.symbol?.toUpperCase?.() || "--";
    const change = Number(coin.price_change_percentage_24h_in_currency ?? 0);
    const cls = change > 0 ? "pos" : change < 0 ? "neg" : "neu";
    return `
      <div class="ticker-item">
        <div class="ticker-top">
          <img class="ticker-logo" src="${escapeHtml(coin.image || "")}" alt="" loading="lazy">
          <span class="ticker-price">${escapeHtml(formatCurrency(coin.current_price))}</span>
        </div>
        <div class="ticker-bottom">
          <span class="ticker-symbol">${escapeHtml(symbol)}</span>
          <span class="${cls}">${change > 0 ? "+" : ""}${change.toFixed(1)}%</span>
        </div>
      </div>`;
  }).join("");

  ticker.innerHTML = `<div class="ticker-track">${items}</div>`;
}

async function loadSentiment() {
  if (isLoadingSentiment) return;
  isLoadingSentiment = true;
  try {
    const res = await fetchJson("/api/sentiment", null);
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
  if (isLoadingGlobal) return;
  isLoadingGlobal = true;
  try {
    const res = await fetchJson(
      `/api/global?timeframe=${encodeURIComponent(globalTimeframe)}`, null
    );
    if (!res || typeof res !== "object") return;

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

    currentGlobalChange = getMarketBaseChangeForTimeframe(safeNum(res.change, 0), globalTimeframe);
    currentMarketScore  = computeMarketScoreFromInputs(
      currentGlobalChange, getTrendingMomentumScore(), getMemeMomentumScore(), 50
    );
    currentPulseScore = getPulseScore();

    buildHeroTimeline(res.timeline || []);
    recomputeHeroSystem();
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

  coinExchangeData = [];
  renderCoinExchanges();
  renderCoinSections();

  await loadCoinDetails();
  await loadCoinExchanges();

  renderStudio();
  qs(".chart-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
function drawLineChart(prices) {
  const path = byId("coinChartPath");
  const area = byId("coinChartArea");
  const candles = byId("coinChartCandles");

  if (!path || !area || !prices || prices.length < 2) return;
  if (candles) candles.innerHTML = "";

  const w = 900, h = 280;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const line = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((price - min) / range) * (h - 20);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");

  path.setAttribute("d", line);
  area.setAttribute("d", `${line} L ${w} ${h} L 0 ${h} Z`);

  const positive = prices[prices.length - 1] >= prices[0];
  path.style.display = "";
  area.style.display = "";
  path.style.stroke = positive ? "var(--pos-hard)" : "var(--neg-hard)";
  area.style.fill   = positive ? "rgba(59,217,122,.07)" : "rgba(228,72,92,.07)";
}

/* Velas REALES. Antes esta función fabricaba OHLC a partir de una
   serie de precios: el open salía del punto anterior y el high/low
   de los vecinos. Eso no es una vela, es una línea disfrazada, y
   cualquier trader lo detecta. Ahora consume el OHLC que devuelve
   /api/coin-chart. Si no hay velas reales, NO se dibuja nada. */
function drawCandleChart(candles) {
  const path = byId("coinChartPath");
  const area = byId("coinChartArea");
  const group = byId("coinChartCandles");
  if (!group) return;

  if (!Array.isArray(candles) || candles.length < 2) {
    group.innerHTML = "";
    return;
  }

  if (path) { path.setAttribute("d", ""); path.style.display = "none"; }
  if (area) { area.setAttribute("d", ""); area.style.display = "none"; }

  const w = 900, h = 280, pad = 18;

  // El rango lo marcan los extremos reales, no los cierres.
  const min = Math.min(...candles.map((c) => c.low));
  const max = Math.max(...candles.map((c) => c.high));
  const range = max - min || 1;

  const step = w / candles.length;
  const bodyWidth = Math.max(3, Math.min(step * 0.62, 22));
  const y = (v) => pad + (1 - (v - min) / range) * (h - pad * 2);

  group.innerHTML = candles.map((c, i) => {
    const x = i * step + step / 2;
    const up = c.close >= c.open;
    const color = up ? "var(--pos-hard)" : "var(--neg-hard)";

    const bodyTop = y(Math.max(c.open, c.close));
    const bodyH = Math.max(Math.abs(y(c.close) - y(c.open)), 1.5);

    return `
      <line x1="${x.toFixed(2)}" y1="${y(c.high).toFixed(2)}"
            x2="${x.toFixed(2)}" y2="${y(c.low).toFixed(2)}"
            stroke="${color}" stroke-width="1.2"></line>
      <rect x="${(x - bodyWidth / 2).toFixed(2)}" y="${bodyTop.toFixed(2)}"
            width="${bodyWidth.toFixed(2)}" height="${bodyH.toFixed(2)}"
            fill="${color}"></rect>`;
  }).join("");
}

/* Recibe el payload entero del endpoint, no solo precios: necesita
   saber si hay velas reales disponibles para este timeframe. */
function drawChart(payload) {
  const prices  = Array.isArray(payload?.prices) ? payload.prices : [];
  const candles = Array.isArray(payload?.candles) ? payload.candles : [];
  const hasCandles = Boolean(payload?.hasCandles) && candles.length >= 2;

  // El botón de velas se desactiva si el proveedor no dio OHLC.
  const candleBtn = qs('.chart-mode-btn[data-mode="candle"]');
  if (candleBtn) {
    candleBtn.disabled = !hasCandles;
    candleBtn.title = hasCandles ? "" : "OHLC unavailable for this range";
  }

  // Si estábamos en candle y no hay velas, caemos a línea.
  if (chartMode === "candle" && !hasCandles) chartMode = "line";

  if (chartMode === "candle") drawCandleChart(candles);
  else drawLineChart(prices);

  qsa(".chart-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === chartMode);
  });

  setText("chartRenderMode", chartMode === "candle" ? "Candle chart" : "Line chart");
  setText("chartTimeLabel", `Viewing ${chartTimeframe} structure`);
}

/* Caché de series. Antes cada refresco de 30s volvía a pedir el chart
   aunque no hubiera cambiado ni la moneda ni el timeframe. */
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

  if (res) _chartCache.set(key, { ts: Date.now(), data: res });
  return res;
}

async function loadCoinDetails() {
  if (isLoadingCoinDetails) return;
  isLoadingCoinDetails = true;
  try {
    const coin = getCoinBySymbol(activeCoinSymbol);
    if (!coin || !coin.id) return;

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

    const chartRes = await fetchCoinChart(coin.id, chartTimeframe);

    const prices = (Array.isArray(chartRes?.prices) ? chartRes.prices : [])
      .map((e) => Array.isArray(e) ? Number(e[1]) : Number(e))
      .filter((n) => Number.isFinite(n));

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

  const total = getPulseTotalVotes() || 1;
  const style = getCurrentStyle();

  container.innerHTML = Object.keys(PULSE_WEIGHTS).map((key) => {
    const votes = pulseVotes[key] || 0;
    const pct = Math.round((votes / total) * 100);
    const color = getMoodColor(key);
    return `
      <div class="pulse-row">
        <img src="${escapeHtml(getIconImagePath(style, key))}" width="18" height="18" alt="" loading="lazy">
        <div class="pulse-bar">
          <div class="pulse-bar-fill" style="width:${pct}%; background:${color};"></div>
        </div>
        <span>${pct}% (${votes})</span>
      </div>`;
  }).join("");

  currentPulseScore = getPulseScore();
  const pulseMood = getMoodByScore(currentPulseScore);

  const moodEl = byId("pulseMood");
  if (moodEl) { moodEl.textContent = pulseMood.name; moodEl.className = `mood-${pulseMood.key}`; }

  setText("pulseTotalVotes", String(getPulseTotalVotes()));
  setText("pulseScore", String(currentPulseScore));
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

function handlePulseVote(moodKey) {
  if (!moodKey || !PULSE_WEIGHTS[moodKey]) return;

  if (!canVotePulse()) {
    showPulseMessage(
      `Wait 5 minutes before voting again. Time left: ${formatCooldownTime(getPulseRemainingCooldownMs())}`,
      true
    );
    return;
  }

  setLastPulseVoteTime(Date.now());
  pulseVotes[moodKey] = (pulseVotes[moodKey] || 0) + 1;
  currentPulseScore = getPulseScore();

  renderPulseStats();
  showPulseMessage(`Vote registered: ${getMoodByScore(PULSE_WEIGHTS[moodKey]).name}`);
  triggerPulseReaction(moodKey);
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
  if (trades === "Waiting..." || trades === "No live trades") return market;
  if (market === trades) return market;
  return `${market} + ${trades}`;
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
}

function getMoodTimeframeSeries(tf) {
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

function computeMoodTradeScore() {
  return roundScore(normalizeChangeToScore(getMoodTimeframeChange(moodTokenTimeframe), 7.5));
}

function drawMoodBackdrop() {
  const els = getMoodTokenElements();
  if (!els.backdrop || !els.backdropLine || !els.backdropArea) return;

  const prices = getMoodTimeframeSeries(moodTokenTimeframe);

  if (prices.length < 2) {
    els.backdrop.classList.add("hidden");
    els.backdropLine.setAttribute("d", "");
    els.backdropArea.setAttribute("d", "");
    return;
  }

  const w = 900, h = 280, topPad = 16, bottomPad = 16;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const path = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = topPad + (1 - ((price - min) / range)) * (h - topPad - bottomPad);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");

  const positive = prices[prices.length - 1] >= prices[0];

  els.backdropLine.setAttribute("d", path);
  els.backdropArea.setAttribute("d", `${path} L ${w} ${h} L 0 ${h} Z`);
  els.backdropLine.style.stroke = positive ? "#3BD97A" : "#E4485C";
  els.backdropLine.style.fill = "none";
  els.backdropArea.style.fill = positive ? "rgba(59,217,122,0.09)" : "rgba(228,72,92,0.09)";

  els.backdrop.classList.remove("hidden");
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

  els.heroMoodNodes.forEach((node) => {
    node.textContent = mood.name;
    node.className = `mood-${mood.key}`;
  });

  if (els.badge) {
    els.badge.className = `mood-token-badge mood-${mood.key}`;
    const strong = els.badge.querySelector("strong");
    if (strong) strong.textContent = mood.name;
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
    els.feed.innerHTML = `<div class="mood-empty-feed">Waiting for live trades…</div>`;
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

    return `
      <div class="mood-trade ${trade.side}">
        <strong>${trade.side === "buy" ? "BUY" : "SELL"}</strong>
        <span>${escapeHtml(amount)}</span>
        <span>${escapeHtml(shortenAddress(trade.trader))}</span>
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
  const totalVolume = moodBuyVolume + moodSellVolume;
  const marketCapApprox = moodPrice > 0 ? moodPrice * 1e9 : 0;
  const volatility = Math.min(99.99, Math.abs(changePct) * 4.2);

  moodLiveScore = computeMoodTradeScore();
  moodLiveMood  = getMoodByScore(moodLiveScore);

  if (els.ca) els.ca.textContent = MOOD_FIXED_DISPLAY_CA;

  if (els.price) {
    els.price.textContent = moodPrice > 0 ? formatCurrency(moodPrice) : "Reading";
    applyPolarityClass(els.price, changePct);
  }

  if (els.marketCap) {
    els.marketCap.textContent = marketCapApprox > 0 ? formatCurrencyCompact(marketCapApprox) : "Reading";
    applyPolarityClass(els.marketCap, changePct);
  }

  if (els.volume) {
    els.volume.textContent = totalVolume > 0 ? formatCurrencyCompact(totalVolume) : "Reading";
    applyPolarityClass(els.volume, totalVolume > 0 ? 1 : 0);
  }

  if (els.flow) {
    const delta = moodBuyVolume - moodSellVolume;
    els.flow.textContent = delta > 0 ? "Buy pressure" : delta < 0 ? "Sell pressure" : "Balanced";
    applyPolarityClass(els.flow, delta);
  }

  if (els.change) {
    els.change.textContent = formatPercent(changePct);
    applyPolarityClass(els.change, changePct);
  }

  if (els.volatility) {
    els.volatility.textContent = `${volatility.toFixed(2)}%`;
    els.volatility.className = "neutral";
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

function applyMoodHeroImpulse(side, usdValue, marketCapUsd = 0) {
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
    updateMoodUI();
  }, 900);
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

function setMoodPrice(newPrice) {
  if (!Number.isFinite(newPrice) || newPrice <= 0) return false;
  moodPrevPrice = moodPrice > 0 ? moodPrice : newPrice;
  moodPrice = newPrice;
  registerPriceIntoTimeframes(newPrice);
  return true;
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

    moodEventSource.addEventListener("fallback", () => {
      moodTradesSource = "No live trades";
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
  moodTradesSource = "Waiting...";
  moodHistory = emptyMoodHistory();
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

  moodPrice     = safeNum(market?.price, moodPrice);
  moodPrevPrice = moodPrice;
  moodBuyCount  = safeNum(market?.buys,  moodBuyCount);
  moodSellCount = safeNum(market?.sells, moodSellCount);

  const totalVolume = safeNum(market?.volume, 0);
  if (totalVolume > 0) {
    const totalTx = Math.max(1, moodBuyCount + moodSellCount);
    moodBuyVolume  = totalVolume * (moodBuyCount / totalTx);
    moodSellVolume = totalVolume * (moodSellCount / totalTx);
  }

  moodLastAction = market?.lastAction || "Watching";
  if (moodPrice > 0) registerPriceIntoTimeframes(moodPrice);

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
  connectMoodStream();
}

async function tryLoadDefaultTrendingToken() {
  const api = await fetchJson("/api/token-trending", { tokens: [] });
  const tokens = Array.isArray(api?.tokens) ? api.tokens : [];

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

  const remote = await fetchJson(`/api/bag-search?q=${encodeURIComponent(clean)}`, { results: [] });
  const remoteResults = Array.isArray(remote?.results)
    ? remote.results.map(normalizeBagCoin).filter(Boolean) : [];

  const seen = new Set();
  return [...localResults, ...remoteResults].filter((coin) => {
    const key = `${coin.source}-${coin.id}-${coin.contract}-${coin.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
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
    if (threshol
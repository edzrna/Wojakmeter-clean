window.onerror = function (msg, url, line, col) {
  console.error("WojakMeter Error:", msg, url, line, col);
  return false;
};

const BRAND_X = "@wojakmeterx";
const BRAND_NAME = "wojakmeter";

const TOP_COINS_REFRESH_MS = 30000;
const GLOBAL_REFRESH_MS = 45000;
const COIN_DETAILS_REFRESH_MS = 30000;
const TRENDING_REFRESH_MS = 60000;
const MEMES_REFRESH_MS = 90000;
const SENTIMENT_REFRESH_MS = 60000;

const ACTIVE_COIN_STORAGE_KEY = "wojakActiveCoin";
const DEFAULT_STYLE = "classic";
const STYLE_STORAGE_KEY = "wojakStyle";
const SHARED_ICON_STYLE = "classic";

const PULSE_VOTE_STORAGE_KEY = "wmPulseLastVoteTime";
const PULSE_VOTE_COOLDOWN_MS = 5 * 60 * 1000;
const PULSE_REACTION_MS = 1800;

const HERO_MODE_RAW = "raw";
const HERO_MODE_COMPOSITE = "composite";
const HERO_MODE_CUSTOM = "custom";

const HERO_ALLOWED_TIMEFRAMES = ["1h", "4h", "24h", "7d", "30d"];
const CHART_ALLOWED_TIMEFRAMES = ["1h", "4h", "24h", "7d", "30d"];
const TOKEN_ALLOWED_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "24h"];

// ===============================
// MOOD TOKEN CONFIG
// ===============================
let MOOD_CA = "4JkeVbpKKjaLEWFk6tbUV9mLzYD6xmaPPGZwgRvkpump";
const MOOD_MAIN_CA = "4JkeVbpKKjaLEWFk6tbUV9mLzYD6xmaPPGZwgRvkpump";
const MOOD_MAIN_LABEL = "MOOD";
const MOOD_FIXED_DISPLAY_CA = "4JkeVbpKKjaLEWFk6tbUV9mLzYD6xmaPPGZwgRvkpump";

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
let moodLastAction = "Watching...";
let moodBuyCount = 0;
let moodSellCount = 0;
let moodBuyVolume = 0;
let moodSellVolume = 0;
let moodLiveScore = 50;
let moodLiveMood = getMoodByScore(50);
let moodTokenTimeframe = "5m";

let moodTokenMeta = {
  name: "Trending Solana Token",
  symbol: "---",
  image: "/assets/logo/wojakmeter_logo.png",
  source: "Auto"
};

let moodHistory = {
  "1m": [],
  "5m": [],
  "15m": [],
  "1h": [],
  "4h": [],
  "24h": []
};

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

let currentGlobalMood = getMoodByScore(50);
let currentGlobalChange = 0;
let currentGlobalScore = 50;

let currentMarketScore = 50;
let currentSocialScore = 50;
let currentPulseScore = 50;
let currentDriverScore = 50;

let currentDominantDriver = "market_flow";
let currentBtcDominanceValue = 50;
let currentHeaderVolumeValue = 0;
let currentGlobalMarketCapValue = 0;

let currentNarrative = "Price action is leading sentiment with no major macro override.";
let currentRiskTone = "Balanced";

let socialPanelOpen = false;
let isPulsePreviewActive = false;
let pulsePreviewTimeout = null;

let pulseVotes = {
  frustration: 2,
  concern: 4,
  doubt: 6,
  neutral: 10,
  optimism: 8,
  content: 5,
  euphoria: 3
};

let activeLayers = {
  market: true,
  social: false,
  driver: false,
  pulse: false
};

let isLoadingTopCoins = false;
let isLoadingGlobal = false;
let isLoadingCoinDetails = false;
let isLoadingTrending = false;
let isLoadingMemes = false;
let isLoadingSentiment = false;
let hasBooted = false;

// ===============================
// BASIC HELPERS
// ===============================
function byId(id) {
  return document.getElementById(id);
}

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

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

function formatCurrencyCompact(value) {
  if (value == null || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return "--";

  const num = Number(value);
  if (!Number.isFinite(num)) return "--";

  if (num >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(num);
  }

  if (num >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  if (num >= 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(num);
  }

  if (num >= 0.0001) return `$${num.toFixed(4)}`;
  if (num > 0) return `$${num.toFixed(6)}`;
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
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(2);
  if (num > 0) return num.toFixed(6);
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
    el.onerror = () => {
      el.onerror = null;
      el.src = fallback;
    };
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyPolarityClass(el, value, neutralZero = true) {
  if (!el) return;

  const num = Number(value);
  el.classList.remove("positive", "negative", "neutral");

  if (!Number.isFinite(num)) {
    el.classList.add("neutral");
    return;
  }

  if (num > 0) {
    el.classList.add("positive");
  } else if (num < 0) {
    el.classList.add("negative");
  } else {
    el.classList.add(neutralZero ? "neutral" : "positive");
  }
}

// ===============================
// MOODS
// ===============================
function getMoodByScore(score) {
  if (score >= 85) return { key: "euphoria", name: "Euphoria", anim: "anim-pulse", range: "85â€“100" };
  if (score >= 70) return { key: "content", name: "Content", anim: "anim-float", range: "70â€“84" };
  if (score >= 60) return { key: "optimism", name: "Optimism", anim: "anim-float", range: "60â€“69" };
  if (score >= 45) return { key: "neutral", name: "Neutral", anim: "anim-blink", range: "45â€“59" };
  if (score >= 35) return { key: "doubt", name: "Doubt", anim: "anim-tilt", range: "35â€“44" };
  if (score >= 20) return { key: "concern", name: "Concern", anim: "anim-shake", range: "20â€“34" };
  return { key: "frustration", name: "Frustration", anim: "anim-shake", range: "0â€“19" };
}

function normalizeChangeToScore(changePct, sensitivity = 10) {
  return clamp(50 + Number(changePct || 0) * sensitivity, 0, 100);
}

function getMoodColor(key) {
  const map = {
    frustration: "#ff3b4d",
    concern: "#ff6c79",
    doubt: "#ff9da6",
    neutral: "#cfd7e3",
    optimism: "#a6ffc4",
    content: "#7cffaa",
    euphoria: "#4dff88"
  };
  return map[key] || "#cfd7e3";
}

function getCurrentStyle() {
  const select = byId("styleSelector");
  const value = String(select?.value || "").toLowerCase();
  return ["classic", "synth", "boyak", "minimal"].includes(value) ? value : DEFAULT_STYLE;
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
function saveActiveCoin(symbol) {
  if (!symbol) return;
  try {
    localStorage.setItem(ACTIVE_COIN_STORAGE_KEY, String(symbol).toUpperCase());
  } catch {}
}

function loadSavedActiveCoin() {
  try {
    const saved = localStorage.getItem(ACTIVE_COIN_STORAGE_KEY);
    return saved ? saved.toUpperCase() : null;
  } catch {
    return null;
  }
}

function saveSelectedStyle(style) {
  if (!style) return;
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, String(style).toLowerCase());
  } catch {}
}

function loadSavedStyle() {
  try {
    const saved = localStorage.getItem(STYLE_STORAGE_KEY);
    if (!saved) return DEFAULT_STYLE;
    const normalized = String(saved).toLowerCase();
    return ["classic", "synth", "boyak", "minimal"].includes(normalized) ? normalized : DEFAULT_STYLE;
  } catch {
    return DEFAULT_STYLE;
  }
}

function applyStyleClass(style) {
  const root = document.body;
  if (!root) return;
  root.classList.remove("style-classic", "style-synth", "style-boyak", "style-minimal");
  root.classList.add(`style-${style}`);
}

// ===============================
// DRIVER HELPERS
// ===============================
function getDriverLabel(driverKey) {
  const labels = {
    market_flow: "Market flow / price action",
    social_sentiment: "Social sentiment",
    etf_adoption: "ETF / institutional adoption",
    rate_cut: "Rate cut hopes",
    rate_hike: "Rate hike fears",
    regulation_crackdown: "Regulation crackdown",
    crypto_hack: "Crypto hack / insolvency",
    war_escalation: "War escalation",
    neutral_macro: "Neutral macro environment"
  };
  return labels[driverKey] || "Market flow / price action";
}

function getDriverNarrative(driverKey) {
  const narratives = {
    market_flow: "Price action is leading sentiment with no major macro override.",
    social_sentiment: "Social momentum and trending reactions are amplifying the market mood.",
    etf_adoption: "Institutional-style strength is supporting confidence across major crypto assets.",
    rate_cut: "Rate cut expectations improve liquidity narratives and help sentiment recover.",
    rate_hike: "Higher rate fears pressure liquidity and weaken risk appetite across crypto.",
    regulation_crackdown: "Regulatory pressure increases uncertainty and creates hesitation across the market.",
    crypto_hack: "Security concerns or insolvency headlines are damaging confidence quickly.",
    war_escalation: "Geopolitical stress is pushing markets toward a more defensive and emotional state.",
    neutral_macro: "No dominant macro shock; market mood is being shaped mostly by internal crypto flows."
  };
  return narratives[driverKey] || narratives.market_flow;
}

function getRiskToneFromMood(moodKey) {
  const map = {
    euphoria: "Risk-on",
    content: "Constructive",
    optimism: "Positive",
    neutral: "Balanced",
    doubt: "Cautious",
    concern: "Defensive",
    frustration: "High alert"
  };
  return map[moodKey] || "Balanced";
}

function getReactionLabel(timeframe) {
  switch (timeframe) {
    case "1h": return "Balanced intraday reaction";
    case "4h": return "Broader structural reaction";
    case "24h": return "Higher conviction reaction";
    case "7d": return "Macro-leaning reaction";
    case "30d": return "Trend-cycle reaction";
    default: return "Balanced reaction";
  }
}

function mapDriverLabelToKey(driverLabel) {
  const text = String(driverLabel || "").toLowerCase();

  if (text.includes("etf") || text.includes("institutional")) return "etf_adoption";
  if (text.includes("rate cut")) return "rate_cut";
  if (text.includes("rate hike")) return "rate_hike";
  if (text.includes("regulation")) return "regulation_crackdown";
  if (text.includes("hack") || text.includes("insolvency")) return "crypto_hack";
  if (text.includes("war")) return "war_escalation";
  if (text.includes("neutral macro")) return "neutral_macro";

  return "market_flow";
}

function getDriverScoreFromKey(driverKey) {
  const map = {
    market_flow: 50,
    social_sentiment: 56,
    etf_adoption: 74,
    rate_cut: 66,
    rate_hike: 36,
    regulation_crackdown: 30,
    crypto_hack: 22,
    war_escalation: 26,
    neutral_macro: 50
  };
  return map[driverKey] ?? 50;
}

// ===============================
// PULSE
// ===============================
function getPulseWeightMap() {
  return {
    frustration: 10,
    concern: 25,
    doubt: 40,
    neutral: 50,
    optimism: 65,
    content: 75,
    euphoria: 90
  };
}

function getPulseTotalVotes() {
  return Object.values(pulseVotes).reduce((sum, n) => sum + Number(n || 0), 0);
}

function getPulseScore() {
  const totalVotes = getPulseTotalVotes();
  if (!totalVotes) return 50;

  const weights = getPulseWeightMap();
  let total = 0;

  Object.entries(pulseVotes).forEach(([mood, count]) => {
    total += (weights[mood] || 50) * Number(count || 0);
  });

  return roundScore(total / totalVotes);
}

function getLastPulseVoteTime() {
  try {
    return Number(localStorage.getItem(PULSE_VOTE_STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function setLastPulseVoteTime(timestamp) {
  try {
    localStorage.setItem(PULSE_VOTE_STORAGE_KEY, String(timestamp));
  } catch {}
}

function canVotePulse() {
  return Date.now() - getLastPulseVoteTime() >= PULSE_VOTE_COOLDOWN_MS;
}

function getPulseRemainingCooldownMs() {
  return Math.max(0, PULSE_VOTE_COOLDOWN_MS - (Date.now() - getLastPulseVoteTime()));
}

function formatCooldownTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ===============================
// VISUAL PATHS
// ===============================
function heartbeatPathForMood(moodKey) {
  const paths = {
    frustration: "M0 28 L28 28 L40 10 L56 46 L72 8 L86 50 L104 16 L126 28 L150 28 L170 12 L188 44 L206 8 L224 48 L244 20 L268 28 L320 28",
    concern: "M0 28 L40 28 L56 18 L72 40 L88 14 L102 38 L124 28 L160 28 L176 18 L192 38 L208 16 L224 36 L248 28 L320 28",
    doubt: "M0 28 L36 28 L52 22 L66 34 L82 20 L98 32 L120 28 L150 28 L168 22 L186 34 L202 24 L218 30 L250 28 L320 28",
    neutral: "M0 28 L44 28 L56 24 L68 32 L82 24 L96 30 L120 28 L160 28 L180 26 L196 30 L214 26 L234 28 L320 28",
    optimism: "M0 28 L36 28 L52 24 L66 20 L82 34 L98 16 L114 30 L138 28 L160 28 L178 22 L194 18 L210 30 L226 20 L246 28 L320 28",
    content: "M0 28 L32 28 L46 20 L60 34 L74 12 L88 30 L104 18 L126 28 L150 28 L168 20 L184 34 L198 14 L214 28 L232 18 L254 28 L320 28",
    euphoria: "M0 28 L28 28 L40 16 L52 40 L66 8 L78 46 L94 6 L108 42 L126 18 L148 28 L166 12 L182 44 L198 8 L214 42 L232 14 L252 28 L320 28"
  };
  return paths[moodKey] || paths.neutral;
}

// ===============================
// SCORE SYSTEM
// ===============================
function getVolumeImpulseScore(volumeUsd) {
  if (!Number.isFinite(volumeUsd) || volumeUsd <= 0) return 50;
  if (volumeUsd >= 220e9) return 78;
  if (volumeUsd >= 170e9) return 70;
  if (volumeUsd >= 120e9) return 62;
  if (volumeUsd >= 80e9) return 54;
  if (volumeUsd >= 50e9) return 46;
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
  const avgTrending = average(
    trendingCoinsData.map((c) => Number(c.price_change_percentage_24h_in_currency || 0))
  );
  return normalizeChangeToScore(avgTrending, 3.5);
}

function getMemeMomentumScore() {
  if (!topMemesData.length) return 50;
  const avgMemes = average(
    topMemesData.map((c) => Number(c.price_change_percentage_24h_in_currency || 0))
  );
  return normalizeChangeToScore(avgMemes, 3.2);
}

function getMarketBaseChangeForTimeframe(change24h, timeframe) {
  const base = Number(change24h || 0);

  switch (timeframe) {
    case "1h": return base * 0.25;
    case "4h": return base * 0.5;
    case "24h": return base;
    case "7d": return base * 2.2;
    case "30d": return base * 4;
    default: return base;
  }
}

function computeCompositeScore() {
  const marketScore = roundScore(currentMarketScore);
  const socialScore = roundScore(currentSocialScore);
  const pulseScore = roundScore(currentPulseScore);
  const volumeScore = roundScore(getVolumeImpulseScore(currentHeaderVolumeValue));
  const btcDomScore = roundScore(getBtcDominanceImpulseScore(currentBtcDominanceValue));
  const driverScore = roundScore(currentDriverScore);

  const score =
    marketScore * 0.46 +
    socialScore * 0.2 +
    pulseScore * 0.1 +
    volumeScore * 0.06 +
    btcDomScore * 0.04 +
    driverScore * 0.14;

  return roundScore(score);
}

function computeCustomLayersScore() {
  const marketScore = roundScore(currentMarketScore);
  const socialScore = roundScore(currentSocialScore);
  const driverScore = roundScore(currentDriverScore);
  const pulseScore = roundScore(currentPulseScore);

  let total = 0;
  let weight = 0;

  if (activeLayers.market) {
    total += marketScore * 0.52;
    weight += 0.52;
  }
  if (activeLayers.social) {
    total += socialScore * 0.18;
    weight += 0.18;
  }
  if (activeLayers.driver) {
    total += driverScore * 0.18;
    weight += 0.18;
  }
  if (activeLayers.pulse) {
    total += pulseScore * 0.12;
    weight += 0.12;
  }

  if (!weight) return marketScore;
  return roundScore(total / weight);
}

function getEffectiveHeroScore() {
  if (heroMode === HERO_MODE_RAW) return roundScore(currentMarketScore);
  if (heroMode === HERO_MODE_COMPOSITE) return computeCompositeScore();
  return computeCustomLayersScore();
}

// ===============================
// MAIN HERO UI
// ===============================
function updateGauge(score, mood) {
  const fill = byId("gaugeFill");
  const needle = byId("gaugeNeedle");
  const scoreEl = byId("gaugeScore");
  const scoreHead = byId("gaugeScoreHead");
  const moodEl = byId("gaugeMood");

  const clamped = roundScore(score);
  const angle = -90 + (clamped / 100) * 180;

  if (fill) {
    const pathLength = 377;
    const visible = (clamped / 100) * pathLength;
    fill.style.strokeDasharray = `${visible} ${pathLength}`;
    fill.style.stroke = getMoodColor(mood.key);
  }

  if (needle) {
    needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
  }

  if (scoreEl) scoreEl.textContent = String(clamped);
  if (scoreHead) scoreHead.textContent = String(clamped);
  if (moodEl) {
    moodEl.textContent = mood.name;
    moodEl.className = `mood-${mood.key}`;
  }
}

function setLayerCard(scoreId, barId, impactId, score, impactText, moodKey) {
  const scoreEl = byId(scoreId);
  const barEl = byId(barId);
  const impactEl = byId(impactId);
  const safeScoreValue = roundScore(score);

  if (scoreEl) scoreEl.textContent = safeScoreValue;

  if (barEl) {
    barEl.style.width = `${safeScoreValue}%`;
    barEl.style.background = getMoodColor(moodKey);
    barEl.style.boxShadow = `0 0 12px ${getMoodColor(moodKey)}44`;
  }

  if (impactEl) {
    impactEl.textContent = impactText;
    impactEl.className = "layer-impact";
    if (impactText.startsWith("+")) impactEl.classList.add("positive");
    else if (impactText.startsWith("-")) impactEl.classList.add("negative");
    else impactEl.classList.add("neutral");
  }
}

function updateLayerUI() {
  const socialDiff = Math.abs(roundScore(currentSocialScore) - roundScore(currentMarketScore));
  const driverDiff = Math.abs(roundScore(currentDriverScore) - roundScore(currentMarketScore));
  const pulseDiff = Math.abs(roundScore(currentPulseScore) - roundScore(currentMarketScore));

  const marketImpact = "Base";
  const socialImpact = activeLayers.social || heroMode === HERO_MODE_COMPOSITE
    ? `${currentSocialScore >= currentMarketScore ? "+" : "-"}${socialDiff}`
    : "+0";
  const driverImpact = activeLayers.driver || heroMode === HERO_MODE_COMPOSITE
    ? `${currentDriverScore >= currentMarketScore ? "+" : "-"}${driverDiff}`
    : "+0";
  const pulseImpact = activeLayers.pulse || heroMode === HERO_MODE_COMPOSITE
    ? `${currentPulseScore >= currentMarketScore ? "+" : "-"}${pulseDiff}`
    : "+0";

  setLayerCard("layerScoreMarket", "layerBarMarket", "layerImpactMarket", currentMarketScore, marketImpact, getMoodByScore(currentMarketScore).key);
  setLayerCard("layerScoreSocial", "layerBarSocial", "layerImpactSocial", currentSocialScore, socialImpact, getMoodByScore(currentSocialScore).key);
  setLayerCard("layerScoreDriver", "layerBarDriver", "layerImpactDriver", currentDriverScore, driverImpact, getMoodByScore(currentDriverScore).key);
  setLayerCard("layerScorePulse", "layerBarPulse", "layerImpactPulse", currentPulseScore, pulseImpact, getMoodByScore(currentPulseScore).key);

  const shell = byId("wmLayers");
  if (shell) shell.classList.toggle("disabled-layers", heroMode !== HERO_MODE_CUSTOM);

  qsa(".layer-btn").forEach((btn) => {
    const layer = btn.dataset.layer;
    btn.classList.toggle("active", !!activeLayers[layer]);
    btn.disabled = heroMode !== HERO_MODE_CUSTOM;
  });

  qsa(".hero-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.heroMode === heroMode);
  });
}

function updateHero(score, mood, options = {}) {
  const { pulseMode = false } = options;
  const style = getCurrentStyle();

  const heroMood = byId("heroMood");
  const heroScoreWrap = byId("heroScoreWrap");
  const heroFaceImg = byId("heroFaceImg");
  const emotionPointer = byId("emotionPointer");
  const emotionPointerImg = byId("emotionPointerImg");
  const heartbeatWrap = byId("heartbeatWrap");
  const heartbeatPath = byId("heartbeatPath");

  if (heroMood) {
    heroMood.textContent = mood.name;
    heroMood.className = `hero-mood mood-${mood.key}`;
  }

  if (heroScoreWrap) {
    heroScoreWrap.innerHTML = `
      <span class="score-label">Score</span><span class="score-colon">:</span>
      <span id="heroScore" class="mood-${mood.key}">${roundScore(score)}</span>
      <span class="score-divider">/</span>
      <span class="score-max">100</span>
    `;
  }

  if (heroFaceImg) {
    heroFaceImg.className = `hero-face-img ${mood.anim}`;

    if (pulseMode) {
      heroFaceImg.classList.add("hero-face-pulse");
      clearTimeout(heroFaceImg.__pulseTimer);
      heroFaceImg.__pulseTimer = setTimeout(() => {
        heroFaceImg.classList.remove("hero-face-pulse");
      }, 700);
    }

    setImage(
      heroFaceImg,
      getHeroImagePath(style, mood.key),
      getHeroImagePath(DEFAULT_STYLE, mood.key)
    );
  }

  if (emotionPointer) {
    emotionPointer.style.left = `${clamp(roundScore(score), 0, 100)}%`;
  }

  if (emotionPointerImg) {
    setImage(
      emotionPointerImg,
      getIconImagePath(style, mood.key),
      getIconImagePath(DEFAULT_STYLE, mood.key)
    );
  }

  if (heartbeatWrap && heartbeatPath) {
    heartbeatWrap.className = `heartbeat-wrap heartbeat-${mood.key}`;
    heartbeatPath.setAttribute("d", heartbeatPathForMood(mood.key));
  }

  updateGauge(score, mood);
}

function updateSocialPanel(score, socialMood) {
  const roundedScore = roundScore(score);

  const interactions = Math.max(
    1200,
    Math.round(
      3500 +
      Math.abs(currentGlobalChange) * 2200 +
      average(trendingCoinsData.map((c) => Number(c.price_change_percentage_24h_in_currency || 0))) * 180
    )
  );

  const bullish = clamp(Math.round(roundedScore * 0.82), 0, 100);
  const bearish = clamp(Math.round((100 - roundedScore) * 0.82), 0, 100);
  const neutral = clamp(100 - Math.round((bullish + bearish) * 0.55), 0, 100);

  if (byId("socialExpandMood")) {
    byId("socialExpandMood").textContent = socialMood.name;
    byId("socialExpandMood").className = `mood-${socialMood.key}`;
  }

  setText("socialExpandScore", String(roundedScore));
  setText("socialExpandEngagement", interactions.toLocaleString("en-US"));

  const bullishEl = byId("socialExpandBullish");
  const bearishEl = byId("socialExpandBearish");
  const neutralEl = byId("socialExpandNeutral");

  if (bullishEl) {
    bullishEl.textContent = `${bullish}%`;
    bullishEl.className = "positive";
  }

  if (bearishEl) {
    bearishEl.textContent = `${bearish}%`;
    bearishEl.className = "negative";
  }

  if (neutralEl) {
    neutralEl.textContent = `${neutral}%`;
    neutralEl.className = "neutral";
  }

  setText("socialExpandWindow", globalTimeframe);
}

function updateSocial(socialScore) {
  const style = getCurrentStyle();
  const socialMood = getMoodByScore(socialScore);

  const socialMoodMini = byId("socialMoodMini");
  const socialScoreMini = byId("socialScoreMini");
  const socialBadge = byId("socialBubble");
  const socialIconImg = byId("socialIconImg");

  if (socialMoodMini) {
    socialMoodMini.textContent = socialMood.name;
    socialMoodMini.className = `mood-${socialMood.key}`;
  }

  if (socialScoreMini) {
    socialScoreMini.textContent = String(roundScore(socialScore));
    socialScoreMini.className = `mood-${socialMood.key}`;
  }

  if (socialBadge) {
    socialBadge.classList.remove(
      "social-euphoria",
      "social-content",
      "social-optimism",
      "social-neutral",
      "social-doubt",
      "social-concern",
      "social-frustration"
    );
    socialBadge.classList.add(`social-${socialMood.key}`);
  }

  if (socialIconImg) {
    socialIconImg.className = `mood-icon-img ${socialMood.anim}`;
    setImage(
      socialIconImg,
      getIconImagePath(style, socialMood.key),
      getIconImagePath(DEFAULT_STYLE, socialMood.key)
    );
  }

  updateSocialPanel(socialScore, socialMood);
  return socialMood;
}

function updateDriverPanel() {
  const driverKey = currentDominantDriver || "market_flow";
  const mood = currentGlobalMood || getMoodByScore(50);

  const macroLabel = getDriverLabel(driverKey);
  const narrative = currentNarrative || getDriverNarrative(driverKey);
  const reaction = `${getReactionLabel(globalTimeframe)} (${globalTimeframe})`;
  const riskTone = currentRiskTone || getRiskToneFromMood(mood.key);

  setText("driverMacro", macroLabel);
  setText("driverNarrative", narrative);
  setText("driverTimeframeReaction", reaction);
  setText("driverRiskTone", riskTone);

  const macroDriverSelect = byId("macroDriver");
  if (macroDriverSelect && macroDriverSelect.value !== driverKey) {
    macroDriverSelect.value = driverKey;
  }

  setText("heroDriverLabel", ` (${macroLabel})`);
}

function buildHeroTimeline(series) {
  const wrapper = byId("heroTimelineBackdrop");
  const line = byId("heroTimelineLine");
  const area = byId("heroTimelineArea");

  if (!wrapper || !line || !area) return;

  if (!Array.isArray(series) || series.length < 2) {
    wrapper.classList.add("hidden");
    line.setAttribute("d", "");
    area.setAttribute("d", "");
    return;
  }

  const values = series
    .map((entry) => {
      if (Array.isArray(entry)) return Number(entry[1]);
      return Number(entry?.value ?? entry?.marketCap ?? entry);
    })
    .filter((v) => Number.isFinite(v));

  if (values.length < 2) {
    wrapper.classList.add("hidden");
    line.setAttribute("d", "");
    area.setAttribute("d", "");
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const w = 900;
  const h = 280;
  const topPad = 16;
  const bottomPad = 18;
  const usableH = h - topPad - bottomPad;

  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = topPad + (1 - ((value - min) / range)) * usableH;
    return [x, y];
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;

  const first = values[0];
  const last = values[values.length - 1];
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
  const mood = getMoodByScore(normalizeChangeToScore(changePct, globalTimeframe === "30d" ? 5 : 8));
  const color = getMoodColor(mood.key);

  line.setAttribute("d", linePath);
  area.setAttribute("d", areaPath);

  line.style.stroke = color;
  line.style.fill = "none";
  area.style.fill = `${color}14`;

  wrapper.classList.remove("hidden");
}

// ===============================
// MARKET DATA
// ===============================
function renderTicker(coins) {
  const ticker = byId("tickerBar");
  if (!ticker) return;

  if (!Array.isArray(coins) || !coins.length) {
    ticker.innerHTML = `<span>Loading market...</span>`;
    return;
  }

  const items = coins.slice(0, 8).map((coin) => {
    const symbol = coin.symbol?.toUpperCase?.() || "--";
    const price = formatCurrency(coin.current_price);
    const change = Number(coin.price_change_percentage_24h_in_currency ?? 0);
    const cls = change > 0 ? "pos" : change < 0 ? "neg" : "neu";
    const sign = change > 0 ? "+" : "";
    const logo = coin.image || "";

    return `
      <div class="ticker-item">
        <div class="ticker-top">
          <img class="ticker-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(symbol)} logo">
          <span class="ticker-price">${escapeHtml(price)}</span>
        </div>
        <div class="ticker-bottom">
          <span class="ticker-symbol">${escapeHtml(symbol)}</span>
          <span class="${cls}">${sign}${change.toFixed(1)}%</span>
        </div>
      </div>
    `;
  }).join("");

  ticker.innerHTML = `<div class="ticker-track">${items}</div>`;
}

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
    id: item.id || item.coin_id || item.api_symbol || item.symbol?.toLowerCase?.() || "",
    name: item.name || item.symbol?.toUpperCase?.() || "Unknown",
    symbol: item.symbol || item.name || "--",
    image: item.image || item.thumb || item.large || "",
    current_price: item.current_price ?? item.price ?? null,
    market_cap: item.market_cap ?? null,
    total_volume: item.total_volume ?? null,
    price_change_percentage_1h_in_currency: item.price_change_percentage_1h_in_currency ?? item.change_1h ?? 0,
    price_change_percentage_24h_in_currency:
      item.price_change_percentage_24h_in_currency ??
      item.data?.price_change_percentage_24h?.usd ??
      item.change ??
      item.change_24h ??
      0,
    price_change_percentage_7d_in_currency: item.price_change_percentage_7d_in_currency ?? item.change_7d ?? 0
  };
}

function getSocialScoreFromMarket(change, trending = 50, memes = 50, newsScore = 50) {
  return roundScore(
    clamp(
      50 +
      change * 5 +
      (trending - 50) * 0.12 +
      (memes - 50) * 0.1 +
      (Number(newsScore || 50) - 50) * 0.55,
      0,
      100
    )
  );
}

function computeMarketScoreFromInputs(change, trendingScore, memeScore, fearGreed = 50) {
  const base = normalizeChangeToScore(change, 12);
  const combined =
    base * 0.62 +
    trendingScore * 0.14 +
    memeScore * 0.08 +
    Number(fearGreed || 50) * 0.16;
  return roundScore(combined);
}

function getCoinBySymbol(symbol) {
  const normalized = String(symbol || "").toUpperCase();

  return (
    topCoinsData.find((coin) => coin.symbol?.toUpperCase?.() === normalized) ||
    trendingCoinsData.find((coin) => coin.symbol?.toUpperCase?.() === normalized) ||
    topMemesData.find((coin) => coin.symbol?.toUpperCase?.() === normalized) ||
    null
  );
}

function getCoinChangeForTimeframe(coin, timeframe) {
  const h1 = Number(coin.price_change_percentage_1h_in_currency ?? 0);
  const h24 = Number(coin.price_change_percentage_24h_in_currency ?? 0);
  const d7 = Number(coin.price_change_percentage_7d_in_currency ?? 0);

  switch (timeframe) {
    case "1h": return h1;
    case "4h": return h24 / 6;
    case "24h": return h24;
    case "7d": return d7;
    case "30d": return d7 * 2.8;
    default: return h24;
  }
}

function recomputeHeroSystem() {
  if (isPulsePreviewActive) return;

  const heroScore = getEffectiveHeroScore();
  currentGlobalScore = heroScore;
  currentGlobalMood = getMoodByScore(heroScore);

  updateHero(currentGlobalScore, currentGlobalMood);
  updateSocial(currentSocialScore);
  updateDriverPanel();
  updateLayerUI();

  const globalChangeEl = byId("globalMarketChange");
  if (globalChangeEl) {
    globalChangeEl.textContent = formatPercent(currentGlobalChange);
    globalChangeEl.classList.remove("positive", "negative", "neutral");
    if (currentGlobalChange > 0) globalChangeEl.classList.add("positive");
    else if (currentGlobalChange < 0) globalChangeEl.classList.add("negative");
    else globalChangeEl.classList.add("neutral");
  }

  setText("globalMarketTimeframe", globalTimeframe);
  renderStudio();
}

async function loadSentiment() {
  if (isLoadingSentiment) return;
  isLoadingSentiment = true;

  try {
    const response = await fetchJson("/api/sentiment", null);
    if (!response || typeof response !== "object") {
      updateDriverPanel();
      return;
    }

    currentDominantDriver = mapDriverLabelToKey(response.driver || "Market flow / price action");
    currentDriverScore = getDriverScoreFromKey(currentDominantDriver);
    currentNarrative = response.narrative || getDriverNarrative(currentDominantDriver);
    currentRiskTone = response.risk || "Balanced";

    const trendingScore = getTrendingMomentumScore();
    const memeScore = getMemeMomentumScore();

    currentSocialScore = getSocialScoreFromMarket(
      currentGlobalChange,
      trendingScore,
      memeScore,
      response.newsScore ?? 50
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
    const response = await fetchJson(`/api/global?timeframe=${encodeURIComponent(globalTimeframe)}`, null);
    if (!response || typeof response !== "object") return;

    const globalData = response.raw || {};

    const btcDom =
      response.btcDominance && response.btcDominance !== "--"
        ? parseFloat(String(response.btcDominance).replace("%", ""))
        : safeNum(globalData.market_cap_percentage?.btc, 50);

    currentBtcDominanceValue = btcDom;
    setText("btcDominance", `${btcDom.toFixed(1)}%`);

    const marketCapValue = safeNum(response.marketCapUsd ?? globalData.total_market_cap?.usd, 0);
    currentGlobalMarketCapValue = marketCapValue;
    const marketCapText =
      response.marketCap && response.marketCap !== "--"
        ? response.marketCap
        : formatCurrencyCompact(marketCapValue);
    setText("headerMarketCap", marketCapText);

    const volumeUsd = safeNum(response.volumeUsd ?? globalData.total_volume?.usd, 0);
    currentHeaderVolumeValue = volumeUsd;
    const volumeText =
      response.volume && response.volume !== "--"
        ? response.volume
        : formatCurrencyCompact(volumeUsd);
    setText("headerVolume", volumeText);

    const raw24hChange = safeNum(response.change, 0);
    currentGlobalChange = getMarketBaseChangeForTimeframe(raw24hChange, globalTimeframe);

    currentMarketScore = computeMarketScoreFromInputs(
      currentGlobalChange,
      getTrendingMomentumScore(),
      getMemeMomentumScore(),
      50
    );

    currentPulseScore = getPulseScore();

    setText("globalMarketVolume", volumeText);
    buildHeroTimeline(response.timeline || []);
    recomputeHeroSystem();
  } finally {
    isLoadingGlobal = false;
  }
}

// ===============================
// COIN GRIDS
// ===============================
function createCoinCard(coin, isActive = false) {
  const style = getCurrentStyle();
  const symbol = coin.symbol?.toUpperCase?.() || "--";
  const change = Number(coin.price_change_percentage_24h_in_currency ?? 0);
  const score = normalizeChangeToScore(change, 6);
  const mood = getMoodByScore(score);

  const card = document.createElement("button");
  card.type = "button";
  card.className = `coin-card coin-card-button ${isActive ? "active-coin-card" : ""}`;

  card.innerHTML = `
    <div class="coin-card-top">
      <div class="coin-main">
        <img class="coin-logo" src="${escapeHtml(coin.image || "")}" alt="${escapeHtml(symbol)} logo">
        <div class="price">${escapeHtml(formatCurrency(coin.current_price))}</div>
      </div>
    </div>
    <div class="coin-card-bottom">
      <div class="symbol">${escapeHtml(symbol)}</div>
      <div class="change ${change >= 0 ? "positive" : "negative"}">${formatPercent(change)}</div>
    </div>
    <div class="coin-emoji">
      <img src="${escapeHtml(getIconImagePath(style, mood.key))}" alt="${escapeHtml(symbol)} mood">
    </div>
  `;

  card.addEventListener("click", async () => {
    if (!coin.symbol) return;
    activeCoinSymbol = coin.symbol.toUpperCase();
    saveActiveCoin(activeCoinSymbol);
    renderCoinSections();
    await loadCoinDetails();
    renderStudio();
    qs(".chart-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  return card;
}

function createFallbackCard(title = "Unavailable") {
  const card = document.createElement("div");
  card.className = "coin-card";
  card.innerHTML = `
    <div class="coin-card-top">
      <div class="coin-main">
        <div class="price">--</div>
      </div>
    </div>
    <div class="coin-card-bottom">
      <div class="symbol">${escapeHtml(title)}</div>
      <div class="change neutral">--</div>
    </div>
  `;
  return card;
}

function renderGrid(targetId, data, emptyLabel = "Unavailable") {
  const grid = byId(targetId);
  if (!grid) return;

  grid.innerHTML = "";

  if (!Array.isArray(data) || !data.length) {
    grid.appendChild(createFallbackCard(emptyLabel));
    return;
  }

  data.slice(0, 10).forEach((coin) => {
    const isActive = activeCoinSymbol === coin.symbol?.toUpperCase?.();
    grid.appendChild(createCoinCard(coin, isActive));
  });
}

function renderCoinSections() {
  renderGrid("coinsGrid", topCoinsData, "Top coins unavailable");
  renderGrid("trendingGrid", trendingCoinsData, "Trending unavailable");
  renderGrid("memesGrid", topMemesData, "Memes unavailable");
}

async function loadTopCoins() {
  if (isLoadingTopCoins) return;
  isLoadingTopCoins = true;

  try {
    const response = await fetchJson("/api/top-coins", []);
    const coins = (Array.isArray(response) ? response : [])
      .map(normalizeCoinMarketItem)
      .filter(Boolean);

    if (coins.length) {
      topCoinsData = coins;
      renderTicker(topCoinsData);

      const coinStillExists = getCoinBySymbol(activeCoinSymbol);
      if (!coinStillExists) {
        const savedCoin = loadSavedActiveCoin();
        const savedStillExists = getCoinBySymbol(savedCoin);

        if (savedStillExists) {
          activeCoinSymbol = savedCoin;
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
    const response = await fetchJson("/api/trending", []);
    const coins = (Array.isArray(response) ? response : [])
      .map(normalizeCoinMarketItem)
      .filter(Boolean);

    trendingCoinsData = coins.slice(0, 10);
    renderCoinSections();
  } finally {
    isLoadingTrending = false;
  }
}

async function loadTopMemes() {
  if (isLoadingMemes) return;
  isLoadingMemes = true;

  try {
    const response = await fetchJson("/api/top-memes", []);
    const coins = (Array.isArray(response) ? response : [])
      .map(normalizeCoinMarketItem)
      .filter(Boolean);

    topMemesData = coins.slice(0, 10);
    renderCoinSections();
  } finally {
    isLoadingMemes = false;
  }
}

// ===============================
// MAIN COIN CHART
// ===============================
function drawLineChart(prices) {
  const path = byId("coinChartPath");
  const area = byId("coinChartArea");
  const candleGroup = byId("coinChartCandles");

  if (!path || !area || !prices || prices.length < 2) return;
  if (candleGroup) candleGroup.innerHTML = "";

  const w = 900;
  const h = 280;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((price - min) / range) * (h - 20);
    return [x, y];
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const areaPath = `${line} L ${w} ${h} L 0 ${h} Z`;

  path.setAttribute("d", line);
  area.setAttribute("d", areaPath);

  const first = prices[0];
  const last = prices[prices.length - 1];
  const positive = last >= first;

  path.style.display = "";
  area.style.display = "";
  path.style.stroke = positive ? "var(--green)" : "var(--red)";
  area.style.fill = positive ? "rgba(77,255,136,.08)" : "rgba(255,59,77,.08)";
}

function drawCandleChart(prices) {
  const path = byId("coinChartPath");
  const area = byId("coinChartArea");
  const candleGroup = byId("coinChartCandles");

  if (!candleGroup || !prices || !prices.length) return;

  path.setAttribute("d", "");
  area.setAttribute("d", "");
  path.style.display = "none";
  area.style.display = "none";

  const sample = prices.slice(-28);
  if (sample.length < 2) return;

  const w = 900;
  const h = 280;
  const min = Math.min(...sample);
  const max = Math.max(...sample);
  const range = max - min || 1;
  const step = w / sample.length;
  const bodyWidth = Math.max(6, step * 0.42);

  candleGroup.innerHTML = sample.map((price, i) => {
    const prev = sample[Math.max(i - 1, 0)];
    const next = sample[Math.min(i + 1, sample.length - 1)];
    const open = prev;
    const close = price;
    const high = Math.max(open, close, next);
    const low = Math.min(open, close, next);

    const x = i * step + step / 2;
    const yOpen = h - ((open - min) / range) * (h - 24);
    const yClose = h - ((close - min) / range) * (h - 24);
    const yHigh = h - ((high - min) / range) * (h - 24);
    const yLow = h - ((low - min) / range) * (h - 24);

    const color = close >= open ? "var(--green)" : "var(--red)";
    const rectY = Math.min(yOpen, yClose);
    const rectH = Math.max(Math.abs(yClose - yOpen), 4);

    return `
      <line x1="${x}" y1="${yHigh}" x2="${x}" y2="${yLow}" stroke="${color}"></line>
      <rect x="${x - bodyWidth / 2}" y="${rectY}" width="${bodyWidth}" height="${rectH}" fill="${color}"></rect>
    `;
  }).join("");
}

function updateChartModeLabel() {
  const label = byId("chartRenderMode");
  if (label) label.textContent = chartMode === "candle" ? "Candle chart" : "Line chart";
}

function updateChartTimeLabel() {
  const label = byId("chartTimeLabel");
  if (label) label.textContent = `Viewing ${chartTimeframe} structure`;
}

function drawChart(prices) {
  if (chartMode === "candle") drawCandleChart(prices);
  else drawLineChart(prices);

  updateChartModeLabel();
  updateChartTimeLabel();
}

async function loadCoinDetails() {
  if (isLoadingCoinDetails) return;
  isLoadingCoinDetails = true;

  try {
    const coin = getCoinBySymbol(activeCoinSymbol);
    if (!coin || !coin.id) return;

    const value = getCoinChangeForTimeframe(coin, chartTimeframe);
    const technicalMood = getMoodByScore(normalizeChangeToScore(value, chartTimeframe === "30d" ? 5 : 10));
    const socialMood = getMoodByScore(currentSocialScore);
    const style = getCurrentStyle();

    setText("chartTitle", `${activeCoinSymbol} / ${coin.name}`);
    setText("chartCoinPrice", formatCurrency(coin.current_price));
    setText("chartCoinVolume", formatCurrencyCompact(coin.total_volume));
    setText("chartCoinMarketCap", formatCurrencyCompact(coin.market_cap));
    setText("selectedTimeframe", chartTimeframe);

    const chartCoinIcon = byId("chartCoinIcon");
    if (chartCoinIcon) chartCoinIcon.src = coin.image || "";

    const selectedPerformance = byId("selectedPerformance");
    if (selectedPerformance) {
      selectedPerformance.textContent = formatPercent(value);
      selectedPerformance.classList.remove("positive", "negative", "neutral");
      if (value > 0) selectedPerformance.classList.add("positive");
      else if (value < 0) selectedPerformance.classList.add("negative");
      else selectedPerformance.classList.add("neutral");
    }

    setText("coinMoodLabel", technicalMood.name);
    setText("detailSocialLabel", socialMood.name);

    const coinMoodIcon = byId("coinMoodIconImg");
    if (coinMoodIcon) {
      coinMoodIcon.className = `chart-mood-chip-icon mood-icon-img ${technicalMood.anim}`;
      setImage(coinMoodIcon, getIconImagePath(style, technicalMood.key), getIconImagePath(DEFAULT_STYLE, technicalMood.key));
    }

    const socialIcon = byId("detailSocialIconImg");
    if (socialIcon) {
      socialIcon.className = `chart-mood-chip-icon mood-icon-img ${socialMood.anim}`;
      setImage(socialIcon, getIconImagePath(style, socialMood.key), getIconImagePath(DEFAULT_STYLE, socialMood.key));
    }

    const intervalIds = {
      "1h": "perf1h",
      "4h": "perf4h",
      "24h": "perf24h",
      "7d": "perf7d",
      "30d": "perf30d"
    };

    Object.entries(intervalIds).forEach(([tf, id]) => {
      const el = byId(id);
      if (!el) return;
      const v = getCoinChangeForTimeframe(coin, tf);
      el.textContent = formatPercent(v);
      el.className = v > 0 ? "positive" : v < 0 ? "negative" : "neutral";
    });

    qsa("#chartTimeframes button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.timeframe === chartTimeframe);
      btn.classList.toggle("hidden", !CHART_ALLOWED_TIMEFRAMES.includes(btn.dataset.timeframe));
    });

    qsa(".chart-mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === chartMode);
    });

    const chartResponse = await fetchJson(
      `/api/coin-chart?coin=${encodeURIComponent(coin.id)}&timeframe=${encodeURIComponent(chartTimeframe)}`,
      null
    );

    const rawPrices = chartResponse?.prices;
    if (Array.isArray(rawPrices) && rawPrices.length >= 2) {
      const prices = rawPrices
        .map((entry) => (Array.isArray(entry) ? Number(entry[1]) : Number(entry)))
        .filter((n) => Number.isFinite(n));

      if (prices.length >= 2) drawChart(prices);
    }

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
  const weights = getPulseWeightMap();
  const style = getCurrentStyle();

  const rows = Object.keys(weights).map((key) => {
    const votes = pulseVotes[key] || 0;
    const pct = Math.round((votes / total) * 100);
    const color = getMoodColor(key);

    return `
      <div class="pulse-row">
        <img src="${escapeHtml(getIconImagePath(style, key))}" width="18" height="18" alt="${escapeHtml(key)}">
        <div class="pulse-bar">
          <div
            class="pulse-bar-fill"
            style="width:${pct}%; background:${color}; box-shadow:0 0 10px ${color}55;"
          ></div>
        </div>
        <span>${pct}% (${votes})</span>
      </div>
    `;
  }).join("");

  container.innerHTML = rows;
  const pulseMood = getMoodByScore(getPulseScore());
  currentPulseScore = getPulseScore();

  const pulseMoodEl = byId("pulseMood");
  if (pulseMoodEl) {
    pulseMoodEl.textContent = pulseMood.name;
    pulseMoodEl.className = `mood-${pulseMood.key}`;
  }

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
  msg.__timer = setTimeout(() => {
    msg.classList.remove("show");
    msg.classList.remove("error");
  }, isError ? 2600 : 1800);
}

function triggerPulseReaction(moodKey) {
  const weights = getPulseWeightMap();
  const score = weights[moodKey] || 50;
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
  if (!moodKey) return;

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

  showPulseMessage(`Vote registered: ${getMoodByScore(getPulseWeightMap()[moodKey]).name}`);
  triggerPulseReaction(moodKey);
}

// ===============================
// SOCIAL / PANELS
// ===============================
function setupSocialExpand() {
  const bubble = byId("socialBubble");
  const expand = byId("socialExpand");
  const wrapper = byId("socialWrapper");

  if (!bubble || !expand || !wrapper) return;

  function closePanel() {
    socialPanelOpen = false;
    expand.classList.add("hidden");
    bubble.classList.remove("expanded");
  }

  function togglePanel() {
    socialPanelOpen = !socialPanelOpen;
    expand.classList.toggle("hidden", !socialPanelOpen);
    bubble.classList.toggle("expanded", socialPanelOpen);
  }

  bubble.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePanel();
  });

  bubble.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePanel();
    }
    if (e.key === "Escape") closePanel();
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) closePanel();
  });
}

function setupPulsePanel() {
  const toggle = byId("pulseToggle");
  const panel = byId("pulsePanel");

  if (!toggle || !panel) return;

  const closePanel = () => {
    panel.classList.add("hidden");
    toggle.classList.remove("open");
  };

  const openPanel = () => {
    panel.classList.remove("hidden");
    toggle.classList.add("open");
  };

  const togglePanel = (e) => {
    if (e) e.stopPropagation();
    const isHidden = panel.classList.contains("hidden");
    if (isHidden) openPanel();
    else closePanel();
  };

  toggle.addEventListener("click", togglePanel);

  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePanel(e);
    }
    if (e.key === "Escape") closePanel();
  });

  panel.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", (e) => {
    const clickedInsideToggle = toggle.contains(e.target);
    const clickedInsidePanel = panel.contains(e.target);
    if (!clickedInsideToggle && !clickedInsidePanel) closePanel();
  });

  panel.querySelectorAll("[data-vote]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handlePulseVote(btn.dataset.vote);
    });
  });
}

// ===============================
// MODES
// ===============================
function setupHeroModes() {
  qsa(".hero-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      heroMode = btn.dataset.heroMode || HERO_MODE_RAW;

      if (heroMode === HERO_MODE_RAW) {
        activeLayers = { market: true, social: false, driver: false, pulse: false };
      } else if (heroMode === HERO_MODE_COMPOSITE) {
        activeLayers = { market: true, social: true, driver: true, pulse: true };
      }

      recomputeHeroSystem();
    });
  });
}

function setupLayerButtons() {
  qsa(".layer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (heroMode !== HERO_MODE_CUSTOM) return;

      const layer = btn.dataset.layer;
      if (!layer) return;

      if (layer === "market") activeLayers.market = true;
      else activeLayers[layer] = !activeLayers[layer];

      recomputeHeroSystem();
    });
  });
}

// ===============================
// STUDIO
// ===============================
function initStudioTabs() {
  const buttons = qsa("[data-studio-tab]");
  const panels = qsa(".studio-panel");

  if (!buttons.length || !panels.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.studioTab;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      panels.forEach((panel) => panel.classList.remove("active"));
      const target = byId(`studio-${tab}`);
      if (target) target.classList.add("active");
    });
  });
}

function getGlobalMarketContext() {
  return {
    globalMood: currentGlobalMood?.name || "Neutral",
    globalScore: roundScore(currentGlobalScore),
    marketScore: roundScore(currentMarketScore),
    socialScore: roundScore(currentSocialScore),
    pulseScore: roundScore(currentPulseScore),
    driverScore: roundScore(currentDriverScore),
    globalTimeframe,
    globalChange: currentGlobalChange ?? 0,
    globalVolume: byId("globalMarketVolume")?.textContent || "--",
    macroLabel: getDriverLabel(currentDominantDriver),
    macroNarrative: currentNarrative || getDriverNarrative(currentDominantDriver)
  };
}

function getCoinContext() {
  const activeCoin = getCoinBySymbol(activeCoinSymbol);

  return {
    activeCoin: activeCoinSymbol || "BTC",
    activeCoinName: activeCoin?.name || activeCoinSymbol || "Bitcoin",
    coinTimeframe: chartTimeframe,
    coinPerformance: byId("selectedPerformance")?.textContent || "--",
    technicalMood: byId("coinMoodLabel")?.textContent || "Neutral",
    socialMood: byId("detailSocialLabel")?.textContent || "Neutral"
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
<strong>Scene:</strong> A ${getCurrentStyle()} Wojak hero reacts to a ${ctx.globalMood.toLowerCase()} market while ${ctx.activeCoin} leads the visual focus. The dashboard shows ${ctx.coinPerformance} on the ${ctx.coinTimeframe} chart, and the market atmosphere is influenced by ${ctx.macroLabel.toLowerCase()}.

<strong>Signal mix:</strong> Market ${ctx.marketScore}/100 â€¢ Social ${ctx.socialScore}/100 â€¢ Driver ${ctx.driverScore}/100 â€¢ Pulse ${ctx.pulseScore}/100

<strong>Visual tone:</strong> The image should feel premium, dramatic and native to crypto X, with clear emotional readability and a strong meme format.
  `.trim();
}

function buildDailyMeme(ctx) {
  return `
<strong>Today's market setup:</strong> The crypto market is sitting in <strong>${ctx.globalMood}</strong> on the <strong>${ctx.globalTimeframe}</strong> view, with overall market performance at <strong>${formatPercent(ctx.globalChange)}</strong>.

<strong>Signal blend:</strong> Market <strong>${ctx.marketScore}</strong> â€¢ Social <strong>${ctx.socialScore}</strong> â€¢ Driver <strong>${ctx.driverScore}</strong> â€¢ Pulse <strong>${ctx.pulseScore}</strong>

<strong>Daily meme angle:</strong> Focus on ${ctx.activeCoin} as the emotional anchor, use ${ctx.macroLabel.toLowerCase()} as the macro backdrop, and make the reaction feel instantly understandable for crypto traders scrolling X.
  `.trim();
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

  const alt = `A ${getCurrentStyle()} Wojak-style crypto market meme showing ${ctx.globalMood} sentiment for ${ctx.activeCoin}, with a trading dashboard and market context tied to ${ctx.macroLabel.toLowerCase()}.`;
  const hashtags = `#Crypto #Bitcoin #${ctx.activeCoin} #WojakMeter`;

  return { caption, alt, hashtags };
}

function buildStoryMode(ctx) {
  return `
<div class="story-block"><strong>Market context</strong><br>The market is trading with <strong>${ctx.globalMood}</strong> on the <strong>${ctx.globalTimeframe}</strong> timeframe, while overall market performance sits at <strong>${formatPercent(ctx.globalChange)}</strong>.</div>

<div class="story-block"><strong>Signal blend</strong><br>The current emotion index is built from <strong>market (${ctx.marketScore})</strong>, <strong>social (${ctx.socialScore})</strong>, <strong>driver (${ctx.driverScore})</strong>, and <strong>community pulse (${ctx.pulseScore})</strong>.</div>

<div class="story-block"><strong>Technical confirmation</strong><br>${ctx.activeCoin} is showing <strong>${ctx.technicalMood}</strong> conditions on the <strong>${ctx.coinTimeframe}</strong> structure, with current selected performance at <strong>${ctx.coinPerformance}</strong>.</div>
  `.trim();
}

function setStudioOutput(id, value) {
  const el = byId(id);
  if (el) el.innerHTML = value;
}

function setStudioText(id, value) {
  const el = byId(id);
  if (el) el.textContent = value;
}

function renderStudio() {
  const globalCtx = getGlobalMarketContext();
  const coinCtx = getCoinContext();
  const ctx = { ...globalCtx, ...coinCtx };
  const xPost = buildXPost(ctx);

  setStudioText("memePromptOutput", buildMemePrompt(ctx));
  setStudioOutput("memeSceneOutput", buildMemeScene(ctx));
  setStudioOutput("dailyMemeOutput", buildDailyMeme(ctx));
  setStudioOutput("xPostCaptionOutput", xPost.caption);
  setStudioOutput("xPostAltOutput", xPost.alt);
  setStudioOutput("xPostTagsOutput", xPost.hashtags);
  setStudioOutput("storyModeOutput", buildStoryMode(ctx));
}

async function copyStudioTarget(targetId) {
  const el = byId(targetId);
  if (!el) return;

  const text = el.innerText || el.textContent || "";
  if (!text.trim()) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

function shareMoodOnX() {
  const ctx = getGlobalMarketContext();
  const moodIconMap = {
    Euphoria: "ðŸ¤©",
    Content: "ðŸ˜Œ",
    Optimism: "ðŸ™‚",
    Neutral: "ðŸ˜",
    Doubt: "ðŸ¤¨",
    Concern: "ðŸ˜Ÿ",
    Frustration: "ðŸ˜¤"
  };

  const moodIcon = moodIconMap[ctx.globalMood] || "ðŸ§ ";

  const text =
`${moodIcon} MARKET MOOD: ${ctx.globalMood.toUpperCase()} (${ctx.globalScore}/100)

ðŸ“Š Macro: ${ctx.macroLabel}
â±ï¸ Timeframe: ${ctx.globalTimeframe}
ðŸ“‰ Move: ${formatPercent(ctx.globalChange)}
ðŸ’° Volume: ${ctx.globalVolume}

${moodIcon} ${ctx.macroNarrative}

Track the market mood live ðŸ‘‡`;

  const shareUrl =
    "https://twitter.com/intent/tweet?text=" +
    encodeURIComponent(text) +
    "&url=" +
    encodeURIComponent("https://wojakmeter.com");

  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

// ===============================
// MOOD TOKEN MODULE
// ===============================
function getMoodTokenElements() {
  return {
    section: byId("moodSection") || byId("mood-token"),
    ca: byId("moodContractAddress"),
    copyBtn: byId("copyMoodCaBtn") || byId("copyMoodCA"),
    price: byId("moodTokenPrice") || byId("moodPrice"),
    marketCap: byId("moodTokenMarketCap"),
    volume: byId("moodTokenVolume"),
    flow: byId("moodTokenFlow") || byId("moodFlow"),
    heroImg: byId("moodHeroImg"),
    heroScore: byId("moodTokenScore") || byId("moodHeroScore"),
    heroMoodNodes: [
      byId("moodHeroMood"),
      byId("moodTokenMood")
    ].filter(Boolean),
    volatility: byId("moodTokenVolatility") || byId("moodVolatility"),
    lastAction: byId("moodTokenLastAction") || byId("moodLastAction"),
    badge: byId("moodTokenBadge"),
    name: byId("moodTokenName"),
    symbol: byId("moodTokenSymbol"),
    image: byId("moodTokenImg"),
    input: byId("tokenSearchInput"),
    searchBtn: byId("tokenSearchBtn"),
    loadMoodBtn: byId("loadMoodMain"),
    source: byId("moodTokenSource"),
    feed: byId("moodTradesFeed"),
    backdrop: byId("moodChartBackdrop"),
    backdropLine: byId("moodChartLine"),
    backdropArea: byId("moodChartArea")
  };
}

function getMoodTradeIntensity(usdValue, marketCapUsd = 0) {
  const usd = Number(usdValue || 0);
  const mc = Number(marketCapUsd || 0);
  const ratio = mc > 0 ? usd / mc : 0;

  if (usd >= 100000 || ratio >= 0.03) return 1;
  if (usd >= 50000 || ratio >= 0.015) return 0.85;
  if (usd >= 10000 || ratio >= 0.006) return 0.65;
  if (usd >= 2500 || ratio >= 0.0025) return 0.45;
  if (usd >= 500 || ratio >= 0.001) return 0.25;
  return 0.12;
}

function getMoodCombinedSourceLabel() {
  const market = moodMarketSource || "Auto";
  const trades = moodTradesSource || "Waiting...";

  if (trades === "Waiting..." || trades === "No live trades") {
    return market;
  }

  if (market === trades) {
    return market;
  }

  return `${market} + ${trades}`;
}

function updateMoodTokenMeta(meta = {}) {
  moodTokenMeta = {
    ...moodTokenMeta,
    ...meta
  };

  const els = getMoodTokenElements();

  if (els.name) {
    els.name.textContent =
      moodTokenMeta.name ||
      (isUsingMoodToken ? "MOOD" : "Trending Solana Token");
  }

  if (els.symbol) {
    els.symbol.textContent = moodTokenMeta.symbol
      ? `$${String(moodTokenMeta.symbol).toUpperCase()}`
      : (isUsingMoodToken ? "$MOOD" : "$---");
  }

  if (els.image) {
    els.image.src = moodTokenMeta.image || "/assets/logo/wojakmeter_logo.png";
  }

  if (els.source) {
    els.source.textContent = getMoodCombinedSourceLabel();
  }
}

async function resolveTokenSource(address) {
  return await fetchJson(
    `/api/token-resolve?address=${encodeURIComponent(address)}`,
    null
  );
}

function getMoodTradeBucket(usdValue = 0, marketCapUsd = 0) {
  const usd = Number(usdValue || 0);
  const mc = Number(marketCapUsd || 0);
  const ratio = mc > 0 ? usd / mc : 0;

  if (usd >= 10000 || ratio >= 0.01) return "strong";
  if (usd >= 2500 || ratio >= 0.003) return "medium";
  return "light";
}

function getImpulseMoodFromTrade(side, usdValue = 0, marketCapUsd = 0) {
  const bucket = getMoodTradeBucket(usdValue, marketCapUsd);

  if (side === "buy") {
    if (bucket === "strong") return getMoodByScore(92);
    if (bucket === "medium") return getMoodByScore(76);
    return getMoodByScore(64);
  }

  if (side === "sell") {
    if (bucket === "strong") return getMoodByScore(12);
    if (bucket === "medium") return getMoodByScore(26);
    return getMoodByScore(40);
  }

  return getMoodByScore(50);
}

function computeMoodTradeScore() {
  const tfChange = getMoodTimeframeChange(moodTokenTimeframe);
  return roundScore(normalizeChangeToScore(tfChange, 7.5));
}

function applyMoodHeroImpulse(side, usdValue, marketCapUsd = 0) {
  const heroImg = byId("moodHeroImg");
  const stage = byId("moodStage");

  if (!heroImg || !stage) return;

  const intensity = getMoodTradeIntensity(usdValue || 250, marketCapUsd || 0);
  const impulseMood = getImpulseMoodFromTrade(side, usdValue || 0, marketCapUsd || 0);

  stage.style.setProperty("--token-react-scale", String(1 + intensity * 0.12));
  stage.style.setProperty("--token-react-shift", `${Math.max(6, Math.round(intensity * 16))}px`);

  stage.classList.remove("token-buy-burst", "token-sell-shake");
  heroImg.classList.remove("token-buy-burst", "token-sell-shake");

  void stage.offsetWidth;
  void heroImg.offsetWidth;

  heroImg.className = `mood-hero-img ${impulseMood.anim}`;
  setImage(
    heroImg,
    getHeroImagePath(getCurrentStyle(), impulseMood.key),
    getHeroImagePath(DEFAULT_STYLE, impulseMood.key)
  );

  if (side === "buy") {
    stage.classList.add("token-buy-burst");
    heroImg.classList.add("token-buy-burst");
  } else {
    stage.classList.add("token-sell-shake");
    heroImg.classList.add("token-sell-shake");
  }

  clearTimeout(stage.__reactTimer);
  stage.__reactTimer = setTimeout(() => {
    stage.classList.remove("token-buy-burst", "token-sell-shake");
    heroImg.classList.remove("token-buy-burst", "token-sell-shake");
    updateMoodUI();
  }, 900);
}

function updateMoodHero(mood, score) {
  const els = getMoodTokenElements();
  const style = getCurrentStyle();

  if (els.heroImg) {
    els.heroImg.className = `mood-hero-img ${mood.anim}`;
    setImage(
      els.heroImg,
      getHeroImagePath(style, mood.key),
      getHeroImagePath(DEFAULT_STYLE, mood.key)
    );
  }

  if (els.heroScore) {
    els.heroScore.textContent = String(roundScore(score));
    els.heroScore.classList.remove("positive", "negative", "neutral");

    if (mood.key === "euphoria" || mood.key === "content" || mood.key === "optimism") {
      els.heroScore.classList.add("positive");
    } else if (mood.key === "frustration" || mood.key === "concern" || mood.key === "doubt") {
      els.heroScore.classList.add("negative");
    } else {
      els.heroScore.classList.add("neutral");
    }
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

  const stage = byId("moodStage");
  const glow = byId("moodStageGlow");

  if (stage) {
    stage.classList.remove(
      "euphoria",
      "content",
      "optimism",
      "neutral",
      "doubt",
      "concern",
      "frustration"
    );
    stage.classList.add(mood.key);
    stage.style.boxShadow = `0 0 60px ${getMoodColor(mood.key)}22 inset`;
  }

  if (glow) {
    glow.style.background = `radial-gradient(circle, ${getMoodColor(mood.key)}33 0%, ${getMoodColor(mood.key)}18 35%, rgba(0,0,0,0) 72%)`;
  }
}

function renderMoodTradesFeed() {
  const els = getMoodTokenElements();
  if (!els.feed) return;

  if (!moodTrades.length) {
    els.feed.innerHTML = `<div class="mood-empty-feed">Waiting live trades...</div>`;
    return;
  }

  els.feed.innerHTML = moodTrades.slice(0, 16).map((trade) => {
    const usdValue = Number(trade.usdValue || 0);
    const tokenAmount = Number(trade.tokenAmount || 0);
    const marketCapUsd = Number(trade.marketCapUsd || 0);

    let amountText = "--";
    if (usdValue > 0) amountText = formatCurrency(usdValue);
    else if (tokenAmount > 0) amountText = `${formatCompactNumber(tokenAmount)} TOKENS`;
    else if (marketCapUsd > 0) amountText = `MC ${formatCurrencyCompact(marketCapUsd)}`;

    const sideLabel = trade.side === "buy" ? "BUY" : "SELL";

    return `
      <div class="mood-trade ${trade.side}">
        <strong>${sideLabel}</strong>
        <span>${escapeHtml(amountText)}</span>
        <span>${escapeHtml(shortenAddress(trade.trader))}</span>
      </div>
    `;
  }).join("");
}

function getMoodTimeframeSeries(tf) {
  const bucket = moodHistory[tf];
  if (Array.isArray(bucket) && bucket.length >= 2) {
    return bucket.map((item) => Number(item.price)).filter((v) => Number.isFinite(v));
  }

  const all = moodTrades
    .map((t) => Number(t.price))
    .filter((v) => Number.isFinite(v));

  return all.length >= 2 ? all.slice(-40) : [];
}

function drawMoodBackdrop() {
  const els = getMoodTokenElements();
  if (!els.backdrop || !els.backdropLine || !els.backdropArea) return;

  const prices = getMoodTimeframeSeries(moodTokenTimeframe);

  if (!prices.length || prices.length < 2) {
    els.backdrop.classList.add("hidden");
    els.backdropLine.setAttribute("d", "");
    els.backdropArea.setAttribute("d", "");
    return;
  }

  const w = 900;
  const h = 280;
  const topPad = 16;
  const bottomPad = 16;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y =
      topPad + (1 - ((price - min) / range)) * (h - topPad - bottomPad);
    return [x, y];
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(" ");

  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  const first = prices[0];
  const last = prices[prices.length - 1];
  const positive = last >= first;

  const strokeColor = positive ? "#4dff88" : "#ff3b4d";
  const fillColor = positive
    ? "rgba(77,255,136,0.10)"
    : "rgba(255,59,77,0.10)";

  els.backdropLine.setAttribute("d", path);
  els.backdropArea.setAttribute("d", area);

  els.backdropLine.style.stroke = strokeColor;
  els.backdropLine.style.strokeWidth = "3";
  els.backdropLine.style.fill = "none";
  els.backdropArea.style.fill = fillColor;

  els.backdrop.classList.remove("hidden");
}

function getMoodTimeframeChange(tf) {
  const prices = getMoodTimeframeSeries(tf);
  if (!prices.length || prices.length < 2) return 0;
  const first = prices[0];
  const last = prices[prices.length - 1];
  if (first <= 0) return 0;
  return ((last - first) / first) * 100;
}

function renderMoodTimeframeButtons() {
  qsa("[data-token-timeframe]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tokenTimeframe === moodTokenTimeframe);
  });
}

function updateMoodUI() {
  const els = getMoodTokenElements();
  if (!els.section) return;

  const priceChangePct = getMoodTimeframeChange(moodTokenTimeframe);
  const totalVolume = moodBuyVolume + moodSellVolume;
  const marketCapApprox = moodPrice > 0 ? moodPrice * 1000000000 : 0;
  const volatilityValue = Math.min(99.99, Math.abs(priceChangePct) * 4.2);

  moodLiveScore = computeMoodTradeScore();
  moodLiveMood = getMoodByScore(moodLiveScore);

  if (els.ca) els.ca.textContent = MOOD_FIXED_DISPLAY_CA;

  if (els.price) {
    els.price.textContent = moodPrice > 0 ? formatCurrency(moodPrice) : "Loading live...";
    applyPolarityClass(els.price, priceChangePct);
  }

  if (els.marketCap) {
    els.marketCap.textContent = marketCapApprox > 0 ? formatCurrencyCompact(marketCapApprox) : "Loading live...";
    applyPolarityClass(els.marketCap, priceChangePct);
  }

  if (els.volume) {
    els.volume.textContent = totalVolume > 0 ? formatCurrencyCompact(totalVolume) : "Loading live...";
    applyPolarityClass(els.volume, totalVolume > 0 ? 1 : 0);
  }

  if (els.flow) {
    const flowDelta = moodBuyVolume - moodSellVolume;
    const flowText =
      flowDelta > 0
        ? "Buy pressure"
        : flowDelta < 0
          ? "Sell pressure"
          : "Balanced";

    els.flow.textContent = flowText;
    applyPolarityClass(els.flow, flowDelta);
  }

  const changeEl = byId("moodChange");
  if (changeEl) {
    changeEl.textContent = formatPercent(priceChangePct);
    applyPolarityClass(changeEl, priceChangePct);
  }

  if (els.volatility) {
    els.volatility.textContent = `${volatilityValue.toFixed(2)}%`;
    els.volatility.classList.remove("positive", "negative", "neutral");
    els.volatility.classList.add("neutral");
  }

  if (els.lastAction) {
    els.lastAction.textContent = moodLastAction;

    if (moodLastAction.toLowerCase().includes("buy")) {
      els.lastAction.classList.remove("positive", "negative", "neutral");
      els.lastAction.classList.add("positive");
    } else if (moodLastAction.toLowerCase().includes("sell")) {
      els.lastAction.classList.remove("positive", "negative", "neutral");
      els.lastAction.classList.add("negative");
    } else {
      els.lastAction.classList.remove("positive", "negative", "neutral");
      els.lastAction.classList.add("neutral");
    }
  }

  if (els.source) {
    els.source.textContent = getMoodCombinedSourceLabel();
  }

  updateMoodHero(moodLiveMood, moodLiveScore);
  renderMoodTradesFeed();
  drawMoodBackdrop();
  renderMoodTimeframeButtons();
}

function parseMoodTradePayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const sideText = String(
    payload.txType ||
    payload.side ||
    payload.type ||
    payload.tradeType ||
    payload.eventType ||
    payload.tx_type ||
    payload.action ||
    ""
  ).toLowerCase();

  const side = sideText.includes("sell") ? "sell" : "buy";

  const marketCapUsd =
    safeNum(payload.marketCapUsd, 0) ||
    safeNum(payload.market_cap_usd, 0) ||
    safeNum(payload.usd_market_cap, 0) ||
    safeNum(payload.marketCap, 0) ||
    0;

  const price =
    safeNum(payload.priceUsd, 0) ||
    safeNum(payload.price_usd, 0) ||
    safeNum(payload.price, 0) ||
    safeNum(payload.tokenPrice, 0) ||
    safeNum(payload.usdPrice, 0) ||
    0;

  const tokenAmount =
    safeNum(payload.tokenAmount, 0) ||
    safeNum(payload.amount, 0) ||
    safeNum(payload.baseAmount, 0) ||
    safeNum(payload.tokens, 0) ||
    safeNum(payload.token_quantity, 0) ||
    safeNum(payload.quantity, 0) ||
    0;

  let usdValue =
    safeNum(payload.vUsd, 0) ||
    safeNum(payload.volumeUsd, 0) ||
    safeNum(payload.usdVolume, 0) ||
    safeNum(payload.notionalUsd, 0) ||
    safeNum(payload.totalUsd, 0) ||
    safeNum(payload.amountUsd, 0) ||
    0;

  let resolvedPrice = price;

  if ((!resolvedPrice || resolvedPrice <= 0) && marketCapUsd > 0) {
    resolvedPrice = marketCapUsd / 1000000000;
  }

  if ((!usdValue || usdValue <= 0) && resolvedPrice > 0 && tokenAmount > 0) {
    usdValue = resolvedPrice * tokenAmount;
  }

  if ((!usdValue || usdValue <= 0) && marketCapUsd > 0) {
    usdValue = marketCapUsd * 0.0000025;
  }

  const trader =
    payload.traderPublicKey ||
    payload.wallet ||
    payload.user ||
    payload.owner ||
    payload.maker ||
    payload.trader ||
    payload.publicKey ||
    "";

  const name =
    payload.name ||
    payload.tokenName ||
    payload.token_name ||
    "";

  const symbol =
    payload.symbol ||
    payload.ticker ||
    payload.tokenSymbol ||
    "";

  const image =
    payload.image ||
    payload.imageUrl ||
    payload.logo ||
    payload.uri ||
    payload.image_uri ||
    "";

  if (!sideText && !resolvedPrice && !usdValue && !marketCapUsd) return null;

  return {
    side,
    price: resolvedPrice,
    usdValue,
    tokenAmount,
    trader,
    name,
    symbol,
    image,
    marketCapUsd,
    ts: Date.now()
  };
}

function trimMoodHistory() {
  Object.keys(moodHistory).forEach((tf) => {
    if (moodHistory[tf].length > 240) {
      moodHistory[tf] = moodHistory[tf].slice(-240);
    }
  });
}

function registerPriceIntoTimeframes(price) {
  if (!Number.isFinite(price) || price <= 0) return;
  const now = Date.now();

  Object.keys(moodHistory).forEach((tf) => {
    moodHistory[tf].push({ ts: now, price });
  });

  const limits = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000
  };

  Object.entries(limits).forEach(([tf, ms]) => {
    moodHistory[tf] = moodHistory[tf].filter((entry) => now - entry.ts <= ms);
  });

  trimMoodHistory();
}

function registerMoodTrade(rawTrade) {
  const trade = parseMoodTradePayload(rawTrade);
  if (!trade) return;

  if (trade.name || trade.symbol || trade.image) {
    updateMoodTokenMeta({
      name: trade.name || moodTokenMeta.name,
      symbol: trade.symbol || moodTokenMeta.symbol,
      image: trade.image || moodTokenMeta.image
    });
  }

  if (trade.price > 0) {
    if (moodPrice <= 0) {
      moodPrice = trade.price;
      moodPrevPrice = trade.price;
    } else {
      moodPrevPrice = moodPrice;
      moodPrice = trade.price;
    }

    registerPriceIntoTimeframes(trade.price);
  } else if (trade.marketCapUsd > 0) {
    const syntheticPrice = trade.marketCapUsd / 1000000000;
    if (syntheticPrice > 0) {
      if (moodPrice <= 0) {
        moodPrice = syntheticPrice;
        moodPrevPrice = syntheticPrice;
      } else {
        moodPrevPrice = moodPrice;
        moodPrice = syntheticPrice;
      }

      registerPriceIntoTimeframes(syntheticPrice);
    }
  }

  const bucket = getMoodTradeBucket(trade.usdValue || 0, trade.marketCapUsd || 0);

  if (trade.side === "buy") {
    moodBuyCount += 1;
    moodBuyVolume += trade.usdValue;

    if (bucket === "strong") moodLastAction = "Strong buy";
    else if (bucket === "medium") moodLastAction = "Medium buy";
    else moodLastAction = "Light buy";
  } else {
    moodSellCount += 1;
    moodSellVolume += trade.usdValue;

    if (bucket === "strong") moodLastAction = "Strong sell";
    else if (bucket === "medium") moodLastAction = "Medium sell";
    else moodLastAction = "Light sell";
  }

  moodTrades.unshift(trade);
  if (moodTrades.length > 24) {
    moodTrades = moodTrades.slice(0, 24);
  }

  updateMoodUI();
  applyMoodHeroImpulse(trade.side, trade.usdValue || 0, trade.marketCapUsd || 0);
}

function cleanupMoodStream() {
  clearTimeout(moodStreamReconnectTimer);

  try {
    if (moodEventSource) {
      moodEventSource.close();
    }
  } catch {}

  moodEventSource = null;
}

function connectMoodStream() {
  if (!moodResolvedAddress) return;

  cleanupMoodStream();

  const streamUrl =
    `/api/token-stream?address=${encodeURIComponent(moodResolvedAddress)}` +
    `&source=auto`;

  try {
    moodEventSource = new EventSource(streamUrl);

    moodEventSource.addEventListener("ready", () => {});

    moodEventSource.addEventListener("source", (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");

        if (payload?.source === "birdeye") {
          moodTradesSource = "Birdeye Live";
        } else if (payload?.source === "pumpportal") {
          moodTradesSource = "Pump.fun Live";
        } else {
          moodTradesSource = "Live";
        }

        updateMoodTokenMeta({});
        updateMoodUI();
      } catch {}
    });

    moodEventSource.addEventListener("trade", (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        registerMoodTrade(payload);
      } catch (error) {
        console.error("Mood stream parse error:", error);
      }
    });

    moodEventSource.addEventListener("fallback", () => {
      moodTradesSource = "No live trades";
      updateMoodTokenMeta({});
      updateMoodUI();
      cleanupMoodStream();
    });

    moodEventSource.onerror = () => {
      cleanupMoodStream();

      moodTradesSource = "Reconnecting...";
      updateMoodTokenMeta({});
      updateMoodUI();

      clearTimeout(moodStreamReconnectTimer);
      moodStreamReconnectTimer = setTimeout(() => {
        if (moodResolvedAddress) connectMoodStream();
      }, 3000);
    };
  } catch (error) {
    console.error("Mood stream connection error:", error);
  }
}

function resetMoodTokenState() {
  cleanupMoodStream();

  moodTrades = [];
  moodPrice = 0;
  moodPrevPrice = 0;
  moodLastAction = "Watching...";
  moodBuyCount = 0;
  moodSellCount = 0;
  moodBuyVolume = 0;
  moodSellVolume = 0;
  moodLiveScore = 50;
  moodLiveMood = getMoodByScore(50);
  moodTradesSource = "Waiting...";
  moodHistory = {
    "1m": [],
    "5m": [],
    "15m": [],
    "1h": [],
    "4h": [],
    "24h": []
  };
}

async function loadMoodMarketSnapshot() {
  if (!moodResolvedAddress) return null;

  const market = await fetchJson(
    `/api/token-data?address=${encodeURIComponent(moodResolvedAddress)}`,
    null
  );

  if (!market || typeof market !== "object") return null;

  moodMarketSource = market?.meta?.source || "Auto";

  updateMoodTokenMeta({
    name: market?.meta?.name || moodTokenMeta.name,
    symbol: market?.meta?.symbol || moodTokenMeta.symbol,
    image: market?.meta?.image || moodTokenMeta.image
  });

  moodPrice = safeNum(market?.price, moodPrice);
  moodPrevPrice = moodPrice;
  moodBuyCount = safeNum(market?.buys, moodBuyCount);
  moodSellCount = safeNum(market?.sells, moodSellCount);

  const totalVolume = safeNum(market?.volume, 0);
  if (totalVolume > 0) {
    const totalTx = Math.max(1, moodBuyCount + moodSellCount);
    const buyRatio = moodBuyCount / totalTx;
    const sellRatio = moodSellCount / totalTx;
    moodBuyVolume = totalVolume * buyRatio;
    moodSellVolume = totalVolume * sellRatio;
  }

  moodLastAction = market?.lastAction || "Watching...";

  if (moodPrice > 0) {
    registerPriceIntoTimeframes(moodPrice);
  }

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

function startMoodPolling() {
  clearInterval(window.__wmMoodMarketTimer);
  clearInterval(window.__wmMoodChartTimer);

  window.__wmMoodMarketTimer = setInterval(async () => {
    await loadMoodMarketSnapshot();
  }, 15000);

  window.__wmMoodChartTimer = setInterval(async () => {
    await loadMoodChartSnapshot();
  }, 12000);
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

  const resolved = await resolveTokenSource(cleaned);

  if (resolved?.ok) {
    moodResolvedAddress = resolved?.token?.address || cleaned;
    moodPairAddress = resolved?.pair?.pairAddress || "";
    moodDexId = resolved?.pair?.dexId || "";

    updateMoodTokenMeta({
      name: resolved?.token?.name || meta?.name,
      symbol: resolved?.token?.symbol || meta?.symbol,
      image: resolved?.token?.image || meta?.image
    });
  } else {
    moodResolvedAddress = cleaned;
  }

  await loadMoodMarketSnapshot();
  await loadMoodChartSnapshot();

  connectMoodStream();
}

async function tryLoadDefaultTrendingToken() {
  const ownApi = await fetchJson("/api/token-trending", { tokens: [] });
  const tokens = Array.isArray(ownApi?.tokens) ? ownApi.tokens : [];

  if (tokens.length) {
    const top = tokens[0];

    isUsingDefaultTrending = true;
    isUsingMoodToken = false;

    await loadMoodTokenAddress(top.address || top.mint, {
      name: top.name || "Trending Token",
      symbol: top.symbol || "---",
      image: top.image || "/assets/logo/wojakmeter_logo.png",
      source: "Auto"
    });

    return true;
  }

  const HARD_FALLBACK = "So11111111111111111111111111111111111111112";

  isUsingDefaultTrending = true;
  isUsingMoodToken = false;

  await loadMoodTokenAddress(HARD_FALLBACK, {
    name: "SOL",
    symbol: "SOL",
    image: "/assets/logo/wojakmeter_logo.png",
    source: "Fallback"
  });

  return true;
}

function ensureMoodBackdropMarkup() {
  const stage = byId("moodStage");
  if (!stage) return;

  if (byId("moodChartBackdrop")) return;

  const wrapper = document.createElement("div");
  wrapper.id = "moodChartBackdrop";
  wrapper.className = "mood-chart-backdrop hidden";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 900 280");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
  area.setAttribute("id", "moodChartArea");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("id", "moodChartLine");

  svg.appendChild(area);
  svg.appendChild(line);
  wrapper.appendChild(svg);

  const glow = byId("moodStageGlow");
  if (glow) {
    stage.insertBefore(wrapper, glow.nextSibling);
  } else {
    stage.insertBefore(wrapper, stage.firstChild);
  }
}

function ensureMoodTimeframeMarkup() {
  if (byId("moodTokenTimeframes")) return;

  const main = qs(".mood-token-main");
  const statsGrid = qs(".mood-stats-grid");
  if (!main || !statsGrid) return;

  const row = document.createElement("div");
  row.className = "timeframes mood-token-timeframes";
  row.id = "moodTokenTimeframes";

  row.innerHTML = TOKEN_ALLOWED_TIMEFRAMES.map((tf) => {
    const active = tf === moodTokenTimeframe ? "active" : "";
    return `<button type="button" class="${active}" data-token-timeframe="${tf}">${tf}</button>`;
  }).join("");

  main.insertBefore(row, statsGrid);
}

function ensureMoodFeedMarkup() {
  const visual = qs(".mood-token-visual");
  const note = qs(".mood-token-note");
  if (!visual || byId("moodTradesFeed")) return;

  const feed = document.createElement("div");
  feed.className = "mood-trades-feed";
  feed.id = "moodTradesFeed";
  feed.innerHTML = `<div class="mood-empty-feed">Waiting live trades...</div>`;

  if (note) {
    visual.insertBefore(feed, note);
  } else {
    visual.appendChild(feed);
  }
}

function setupMoodTokenControls() {
  const els = getMoodTokenElements();

  if (els.copyBtn && !els.copyBtn.dataset.bound) {
    els.copyBtn.dataset.bound = "1";
    els.copyBtn.addEventListener("click", async () => {
      const text = MOOD_FIXED_DISPLAY_CA || "";
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        const original = els.copyBtn.textContent || "Copy CA";
        els.copyBtn.textContent = "Copied";
        setTimeout(() => {
          els.copyBtn.textContent = original;
        }, 1200);
      } catch {}
    });
  }

  if (els.searchBtn && els.input && !els.searchBtn.dataset.bound) {
    els.searchBtn.dataset.bound = "1";
    els.searchBtn.addEventListener("click", async () => {
      const ca = String(els.input.value || "").trim();
      if (!ca) return;

      isUsingDefaultTrending = false;
      isUsingMoodToken = false;

      await loadMoodTokenAddress(ca, {
        name: "Custom Token",
        symbol: "---",
        image: "/assets/logo/wojakmeter_logo.png",
        source: "Custom"
      });
    });
  }

  if (els.input && !els.input.dataset.boundEnter) {
    els.input.dataset.boundEnter = "1";
    els.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        els.searchBtn?.click();
      }
    });
  }

  if (els.loadMoodBtn && !els.loadMoodBtn.dataset.bound) {
    els.loadMoodBtn.dataset.bound = "1";
    els.loadMoodBtn.addEventListener("click", async () => {
      if (!MOOD_MAIN_CA) {
        alert("MOOD token launching soon ðŸš€");
        return;
      }

      isUsingMoodToken = true;
      isUsingDefaultTrending = false;

      await loadMoodTokenAddress(MOOD_MAIN_CA, {
        name: "MOOD",
        symbol: "MOOD",
        image: "/assets/logo/wojakmeter_logo.png",
        source: "MOOD"
      });
    });
  }

  qsa("[data-token-timeframe]").forEach((btn) => {
    if (btn.dataset.boundTf) return;
    btn.dataset.boundTf = "1";

    btn.addEventListener("click", async () => {
      const tf = btn.dataset.tokenTimeframe;
      if (!TOKEN_ALLOWED_TIMEFRAMES.includes(tf)) return;
      moodTokenTimeframe = tf;
      renderMoodTimeframeButtons();
      await loadMoodChartSnapshot();
      updateMoodUI();
    });
  });
}

async function initMoodToken() {
  const els = getMoodTokenElements();
  if (!els.section) return;

  ensureMoodBackdropMarkup();
  ensureMoodTimeframeMarkup();
  ensureMoodFeedMarkup();

  if (els.ca) {
    els.ca.textContent = MOOD_FIXED_DISPLAY_CA;
  }

  setupMoodTokenControls();
  await tryLoadDefaultTrendingToken();
  startMoodPolling();
}

// ===============================
// BAG MOOD MODULE
// ===============================
const BAG_STORAGE_KEY = "wojakBagMoodHoldings";
const BAG_STYLE_STORAGE_KEY = "wojakBagMoodStyle";

let bagMoodHoldings = [];
let bagMoodTimeframe = "24h";
let bagMoodMode = "portfolio";
let bagMoodStyle = DEFAULT_STYLE;
let bagSearchResults = [];
let bagSelectedIndex = 0;

function getAllowedBagStyles() {
  return ["classic", "synth", "boyak", "minimal"];
}

function getBagMoodStyle() {
  return getAllowedBagStyles().includes(bagMoodStyle) ? bagMoodStyle : DEFAULT_STYLE;
}

function saveBagMoodStyle(style) {
  try {
    localStorage.setItem(BAG_STYLE_STORAGE_KEY, style);
  } catch {}
}

function loadBagMoodStyle() {
  try {
    const saved = localStorage.getItem(BAG_STYLE_STORAGE_KEY);
    if (getAllowedBagStyles().includes(saved)) return saved;
    return getCurrentStyle();
  } catch {
    return getCurrentStyle();
  }
}

function saveBagMoodHoldings() {
  try {
    localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(bagMoodHoldings));
  } catch {}
}

function loadBagMoodHoldings() {
  try {
    const saved = localStorage.getItem(BAG_STORAGE_KEY);
    bagMoodHoldings = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(bagMoodHoldings)) bagMoodHoldings = [];
  } catch {
    bagMoodHoldings = [];
  }
}

function findLocalBagCoin(query) {
  const q = String(query || "").toLowerCase();

  return (
    topCoinsData.find((c) => c.symbol?.toLowerCase?.() === q || c.name?.toLowerCase?.() === q) ||
    trendingCoinsData.find((c) => c.symbol?.toLowerCase?.() === q || c.name?.toLowerCase?.() === q) ||
    topMemesData.find((c) => c.symbol?.toLowerCase?.() === q || c.name?.toLowerCase?.() === q) ||
    null
  );
}

function normalizeBagCoin(item) {
  if (!item) return null;

  return {
    id: item.id || item.coinId || item.address || "",
    symbol: String(item.symbol || "---").toUpperCase(),
    name: item.name || item.symbol || "Unknown",
    image: item.image || item.thumb || item.large || "/assets/logo/wojakmeter_logo.png",
    source: item.source || "local",
    network: item.network || item.chain || "",
    contract: item.contract || item.address || "",
    current_price: item.current_price ?? item.price ?? null,
    price_change_percentage_1h_in_currency:
      item.price_change_percentage_1h_in_currency ?? item.change_1h ?? 0,
    price_change_percentage_24h_in_currency:
      item.price_change_percentage_24h_in_currency ?? item.change_24h ?? 0,
    price_change_percentage_7d_in_currency:
      item.price_change_percentage_7d_in_currency ?? item.change_7d ?? 0
  };
}

async function searchBagCoins(query) {
  const clean = String(query || "").trim();
  if (!clean) return [];

  const local = findLocalBagCoin(clean);
  const localResults = local ? [{ ...normalizeBagCoin(local), source: "WojakMeter" }] : [];

  const remote = await fetchJson(
    `/api/bag-search?q=${encodeURIComponent(clean)}`,
    { results: [] }
  );

  const remoteResults = Array.isArray(remote?.results)
    ? remote.results.map(normalizeBagCoin).filter(Boolean)
    : [];

  const merged = [...localResults, ...remoteResults];
  const seen = new Set();

  return merged
    .filter((coin) => {
      const key = `${coin.source}-${coin.id}-${coin.contract}-${coin.symbol}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function getHoldingLiveCoin(holding) {
  return getCoinBySymbol(holding.symbol) || holding;
}

function getHoldingCurrentPrice(holding) {
  const liveCoin = getHoldingLiveCoin(holding);
  return Number(liveCoin.current_price || holding.current_price || 0);
}

function getHoldingTokenAmount(holding) {
  const entryPrice = Number(holding.entryPrice || 0);
  const invested = Number(holding.usdValue || 0);

  if (entryPrice > 0 && invested > 0) {
    return invested / entryPrice;
  }

  return 0;
}

function getHoldingCurrentValue(holding) {
  const amount = getHoldingTokenAmount(holding);
  const currentPrice = getHoldingCurrentPrice(holding);

  if (amount > 0 && currentPrice > 0) {
    return amount * currentPrice;
  }

  return Number(holding.usdValue || 0);
}

function getHoldingPnl(holding) {
  const invested = Number(holding.usdValue || 0);
  const currentValue = getHoldingCurrentValue(holding);
  const pnl = currentValue - invested;
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

  return {
    invested,
    currentValue,
    pnl,
    pnlPercent
  };
}

function getHoldingChange(holding) {
  const pnlData = getHoldingPnl(holding);

  if (Number(holding.entryPrice || 0) > 0) {
    return pnlData.pnlPercent;
  }

  const localCoin = getCoinBySymbol(holding.symbol);

  if (localCoin) {
    return getCoinChangeForTimeframe(localCoin, bagMoodTimeframe);
  }

  const h1 = Number(holding.price_change_percentage_1h_in_currency || 0);
  const h24 = Number(holding.price_change_percentage_24h_in_currency || 0);
  const d7 = Number(holding.price_change_percentage_7d_in_currency || 0);

  switch (bagMoodTimeframe) {
    case "1h": return h1;
    case "4h": return h24 / 6;
    case "24h": return h24;
    case "7d": return d7;
    case "30d": return d7 * 2.8;
    default: return h24;
  }
}

function getBagPortfolioTotals() {
  return bagMoodHoldings.reduce(
    (totals, holding) => {
      const data = getHoldingPnl(holding);

      totals.invested += data.invested;
      totals.currentValue += data.currentValue;
      totals.pnl += data.pnl;

      return totals;
    },
    {
      invested: 0,
      currentValue: 0,
      pnl: 0
    }
  );
}

function updateBagPortfolioSummary() {
  const totals = getBagPortfolioTotals();
  const pnlPercent = totals.invested > 0 ? (totals.pnl / totals.invested) * 100 : 0;

  setText("bagPortfolioValue", formatCurrency(totals.currentValue));
  setText("bagTotalInvested", formatCurrency(totals.invested));
  setText("bagPortfolioPnl", formatCurrency(totals.pnl));
  setText("bagPortfolioPnlPercent", formatPercent(pnlPercent));

  const pnlEl = byId("bagPortfolioPnl");
  const pnlPercentEl = byId("bagPortfolioPnlPercent");

  if (pnlEl) applyPolarityClass(pnlEl, totals.pnl);
  if (pnlPercentEl) applyPolarityClass(pnlPercentEl, pnlPercent);
}

function calculateBagMood() {
  if (!bagMoodHoldings.length) {
    return { change: 0, score: 50, mood: getMoodByScore(50) };
  }

  if (bagMoodMode === "single") {
    const selected = bagMoodHoldings[bagSelectedIndex] || bagMoodHoldings[0];
    const change = selected ? getHoldingChange(selected) : 0;
    const score = roundScore(normalizeChangeToScore(change, 10));

    return {
      change,
      score,
      mood: getMoodByScore(score)
    };
  }

  const totals = getBagPortfolioTotals();

  if (totals.invested <= 0) {
    return { change: 0, score: 50, mood: getMoodByScore(50) };
  }

  const weightedChange = (totals.pnl / totals.invested) * 100;
  const score = roundScore(normalizeChangeToScore(weightedChange, 10));

  return {
    change: weightedChange,
    score,
    mood: getMoodByScore(score)
  };
}

function renderBagSearchResults() {
  const box = byId("bagSearchResults");
  const usdValue = Number(byId("bagValueInput")?.value || 0);
  const entryPrice = Number(byId("bagEntryPriceInput")?.value || 0);

  if (!box) return;

  if (!bagSearchResults.length) {
    box.innerHTML = "";
    return;
  }

  box.innerHTML = bagSearchResults.map((coin, index) => `
    <div class="bag-result">
      <div class="bag-coin">
        <img src="${escapeHtml(coin.image)}" alt="${escapeHtml(coin.symbol)}">
        <div>
          <strong>${escapeHtml(coin.symbol)}</strong>
          <span>${escapeHtml(coin.name)}${coin.network ? " • " + escapeHtml(coin.network) : ""}</span>
        </div>
      </div>

      <span>${escapeHtml(coin.source || "source")}</span>

      <button class="bag-add-btn" type="button" data-bag-result-index="${index}">
        Add
      </button>
    </div>
  `).join("");

  qsa("[data-bag-result-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.bagResultIndex);
      const coin = bagSearchResults[index];
      if (!coin) return;

      addBagHolding(coin, usdValue > 0 ? usdValue : 100, entryPrice);

      bagSearchResults = [];
      renderBagSearchResults();

      const searchInput = byId("bagSearchInput");
      const valueInput = byId("bagValueInput");
      const entryInput = byId("bagEntryPriceInput");

      if (searchInput) searchInput.value = "";
      if (valueInput) valueInput.value = "";
      if (entryInput) entryInput.value = "";
    });
  });
}

function addBagHolding(coin, usdValue, entryPrice = 0) {
  const normalized = normalizeBagCoin(coin);
  if (!normalized) return;

  const value = Number(usdValue || 0);
  if (!Number.isFinite(value) || value <= 0) return;

  const cleanEntryPrice = Number(entryPrice || 0);
  const finalEntryPrice =
    Number.isFinite(cleanEntryPrice) && cleanEntryPrice > 0
      ? cleanEntryPrice
      : Number(normalized.current_price || 0);

  const existing = bagMoodHoldings.find((h) => {
    if (normalized.contract && h.contract) return h.contract === normalized.contract;
    return h.symbol === normalized.symbol;
  });

  if (existing) {
    existing.usdValue = value;
    existing.entryPrice = finalEntryPrice;
    Object.assign(existing, normalized);
  } else {
    bagMoodHoldings.push({
      ...normalized,
      usdValue: value,
      entryPrice: finalEntryPrice
    });

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

function renderBagMood() {
  const section = byId("bagMoodSection");
  if (!section) return;

  const result = calculateBagMood();
  const mood = result.mood;
  const bagStyle = getBagMoodStyle();

  const title = byId("bagMoodTitle");
  if (title) {
    title.textContent = mood.name;
    title.className = `mood-${mood.key}`;
  }

  setText("bagMoodScore", `${result.score}/100`);
  setText("bagMoodChange", formatPercent(result.change));
  setText("bagMoodTimeframe", bagMoodTimeframe);

  const changeEl = byId("bagMoodChange");
  if (changeEl) applyPolarityClass(changeEl, result.change);

  const heroImg = byId("bagMoodHeroImg");
  if (heroImg) {
    heroImg.className = `bag-mood-hero-img ${mood.anim}`;
    setImage(
      heroImg,
      getHeroImagePath(bagStyle, mood.key),
      getHeroImagePath(DEFAULT_STYLE, mood.key)
    );
  }

  updateBagPortfolioSummary();

  qsa("[data-bag-mode]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.bagMode === bagMoodMode);
  });

  qsa("[data-bag-timeframe]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.bagTimeframe === bagMoodTimeframe);
  });

  const selector = byId("bagStyleSelector");
  if (selector && selector.value !== bagStyle) {
    selector.value = bagStyle;
  }

  const list = byId("bagMoodList");
  if (!list) return;

  if (!bagMoodHoldings.length) {
    list.innerHTML = `<div class="bag-empty">Build your bag to see what it feels like.</div>`;
    return;
  }

  list.innerHTML = bagMoodHoldings.map((holding, index) => {
    const change = getHoldingChange(holding);
    const score = roundScore(normalizeChangeToScore(change, 10));
    const coinMood = getMoodByScore(score);
    const pnlData = getHoldingPnl(holding);
    const currentPrice = getHoldingCurrentPrice(holding);
    const cls = pnlData.pnl > 0 ? "positive" : pnlData.pnl < 0 ? "negative" : "neutral";
    const isActive = bagMoodMode === "single" && bagSelectedIndex === index ? "active-bag-row" : "";

    return `
      <div class="bag-row ${isActive}" data-select-bag="${index}">
        <div class="bag-coin">
          <img src="${escapeHtml(holding.image || "/assets/logo/wojakmeter_logo.png")}" alt="${escapeHtml(holding.symbol)}">
          <div>
            <strong>${escapeHtml(holding.symbol)}</strong>
            <span>${escapeHtml(holding.name || "")}</span>
          </div>
        </div>

        <div>
          <span class="bag-row-label">Invested</span>
          <strong>${formatCurrency(pnlData.invested)}</strong>
        </div>

        <div>
          <span class="bag-row-label">Entry</span>
          <strong>${formatCurrency(holding.entryPrice || 0)}</strong>
        </div>

        <div>
          <span class="bag-row-label">Now</span>
          <strong>${formatCurrency(currentPrice)}</strong>
        </div>

        <div>
          <span class="bag-row-label">Value</span>
          <strong>${formatCurrency(pnlData.currentValue)}</strong>
        </div>

        <div class="${cls}">
          <span class="bag-row-label">PNL</span>
          <strong>${formatCurrency(pnlData.pnl)} / ${formatPercent(pnlData.pnlPercent)}</strong>
        </div>

        <div class="mood-${coinMood.key}">
          <span class="bag-row-label">Mood</span>
          <strong>${coinMood.name}</strong>
        </div>

        <button class="bag-remove-btn" type="button" data-remove-bag="${index}">
          Remove
        </button>
      </div>
    `;
  }).join("");

  qsa("[data-select-bag]").forEach((row) => {
    row.addEventListener("click", () => {
      if (bagMoodMode !== "single") return;
      bagSelectedIndex = Number(row.dataset.selectBag);
      renderBagMood();
    });
  });

  qsa("[data-remove-bag]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeBagHolding(Number(btn.dataset.removeBag));
    });
  });
}

function shareBagMoodOnX() {
  const result = calculateBagMood();
  const mood = result.mood;
  const totals = getBagPortfolioTotals();
  const pnlPercent = totals.invested > 0 ? (totals.pnl / totals.invested) * 100 : 0;

  const text = `My Bag Mood is ${mood.name} (${result.score}/100)

Portfolio Value: ${formatCurrency(totals.currentValue)}
Invested: ${formatCurrency(totals.invested)}
PNL: ${formatCurrency(totals.pnl)} (${formatPercent(pnlPercent)})

Track the emotion of your bags 👇`;

  const tweetUrl = new URL("https://twitter.com/intent/tweet");
  tweetUrl.searchParams.set("text", text);
  tweetUrl.searchParams.set("url", "https://wojakmeter.com");

  window.open(tweetUrl.toString(), "_blank", "noopener,noreferrer");
}

function setupBagMoodControls() {
  const searchBtn = byId("bagSearchBtn");
  const searchInput = byId("bagSearchInput");

  if (searchBtn && searchInput && !searchBtn.dataset.bound) {
    searchBtn.dataset.bound = "1";

    searchBtn.addEventListener("click", async () => {
      const q = String(searchInput.value || "").trim();
      if (!q) return;

      const oldText = searchBtn.textContent;
      searchBtn.textContent = "Searching...";

      bagSearchResults = await searchBagCoins(q);

      searchBtn.textContent = oldText || "Add";
      renderBagSearchResults();
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchBtn.click();
      }
    });
  }

  qsa("[data-bag-mode]").forEach((btn) => {
    if (btn.dataset.boundBagMode) return;
    btn.dataset.boundBagMode = "1";

    btn.addEventListener("click", () => {
      bagMoodMode = btn.dataset.bagMode || "portfolio";
      renderBagMood();
    });
  });

  qsa("[data-bag-timeframe]").forEach((btn) => {
    if (btn.dataset.boundBagTf) return;
    btn.dataset.boundBagTf = "1";

    btn.addEventListener("click", () => {
      bagMoodTimeframe = btn.dataset.bagTimeframe || "24h";
      renderBagMood();
    });
  });

  const styleSelector = byId("bagStyleSelector");

  if (styleSelector && !styleSelector.dataset.bound) {
    styleSelector.dataset.bound = "1";
    styleSelector.value = getBagMoodStyle();

    styleSelector.addEventListener("change", () => {
      const selected = String(styleSelector.value || "").toLowerCase();
      if (!getAllowedBagStyles().includes(selected)) return;

      bagMoodStyle = selected;
      saveBagMoodStyle(selected);
      renderBagMood();
    });
  }

  const resetBtn = byId("bagResetBtn");

  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = "1";
    resetBtn.addEventListener("click", () => {
      bagMoodHoldings = [];
      bagSelectedIndex = 0;
      localStorage.removeItem(BAG_STORAGE_KEY);
      renderBagMood();
    });
  }

  const shareBtn = byId("bagShareBtn");

  if (shareBtn && !shareBtn.dataset.bound) {
    shareBtn.dataset.bound = "1";
    shareBtn.addEventListener("click", shareBagMoodOnX);
  }
}

function initBagMood() {
  const section = byId("bagMoodSection");
  if (!section) return;

  bagMoodStyle = loadBagMoodStyle();
  loadBagMoodHoldings();
  setupBagMoodControls();
  renderBagMood();
}

// ===============================
// SCALE
// ===============================
function renderScale() {
  const grid = byId("scaleGrid");
  if (!grid) return;

  const style = getCurrentStyle();
  grid.innerHTML = "";

  [
    ["frustration", 10],
    ["concern", 25],
    ["doubt", 40],
    ["neutral", 50],
    ["optimism", 64],
    ["content", 75],
    ["euphoria", 90]
  ].forEach(([, score]) => {
    const mood = getMoodByScore(score);
    const item = document.createElement("div");
    item.className = "scale-item";
    item.innerHTML = `
      <div class="scale-face">
        <img src="${escapeHtml(getIconImagePath(style, mood.key))}" alt="${escapeHtml(mood.name)}">
      </div>
      <strong>${escapeHtml(mood.name)}</strong>
    `;
    grid.appendChild(item);
  });
}

// ===============================
// INIT STYLE
// ===============================
function initStyle() {
  const savedStyle = loadSavedStyle();
  const style = ["classic", "synth", "boyak", "minimal"].includes(savedStyle)
    ? savedStyle
    : DEFAULT_STYLE;

  const selector = byId("styleSelector");
  if (selector) selector.value = style;

  applyStyleClass(style);

  const heroFaceImg = byId("heroFaceImg");
  const socialIconImg = byId("socialIconImg");
  const pointerImg = byId("emotionPointerImg");
  const detailSocialIconImg = byId("detailSocialIconImg");
  const coinMoodIconImg = byId("coinMoodIconImg");

  if (heroFaceImg) setImage(heroFaceImg, getHeroImagePath(style, "neutral"), getHeroImagePath(DEFAULT_STYLE, "neutral"));
  if (socialIconImg) setImage(socialIconImg, getIconImagePath(style, "neutral"), getIconImagePath(DEFAULT_STYLE, "neutral"));
  if (pointerImg) setImage(pointerImg, getIconImagePath(style, "neutral"), getIconImagePath(DEFAULT_STYLE, "neutral"));
  if (detailSocialIconImg) setImage(detailSocialIconImg, getIconImagePath(style, "neutral"), getIconImagePath(DEFAULT_STYLE, "neutral"));
  if (coinMoodIconImg) setImage(coinMoodIconImg, getIconImagePath(style, "neutral"), getIconImagePath(DEFAULT_STYLE, "neutral"));

  const heartbeatWrap = byId("heartbeatWrap");
  const heartbeatPath = byId("heartbeatPath");
  if (heartbeatWrap && heartbeatPath) {
    heartbeatWrap.className = "heartbeat-wrap heartbeat-neutral";
    heartbeatPath.setAttribute("d", heartbeatPathForMood("neutral"));
  }

  const gaugeFill = byId("gaugeFill");
  if (gaugeFill) {
    gaugeFill.style.fill = "none";
    gaugeFill.style.strokeLinecap = "round";
    gaugeFill.style.strokeWidth = "12";
    gaugeFill.style.strokeDasharray = "188 377";
  }

  const heroTimelineBackdrop = byId("heroTimelineBackdrop");
  const heroTimelineLine = byId("heroTimelineLine");
  const heroTimelineArea = byId("heroTimelineArea");
  if (heroTimelineBackdrop) heroTimelineBackdrop.classList.add("hidden");
  if (heroTimelineLine) heroTimelineLine.setAttribute("d", "");
  if (heroTimelineArea) heroTimelineArea.setAttribute("d", "");

  const moodHeroImg = byId("moodHeroImg");
  if (moodHeroImg) {
    setImage(
      moodHeroImg,
      getHeroImagePath(style, "neutral"),
      getHeroImagePath(DEFAULT_STYLE, "neutral")
    );
  }
}

// ===============================
// BUTTONS / EVENTS
// ===============================
function setupButtons() {
  qsa("#heroTimeframes button").forEach((btn) => {
    const tf = btn.dataset.timeframe;
    btn.classList.toggle("hidden", !HERO_ALLOWED_TIMEFRAMES.includes(tf));

    btn.addEventListener("click", async () => {
      if (!HERO_ALLOWED_TIMEFRAMES.includes(tf)) return;
      globalTimeframe = tf;

      qsa("#heroTimeframes button").forEach((b) => {
        b.classList.toggle("active", b.dataset.timeframe === globalTimeframe);
      });

      await loadGlobalMarket();
      await loadSentiment();
    });
  });

  qsa("#chartTimeframes button").forEach((btn) => {
    const tf = btn.dataset.timeframe;
    btn.classList.toggle("hidden", !CHART_ALLOWED_TIMEFRAMES.includes(tf));

    btn.addEventListener("click", async () => {
      if (!CHART_ALLOWED_TIMEFRAMES.includes(tf)) return;
      chartTimeframe = tf;
      await loadCoinDetails();
    });
  });

  qsa(".chart-mode-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      chartMode = btn.dataset.mode;
      await loadCoinDetails();
    });
  });

  qsa(".tab-btn[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeMarketTab = btn.dataset.tab;

      qsa(".tab-btn[data-tab]").forEach((b) => {
        b.classList.toggle("active", b.dataset.tab === activeMarketTab);
      });

      qsa(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `tab-${activeMarketTab}`);
      });
    });
  });

  initStudioTabs();
  setupHeroModes();
  setupLayerButtons();

  qsa(".studio-copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const original = btn.textContent;
      await copyStudioTarget(btn.dataset.copyTarget);
      btn.textContent = "Copied";
      setTimeout(() => {
        btn.textContent = original;
      }, 1200);
    });
  });

  const macroDriverEl = byId("macroDriver");
  if (macroDriverEl) {
    macroDriverEl.addEventListener("change", (e) => {
      currentDominantDriver = e.target.value || "market_flow";
      currentDriverScore = getDriverScoreFromKey(currentDominantDriver);
      currentNarrative = getDriverNarrative(currentDominantDriver);
      currentRiskTone = getRiskToneFromMood(currentGlobalMood.key);
      updateDriverPanel();
      recomputeHeroSystem();
      renderStudio();
    });
  }

  byId("styleSelector")?.addEventListener("change", async () => {
    const style = getCurrentStyle();
    saveSelectedStyle(style);
    applyStyleClass(style);

    renderPulseStats();
    recomputeHeroSystem();
    await loadCoinDetails();
    renderScale();
    await loadGlobalMarket();
    updateMoodHero(moodLiveMood, moodLiveScore);
    drawMoodBackdrop();
  });

  byId("shareMoodBtn")?.addEventListener("click", shareMoodOnX);
}

// ===============================
// LOAD ALL
// ===============================
async function loadAll() {
  await Promise.allSettled([
    loadTopCoins(),
    loadTrendingCoins(),
    loadTopMemes()
  ]);

  currentPulseScore = getPulseScore();

  await loadGlobalMarket();
  await loadSentiment();
  await loadCoinDetails();

  renderPulseStats();
  renderStudio();
}

// ===============================
// AUTO REFRESH
// ===============================
function startAutoRefresh() {
  setInterval(loadTopCoins, TOP_COINS_REFRESH_MS);
  setInterval(loadGlobalMarket, GLOBAL_REFRESH_MS);
  setInterval(loadCoinDetails, COIN_DETAILS_REFRESH_MS);
  setInterval(loadTrendingCoins, TRENDING_REFRESH_MS);
  setInterval(loadTopMemes, MEMES_REFRESH_MS);
  setInterval(loadSentiment, SENTIMENT_REFRESH_MS);
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

  currentPulseScore = getPulseScore();

  renderScale();
  renderPulseStats();
  updateDriverPanel();
  updateGauge(50, getMoodByScore(50));
  updateLayerUI();

  qsa("#heroTimeframes button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.timeframe === globalTimeframe);
    btn.classList.toggle("hidden", !HERO_ALLOWED_TIMEFRAMES.includes(btn.dataset.timeframe));
  });

  qsa("#chartTimeframes button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.timeframe === chartTimeframe);
    btn.classList.toggle("hidden", !CHART_ALLOWED_TIMEFRAMES.includes(btn.dataset.timeframe));
  });

  setText("selectedTimeframe", chartTimeframe);
  setText("chartTimeLabel", `Viewing ${chartTimeframe} structure`);
  setText("globalMarketTimeframe", globalTimeframe);

  setupButtons();
  setupSocialExpand();
  setupPulsePanel();

  await initMoodToken();
  await loadAll();

   initBagMood();

   startAutoRefresh();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

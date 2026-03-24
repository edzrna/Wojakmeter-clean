window.onerror = function (msg, url, line, col) {
  console.error("WojakMeter Error:", msg, url, line, col);

  const ticker = document.getElementById("tickerBar");
  if (ticker) {
    ticker.innerHTML = `
      <span style="color:#ff6c79;">
        Live data temporarily unavailable. Showing latest stable view.
      </span>
    `;
  }

  return false;
};

const TOP_COINS_REFRESH_MS = 30000;
const GLOBAL_REFRESH_MS = 45000;
const COIN_DETAILS_REFRESH_MS = 30000;
const TRENDING_REFRESH_MS = 60000;
const MEMES_REFRESH_MS = 90000;
const SENTIMENT_REFRESH_MS = 60000;
const ACTIVE_COIN_STORAGE_KEY = "wojakActiveCoin";

const macroDrivers = {
  market_flow: { label: "Market flow / price action" },
  social_sentiment: { label: "Social sentiment" },
  etf_adoption: { label: "ETF / institutional adoption" },
  rate_hike: { label: "Rate hike fears" },
  rate_cut: { label: "Rate cut hopes" },
  regulation_crackdown: { label: "Regulation crackdown" },
  crypto_hack: { label: "Crypto hack / insolvency" },
  war_escalation: { label: "War escalation" },
  neutral_macro: { label: "Neutral macro environment" }
};

let activeCoinSymbol = "BTC";
let globalTimeframe = "1h";
let chartTimeframe = "1h";
let chartMode = "line";
let activeMarketTab = "coins";

let topCoinsData = [];
let trendingCoinsData = [];
let topMemesData = [];

let currentGlobalMood = getMoodByScore(50);
let currentGlobalChange = 0;
let currentGlobalScore = 50;
let currentPriceScore = 50;
let currentSocialScore = 50;
let currentMacroScore = 50;
let currentDominantDriver = "market_flow";
let currentBtcDominance = 0;
let currentTotalVolume = 0;
let currentTrendingHeat = 50;
let currentMemeHeat = 50;
let currentFearGreed = 50;
let currentNewsScore = 50;
let currentNewsSignal = "neutral";

let isLoadingTopCoins = false;
let isLoadingGlobal = false;
let isLoadingCoinDetails = false;
let isLoadingTrending = false;
let isLoadingMemes = false;
let isLoadingSentiment = false;
let hasBooted = false;

function byId(id) {
  return document.getElementById(id);
}

function getAppRoot() {
  return document.querySelector(".style-classic, .style-3d, .style-anime, .style-minimal");
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function average(arr) {
  if (!Array.isArray(arr) || !arr.length) return 0;
  return arr.reduce((sum, n) => sum + Number(n || 0), 0) / arr.length;
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

function getMoodByScore(score) {
  if (score >= 85) return { key: "euphoria", name: "Euphoria", anim: "anim-pulse", range: "85–100" };
  if (score >= 70) return { key: "content", name: "Content", anim: "anim-float", range: "70–84" };
  if (score >= 60) return { key: "optimism", name: "Optimism", anim: "anim-float", range: "60–69" };
  if (score >= 45) return { key: "neutral", name: "Neutral", anim: "anim-blink", range: "45–59" };
  if (score >= 35) return { key: "doubt", name: "Doubt", anim: "anim-tilt", range: "35–44" };
  if (score >= 20) return { key: "concern", name: "Concern", anim: "anim-shake", range: "20–34" };
  return { key: "frustration", name: "Frustration", anim: "anim-shake", range: "0–19" };
}

function normalizeChangeToScore(changePct, sensitivity = 10) {
  return clamp(50 + Number(changePct || 0) * sensitivity, 0, 100);
}

function getCurrentStyle() {
  const bodyClasses = document.body.className || "";
  const root = getAppRoot();
  const rootClasses = root?.className || "";
  const classes = `${bodyClasses} ${rootClasses}`;
  const match = classes.match(/style-(classic|3d|anime|minimal)/);
  return match ? match[1] : "classic";
}

function getHeroImagePath(style, moodKey) {
  return `/assets/hero/${style}/${moodKey}.png`;
}

function getIconImagePath(style, moodKey) {
  return `/assets/icons/${style}/${moodKey}.png`;
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

function debugMessage(msg) {
  console.log("[WojakMeter]", msg);
}

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

function getPriceScore({ change1h = 0, change24h = 0, volumeRatio = 1, volatility = 1 }) {
  const shortTerm = normalizeChangeToScore(change1h, 12);
  const daily = normalizeChangeToScore(change24h, 6);

  let base = shortTerm * 0.65 + daily * 0.35;

  if (volumeRatio > 1.2) base += 4;
  if (volumeRatio < 0.8) base -= 3;

  if (volatility > 1.4 && change1h < 0) base -= 4;
  if (volatility > 1.4 && change1h > 0) base += 2;

  return Math.round(clamp(base, 0, 100));
}

function getTrendingHeat(trendingCoins = []) {
  if (!Array.isArray(trendingCoins) || !trendingCoins.length) return 50;
  const avg24h = average(
    trendingCoins.slice(0, 8).map((coin) => coin.price_change_percentage_24h_in_currency ?? 0)
  );
  return Math.round(clamp(50 + avg24h * 6, 0, 100));
}

function getMemeHeat(memeCoins = []) {
  if (!Array.isArray(memeCoins) || !memeCoins.length) return 50;
  const avg24h = average(
    memeCoins.slice(0, 8).map((coin) => coin.price_change_percentage_24h_in_currency ?? 0)
  );
  return Math.round(clamp(50 + avg24h * 7, 0, 100));
}

function getVolumeStrength(totalVolume, totalMarketCap) {
  if (!totalVolume || !totalMarketCap) return 1;
  return clamp((totalVolume / totalMarketCap) * 40, 0.5, 2);
}

function getSocialScore({
  marketChange = 0,
  priceScore = 50,
  macroKey = "market_flow",
  trendingHeat = 50,
  memeHeat = 50,
  fearGreed = 50,
  newsScore = 50
}) {
  let score = 50;

  score += Number(marketChange || 0) * 6;

  if (priceScore < 35) score -= 6;
  if (priceScore > 65) score += 6;

  score += (trendingHeat - 50) * 0.18;
  score += (memeHeat - 50) * 0.12;
  score += (fearGreed - 50) * 0.08;
  score += (newsScore - 50) * 0.08;

  if (macroKey === "etf_adoption" || macroKey === "rate_cut") score += 4;

  if (
    macroKey === "rate_hike" ||
    macroKey === "regulation_crackdown" ||
    macroKey === "crypto_hack" ||
    macroKey === "war_escalation"
  ) {
    score -= 5;
  }

  return Math.round(clamp(score, 0, 100));
}

function getGlobalMoodScore({ priceScore, socialScore, macroScore }) {
  return Math.round(clamp(priceScore * 0.6 + socialScore * 0.25 + macroScore * 0.15, 0, 100));
}

function getMacroScore(driverKey = "market_flow") {
  const map = {
    market_flow: 50,
    neutral_macro: 50,
    social_sentiment: 55,
    etf_adoption: 72,
    rate_cut: 68,
    rate_hike: 36,
    regulation_crackdown: 28,
    crypto_hack: 22,
    war_escalation: 24
  };
  return map[driverKey] ?? 50;
}

function pickDominantDriver({
  priceScore,
  socialScore,
  macroScore,
  macroKey,
  btcDominance = 0,
  marketChange = 0,
  trendingHeat = 50,
  memeHeat = 50,
  fearGreed = 50,
  newsScore = 50
}) {
  const forcedMacroDrivers = [
    "etf_adoption",
    "rate_cut",
    "rate_hike",
    "regulation_crackdown",
    "crypto_hack",
    "war_escalation"
  ];

  if (forcedMacroDrivers.includes(macroKey)) return macroKey;
  if (newsScore < 35) return "crypto_hack";
  if (newsScore < 43 && fearGreed < 40) return "regulation_crackdown";

  if (newsScore > 62 && marketChange > 1.2 && btcDominance >= 54 && memeHeat < 62) {
    return "etf_adoption";
  }

  if (fearGreed < 38 && marketChange < -1) return "rate_hike";
  if (fearGreed > 60 && newsScore > 58 && marketChange > 0.8) return "rate_cut";

  const priceDistance = Math.abs(priceScore - 50);
  const socialDistance = Math.abs(socialScore - 50);

  if (socialDistance > priceDistance + 6 && (trendingHeat > 62 || memeHeat > 65)) {
    return "social_sentiment";
  }

  return "market_flow";
}

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
    case "1m": return "Fast and sensitive reaction";
    case "5m": return "Fast reaction";
    case "15m": return "Responsive intraday reaction";
    case "1h": return "Balanced intraday reaction";
    case "4h": return "Broader structural reaction";
    case "24h": return "Higher conviction reaction";
    case "7d": return "Macro-leaning reaction";
    default: return "Balanced reaction";
  }
}

function getTimeframeAdjustedChange(baseChange24h, timeframe) {
  const change = Number(baseChange24h || 0);

  switch (timeframe) {
    case "1m":
      return change / 1440;
    case "5m":
      return change / 288;
    case "15m":
      return change / 96;
    case "1h":
      return change / 24;
    case "4h":
      return change / 6;
    case "24h":
      return change;
    case "7d":
      return change * 2.2;
    default:
      return change / 24;
  }
}

function applyStyle(style) {
  const safeStyle = ["classic", "3d", "anime", "minimal"].includes(style)
    ? style
    : "classic";

  const root = getAppRoot();
  if (root) root.className = `style-${safeStyle}`;

  document.body.classList.remove(
    "style-classic",
    "style-3d",
    "style-anime",
    "style-minimal"
  );
  document.body.classList.add(`style-${safeStyle}`);

  if (byId("styleSelector")) {
    byId("styleSelector").value = safeStyle;
  }
}

function updateHeroTitle() {
  const heroDriverLabel = byId("heroDriverLabel");
  if (!heroDriverLabel) return;
  heroDriverLabel.textContent = ` (${getDriverLabel(currentDominantDriver)})`;
}

function renderTicker(coins) {
  const ticker = byId("tickerBar");
  if (!ticker) return;

  if (!Array.isArray(coins) || !coins.length) {
    ticker.innerHTML = `
      <div class="ticker-track">
        <div class="ticker-item">
          <div class="ticker-top">
            <span class="ticker-price">Live data delayed</span>
          </div>
          <div class="ticker-bottom">
            <span class="ticker-symbol">Market</span>
            <span class="neu">--</span>
          </div>
        </div>
      </div>
    `;
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
          <img class="ticker-logo" src="${logo}" alt="${symbol} logo">
          <span class="ticker-price">${price}</span>
        </div>
        <div class="ticker-bottom">
          <span class="ticker-symbol">${symbol}</span>
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
    const json = await res.json();
    return json;
  } catch (error) {
    debugMessage(`Fetch failed for ${url}: ${error.message}`);
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
    price_change_percentage_1h_in_currency:
      item.price_change_percentage_1h_in_currency ?? item.change_1h ?? 0,
    price_change_percentage_24h_in_currency:
      item.price_change_percentage_24h_in_currency ??
      item.data?.price_change_percentage_24h?.usd ??
      item.change ??
      item.change_24h ??
      0,
    price_change_percentage_7d_in_currency:
      item.price_change_percentage_7d_in_currency ?? item.change_7d ?? 0
  };
}

function applyMoodColors(mood) {
  const heroScoreWrap = byId("heroScoreWrap");
  const emotionBarMood = byId("emotionBarMood");
  const emotionBarScore = byId("emotionBarScore");

  if (heroScoreWrap) heroScoreWrap.className = `hero-score mood-${mood.key}`;
  if (emotionBarMood) emotionBarMood.className = `mood-${mood.key}`;
  if (emotionBarScore) emotionBarScore.className = `mood-${mood.key}`;
}

function updateHero(score, mood) {
  const style = getCurrentStyle();
  const heroMood = byId("heroMood");
  const heroScore = byId("heroScore");
  const heroFaceImg = byId("heroFaceImg");
  const emotionBarMood = byId("emotionBarMood");
  const emotionBarScore = byId("emotionBarScore");
  const emotionBarRange = byId("emotionBarRange");
  const emotionPointer = byId("emotionPointer");
  const emotionPointerImg = byId("emotionPointerImg");
  const heartbeatWrap = byId("heartbeatWrap");
  const heartbeatPath = byId("heartbeatPath");

  if (heroMood) {
    heroMood.textContent = mood.name;
    heroMood.className = `hero-mood mood-${mood.key}`;
  }

  if (heroScore) heroScore.textContent = score;

  if (heroFaceImg) {
    heroFaceImg.className = `hero-face-img ${mood.anim}`;
    setImage(
      heroFaceImg,
      getHeroImagePath(style, mood.key),
      getHeroImagePath("classic", mood.key)
    );
  }

  if (emotionBarMood) emotionBarMood.textContent = mood.name;
  if (emotionBarScore) emotionBarScore.textContent = score;
  if (emotionBarRange) emotionBarRange.textContent = mood.range;

  if (emotionPointer) emotionPointer.style.left = `${clamp(score, 0, 100)}%`;

  if (emotionPointerImg) {
    setImage(
      emotionPointerImg,
      getIconImagePath(style, mood.key),
      getIconImagePath("classic", mood.key)
    );
  }

  if (heartbeatWrap && heartbeatPath) {
    heartbeatWrap.className = `heartbeat-wrap heartbeat-${mood.key}`;

    const paths = {
      frustration: "M0 28 L28 28 L40 10 L56 46 L72 8 L86 50 L104 16 L126 28 L150 28 L170 12 L188 44 L206 8 L224 48 L244 20 L268 28 L320 28",
      concern: "M0 28 L40 28 L56 18 L72 40 L88 14 L102 38 L124 28 L160 28 L176 18 L192 38 L208 16 L224 36 L248 28 L320 28",
      doubt: "M0 28 L36 28 L52 22 L66 34 L82 20 L98 32 L120 28 L150 28 L168 22 L186 34 L202 24 L218 30 L250 28 L320 28",
      neutral: "M0 28 L44 28 L56 24 L68 32 L82 24 L96 30 L120 28 L160 28 L180 26 L196 30 L214 26 L234 28 L320 28",
      optimism: "M0 28 L36 28 L52 24 L66 20 L82 34 L98 16 L114 30 L138 28 L160 28 L178 22 L194 18 L210 30 L226 20 L246 28 L320 28",
      content: "M0 28 L32 28 L46 20 L60 34 L74 12 L88 30 L104 18 L126 28 L150 28 L168 20 L184 34 L198 14 L214 28 L232 18 L254 28 L320 28",
      euphoria: "M0 28 L28 28 L40 16 L52 40 L66 8 L78 46 L94 6 L108 42 L126 18 L148 28 L166 12 L182 44 L198 8 L214 42 L232 14 L252 28 L320 28"
    };

    heartbeatPath.setAttribute("d", paths[mood.key] || paths.neutral);
  }

  applyMoodColors(mood);
}

function updateSocial(socialScore) {
  const style = getCurrentStyle();
  const socialMood = getMoodByScore(socialScore);

  if (byId("socialMoodMini")) byId("socialMoodMini").textContent = socialMood.name;
  if (byId("socialScoreMini")) byId("socialScoreMini").textContent = socialScore;

  const socialIconImg = byId("socialIconImg");
  if (socialIconImg) {
    socialIconImg.className = `mood-icon-img ${socialMood.anim}`;
    setImage(
      socialIconImg,
      getIconImagePath(style, socialMood.key),
      getIconImagePath("classic", socialMood.key)
    );
  }

  return { socialScore, socialMood };
}

function updateDriverPanel() {
  const driverKey = currentDominantDriver;
  const mood = currentGlobalMood;

  if (byId("driverMacro")) byId("driverMacro").textContent = getDriverLabel(driverKey);
  if (byId("driverNarrative")) byId("driverNarrative").textContent = getDriverNarrative(driverKey);
  if (byId("driverTimeframeReaction")) {
    byId("driverTimeframeReaction").textContent = `${getReactionLabel(globalTimeframe)} (${globalTimeframe})`;
  }
  if (byId("driverRiskTone")) byId("driverRiskTone").textContent = getRiskToneFromMood(mood.key);

  updateHeroTitle();
}

function getGlobalMarketContext() {
  return {
    style: byId("styleSelector")?.value || "classic",
    globalMood: currentGlobalMood?.name || "Neutral",
    globalScore: currentGlobalScore,
    globalTimeframe,
    globalChange: currentGlobalChange ?? 0,
    globalVolume: byId("globalMarketVolume")?.textContent || "--",
    macroKey: currentDominantDriver,
    macroLabel: getDriverLabel(currentDominantDriver),
    macroNarrative: getDriverNarrative(currentDominantDriver),
    macroRisk: getRiskToneFromMood(currentGlobalMood?.key || "neutral")
  };
}

function getCoinContext() {
  const activeCoin = getCoinBySymbol(activeCoinSymbol);

  return {
    activeCoin: activeCoinSymbol || "BTC",
    activeCoinName: activeCoin?.name || activeCoinSymbol || "Bitcoin",
    coinTimeframe: chartTimeframe,
    coinPrice: byId("chartCoinPrice")?.textContent || "--",
    coinPerformance: byId("selectedPerformance")?.textContent || "--",
    technicalMood: byId("coinMoodLabel")?.textContent || "Neutral",
    socialMood: byId("detailSocialLabel")?.textContent || "Neutral"
  };
}

function buildMemePrompt(ctx) {
  return [
    "Create a high-quality crypto meme image based on the current market context.",
    "",
    `Selected visual style: ${ctx.style}`,
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
    '- Add the X account text: "@WojakMeter"',
    "- Put branding in the bottom-right corner"
  ].join("\n");
}

function buildMemeScene(ctx) {
  return `
<strong>Scene:</strong> A ${ctx.style} Wojak hero reacts to a ${ctx.globalMood.toLowerCase()} market while ${ctx.activeCoin} leads the visual focus. The dashboard shows ${ctx.coinPerformance} on the ${ctx.coinTimeframe} chart, and the market atmosphere is influenced by ${ctx.macroLabel.toLowerCase()}.

<strong>Visual tone:</strong> The image should feel premium, dramatic and native to crypto X, with clear emotional readability and a strong meme format.
  `.trim();
}

function buildDailyMeme(ctx) {
  return `
<strong>Today's market setup:</strong> The crypto market is sitting in <strong>${ctx.globalMood}</strong> on the <strong>${ctx.globalTimeframe}</strong> view, with overall market performance at <strong>${formatPercent(ctx.globalChange)}</strong>.

<strong>Daily meme angle:</strong> Focus on ${ctx.activeCoin} as the emotional anchor, use ${ctx.macroLabel.toLowerCase()} as the macro backdrop, and make the reaction feel instantly understandable for crypto traders scrolling X.

<strong>Suggested headline:</strong> "${ctx.globalMood} market, ${ctx.activeCoin} decides the mood."
  `.trim();
}

function buildXPost(ctx) {
  const caption = `${ctx.activeCoin} market mood: ${ctx.globalMood}. ${ctx.macroLabel} is shaping sentiment while the market prints ${formatPercent(ctx.globalChange)} on the ${ctx.globalTimeframe} view. ${ctx.coinPerformance} on the selected chart keeps the reaction focused on ${ctx.activeCoin}.`;
  const alt = `A ${ctx.style} Wojak-style crypto market meme showing ${ctx.globalMood} sentiment for ${ctx.activeCoin}, with a trading dashboard, emotional reaction, and market context tied to ${ctx.macroLabel.toLowerCase()}.`;
  const hashtags = `#Crypto #Bitcoin #${ctx.activeCoin} #WojakMeter`;

  return { caption, alt, hashtags };
}

function buildStoryMode(ctx) {
  return `
<div class="story-block"><strong>Market context</strong><br>The market is trading with <strong>${ctx.globalMood}</strong> on the <strong>${ctx.globalTimeframe}</strong> timeframe, while overall market performance sits at <strong>${formatPercent(ctx.globalChange)}</strong>.</div>

<div class="story-block"><strong>Social mood</strong><br>Crypto social sentiment is leaning <strong>${ctx.socialMood}</strong>, which reinforces the broader emotional tone around the market.</div>

<div class="story-block"><strong>Technical confirmation</strong><br>${ctx.activeCoin} is showing <strong>${ctx.technicalMood}</strong> conditions on the <strong>${ctx.coinTimeframe}</strong> structure, with current selected performance at <strong>${ctx.coinPerformance}</strong>.</div>

<div class="story-block"><strong>Final reaction</strong><br>The combined reaction is a <strong>${ctx.globalMood}</strong> market shaped by <strong>${ctx.macroLabel}</strong>, with traders reacting through the lens of ${ctx.activeCoin}.</div>
  `.trim();
}

function shareMoodOnX() {
  const ctx = getGlobalMarketContext();

  const text =
`Crypto market mood: ${ctx.globalMood} (${ctx.globalScore}/100)

Driver: ${ctx.macroLabel}
Timeframe: ${ctx.globalTimeframe}
Market move: ${formatPercent(ctx.globalChange)}
Volume: ${ctx.globalVolume}

${ctx.macroNarrative}

Track the market mood live 👇`;

  const shareUrl = "https://wojakmeter.com";
  const tweetUrl =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;

  window.open(tweetUrl, "_blank", "noopener,noreferrer");
}

function setStudioOutput(id, value) {
  const el = byId(id);
  if (!el) return;
  el.innerHTML = value;
}

function setStudioText(id, value) {
  const el = byId(id);
  if (!el) return;
  el.textContent = value;
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
  } catch (error) {
    debugMessage(`Copy failed: ${error.message}`);
  }
}

async function loadSentiment() {
  if (isLoadingSentiment) return;
  isLoadingSentiment = true;

  try {
    const data = await fetchJson("/api/sentiment", null);

    if (data && typeof data === "object") {
      currentFearGreed = Number(data.fearGreed ?? 50);
      currentNewsScore = Number(data.newsScore ?? 50);
      currentNewsSignal = String(data.newsSignal || "neutral");

      if (typeof data.driver === "string" && data.driver) {
        const foundKey = Object.keys(macroDrivers).find(
          (key) => macroDrivers[key].label === data.driver
        );
        if (foundKey && byId("macroDriver")) {
          byId("macroDriver").value = foundKey;
        }
      }
    }
  } finally {
    isLoadingSentiment = false;
  }
}

async function loadGlobalMarket() {
  if (isLoadingGlobal) return;
  isLoadingGlobal = true;

  try {
    const response = await fetchJson(
      `/api/global?timeframe=${encodeURIComponent(globalTimeframe)}`,
      null
    );

    if (!response || typeof response !== "object") {
      debugMessage("Global API missing data, keeping current state");
      return;
    }

    const globalData = response.raw || {};

    if (byId("btcDominance")) {
      if (response.btcDominance && response.btcDominance !== "--") {
        byId("btcDominance").textContent = response.btcDominance;
      } else if (globalData.market_cap_percentage?.btc != null) {
        byId("btcDominance").textContent = `${Number(globalData.market_cap_percentage.btc).toFixed(1)}%`;
      }
    }

    if (byId("headerMarketCap")) {
      if (response.marketCap && response.marketCap !== "--") {
        byId("headerMarketCap").textContent = response.marketCap;
      } else {
        byId("headerMarketCap").textContent = formatCurrencyCompact(globalData.total_market_cap?.usd);
      }
    }

    if (byId("headerVolume")) {
      if (response.volume && response.volume !== "--") {
        byId("headerVolume").textContent = response.volume;
      } else {
        byId("headerVolume").textContent = formatCurrencyCompact(globalData.total_volume?.usd);
      }
    }

    const totalVolume = Number(globalData.total_volume?.usd || 0);
    const totalMarketCap = Number(globalData.total_market_cap?.usd || 0);

    currentTotalVolume = totalVolume;
    currentBtcDominance = Number(globalData.market_cap_percentage?.btc || 0);

    const base24hChange = Number(response.change ?? 0);
    currentGlobalChange = getTimeframeAdjustedChange(base24hChange, globalTimeframe);

    const change1hApprox = getTimeframeAdjustedChange(base24hChange, "1h");
    const change24h = base24hChange;
    const volumeRatio = getVolumeStrength(totalVolume, totalMarketCap);
    const volatility = clamp(Math.abs(change1hApprox) / 1.2 + 1, 1, 2);
    const selectedMacroKey = byId("macroDriver")?.value || "market_flow";

    currentTrendingHeat = getTrendingHeat(trendingCoinsData);
    currentMemeHeat = getMemeHeat(topMemesData);

    currentPriceScore = getPriceScore({
      change1h: change1hApprox,
      change24h,
      volumeRatio,
      volatility
    });

    currentSocialScore = getSocialScore({
      marketChange: currentGlobalChange,
      priceScore: currentPriceScore,
      macroKey: selectedMacroKey,
      trendingHeat: currentTrendingHeat,
      memeHeat: currentMemeHeat,
      fearGreed: currentFearGreed,
      newsScore: currentNewsScore
    });

    currentMacroScore = getMacroScore(selectedMacroKey);

    currentGlobalScore = getGlobalMoodScore({
      priceScore: currentPriceScore,
      socialScore: currentSocialScore,
      macroScore: currentMacroScore
    });

    currentGlobalMood = getMoodByScore(currentGlobalScore);

    currentDominantDriver = pickDominantDriver({
      priceScore: currentPriceScore,
      socialScore: currentSocialScore,
      macroScore: currentMacroScore,
      macroKey: selectedMacroKey,
      btcDominance: currentBtcDominance,
      marketChange: currentGlobalChange,
      trendingHeat: currentTrendingHeat,
      memeHeat: currentMemeHeat,
      fearGreed: currentFearGreed,
      newsScore: currentNewsScore
    });

    updateHero(currentGlobalScore, currentGlobalMood);
    updateSocial(currentSocialScore);
    updateDriverPanel();

    if (byId("globalMarketChange")) {
      byId("globalMarketChange").textContent = formatPercent(currentGlobalChange);
      byId("globalMarketChange").className = currentGlobalChange >= 0 ? "positive" : "negative";
    }

    if (byId("globalMarketVolume")) {
      byId("globalMarketVolume").textContent =
        response.volume && response.volume !== "--"
          ? response.volume
          : formatCurrencyCompact(globalData.total_volume?.usd);
    }

    if (byId("globalMarketTimeframe")) {
      byId("globalMarketTimeframe").textContent = globalTimeframe;
    }

    renderStudio();
  } finally {
    isLoadingGlobal = false;
  }
}

function createCoinCard(coin, isActive = false) {
  const style = getCurrentStyle();
  const symbol = coin.symbol?.toUpperCase?.() || "--";
  const change = Number(coin.price_change_percentage_24h_in_currency ?? 0);

  const mood = getMoodByScore(
    getPriceScore({
      change1h: (change || 0) / 24,
      change24h: change || 0,
      volumeRatio: 1,
      volatility: 1
    })
  );

  const card = document.createElement("button");
  card.type = "button";
  card.className = `coin-card coin-card-button ${isActive ? "active-coin-card" : ""}`;

  card.innerHTML = `
    <div class="coin-card-top">
      <div class="coin-main">
        <img class="coin-logo" src="${coin.image || ""}" alt="${symbol} logo">
        <div class="price">${formatCurrency(coin.current_price)}</div>
      </div>
    </div>
    <div class="coin-card-bottom">
      <div class="symbol">${symbol}</div>
      <div class="change ${change >= 0 ? "positive" : "negative"}">${formatPercent(change)}</div>
    </div>
    <div class="coin-emoji">
      <img src="${getIconImagePath(style, mood.key)}" alt="${symbol} mood">
    </div>
  `;

  card.addEventListener("click", async () => {
    if (!coin.symbol) return;
    activeCoinSymbol = coin.symbol.toUpperCase();
    saveActiveCoin(activeCoinSymbol);
    renderCoinSections();
    await loadCoinDetails();
    renderStudio();
    document.querySelector(".chart-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <div class="symbol">${title}</div>
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

    if (coins.length) {
      trendingCoinsData = coins.slice(0, 10);
      renderCoinSections();
    } else if (!trendingCoinsData.length) {
      trendingCoinsData = [];
      renderCoinSections();
    }
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

    if (coins.length) {
      topMemesData = coins.slice(0, 10);
      renderCoinSections();
    } else if (!topMemesData.length) {
      topMemesData = [];
      renderCoinSections();
    }
  } finally {
    isLoadingMemes = false;
  }
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
    case "1m": return h1 / 60;
    case "5m": return h1 / 12;
    case "15m": return h1 / 4;
    case "1h": return h1;
    case "4h": return h24 / 6;
    case "24h": return h24;
    case "7d": return d7;
    default: return h24;
  }
}

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

  if (!candleGroup || !prices || prices.length < 2) return;

  path.setAttribute("d", "");
  area.setAttribute("d", "");
  path.style.display = "none";
  area.style.display = "none";

  const sample = prices.slice(-28);
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
  if (!label) return;
  label.textContent = chartMode === "candle" ? "Candle chart" : "Line chart";
}

function updateChartTimeLabel() {
  const label = byId("chartTimeLabel");
  if (!label) return;
  label.textContent = `Viewing ${chartTimeframe} structure`;
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

    const technicalScore = getPriceScore({
      change1h: coin.price_change_percentage_1h_in_currency ?? value / 24,
      change24h: coin.price_change_percentage_24h_in_currency ?? value,
      volumeRatio: 1,
      volatility: clamp(Math.abs(value) / 2 + 1, 1, 2)
    });

    const mood = getMoodByScore(technicalScore);
    const coinSocialScore = Math.round(clamp(technicalScore * 0.7 + currentSocialScore * 0.3, 0, 100));
    const socialMood = getMoodByScore(coinSocialScore);
    const style = getCurrentStyle();

    if (byId("chartTitle")) byId("chartTitle").textContent = `${activeCoinSymbol} / ${coin.name}`;
    if (byId("chartCoinPrice")) byId("chartCoinPrice").textContent = formatCurrency(coin.current_price);
    if (byId("chartCoinVolume")) byId("chartCoinVolume").textContent = formatCurrencyCompact(coin.total_volume);
    if (byId("chartCoinMarketCap")) byId("chartCoinMarketCap").textContent = formatCurrencyCompact(coin.market_cap);
    if (byId("chartCoinIcon")) byId("chartCoinIcon").src = coin.image || "";

    if (byId("chartChangePill")) {
      byId("chartChangePill").textContent = formatPercent(value);
      byId("chartChangePill").className = `pill ${value >= 0 ? "positive" : "negative"}`;
    }

    if (byId("selectedTimeframe")) byId("selectedTimeframe").textContent = chartTimeframe;

    if (byId("selectedPerformance")) {
      byId("selectedPerformance").textContent = formatPercent(value);
      byId("selectedPerformance").className = value >= 0 ? "positive" : "negative";
    }

    if (byId("coinMoodLabel")) byId("coinMoodLabel").textContent = mood.name;
    if (byId("detailSocialLabel")) byId("detailSocialLabel").textContent = socialMood.name;

    const coinMoodIcon = byId("coinMoodIconImg");
    if (coinMoodIcon) {
      coinMoodIcon.className = `chart-mood-chip-icon mood-icon-img ${mood.anim}`;
      setImage(
        coinMoodIcon,
        getIconImagePath(style, mood.key),
        getIconImagePath("classic", mood.key)
      );
    }

    const socialIcon = byId("detailSocialIconImg");
    if (socialIcon) {
      socialIcon.className = `chart-mood-chip-icon mood-icon-img ${socialMood.anim}`;
      setImage(
        socialIcon,
        getIconImagePath(style, socialMood.key),
        getIconImagePath("classic", socialMood.key)
      );
    }

    const intervalIds = {
      "1m": "perf1m",
      "5m": "perf5m",
      "15m": "perf15m",
      "1h": "perf1h",
      "4h": "perf4h",
      "24h": "perf24h",
      "7d": "perf7d"
    };

    Object.entries(intervalIds).forEach(([tf, id]) => {
      const el = byId(id);
      if (!el) return;
      const v = getCoinChangeForTimeframe(coin, tf);
      el.textContent = formatPercent(v);
      el.className = v >= 0 ? "positive" : "negative";
    });

    document.querySelectorAll("#chartTimeframes button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.timeframe === chartTimeframe);
    });

    document.querySelectorAll(".chart-mode-btn").forEach((btn) => {
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

function setupButtons() {
  document.querySelectorAll("#heroTimeframes button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      globalTimeframe = btn.dataset.timeframe;

      document.querySelectorAll("#heroTimeframes button").forEach((b) => {
        b.classList.toggle("active", b.dataset.timeframe === globalTimeframe);
      });

      await loadGlobalMarket();
    });
  });

  document.querySelectorAll("#chartTimeframes button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      chartTimeframe = btn.dataset.timeframe;
      await loadCoinDetails();
    });
  });

  document.querySelectorAll(".chart-mode-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      chartMode = btn.dataset.mode;
      await loadCoinDetails();
    });
  });

  document.querySelectorAll(".tab-btn[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeMarketTab = btn.dataset.tab;

      document.querySelectorAll(".tab-btn[data-tab]").forEach((b) => {
        b.classList.toggle("active", b.dataset.tab === activeMarketTab);
      });

      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `tab-${activeMarketTab}`);
      });
    });
  });

  document.querySelectorAll("[data-studio-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.studioTab;

      document.querySelectorAll("[data-studio-tab]").forEach((b) => {
        b.classList.toggle("active", b.dataset.studioTab === tab);
      });

      document.querySelectorAll(".studio-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `studio-${tab}`);
      });
    });
  });

  document.querySelectorAll(".studio-copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await copyStudioTarget(btn.dataset.copyTarget);
    });
  });

  byId("macroDriver")?.addEventListener("change", async () => {
    await loadGlobalMarket();
    renderStudio();
  });

  byId("styleSelector")?.addEventListener("change", async () => {
    const value = byId("styleSelector").value;

    applyStyle(value);

    try {
      localStorage.setItem("wojakStyle", value);
    } catch {}

    renderScale();
    renderCoinSections();
    await loadGlobalMarket();
    await loadCoinDetails();
    renderStudio();
  });

  byId("shareMoodBtn")?.addEventListener("click", () => {
    shareMoodOnX();
  });
}

async function loadAll() {
  await Promise.allSettled([
    loadTopCoins(),
    loadTrendingCoins(),
    loadTopMemes(),
    loadSentiment()
  ]);

  await loadGlobalMarket();
  await loadCoinDetails();
  renderStudio();
}

function renderScale() {
  const grid = byId("scaleGrid");
  if (!grid) return;

  const style = getCurrentStyle();
  grid.innerHTML = "";

  [
    "frustration",
    "concern",
    "doubt",
    "neutral",
    "optimism",
    "content",
    "euphoria"
  ].forEach((key) => {
    const mood = getMoodByScore(
      key === "frustration" ? 10 :
      key === "concern" ? 25 :
      key === "doubt" ? 40 :
      key === "neutral" ? 50 :
      key === "optimism" ? 64 :
      key === "content" ? 75 : 90
    );

    const item = document.createElement("div");
    item.className = "scale-item";
    item.innerHTML = `
      <div class="scale-face">
        <img src="${getIconImagePath(style, mood.key)}" alt="${mood.name}">
      </div>
      <strong>${mood.name}</strong>
    `;
    grid.appendChild(item);
  });
}

function initStyle() {
  let savedStyle = "classic";

  try {
    savedStyle = localStorage.getItem("wojakStyle") || "classic";
  } catch {}

  applyStyle(savedStyle);
}

function startAutoRefresh() {
  setInterval(loadTopCoins, TOP_COINS_REFRESH_MS);
  setInterval(loadGlobalMarket, GLOBAL_REFRESH_MS);
  setInterval(loadCoinDetails, COIN_DETAILS_REFRESH_MS);
  setInterval(loadTrendingCoins, TRENDING_REFRESH_MS);
  setInterval(loadTopMemes, MEMES_REFRESH_MS);
  setInterval(loadSentiment, SENTIMENT_REFRESH_MS);
}

async function boot() {
  if (hasBooted) return;
  hasBooted = true;

  try {
    initStyle();

    const savedCoin = loadSavedActiveCoin();
    if (savedCoin) activeCoinSymbol = savedCoin;

    renderScale();
    setupButtons();
    await loadAll();
    startAutoRefresh();
  } catch (error) {
    debugMessage(`Boot failed: ${error.message}`);
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
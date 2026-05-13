// ===============================
// WOJAKMETER EMOTION RADAR API
// Free version: No API key required
// Sources:
// - Fear & Greed Index
// - CoinGecko Trending
// - DexScreener Search
// - RSS headlines fallback
// ===============================

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function roundScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.round(clamp(n, 0, 100));
}

function safeText(value) {
  return String(value || "").trim();
}

function getMoodByScore(score) {
  const s = roundScore(score);

  if (s >= 85) return { key: "euphoria", name: "Euphoria", range: "85-100" };
  if (s >= 70) return { key: "content", name: "Content", range: "70-84" };
  if (s >= 60) return { key: "optimism", name: "Optimism", range: "60-69" };
  if (s >= 45) return { key: "neutral", name: "Neutral", range: "45-59" };
  if (s >= 35) return { key: "doubt", name: "Doubt", range: "35-44" };
  if (s >= 20) return { key: "concern", name: "Concern", range: "20-34" };

  return { key: "frustration", name: "Frustration", range: "0-19" };
}

function tokenize(text) {
  return safeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9$#\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 12);
}

function extractQuery(text) {
  const stop = new Set([
    "the", "and", "for", "with", "that", "this", "from", "are",
    "was", "you", "your", "crypto", "coin", "market", "price",
    "again", "will", "has", "have", "about", "back", "into"
  ]);

  const words = tokenize(text);
  const keywords = words.filter((word) => !stop.has(word));

  return keywords.slice(0, 6).join(" ") || words.slice(0, 6).join(" ");
}

async function fetchJson(url, fallback = null) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WojakMeter/1.0"
      },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return fallback;
  }
}

async function fetchFearGreed() {
  const data = await fetchJson("https://api.alternative.me/fng/", null);

  return {
    value: Number(data?.data?.[0]?.value || 50),
    label: data?.data?.[0]?.value_classification || "Neutral"
  };
}

async function fetchCoinGeckoTrending() {
  const data = await fetchJson(
    "https://api.coingecko.com/api/v3/search/trending",
    null
  );

  const coins = Array.isArray(data?.coins) ? data.coins : [];

  return coins.slice(0, 10).map((entry) => ({
    id: entry?.item?.id || "",
    name: entry?.item?.name || "",
    symbol: entry?.item?.symbol || "",
    marketCapRank: entry?.item?.market_cap_rank || null,
    score: entry?.item?.score ?? null
  }));
}

async function fetchDexScreener(query) {
  if (!query) return [];

  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
  const data = await fetchJson(url, null);

  const pairs = Array.isArray(data?.pairs) ? data.pairs : [];

  return pairs.slice(0, 8).map((pair) => ({
    chainId: pair.chainId || "",
    dexId: pair.dexId || "",
    pairAddress: pair.pairAddress || "",
    baseToken: {
      name: pair.baseToken?.name || "",
      symbol: pair.baseToken?.symbol || ""
    },
    priceUsd: pair.priceUsd || "",
    priceChange24h: Number(pair.priceChange?.h24 || 0),
    volume24h: Number(pair.volume?.h24 || 0),
    liquidityUsd: Number(pair.liquidity?.usd || 0),
    url: pair.url || ""
  }));
}

function analyzeKeywords(text) {
  const lower = safeText(text).toLowerCase();

  const positive = [
    "bullish", "breakout", "pump", "pumping", "moon", "ath",
    "all time high", "approved", "approval", "surge", "green",
    "rally", "explosion", "send it", "memecoin season", "adoption",
    "institutional", "fomo", "parabolic", "squeeze", "recovery",
    "inflow", "inflows", "accumulation", "strong", "up only"
  ];

  const negative = [
    "crash", "dump", "dumping", "fear", "panic", "selloff",
    "war", "ban", "lawsuit", "hack", "rug", "rugpull", "delay",
    "delayed", "rejected", "liquidation", "scam", "collapse",
    "bearish", "bloodbath", "capitulation", "exploit", "outage",
    "investigation", "sec", "bankrupt"
  ];

  const sarcasm = [
    "lol", "lmao", "clown", "🤡", "😂", "yeah right",
    "sure", "classic", "again", "cope", "nothing burger"
  ];

  const hopium = [
    "100x", "1000x", "rocket", "🚀", "wagmi", "supercycle",
    "millionaire", "send it", "moon", "next bitcoin"
  ];

  const fatigue = [
    "again", "not again", "same thing", "tired", "exhausted",
    "still waiting", "delayed again", "fatigue"
  ];

  const count = (arr) => arr.filter((word) => lower.includes(word)).length;

  return {
    positiveHits: count(positive),
    negativeHits: count(negative),
    sarcasmHits: count(sarcasm),
    hopiumHits: count(hopium),
    fatigueHits: count(fatigue)
  };
}

function scoreDexData(pairs) {
  if (!Array.isArray(pairs) || !pairs.length) return 0;

  const avgChange =
    pairs.reduce((sum, pair) => sum + Number(pair.priceChange24h || 0), 0) /
    pairs.length;

  if (avgChange >= 20) return 12;
  if (avgChange >= 10) return 8;
  if (avgChange >= 4) return 4;
  if (avgChange <= -20) return -12;
  if (avgChange <= -10) return -8;
  if (avgChange <= -4) return -4;

  return 0;
}

function scoreFearGreed(fearGreed) {
  const value = Number(fearGreed?.value || 50);

  if (value >= 85) return 12;
  if (value >= 75) return 9;
  if (value >= 60) return 5;
  if (value <= 15) return -12;
  if (value <= 25) return -9;
  if (value <= 40) return -5;

  return 0;
}

function detectModifier(score, signals) {
  if (signals.sarcasmHits > 0 && signals.negativeHits > 0) {
    return "Sarcastic Disbelief";
  }

  if (signals.fatigueHits > 0 && signals.negativeHits > 0) {
    return "Narrative Fatigue";
  }

  if (signals.hopiumHits > 0 && score >= 60) {
    return "Hopium Spike";
  }

  if (score >= 85) return "Overheated Confidence";
  if (score >= 70) return "Strong Conviction";
  if (score >= 60) return "Positive Flow";
  if (score >= 45) return "Narrative Balance";
  if (score >= 35) return "Uncertainty";
  if (score >= 20) return "Risk Rising";

  return "Emotional Breakdown";
}

function getMomentum(score, signals, dexImpact) {
  const signalPower =
    signals.positiveHits +
    signals.negativeHits +
    signals.sarcasmHits +
    signals.hopiumHits +
    signals.fatigueHits;

  const intensity = roundScore(
    clamp(Math.abs(score - 50) * 1.45 + signalPower * 7 + Math.abs(dexImpact) * 2, 12, 100)
  );

  if (intensity >= 80) return { intensity, momentum: "Explosive" };
  if (intensity >= 62) return { intensity, momentum: "Accelerating" };
  if (intensity >= 40) return { intensity, momentum: "Building" };

  return { intensity, momentum: "Soft" };
}

function buildInterpretation({ mood, modifier, fearGreed, pairs, trending }) {
  if (modifier === "Sarcastic Disbelief") {
    return "The internet is reacting with sarcasm and disbelief. The narrative feels mocked, tired, or emotionally distrusted.";
  }

  if (modifier === "Narrative Fatigue") {
    return "The crowd feels tired of seeing the same narrative repeat. This is less about panic and more about emotional exhaustion.";
  }

  if (modifier === "Hopium Spike") {
    return "The crowd is leaning into hope. Upside expectations are forming faster than full confirmation.";
  }

  const map = {
    euphoria:
      "The reaction is extremely risk-on. The crowd is chasing the narrative, but the emotion may be overheating.",
    content:
      "The reaction is constructive. Confidence is present without turning fully irrational.",
    optimism:
      "The crowd is leaning positive. Conviction is building, but traders still want confirmation.",
    neutral:
      "The crowd is undecided. The narrative is being watched, but emotion has not committed strongly.",
    doubt:
      "The crowd is hesitant. People are questioning the narrative and waiting before fully believing it.",
    concern:
      "The crowd is defensive. Confidence is weakening and the reaction feels cautious.",
    frustration:
      "The crowd is emotionally stressed. The narrative feels heavy, reactive, and close to panic or exhaustion."
  };

  let text = map[mood.key] || map.neutral;

  if (fearGreed?.label) {
    text += ` Current Fear & Greed context is ${fearGreed.label}.`;
  }

  if (pairs?.length) {
    text += " DexScreener market activity was included in the emotional read.";
  }

  if (trending?.length) {
    text += " CoinGecko trending data was also used to detect what the market is paying attention to.";
  }

  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const text = safeText(req.body?.text);

    if (!text) {
      return res.status(400).json({
        ok: false,
        error: "Missing text."
      });
    }

    const query = extractQuery(text);

    const [fearGreed, trending, dexPairs] = await Promise.all([
      fetchFearGreed(),
      fetchCoinGeckoTrending(),
      fetchDexScreener(query)
    ]);

    const signals = analyzeKeywords(text);

    let score = 50;

    score += signals.positiveHits * 8;
    score -= signals.negativeHits * 8;

    if (signals.hopiumHits > 0) score += 8;
    if (signals.sarcasmHits > 0 && signals.negativeHits > 0) score -= 5;
    if (signals.fatigueHits > 0 && signals.negativeHits > 0) score -= 5;

    const fearGreedImpact = scoreFearGreed(fearGreed);
    const dexImpact = scoreDexData(dexPairs);

    score += fearGreedImpact;
    score += dexImpact;

    const finalScore = roundScore(score);
    const mood = getMoodByScore(finalScore);
    const modifier = detectModifier(finalScore, signals);
    const { intensity, momentum } = getMomentum(finalScore, signals, dexImpact);

    const interpretation = buildInterpretation({
      mood,
      modifier,
      fearGreed,
      pairs: dexPairs,
      trending
    });

    return res.status(200).json({
      ok: true,
      query,
      score: finalScore,
      mood,
      modifier,
      intensity,
      momentum,
      interpretation,
      signals,
      sources: {
        fearGreed,
        trending: trending.slice(0, 7),
        dexPairs: dexPairs.slice(0, 5)
      }
    });
  } catch (error) {
    console.error("Emotion Radar API error:", error);

    return res.status(500).json({
      ok: false,
      error: "Emotion Radar failed.",
      details: error.message
    });
  }
}
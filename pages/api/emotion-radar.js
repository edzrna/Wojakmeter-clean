// ===============================
// WOJAKMETER EMOTION RADAR API
// Real news + market context
// Sources:
// - CryptoPanic news
// - CoinGecko global market
// ===============================

const CRYPTOPANIC_API_KEY = process.env.CRYPTOPANIC_API_KEY || "";
const COINGECKO_GLOBAL_URL = "https://api.coingecko.com/api/v3/global";

const MOODS = [
  { key: "frustration", name: "Frustration", min: 0, max: 19 },
  { key: "concern", name: "Concern", min: 20, max: 34 },
  { key: "doubt", name: "Doubt", min: 35, max: 44 },
  { key: "neutral", name: "Neutral", min: 45, max: 59 },
  { key: "optimism", name: "Optimism", min: 60, max: 69 },
  { key: "content", name: "Content", min: 70, max: 84 },
  { key: "euphoria", name: "Euphoria", min: 85, max: 100 }
];

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function roundScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 50;
  return Math.round(clamp(num, 0, 100));
}

function getMoodByScore(score) {
  const safeScore = roundScore(score);
  return (
    MOODS.find((mood) => safeScore >= mood.min && safeScore <= mood.max) ||
    MOODS.find((mood) => mood.key === "neutral")
  );
}

function safeText(value) {
  return String(value || "").trim();
}

function tokenize(text) {
  return safeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9$#\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .slice(0, 12);
}

function extractQuery(text) {
  const words = tokenize(text);

  const stop = new Set([
    "the", "and", "for", "with", "that", "this", "from", "are",
    "was", "you", "your", "crypto", "coin", "market", "price",
    "again", "will", "has", "have", "about"
  ]);

  const keywords = words.filter((word) => !stop.has(word));
  return keywords.slice(0, 6).join(" ") || words.slice(0, 6).join(" ");
}

async function fetchJson(url, fallback = null) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WojakMeter/1.0"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return fallback;
  }
}

async function fetchCryptoPanicNews(query) {
  if (!CRYPTOPANIC_API_KEY) return [];

  const params = new URLSearchParams({
    auth_token: CRYPTOPANIC_API_KEY,
    public: "true",
    kind: "news"
  });

  if (query) params.set("filter", "rising");

  const url = `https://cryptopanic.com/api/v1/posts/?${params.toString()}`;
  const data = await fetchJson(url, null);

  const results = Array.isArray(data?.results) ? data.results : [];

  const q = safeText(query).toLowerCase();

  const normalized = results.map((item) => ({
    title: safeText(item.title),
    url: item.url || "",
    source: item.source?.title || "CryptoPanic",
    domain: item.domain || "",
    votes: item.votes || {},
    publishedAt: item.published_at || "",
    currencies: Array.isArray(item.currencies)
      ? item.currencies.map((c) => c.code).filter(Boolean)
      : []
  }));

  if (!q) return normalized.slice(0, 8);

  const queryWords = tokenize(q);

  const scored = normalized
    .map((item) => {
      const haystack = `${item.title} ${item.currencies.join(" ")}`.toLowerCase();
      const matches = queryWords.filter((word) => haystack.includes(word)).length;
      return { ...item, relevance: matches };
    })
    .filter((item) => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);

  return (scored.length ? scored : normalized).slice(0, 8);
}

async function fetchGlobalMarketContext() {
  const data = await fetchJson(COINGECKO_GLOBAL_URL, null);
  const global = data?.data || {};

  return {
    marketCapChange24h: Number(global.market_cap_change_percentage_24h_usd || 0),
    btcDominance: Number(global.market_cap_percentage?.btc || 0),
    totalVolumeUsd: Number(global.total_volume?.usd || 0),
    activeCryptos: Number(global.active_cryptocurrencies || 0)
  };
}

function scoreTextEmotion(text, headlines = []) {
  const combined = [
    safeText(text),
    ...headlines.map((h) => safeText(h.title))
  ].join(" ");

  const lower = combined.toLowerCase();

  const positive = [
    "approved", "approval", "bullish", "rally", "surge", "pump",
    "pumping", "breakout", "recovery", "adoption", "partnership",
    "accumulation", "green", "ath", "all time high", "rate cut",
    "inflow", "inflows", "etf approved", "moon", "strong"
  ];

  const negative = [
    "delayed", "delay", "rejected", "hack", "hacked", "exploit",
    "scam", "crash", "dump", "dumping", "lawsuit", "sec", "ban",
    "outage", "liquidation", "collapse", "bankrupt", "red",
    "fear", "panic", "rug", "dead", "selloff", "investigation"
  ];

  const sarcasm = [
    "lol", "lmao", "clown", "🤡", "😂", "again", "classic",
    "sure", "yeah right", "cope", "nothing burger"
  ];

  const hopium = [
    "moon", "send it", "100x", "rocket", "🚀", "wagmi",
    "supercycle", "millionaire"
  ];

  const exhaustion = [
    "again", "delayed again", "tired", "exhausted", "same thing",
    "not again", "fatigue", "still waiting"
  ];

  const chaos = [
    "breaking", "urgent", "emergency", "war", "massive",
    "insane", "crazy", "wild", "panic"
  ];

  const countHits = (arr) => arr.filter((word) => lower.includes(word)).length;

  const positiveHits = countHits(positive);
  const negativeHits = countHits(negative);
  const sarcasmHits = countHits(sarcasm);
  const hopiumHits = countHits(hopium);
  const exhaustionHits = countHits(exhaustion);
  const chaosHits = countHits(chaos);

  let score = 50;

  score += positiveHits * 7;
  score -= negativeHits * 8;

  if (hopiumHits >= 1) score += 8;
  if (sarcasmHits >= 1 && negativeHits > 0) score -= 5;
  if (exhaustionHits >= 1 && negativeHits > 0) score -= 5;
  if (chaosHits >= 2) score -= 7;

  return {
    score: roundScore(score),
    signals: {
      positiveHits,
      negativeHits,
      sarcasmHits,
      hopiumHits,
      exhaustionHits,
      chaosHits
    }
  };
}

function applyMarketContext(baseScore, market) {
  let score = Number(baseScore || 50);

  const change = Number(market?.marketCapChange24h || 0);

  if (change >= 3) score += 7;
  else if (change >= 1) score += 3;
  else if (change <= -3) score -= 7;
  else if (change <= -1) score -= 3;

  return roundScore(score);
}

function getModifier(score, signals) {
  if (signals.sarcasmHits > 0 && signals.negativeHits > 0) {
    return "Sarcastic Disbelief";
  }

  if (signals.exhaustionHits > 0 && signals.negativeHits > 0) {
    return "Emotional Fatigue";
  }

  if (signals.hopiumHits > 0 && score >= 60) {
    return "Hopium Spike";
  }

  if (signals.chaosHits > 0) {
    return "Chaos Pressure";
  }

  if (score >= 85) return "Overheated Confidence";
  if (score >= 70) return "Strong Conviction";
  if (score >= 60) return "Building Optimism";
  if (score >= 45) return "Narrative Balance";
  if (score >= 35) return "Hesitation";
  if (score >= 20) return "Defensive Pressure";
  return "Panic Stress";
}

function getMomentum(score, signals, market) {
  const intensityBase = Math.abs(score - 50);
  const signalPower =
    signals.positiveHits +
    signals.negativeHits +
    signals.sarcasmHits +
    signals.hopiumHits +
    signals.chaosHits;

  const marketMove = Math.abs(Number(market?.marketCapChange24h || 0));

  const intensity = roundScore(
    clamp(intensityBase * 1.4 + signalPower * 7 + marketMove * 3, 12, 100)
  );

  let momentum = "Soft";
  if (intensity >= 80) momentum = "Explosive";
  else if (intensity >= 62) momentum = "Accelerating";
  else if (intensity >= 40) momentum = "Building";

  return { intensity, momentum };
}

function buildInterpretation({ mood, modifier, score, market, headlines }) {
  const marketMove = Number(market?.marketCapChange24h || 0);
  const hasNews = headlines.length > 0;

  if (modifier === "Sarcastic Disbelief") {
    return "The crowd is reacting with sarcasm and disbelief. The narrative feels tired, mocked, or emotionally distrusted.";
  }

  if (modifier === "Emotional Fatigue") {
    return "The crowd feels tired of the same narrative repeating. This is less about panic and more about emotional exhaustion.";
  }

  if (modifier === "Hopium Spike") {
    return "The crowd is leaning into hope. Upside expectations are forming faster than full confirmation.";
  }

  const map = {
    euphoria:
      "The reaction is extremely risk-on. The crowd is chasing the narrative, but emotion may be overheating.",
    content:
      "The reaction is constructive. Confidence is present without turning fully irrational.",
    optimism:
      "The crowd is leaning positive. Conviction is building, but people still want confirmation.",
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

  if (hasNews) {
    text += " Related real headlines were found and included in the emotional read.";
  } else {
    text += " No highly related headlines were found, so the read is based mostly on the submitted narrative and market context.";
  }

  if (marketMove > 1) {
    text += " Market context is helping sentiment.";
  } else if (marketMove < -1) {
    text += " Market context is adding pressure.";
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

    const [headlines, market] = await Promise.all([
      fetchCryptoPanicNews(query),
      fetchGlobalMarketContext()
    ]);

    const textEmotion = scoreTextEmotion(text, headlines);
    const finalScore = applyMarketContext(textEmotion.score, market);
    const mood = getMoodByScore(finalScore);
    const modifier = getModifier(finalScore, textEmotion.signals);
    const { intensity, momentum } = getMomentum(
      finalScore,
      textEmotion.signals,
      market
    );

    const interpretation = buildInterpretation({
      mood,
      modifier,
      score: finalScore,
      market,
      headlines
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
      market,
      headlines,
      sourceStatus: {
        cryptoPanic: CRYPTOPANIC_API_KEY ? "connected" : "missing_api_key",
        coinGecko: market ? "connected" : "unavailable"
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Emotion Radar API failed.",
      details: error.message
    });
  }
}


function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function roundScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 50;
  return Math.round(clamp(num, 0, 100));
}

/* Mismo léxico que RADAR_LEXICON en script.js, ampliado con
   términos que aparecen más en titulares de prensa que en
   tweets (ban, halt, outflow, surge, all-time high...). */
const NEWS_LEXICON = {
  positive: [
    "approved", "approval", "bullish", "pump", "pumping", "breakout",
    "ath", "all-time high", "all time high", "adoption", "partnership",
    "rate cut", "etf approved", "accumulation", "strong", "recovery",
    "rally", "surge", "inflow", "inflows", "record high", "soars",
    "jumps", "gains", "upgrade", "integrates", "launches", "expands"
  ],
  negative: [
    "delayed", "delay", "hack", "hacked", "exploit", "scam", "crash",
    "dump", "dumping", "lawsuit", "sec", "ban", "banned", "outage",
    "liquidation", "liquidations", "collapse", "bankrupt", "bankruptcy",
    "fear", "panic", "rug", "dead", "selloff", "sell-off", "plunge",
    "plunges", "tumbles", "drops", "falls", "halt", "halted",
    "outflow", "outflows", "investigation", "charges", "fraud", "seized"
  ],
  chaos: [
    "war", "breaking", "emergency", "panic", "massive", "urgent",
    "insane", "crackdown", "raid", "freeze", "frozen"
  ],
  hopium: [
    "moon", "rocket", "100x", "supercycle", "breakout", "surge",
    "record", "all-time high"
  ]
};

function scoreToMoodKey(score) {
  if (score >= 85) return "euphoria";
  if (score >= 70) return "content";
  if (score >= 60) return "optimism";
  if (score >= 45) return "neutral";
  if (score >= 35) return "doubt";
  if (score >= 20) return "concern";
  return "frustration";
}

/* Clasifica un titular. Ligero a propósito: corre sobre 15-20
   titulares por request de refresco sin costo de LLM. */
function classifyHeadline(headline) {
  const text = String(headline || "").toLowerCase();
  if (!text) return { score: 50, moodKey: "neutral" };

  const hits = {};
  Object.entries(NEWS_LEXICON).forEach(([key, words]) => {
    hits[key] = words.filter((w) => text.includes(w)).length;
  });

  let score = 50 + hits.positive * 11 - hits.negative * 11;
  if (hits.chaos >= 1 && hits.negative > 0) score -= 8;
  if (hits.hopium >= 1 && hits.positive > 0) score += 6;

  score = roundScore(score);
  return { score, moodKey: scoreToMoodKey(score) };
}

module.exports = { classifyHeadline, scoreToMoodKey, roundScore };

import { classifyHeadline, scoreToMoodKey } from "../../lib/newsMood";

/* ===========================================================
   EMOTION RADAR  (v2)

   TRES PROBLEMAS DE LA VERSIÓN ANTERIOR:

   1. FALSOS POSITIVOS POR SUBCADENA.
      Usaba text.includes(word), así que "sec" coincidía dentro
      de SECurity, "ban" dentro de BANk, "ath" dentro de deATH y
      "war" dentro de WARning. Un titular con la palabra "death"
      puntuaba POSITIVO porque "ath" está en la lista de all-time
      high. Corregimos esto en lib/newsMood.js y aquí siguió
      intacto: la misma lógica vivía en tres sitios distintos.

      Ahora este endpoint IMPORTA de lib/newsMood.js. Una sola
      fuente de verdad: si mejoras el léxico, mejora en todas
      partes a la vez.

   2. LA BÚSQUEDA EN DEXSCREENER AÑADÍA RUIDO.
      Cogía palabras sueltas del titular y buscaba tokens con ese
      nombre. "Bitcoin ETF delayed again" buscaba "bitcoin etf
      delayed" y devolvía cualquier memecoin llamada así — cuyo
      precio luego movía el score. Se dejaba a tokens aleatorios
      opinar sobre una noticia.

      Ahora solo se consulta si el texto menciona un ticker
      explícito ($ALGO), y nunca altera el score: se muestra
      aparte como contexto.

   3. EL PROBLEMA CONCEPTUAL.
      El Fear & Greed sumaba o restaba hasta 12 puntos al score
      del texto. Eso significa que el MISMO titular daba distinta
      puntuación según el día, por razones ajenas al titular. La
      lectura dejaba de ser verificable.

      Ahora hay dos números separados:
        · textScore    — qué dice el texto (reproducible)
        · marketScore  — cómo está el mercado (contexto)
      y una lectura combinada explícitamente etiquetada.
   =========================================================== */

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function roundScore(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(clamp(n, 0, 100)) : 50;
}

function safeText(v) { return String(v || "").trim(); }

const MOOD_NAMES = {
  euphoria: "Euphoria", content: "Content", optimism: "Optimism",
  neutral: "Neutral", doubt: "Doubt", concern: "Concern",
  frustration: "Frustration"
};

async function fetchJson(url, fallback = null, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "WojakMeter/1.0" },
      signal: controller.signal
    });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/* Solo se busca en DexScreener si el usuario menciona un ticker
   explícito. Antes se buscaba con palabras sueltas del titular,
   lo que traía tokens sin relación cuyo precio movía el score. */
function extractTicker(text) {
  const cashtag = text.match(/\$([A-Za-z][A-Za-z0-9]{1,9})\b/);
  if (cashtag) return cashtag[1].toUpperCase();

  /* Sin $ se aceptan solo símbolos conocidos en mayúsculas, para
     no confundir palabras normales con tickers. */
  const known = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "BNB", "AVAX", "LINK", "TRX"];
  const upper = text.toUpperCase();
  return known.find((t) => new RegExp(`\\b${t}\\b`).test(upper)) || null;
}

async function fetchTickerContext(ticker) {
  if (!ticker) return null;

  const data = await fetchJson(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(ticker)}`
  );

  const pairs = Array.isArray(data?.pairs) ? data.pairs : [];
  if (!pairs.length) return null;

  /* El par con más liquidez: el primero del array puede ser uno
     muerto con treinta dólares y un precio absurdo. */
  const best = pairs.reduce((a, b) =>
    Number(b?.liquidity?.usd || 0) > Number(a?.liquidity?.usd || 0) ? b : a
  , pairs[0]);

  return {
    symbol: best?.baseToken?.symbol || ticker,
    name: best?.baseToken?.name || "",
    priceUsd: best?.priceUsd || "",
    change24h: Number(best?.priceChange?.h24 || 0),
    volume24h: Number(best?.volume?.h24 || 0),
    url: best?.url || ""
  };
}

async function fetchFearGreed() {
  const data = await fetchJson("https://api.alternative.me/fng/");
  const entry = data?.data?.[0];
  if (!entry) return null;
  return {
    value: roundScore(entry.value),
    label: entry.value_classification || "Neutral"
  };
}

/* ---------------------------------------------------------
   MOMENTUM E INTENSIDAD

   Antes la intensidad dependía del número de coincidencias del
   diccionario, así que un texto largo con muchas palabras
   comunes salía "Explosive" aunque no dijera nada fuerte.
   Ahora depende de cuánto se aparta el score del centro y de la
   densidad de señal, no de su cantidad bruta.
--------------------------------------------------------- */
function getMomentum(score, signals, wordCount) {
  const totalHits =
    signals.positive + signals.negative + signals.chaos + signals.hopium;

  const density = wordCount > 0 ? totalHits / Math.max(wordCount / 6, 1) : 0;
  const extremity = Math.abs(score - 50) / 50;

  const intensity = roundScore(clamp(extremity * 78 + density * 26, 8, 100));

  if (intensity >= 78) return { intensity, momentum: "Explosive" };
  if (intensity >= 58) return { intensity, momentum: "Accelerating" };
  if (intensity >= 34) return { intensity, momentum: "Building" };
  return { intensity, momentum: "Soft" };
}

function detectModifier(score, signals) {
  if (signals.negated > 0 && signals.negative === 0) return "Denied Expectation";
  if (signals.chaos > 0 && signals.negative > 0) return "Chaos Pressure";
  if (signals.hopium > 0 && score >= 60) return "Hopium Spike";
  if (signals.positive > 0 && signals.negative > 0) return "Mixed Signals";

  if (score >= 85) return "Overheated Confidence";
  if (score >= 70) return "Strong Conviction";
  if (score >= 60) return "Positive Flow";
  if (score >= 45) return "Narrative Balance";
  if (score >= 35) return "Uncertainty";
  if (score >= 20) return "Risk Rising";
  return "Emotional Breakdown";
}

const INTERPRETATIONS = {
  euphoria:    "The reaction is extremely risk-on. The crowd is chasing the narrative, and the emotion may be overheating.",
  content:     "The reaction is constructive. Confidence is present without turning irrational.",
  optimism:    "The crowd leans positive. Conviction is building, but traders still want confirmation.",
  neutral:     "The crowd is undecided. The narrative is being watched, but emotion hasn't committed.",
  doubt:       "The crowd is hesitant. People are questioning the narrative before believing it.",
  concern:     "The crowd is defensive. Confidence is weakening and the reaction feels cautious.",
  frustration: "The crowd is emotionally stressed. The narrative feels heavy and close to panic."
};

const MODIFIER_OVERRIDES = {
  "Denied Expectation": "Something expected did NOT happen. The disappointment weighs more than the news itself.",
  "Chaos Pressure":     "Urgency and threat language dominate. The reaction is driven by alarm more than analysis.",
  "Hopium Spike":       "The crowd is leaning into hope. Upside expectations are forming faster than confirmation.",
  "Mixed Signals":      "The text carries positive and negative weight at once. The crowd would split on this."
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
  }

  try {
    const text = safeText(req.body?.text);
    if (!text) {
      return res.status(400).json({ ok: false, error: "Missing text." });
    }

    /* ---- 1. LECTURA DEL TEXTO (reproducible) ----
       Misma función que clasifica los titulares del feed, así que
       el mismo texto da el mismo resultado entre por donde entre. */
    const classified = classifyHeadline(text);
    const textScore = roundScore(classified.score);
    const signals = classified.signals || {
      positive: 0, negative: 0, chaos: 0, hopium: 0, negated: 0
    };

    const wordCount = text.split(/\s+/).filter(Boolean).length;

    /* ---- 2. CONTEXTO DE MERCADO (no altera el score) ---- */
    const ticker = extractTicker(text);

    const [fearGreed, tokenContext] = await Promise.all([
      fetchFearGreed(),
      fetchTickerContext(ticker)
    ]);

    const moodKey = scoreToMoodKey(textScore);
    const modifier = detectModifier(textScore, signals);
    const { intensity, momentum } = getMomentum(textScore, signals, wordCount);

    let interpretation =
      MODIFIER_OVERRIDES[modifier] || INTERPRETATIONS[moodKey] || INTERPRETATIONS.neutral;

    /* El contexto se AÑADE como frase aparte, no se funde en el
       número. El usuario ve qué viene del texto y qué del mercado. */
    const contextLines = [];
    if (fearGreed) {
      contextLines.push(`Market context: Fear & Greed at ${fearGreed.value} (${fearGreed.label}).`);
    }
    if (tokenContext) {
      const dir = tokenContext.change24h >= 0 ? "+" : "";
      contextLines.push(
        `$${tokenContext.symbol} is ${dir}${tokenContext.change24h.toFixed(1)}% over 24h.`
      );
    }

    return res.status(200).json({
      ok: true,

      /* El score principal viene SOLO del texto. Antes el Fear &
         Greed lo movía hasta 12 puntos, así que el mismo titular
         puntuaba distinto según el día. */
      score: textScore,
      mood: { key: moodKey, name: MOOD_NAMES[moodKey] || "Neutral" },
      modifier,
      intensity,
      momentum,
      interpretation,

      /* Desglose: permite depurar por qué salió lo que salió sin
         adivinar, y da material para explicar la lectura. */
      signals,
      context: {
        lines: contextLines,
        fearGreed,
        token: tokenContext,
        ticker
      },

      method: "lexicon-v2"
    });
  } catch (error) {
    console.error("Emotion Radar error:", error);
    return res.status(500).json({
      ok: false,
      error: "Emotion Radar failed.",
      detail: error?.message
    });
  }
}

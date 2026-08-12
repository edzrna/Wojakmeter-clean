import {
  cachedJson,
  cgHeaders,
  cgUrl,
  fetchJsonWithRetry
} from "../../lib/data-proxy";

function formatUsdCompact(value) {
  const num = Number(value || 0);

  if (!Number.isFinite(num) || num <= 0) return "--";

  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2
  }).format(num);
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

/* ESPEJO de changeToScore en script.js y history-snapshot.js.

   Antes esto era `50 + change * 10`, la formula lineal vieja: a
   partir de +-5% daba 0 o 100 y ademas discrepaba de la curva
   tanh que usan el navegador y el snapshot. Tres formulas para el
   mismo numero es una garantia de que dos van a estar mal. */
const SIGMA_TO_SCALE = 2.5;

function tanh(x) {
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

function changeToScore(changePct, scale) {
  const change = Number(changePct || 0);
  const safeScale = Number(scale) > 0 ? Number(scale) : 1;
  return clamp(50 + 50 * tanh(change / (safeScale * SIGMA_TO_SCALE)) * 0.97, 0, 100);
}

/* El mercado global no se mueve como una memecoin: la escala
   depende del rango. Un -2% en una hora es mucho; en 30 dias es
   nada. Antes se usaba la misma sensibilidad para los cinco. */
const CHANGE_SCALE_BY_TIMEFRAME = {
  "1h": 0.7, "4h": 1.4, "24h": 2.8, "7d": 6.5, "30d": 12
};

function scoreFromChange(change, timeframe = "24h") {
  const scale = CHANGE_SCALE_BY_TIMEFRAME[String(timeframe)] || 2.8;
  return Math.round(changeToScore(change, scale));
}

function getDaysFromTimeframe(timeframe) {
  switch (String(timeframe || "24h")) {
    case "1h":
      return 1;
    case "4h":
      return 1;
    case "24h":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    default:
      return 1;
  }
}

/* Ventana real de cada pill, en horas. Es lo que permite recortar
   la serie de CoinGecko antes de medir el cambio. */
const WINDOW_HOURS = {
  "1h": 1, "4h": 4, "24h": 24, "7d": 24 * 7, "30d": 24 * 30
};

/* Recorta la serie a la ventana pedida y devuelve el cambio REAL
   de punto a punto.

   EL BUG QUE ARREGLA:
   Antes se devolvia siempre `market_cap_change_percentage_24h_usd`
   para las cinco pills, y el navegador lo multiplicaba por una
   constante (1h x0.25, 7d x2.2, 30d x4). O sea que "7D" no leia
   siete dias de mercado: leia el mismo 24h escalado a ojo. Ahora
   1h son los ultimos 60 minutos de la serie, y 7d son siete dias.

   Devuelve null si no hay datos suficientes para medir. Null se
   propaga como "no medido" en vez de convertirse en un cero, que
   se leeria como "el mercado esta plano". */
function measureChangeFromSeries(series, timeframe) {
  if (!Array.isArray(series) || series.length < 2) return null;

  const hours = WINDOW_HOURS[String(timeframe)] || 24;
  const cutoff = Date.now() - hours * 3600 * 1000;

  const points = series
    .map((e) => (Array.isArray(e) ? [Number(e[0]), Number(e[1])] : null))
    .filter((e) => e && Number.isFinite(e[0]) && Number.isFinite(e[1]) && e[1] > 0);

  if (points.length < 2) return null;

  const windowed = points.filter((e) => e[0] >= cutoff);

  /* Con menos de dos puntos dentro de la ventana no hay nada que
     medir. Ocurre en 1h si el proveedor solo da datos horarios.
     Se toman los dos ultimos puntos disponibles y se marca la
     ventana efectiva, en vez de inventar un numero. */
  const use = windowed.length >= 2 ? windowed : points.slice(-2);

  const first = use[0][1];
  const last = use[use.length - 1][1];
  if (!(first > 0)) return null;

  return {
    change: ((last - first) / first) * 100,
    spanHours: (use[use.length - 1][0] - use[0][0]) / 3600000,
    points: use.length,
    exact: windowed.length >= 2
  };
}

function getPointLimitForTimeframe(timeframe) {
  switch (String(timeframe || "24h")) {
    case "1h":
      return 24;
    case "4h":
      return 24;
    case "24h":
      return 24;
    case "7d":
      return 14;
    case "30d":
      return 30;
    default:
      return 24;
  }
}

function downsampleSeries(series, maxPoints) {
  if (!Array.isArray(series)) return [];
  if (series.length <= maxPoints) return series;

  const result = [];
  const lastIndex = series.length - 1;

  for (let i = 0; i < maxPoints; i += 1) {
    const idx = Math.round((i / (maxPoints - 1)) * lastIndex);
    result.push(series[idx]);
  }

  return result;
}

/* buildSyntheticTimelineFromCurrent SE ELIMINO.

   Interpolaba una recta entre el valor de hace 24h y el actual y
   le sumaba `Math.sin(progress * PI * 2) * 0.008` —una onda— para
   "que no se vea como linea recta perfecta". Es decir: dibujaba
   subidas y bajadas del mercado global que nunca ocurrieron, con
   el proposito explicito de parecer datos.

   Es el mismo principio que ya se aplico a las velas: no se
   fabrican. Si CoinGecko no responde, el timeline va vacio y el
   cliente lo sabe por `timelineSource: "unavailable"`. Un hueco
   honesto es mejor que un grafico inventado en una herramienta
   cuyo producto entero es pedir confianza en sus numeros. */

async function getGlobalSnapshot() {
  return await fetchJsonWithRetry(cgUrl("/global"), {
    headers: cgHeaders(),
    timeoutMs: 6500,
    retries: 2
  });
}

async function getGlobalMarketCapChart(timeframe) {
  const days = getDaysFromTimeframe(timeframe);

  const json = await fetchJsonWithRetry(
    cgUrl(`/global/market_cap_chart?days=${encodeURIComponent(days)}&vs_currency=usd`),
    {
      headers: cgHeaders(),
      timeoutMs: 7000,
      retries: 1
    }
  );

  const marketCaps = Array.isArray(json?.market_cap_chart)
    ? json.market_cap_chart
    : Array.isArray(json?.market_caps)
      ? json.market_caps
      : [];

  return marketCaps;
}

export default async function handler(req, res) {
  const timeframe = String(req.query?.timeframe || "24h");

  try {
    const result = await cachedJson(
      `global:${timeframe}`,
      async () => {
        const snapshot = await getGlobalSnapshot();
        const data = snapshot?.data || snapshot || {};

        const marketCapUsd = Number(data?.total_market_cap?.usd ?? 0);
        const volumeUsd = Number(data?.total_volume?.usd ?? 0);
        const btcDom = Number(data?.market_cap_percentage?.btc ?? 0);
        const raw24hChange = Number(data?.market_cap_change_percentage_24h_usd ?? 0);

        let timeline = [];
        let timelineSource = "unavailable";
        let measured = null;

        try {
          const history = await getGlobalMarketCapChart(timeframe);
          if (Array.isArray(history) && history.length >= 2) {
            /* SE MIDE ANTES DE DIEZMAR. downsampleSeries reduce 7
               dias a 14 puntos; medir el cambio de 1h sobre eso
               daria la variacion de medio dia. */
            measured = measureChangeFromSeries(history, timeframe);
            timeline = downsampleSeries(history, getPointLimitForTimeframe(timeframe));
            timelineSource = "coingecko_global_market_cap_chart";
          }
        } catch {
          timeline = [];
        }

        return {
          marketCapUsd,
          volumeUsd,
          btcDom,
          raw24hChange,
          measured,
          timeline,
          timelineSource,
          raw: data
        };
      },
      {
        ttlMs: timeframe === "1h" || timeframe === "4h" || timeframe === "24h" ? 25000 : 60000,
        staleMs: 600000
      }
    );

    const payload = result?.data || {};
    const marketCapUsd = Number(payload.marketCapUsd ?? 0);
    const volumeUsd = Number(payload.volumeUsd ?? 0);
    const btcDom = Number(payload.btcDom ?? 0);
    /* El cambio de ESTE timeframe, medido sobre la serie real.
       Solo se cae al 24h del snapshot si no se pudo medir, y en
       ese caso se dice: changeSource lo declara. */
    const measured = payload.measured || null;
    const raw24h = Number(payload.raw24hChange ?? 0);

    const change = measured ? measured.change : raw24h;
    const changeSource = measured
      ? (measured.exact ? "measured" : "measured_partial")
      : "snapshot_24h";

    const score = scoreFromChange(change, timeframe);

    res.status(200).json({
      ok: true,
      stale: Boolean(result?.stale),
      cached: Boolean(result?.cached),
      timeframe,

      marketCap: formatUsdCompact(marketCapUsd),
      volume: formatUsdCompact(volumeUsd),
      btcDominance: Number.isFinite(btcDom) ? `${btcDom.toFixed(1)}%` : "--",

      marketCapUsd,
      volumeUsd,
      btcDominanceValue: Number.isFinite(btcDom) ? btcDom : 0,
      change,
      score,

      /* El navegador necesita saber si el numero es del rango
         pedido o un 24h prestado: con eso decide si ponderar el
         movimiento o apoyarse mas en la estructura. */
      changeSource,
      changeSpanHours: measured ? Number(measured.spanHours.toFixed(2)) : null,
      change24h: raw24h,

      timeline: Array.isArray(payload.timeline) ? payload.timeline : [],
      timelineSource: payload.timelineSource || "fallback",

      raw: payload.raw || null
    });
  } catch (error) {
    res.status(200).json({
      ok: false,
      stale: false,
      cached: false,
      timeframe,

      marketCap: "--",
      volume: "--",
      btcDominance: "--",

      marketCapUsd: 0,
      volumeUsd: 0,
      btcDominanceValue: 0,
      change: 0,
      score: 50,
      changeSource: "error",
      changeSpanHours: null,
      change24h: 0,

      timeline: [],
      timelineSource: "error",

      raw: null,
      error: error?.message || "Unknown error"
    });
  }
}
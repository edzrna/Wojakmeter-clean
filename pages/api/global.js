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

function scoreFromChange(change) {
  return Math.round(clamp(50 + Number(change || 0) * 10, 0, 100));
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

function buildSyntheticTimelineFromCurrent(currentValue, changePct, timeframe) {
  const safeCurrent = Number(currentValue || 0);
  if (!Number.isFinite(safeCurrent) || safeCurrent <= 0) return [];

  const totalChange = Number(changePct || 0) / 100;
  const startValue = safeCurrent / (1 + totalChange || 1);

  const points =
    timeframe === "30d" ? 30 :
    timeframe === "7d" ? 14 :
    24;

  const now = Date.now();
  const rangeMs =
    timeframe === "30d" ? 30 * 24 * 60 * 60 * 1000 :
    timeframe === "7d" ? 7 * 24 * 60 * 60 * 1000 :
    24 * 60 * 60 * 1000;

  const out = [];

  for (let i = 0; i < points; i += 1) {
    const progress = points === 1 ? 1 : i / (points - 1);
    const ts = now - rangeMs + progress * rangeMs;

    // curva suave para que no se vea como línea recta perfecta
    const wave = Math.sin(progress * Math.PI * 2) * 0.008;
    const drift = startValue + (safeCurrent - startValue) * progress;
    const value = drift * (1 + wave);

    out.push([Math.round(ts), Math.round(value)]);
  }

  // último punto exacto igual al market cap actual
  out[out.length - 1] = [now, Math.round(safeCurrent)];

  return out;
}

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
        let timelineSource = "fallback";

        try {
          const history = await getGlobalMarketCapChart(timeframe);
          if (Array.isArray(history) && history.length >= 2) {
            timeline = downsampleSeries(history, getPointLimitForTimeframe(timeframe));
            timelineSource = "coingecko_global_market_cap_chart";
          }
        } catch {
          timeline = [];
        }

        if (!timeline.length) {
          timeline = buildSyntheticTimelineFromCurrent(
            marketCapUsd,
            raw24hChange,
            timeframe
          );
        }

        return {
          marketCapUsd,
          volumeUsd,
          btcDom,
          raw24hChange,
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
    const change = Number(payload.raw24hChange ?? 0);
    const score = scoreFromChange(change);

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

      timeline: [],
      timelineSource: "error",

      raw: null,
      error: error?.message || "Unknown error"
    });
  }
}
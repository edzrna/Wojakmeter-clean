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

export default async function handler(req, res) {
  try {
    const timeframe = String(req.query?.timeframe || "1h");

    const result = await cachedJson(
      "global",
      async () => {
        return await fetchJsonWithRetry(cgUrl("/global"), {
          headers: cgHeaders(),
          timeoutMs: 6500,
          retries: 2
        });
      },
      {
        ttlMs: 25000,
        staleMs: 600000
      }
    );

    const data = result?.data?.data || result?.data || {};

    const marketCapUsd = Number(data?.total_market_cap?.usd ?? 0);
    const volumeUsd = Number(data?.total_volume?.usd ?? 0);
    const btcDom = Number(data?.market_cap_percentage?.btc ?? 0);
    const change = Number(data?.market_cap_change_percentage_24h_usd ?? 0);

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

      raw: data
    });
  } catch (error) {
    res.status(200).json({
      ok: false,
      stale: false,
      cached: false,
      timeframe: String(req.query?.timeframe || "1h"),

      marketCap: "--",
      volume: "--",
      btcDominance: "--",

      marketCapUsd: 0,
      volumeUsd: 0,
      btcDominanceValue: 0,
      change: 0,
      score: 50,

      raw: null,
      error: error?.message || "Unknown error"
    });
  }
}
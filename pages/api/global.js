import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

export default async function handler(req, res) {
  try {
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

    const data = result.data?.data || result.data || {};

    res.status(200).json({
      ok: true,
      stale: result.stale,
      cached: result.cached,
      marketCap: data?.total_market_cap?.usd
        ? Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 2
          }).format(data.total_market_cap.usd)
        : "--",
      volume: data?.total_volume?.usd
        ? Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 2
          }).format(data.total_volume.usd)
        : "--",
      btcDominance: data?.market_cap_percentage?.btc != null
        ? `${Number(data.market_cap_percentage.btc).toFixed(1)}%`
        : "--",
      change: Number(data?.market_cap_change_percentage_24h_usd ?? 0).toFixed(2),
      raw: data
    });
  } catch (error) {
    res.status(200).json({
      ok: false,
      marketCap: "--",
      volume: "--",
      btcDominance: "--",
      change: "0.00",
      raw: null,
      error: error.message
    });
  }
}
import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

function timeframeToDays(timeframe) {
  switch (timeframe) {
    case "1m":
    case "5m":
    case "15m":
    case "1h":
      return 1;
    case "4h":
      return 7;
    case "24h":
      return 30;
    case "7d":
      return 90;
    default:
      return 1;
  }
}

export default async function handler(req, res) {
  const coin = String(req.query.coin || "bitcoin");
  const timeframe = String(req.query.timeframe || "1h");

  try {
    const days = timeframeToDays(timeframe);

    const result = await cachedJson(
      `coin-chart:${coin}:${timeframe}`,
      async () => {
        return await fetchJsonWithRetry(
          cgUrl(`/coins/${encodeURIComponent(coin)}/market_chart`, {
            vs_currency: "usd",
            days,
            interval: days <= 1 ? "hourly" : "daily"
          }),
          {
            headers: cgHeaders(),
            timeoutMs: 7000,
            retries: 2
          }
        );
      },
      {
        ttlMs: 30000,
        staleMs: 900000
      }
    );

    res.status(200).json({
      prices: result.data?.prices || []
    });
  } catch {
    res.status(200).json({
      prices: []
    });
  }
}
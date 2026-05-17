import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

export default async function handler(req, res) {
  try {
    const result = await cachedJson(
      "trending-top-20",
      async () => {
        const json = await fetchJsonWithRetry(
          cgUrl(
            "/coins/markets",
            {
              vs_currency: "usd",
              order: "volume_desc",
              per_page: 20,
              page: 1,
              sparkline: "false",
              price_change_percentage: "1h,24h,7d"
            }
          ),
          {
            headers: cgHeaders(),
            timeoutMs: 6500,
            retries: 2
          }
        );

        return (Array.isArray(json) ? json : []).map((coin) => ({
          id: coin.id || "",
          name: coin.name || "Unknown",
          symbol: coin.symbol || "--",
          image: coin.image || "",
          current_price: coin.current_price ?? null,
          market_cap: coin.market_cap ?? null,
          total_volume: coin.total_volume ?? null,
          price_change_percentage_1h_in_currency:
            coin.price_change_percentage_1h_in_currency ?? 0,
          price_change_percentage_24h_in_currency:
            coin.price_change_percentage_24h_in_currency ?? 0,
          price_change_percentage_7d_in_currency:
            coin.price_change_percentage_7d_in_currency ?? 0
        }));
      },
      {
        ttlMs: 45000,
        staleMs: 600000
      }
    );

    res.status(200).json(result.data || []);
  } catch {
    res.status(200).json([]);
  }
}
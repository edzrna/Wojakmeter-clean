import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

export default async function handler(req, res) {
  try {
    const result = await cachedJson(
      "trending",
      async () => {
        const json = await fetchJsonWithRetry(cgUrl("/search/trending"), {
          headers: cgHeaders(),
          timeoutMs: 6500,
          retries: 2
        });

        return (json?.coins || []).map((entry) => {
          const coin = entry?.item || entry;
          return {
            id: coin.id || coin.coin_id || "",
            name: coin.name || "Unknown",
            symbol: coin.symbol || "--",
            image: coin.large || coin.thumb || coin.small || "",
            price: coin.data?.price ?? null,
            change: Number(coin.data?.price_change_percentage_24h?.usd ?? 0),
            current_price: coin.data?.price ?? null,
            market_cap: null,
            total_volume: null,
            price_change_percentage_1h_in_currency: 0,
            price_change_percentage_24h_in_currency: Number(
              coin.data?.price_change_percentage_24h?.usd ?? 0
            ),
            price_change_percentage_7d_in_currency: 0
          };
        });
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
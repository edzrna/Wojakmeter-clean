import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

export default async function handler(req, res) {
  try {
    const result = await cachedJson(
      "top-coins",
      async () => {
        return await fetchJsonWithRetry(
          cgUrl("/coins/markets", {
            vs_currency: "usd",
            order: "market_cap_desc",
            per_page: 10,
            page: 1,
            sparkline: "false",
            price_change_percentage: "1h,24h,7d"
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
        staleMs: 600000
      }
    );

    const coins = (result.data || []).map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      image: coin.image,
      price: coin.current_price,
      change: Number(coin.price_change_percentage_24h_in_currency ?? 0),
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      total_volume: coin.total_volume,
      price_change_percentage_1h_in_currency: coin.price_change_percentage_1h_in_currency ?? 0,
      price_change_percentage_24h_in_currency: coin.price_change_percentage_24h_in_currency ?? 0,
      price_change_percentage_7d_in_currency: coin.price_change_percentage_7d_in_currency ?? 0
    }));

    res.status(200).json(coins);
  } catch (error) {
    res.status(200).json([]);
  }
}
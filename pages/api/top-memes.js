import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

const MEME_IDS = [
  "dogecoin",
  "shiba-inu",
  "pepe",
  "floki",
  "bonk",
  "dogwifcoin",
  "brett",
  "mog-coin",
  "popcat",
  "book-of-meme"
];

export default async function handler(req, res) {
  try {
    const result = await cachedJson(
      "top-memes",
      async () => {
        return await fetchJsonWithRetry(
          cgUrl("/coins/markets", {
            vs_currency: "usd",
            ids: MEME_IDS.join(","),
            order: "market_cap_desc",
            per_page: MEME_IDS.length,
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
        ttlMs: 60000,
        staleMs: 900000
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
  } catch {
    res.status(200).json([]);
  }
}
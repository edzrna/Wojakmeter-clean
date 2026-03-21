const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

const IDS = [
  "bitcoin",
  "ethereum",
  "solana",
  "ripple",
  "binancecoin",
  "cardano",
  "dogecoin",
  "the-open-network",
  "avalanche-2",
  "tron"
];

export default async function handler(req, res) {
  try {
    const headers = {
      accept: "application/json"
    };

    if (process.env.CG_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.CG_API_KEY;
    }

    const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${IDS.join(",")}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=1h,24h,7d`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: `CoinGecko error: ${response.status} ${text}`
      });
    }

    const coins = await response.json();

    return res.status(200).json({ coins });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unknown error"
    });
  }
}
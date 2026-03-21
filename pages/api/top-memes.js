export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=10&page=1&price_change_percentage=1h,24h,7d"
    );

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
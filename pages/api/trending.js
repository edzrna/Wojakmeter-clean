export default async function handler(req, res) {
  try {
    const trendingRes = await fetch("https://api.coingecko.com/api/v3/search/trending");

    if (!trendingRes.ok) {
      const text = await trendingRes.text();
      return res.status(500).json({
        error: `CoinGecko trending error: ${trendingRes.status} ${text}`
      });
    }

    const trendingData = await trendingRes.json();

    const ids = (trendingData.coins || [])
      .map((c) => c?.item?.id)
      .filter(Boolean)
      .slice(0, 10)
      .join(",");

    if (!ids) {
      return res.status(200).json({ coins: [] });
    }

    const marketsRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=1h,24h,7d`
    );

    if (!marketsRes.ok) {
      const text = await marketsRes.text();
      return res.status(500).json({
        error: `CoinGecko markets error: ${marketsRes.status} ${text}`
      });
    }

    const coins = await marketsRes.json();

    return res.status(200).json({ coins });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unknown error"
    });
  }
}
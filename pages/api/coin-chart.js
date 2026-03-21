function getDaysFromTimeframe(timeframe) {
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
  try {
    const coin = req.query.coin || "bitcoin";
    const timeframe = req.query.timeframe || "1h";

    const days = getDaysFromTimeframe(timeframe);

    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
      coin
    )}/market_chart?vs_currency=usd&days=${days}`;

    const response = await fetch(url, {
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: `CoinGecko error: ${response.status} ${text}`
      });
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.prices)) {
      return res.status(200).json({
        error: "NO_PRICES",
        received: data
      });
    }

    return res.status(200).json({
      prices: data.prices
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unknown error"
    });
  }
}
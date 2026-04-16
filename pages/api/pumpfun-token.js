export default async function handler(req, res) {
  const { ca } = req.query;

  if (!ca) {
    return res.status(400).json({ error: "Missing CA" });
  }

  try {
    const r = await fetch(`https://frontend-api.pump.fun/coins/${ca}`);
    const json = await r.json();

    if (!json) {
      return res.status(200).json(null);
    }

    const price = Number(json.price_usd || 0);
    const marketCap = Number(json.usd_market_cap || 0);
    const volume = Number(json.volume_24h || 0);

    const buys = Number(json.buy_count_24h || 0);
    const sells = Number(json.sell_count_24h || 0);

    const change = Number(json.price_change_24h || 0);

    const response = {
      meta: {
        name: json.name,
        symbol: json.symbol,
        image: json.image_uri,
        source: "Pump.fun"
      },
      price,
      marketCap,
      volume,
      buys,
      sells,
      change,
      lastAction: "Watching...",
      recentTrades: [] // opcional (lo dejamos vacío)
    };

    res.status(200).json(response);
  } catch (err) {
    res.status(200).json(null);
  }
}

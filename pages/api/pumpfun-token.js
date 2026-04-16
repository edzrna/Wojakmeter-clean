export default async function handler(req, res) {
  const { ca } = req.query;

  if (!ca || typeof ca !== "string") {
    return res.status(400).json({ error: "Missing CA" });
  }

  try {
    const r = await fetch(`https://frontend-api.pump.fun/coins/${encodeURIComponent(ca)}`, {
      headers: { accept: "application/json" }
    });

    if (!r.ok) {
      return res.status(200).json({
        error: "Upstream failed",
        price: 0
      });
    }

    const json = await r.json();

    // 🔥 EXTRA SAFE PRICE DETECTION
    const price =
      Number(json?.price_usd) ||
      (json?.usd_market_cap && json?.total_supply
        ? Number(json.usd_market_cap) / Number(json.total_supply)
        : 0) ||
      0;

    const marketCap =
      Number(json?.usd_market_cap) ||
      Number(json?.market_cap) ||
      0;

    const volume =
      Number(json?.volume_24h) ||
      0;

    const buys =
      Number(json?.buy_count_24h) ||
      0;

    const sells =
      Number(json?.sell_count_24h) ||
      0;

    const change =
      Number(json?.price_change_24h) ||
      0;

    return res.status(200).json({
      meta: {
        name: json?.name || "Unknown Token",
        symbol: json?.symbol || "---",
        image: json?.image_uri || "",
        source: "Pump.fun"
      },
      price,
      marketCap,
      volume,
      buys,
      sells,
      change,
      lastAction: buys > sells ? "Buying pressure" : sells > buys ? "Selling pressure" : "Balanced",
      recentTrades: []
    });

  } catch (err) {
    return res.status(200).json({
      meta: {
        name: "Fallback",
        symbol: "TEST",
        image: "",
        source: "fallback"
      },
      price: 0,
      marketCap: 0,
      volume: 0,
      buys: 0,
      sells: 0,
      change: 0,
      lastAction: "No data",
      recentTrades: []
    });
  }
}
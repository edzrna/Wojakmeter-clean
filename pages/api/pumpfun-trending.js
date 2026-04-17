export default async function handler(req, res) {
  try {
    // Endpoint real funcional
    const r = await fetch("https://frontend-api.pump.fun/coins?offset=0&limit=20&sort=volume24h", {
      headers: {
        "accept": "application/json"
      }
    });

    if (!r.ok) {
      return res.status(200).json({ tokens: [] });
    }

    const json = await r.json();

    const tokens = (json || []).map((item) => ({
      address: item.mint,
      mint: item.mint,
      name: item.name || "Token",
      symbol: item.symbol || "---",
      image: item.image_uri || item.image || "",
      volume24h: Number(item.volume_24h || 0),
      marketCap: Number(item.market_cap || 0)
    }));

    return res.status(200).json({
      tokens: tokens.slice(0, 12)
    });

  } catch (e) {
    console.error("TRENDING ERROR:", e);
    return res.status(200).json({ tokens: [] });
  }
}
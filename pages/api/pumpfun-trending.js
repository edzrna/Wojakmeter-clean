export default async function handler(req, res) {
  try {
    // Endpoint público no oficial (puede cambiar)
    const r = await fetch("https://frontend-api.pump.fun/coins");
    const json = await r.json();

    if (!Array.isArray(json)) {
      return res.status(200).json({ tokens: [] });
    }

    const tokens = json
      .slice(0, 10)
      .map((t) => ({
        address: t.mint,
        name: t.name,
        symbol: t.symbol,
        image: t.image_uri,
        volume24h: t.volume_24h,
        marketCap: t.usd_market_cap
      }))
      .filter((t) => t.address);

    res.status(200).json({ tokens });
  } catch (err) {
    res.status(200).json({ tokens: [] });
  }
}

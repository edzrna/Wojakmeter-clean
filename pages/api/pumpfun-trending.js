export default async function handler(req, res) {
  try {
    const r = await fetch("https://frontend-api.pump.fun/coins");
    const json = await r.json();

    if (Array.isArray(json) && json.length > 0) {
      const tokens = json.slice(0, 10).map((t) => ({
        address: t.mint,
        name: t.name,
        symbol: t.symbol,
        image: t.image_uri,
        volume24h: t.volume_24h,
        marketCap: t.usd_market_cap
      }));

      return res.status(200).json({ tokens });
    }

    // 🔥 FALLBACK (esto es lo importante)
    return res.status(200).json({
      tokens: [
        {
          address: "So11111111111111111111111111111111111111112",
          name: "Solana",
          symbol: "SOL",
          image: "https://cryptologos.cc/logos/solana-sol-logo.png",
          volume24h: 0,
          marketCap: 0
        },
        {
          address: "btc",
          name: "Bitcoin",
          symbol: "BTC",
          image: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
          volume24h: 0,
          marketCap: 0
        }
      ]
    });
  } catch (err) {
    return res.status(200).json({
      tokens: [
        {
          address: "fallback",
          name: "Fallback Token",
          symbol: "TEST",
          image: "",
          volume24h: 0,
          marketCap: 0
        }
      ]
    });
  }
}
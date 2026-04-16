export default async function handler(req, res) {
  try {
    const r = await fetch("https://pumpportal.fun/api/data");

    if (!r.ok) {
      return res.status(200).json({ tokens: [] });
    }

    const json = await r.json();

    const list = Array.isArray(json) ? json : [];

    const tokens = list.map((item) => ({
      address: item.mint,
      mint: item.mint,
      name: item.name || "Token",
      symbol: item.symbol || "---",
      image: item.image || "",
      volume24h: Number(item.volumeUsd || 0),
      marketCap: Number(item.marketCapUsd || 0)
    }));

    return res.status(200).json({
      tokens: tokens.slice(0, 12)
    });

  } catch (e) {
    return res.status(200).json({ tokens: [] });
  }
}
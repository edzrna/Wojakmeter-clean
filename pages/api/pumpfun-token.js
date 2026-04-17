export default async function handler(req, res) {
  try {
    const r = await fetch(
      "https://frontend-api.pump.fun/coins?offset=0&limit=20&sort=volume24h",
      {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0"
        }
      }
    );

    if (!r.ok) {
      return res.status(200).json({ tokens: [] });
    }

    const json = await r.json();
    const list = Array.isArray(json) ? json : [];

    const tokens = list
      .map((item) => {
        const address =
          item?.mint ||
          item?.ca ||
          item?.coinMint ||
          item?.address ||
          item?.token_address ||
          "";

        return {
          address,
          mint: address,
          name: item?.name || "Token",
          symbol: item?.symbol || "---",
          image: item?.image_uri || item?.image || item?.imageUrl || "",
          volume24h: Number(item?.volume_24h || item?.volume24h || 0),
          marketCap: Number(item?.usd_market_cap || item?.market_cap || 0)
        };
      })
      .filter((item) => item.address);

    return res.status(200).json({
      tokens: tokens.slice(0, 12)
    });
  } catch (e) {
    console.error("pumpfun-trending error:", e);
    return res.status(200).json({ tokens: [] });
  }
}
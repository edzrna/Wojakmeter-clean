export default async function handler(req, res) {
  try {
    const r = await fetch("https://frontend-api.pump.fun/coins/currently-live", {
      headers: { accept: "application/json" }
    });

    if (!r.ok) {
      return res.status(200).json({ tokens: [] });
    }

    const json = await r.json();
    const list = Array.isArray(json) ? json : Array.isArray(json?.coins) ? json.coins : [];

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
          name: item?.name || "Unknown Token",
          symbol: item?.symbol || "---",
          image:
            item?.image_uri ||
            item?.image ||
            item?.imageUrl ||
            "",
          volume24h:
            Number(item?.volume_24h || item?.volume24h || 0),
          marketCap:
            Number(item?.usd_market_cap || item?.market_cap || 0),
          createdAt:
            item?.created_timestamp || item?.createdAt || 0
        };
      })
      .filter((item) => item.address);

    tokens.sort((a, b) => {
      const volumeDiff = Number(b.volume24h || 0) - Number(a.volume24h || 0);
      if (volumeDiff !== 0) return volumeDiff;
      return Number(b.marketCap || 0) - Number(a.marketCap || 0);
    });

    return res.status(200).json({
      tokens: tokens.slice(0, 12)
    });
  } catch (error) {
    return res.status(200).json({ tokens: [] });
  }
}
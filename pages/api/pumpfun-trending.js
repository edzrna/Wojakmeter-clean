export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    const r = await fetch(
      "https://frontend-api.pump.fun/coins?offset=0&limit=24&sort=volume24h",
      {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0",
          "cache-control": "no-cache"
        }
      }
    );

    if (!r.ok) {
      return res.status(200).json({
        tokens: [],
        debug: {
          ok: false,
          status: r.status,
          statusText: r.statusText
        }
      });
    }

    const json = await r.json();

    const list =
      Array.isArray(json) ? json :
      Array.isArray(json?.coins) ? json.coins :
      Array.isArray(json?.data) ? json.data :
      Array.isArray(json?.tokens) ? json.tokens :
      [];

    const tokens = list
      .map((item) => {
        const address =
          item?.mint ||
          item?.ca ||
          item?.coinMint ||
          item?.address ||
          item?.token_address ||
          "";

        const volume24h =
          Number(item?.volume_24h) ||
          Number(item?.volume24h) ||
          Number(item?.volume) ||
          0;

        const marketCap =
          Number(item?.usd_market_cap) ||
          Number(item?.market_cap) ||
          Number(item?.marketCap) ||
          0;

        return {
          address,
          mint: address,
          name: item?.name || "Token",
          symbol: item?.symbol || "---",
          image:
            item?.image_uri ||
            item?.image ||
            item?.imageUrl ||
            item?.metadata?.image ||
            "",
          volume24h,
          marketCap,
          createdAt:
            item?.created_timestamp ||
            item?.createdAt ||
            item?.created_at ||
            0
        };
      })
      .filter((item) => item.address);

    tokens.sort((a, b) => {
      const volumeDiff = Number(b.volume24h || 0) - Number(a.volume24h || 0);
      if (volumeDiff !== 0) return volumeDiff;

      const marketCapDiff = Number(b.marketCap || 0) - Number(a.marketCap || 0);
      if (marketCapDiff !== 0) return marketCapDiff;

      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    });

    return res.status(200).json({
      tokens: tokens.slice(0, 12),
      debug: {
        ok: true,
        count: tokens.length
      }
    });
  } catch (e) {
    console.error("pumpfun-trending error:", e);

    return res.status(200).json({
      tokens: [],
      debug: {
        ok: false,
        error: String(e?.message || e)
      }
    });
  }
}
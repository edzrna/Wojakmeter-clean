export default async function handler(req, res) {
  try {
    const endpoint = "https://frontend-api.pump.fun/coins/currently-live";

    const r = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0"
      }
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("pumpfun-trending upstream error:", {
        status: r.status,
        statusText: r.statusText,
        body: text.slice(0, 500)
      });

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
      [];

    const tokens = list
      .map((item) => {
        const address =
          item?.mint ||
          item?.ca ||
          item?.coinMint ||
          item?.address ||
          item?.token_address ||
          item?.tokenAddress ||
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
            item?.metadata?.image ||
            "",
          volume24h: Number(
            item?.volume_24h ||
            item?.volume24h ||
            item?.volume ||
            0
          ),
          marketCap: Number(
            item?.usd_market_cap ||
            item?.market_cap ||
            item?.marketCap ||
            0
          ),
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
      return Number(b.marketCap || 0) - Number(a.marketCap || 0);
    });

    return res.status(200).json({
      tokens: tokens.slice(0, 12),
      debug: {
        ok: true,
        count: tokens.length
      }
    });
  } catch (error) {
    console.error("pumpfun-trending handler error:", error);

    return res.status(200).json({
      tokens: [],
      debug: {
        ok: false,
        error: String(error?.message || error)
      }
    });
  }
}
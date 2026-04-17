export default async function handler(req, res) {
  const { address } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Missing address" });
  }

  const tokenAddress = String(address).trim();

  async function fromDexScreener() {
    try {
      const url = `https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(tokenAddress)}`;

      const r = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0"
        }
      });

      if (!r.ok) return null;

      const json = await r.json();
      const pairs = Array.isArray(json) ? json : [];
      if (!pairs.length) return null;

      const best = pairs
        .map((pair) => {
          const liquidityUsd = Number(pair?.liquidity?.usd || 0);
          const volume24h = Number(pair?.volume?.h24 || 0);
          const txns24h =
            Number(pair?.txns?.h24?.buys || 0) +
            Number(pair?.txns?.h24?.sells || 0);

          return {
            ...pair,
            __score: liquidityUsd * 0.55 + volume24h * 0.35 + txns24h * 8
          };
        })
        .sort((a, b) => b.__score - a.__score)[0];

      if (!best) return null;

      const buys = Number(best?.txns?.h24?.buys || 0);
      const sells = Number(best?.txns?.h24?.sells || 0);
      const price = Number(best?.priceUsd || 0);
      const marketCap =
        Number(best?.marketCap || 0) ||
        Number(best?.fdv || 0) ||
        0;
      const volume = Number(best?.volume?.h24 || 0);
      const change = Number(best?.priceChange?.h24 || 0);

      return {
        source: "dexscreener",
        meta: {
          name: best?.baseToken?.name || "Unknown Token",
          symbol: best?.baseToken?.symbol || "---",
          image: best?.info?.imageUrl || "",
          source: "DexScreener"
        },
        price: Number.isFinite(price) ? price : 0,
        marketCap: Number.isFinite(marketCap) ? marketCap : 0,
        volume: Number.isFinite(volume) ? volume : 0,
        buys: Number.isFinite(buys) ? buys : 0,
        sells: Number.isFinite(sells) ? sells : 0,
        change: Number.isFinite(change) ? change : 0,
        lastAction:
          buys > sells
            ? "Buying pressure"
            : sells > buys
              ? "Selling pressure"
              : "Balanced"
      };
    } catch (error) {
      console.error("token-data DexScreener error:", error);
      return null;
    }
  }

  async function fromPumpFun() {
    try {
      const endpoint = `https://frontend-api.pump.fun/coins/${encodeURIComponent(tokenAddress)}`;

      const r = await fetch(endpoint, {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0",
          "cache-control": "no-cache"
        }
      });

      if (!r.ok) return null;

      const json = await r.json();

      const totalSupply =
        Number(json?.total_supply) ||
        Number(json?.supply) ||
        Number(json?.token_supply) ||
        0;

      const marketCap =
        Number(json?.usd_market_cap) ||
        Number(json?.market_cap) ||
        0;

      const rawPrice =
        Number(json?.price_usd) ||
        Number(json?.priceUsd) ||
        Number(json?.price) ||
        ((marketCap > 0 && total
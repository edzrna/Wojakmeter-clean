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
      console.error("token-market DexScreener error:", error);
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
        Number(json?.marketCap) ||
        0;

      const rawPrice =
        Number(json?.price_usd) ||
        Number(json?.priceUsd) ||
        Number(json?.price) ||
        ((marketCap > 0 && totalSupply > 0) ? marketCap / totalSupply : 0) ||
        0;

      const volume =
        Number(json?.volume_24h) ||
        Number(json?.volume24h) ||
        Number(json?.volume) ||
        0;

      const buys =
        Number(json?.buy_count_24h) ||
        Number(json?.buys) ||
        0;

      const sells =
        Number(json?.sell_count_24h) ||
        Number(json?.sells) ||
        0;

      const change =
        Number(json?.price_change_24h) ||
        Number(json?.change_24h) ||
        0;

      return {
        source: "pumpfun",
        meta: {
          name: json?.name || "Unknown Token",
          symbol: json?.symbol || "---",
          image: json?.image_uri || json?.image || "",
          source: "Pump.fun"
        },
        price: Number.isFinite(rawPrice) ? rawPrice : 0,
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
      console.error("token-market Pump.fun error:", error);
      return null;
    }
  }

  const dex = await fromDexScreener();
  if (dex) {
    return res.status(200).json(dex);
  }

  const pump = await fromPumpFun();
  if (pump) {
    return res.status(200).json(pump);
  }

  return res.status(200).json({
    source: "none",
    error: "Failed to load token data",
    meta: {
      name: "Unavailable",
      symbol: "---",
      image: "",
      source: "Unavailable"
    },
    price: 0,
    marketCap: 0,
    volume: 0,
    buys: 0,
    sells: 0,
    change: 0,
    lastAction: "No data"
  });
}
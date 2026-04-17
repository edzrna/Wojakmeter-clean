export default async function ha0t { address } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Missing address" });
  }

  const tokenAddress = String(address).trim();

  const fallbackResponse = () =>
    res.status(200).json({
      ok: false,
      source: "none",
      token: null,
      pair: null
    });

  async function tryDexScreener() {
    try {
      const dexUrl = `https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(tokenAddress)}`;
      const r = await fetch(dexUrl, {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0"
        }
      });

      if (!r.ok) return null;

      const json = await r.json();
      const pairs = Array.isArray(json) ? json : [];

      if (!pairs.length) return null;

      const scored = pairs
        .map((pair) => {
          const liquidityUsd = Number(pair?.liquidity?.usd || 0);
          const volume24h = Number(pair?.volume?.h24 || 0);
          const txns24h =
            Number(pair?.txns?.h24?.buys || 0) + Number(pair?.txns?.h24?.sells || 0);

          return {
            ...pair,
            __score: liquidityUsd * 0.55 + volume24h * 0.35 + txns24h * 8
          };
        })
        .sort((a, b) => b.__score - a.__score);

      const best = scored[0];

      return {
        ok: true,
        source: "dexscreener",
        token: {
          chainId: best?.chainId || "solana",
          address:
            best?.baseToken?.address === tokenAddress
              ? best?.baseToken?.address
              : tokenAddress,
          name: best?.baseToken?.name || "Unknown Token",
          symbol: best?.baseToken?.symbol || "---",
          image: best?.info?.imageUrl || "",
          url: best?.url || ""
        },
        pair: {
          chainId: best?.chainId || "solana",
          dexId: best?.dexId || "",
          pairAddress: best?.pairAddress || "",
          priceUsd: Number(best?.priceUsd || 0),
          liquidityUsd: Number(best?.liquidity?.usd || 0),
          marketCap: Number(best?.marketCap || 0),
          fdv: Number(best?.fdv || 0),
          volume24h: Number(best?.volume?.h24 || 0)
        }
      };
    } catch {
      return null;
    }
  }

  async function tryPumpFun() {
    try {
      const pumpUrl = `https://frontend-api.pump.fun/coins/${encodeURIComponent(tokenAddress)}`;
      const r = await fetch(pumpUrl, {
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

      const priceUsd =
        Number(json?.price_usd) ||
        (marketCap > 0 && totalSupply > 0 ? marketCap / totalSupply : 0) ||
        0;

      return {
        ok: true,
        source: "pumpfun",
        token: {
          chainId: "solana",
          address: tokenAddress,
          name: json?.name || "Unknown Token",
          symbol: json?.symbol || "---",
          image: json?.image_uri || json?.image || "",
          url: ""
        },
        pair: {
          chainId: "solana",
          dexId: "pumpfun",
          pairAddress: tokenAddress,
          priceUsd,
          liquidityUsd: 0,
          marketCap,
          fdv: 0,
          volume24h:
            Number(json?.volume_24h) ||
            Number(json?.volume24h) ||
            Number(json?.volume) ||
            0
        }
      };
    } catch {
      return null;
    }
  }

  const dex = await tryDexScreener();
  if (dex?.ok) return res.status(200).json(dex);

  const pump = await tryPumpFun();
  if (pump?.ok) return res.status(200).json(pump);

  return fallbackResponse();
}
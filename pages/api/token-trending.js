export default async function handler(req, res) {
  async function fromDexScreener() {
    try {
      const r = await fetch("https://api.dexscreener.com/token-boosts/latest/v1", {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0"
        }
      });

      if (!r.ok) return null;

      const json = await r.json();
      const list = Array.isArray(json) ? json : [];
      if (!list.length) return null;

      const tokens = list
        .map((item) => {
          const address =
            item?.tokenAddress ||
            item?.address ||
            item?.mint ||
            "";

          return {
            address,
            mint: address,
            name: item?.description || item?.name || "Trending Token",
            symbol: item?.symbol || "---",
            image: item?.icon || item?.image || "",
            chainId: item?.chainId || "solana",
            source: "dexscreener_boosts",
            rankScore:
              Number(item?.amount || 0) * 1.2 +
              Number(item?.totalAmount || 0)
          };
        })
        .filter((item) => item.address && item.chainId === "solana")
        .sort((a, b) => b.rankScore - a.rankScore)
        .slice(0, 12);

      if (!tokens.length) return null;

      return tokens;
    } catch {
      return null;
    }
  }

  async function fromDexSearch() {
    try {
      const searchTerms = ["meme", "solana", "pump"];
      const collected = [];

      for (const term of searchTerms) {
        const r = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(term)}`,
          {
            headers: {
              accept: "application/json",
              "user-agent": "Mozilla/5.0"
            }
          }
        );

        if (!r.ok) continue;

        const json = await r.json();
        const pairs = Array.isArray(json?.pairs) ? json.pairs : [];

        collected.push(
          ...pairs.map((pair) => {
            const address = pair?.baseToken?.address || "";

            return {
              address,
              mint: address,
              name: pair?.baseToken?.name || "Trending Token",
              symbol: pair?.baseToken?.symbol || "---",
              image: pair?.info?.imageUrl || "",
              chainId: pair?.chainId || "",
              source: "dexscreener_search",
              rankScore:
                Number(pair?.liquidity?.usd || 0) * 0.55 +
                Number(pair?.volume?.h24 || 0) * 0.35 +
                (
                  Number(pair?.txns?.h24?.buys || 0) +
                  Number(pair?.txns?.h24?.sells || 0)
                ) * 8
            };
          })
        );
      }

      const deduped = [];
      const seen = new Set();

      for (const item of collected) {
        if (!item.address || item.chainId !== "solana") continue;
        if (seen.has(item.address)) continue;
        seen.add(item.address);
        deduped.push(item);
      }

      deduped.sort((a, b) => b.rankScore - a.rankScore);

      return deduped.slice(0, 12);
    } catch {
      return null;
    }
  }

  async function fromPumpFun() {
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

      if (!r.ok) return null;

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
            chainId: "solana",
            source: "pumpfun",
            rankScore:
              Number(item?.volume_24h || item?.volume24h || 0) * 0.7 +
              Number(item?.usd_market_cap || item?.market_cap || 0) * 0.3
          };
        })
        .filter((item) => item.address)
        .sort((a, b) => b.rankScore - a.rankScore)
        .slice(0, 12);

      if (!tokens.length) return null;

      return tokens;
    } catch {
      return null;
    }
  }

  const dexBoosts = await fromDexScreener();
  if (dexBoosts?.length) {
    return res.status(200).json({
      source: "dexscreener_boosts",
      tokens: dexBoosts
    });
  }

  const dexSearch = await fromDexSearch();
  if (dexSearch?.length) {
    return res.status(200).json({
      source: "dexscreener_search",
      tokens: dexSearch
    });
  }

  const pump = await fromPumpFun();
  if (pump?.length) {
    return res.status(200).json({
      source: "pumpfun",
      tokens: pump
    });
  }

  return res.status(200).json({
    source: "none",
    tokens: []
  });
}
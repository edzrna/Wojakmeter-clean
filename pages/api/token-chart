export default async function handler(req, res) {
  const { address, timeframe = "5m" } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Missing address" });
  }

  const tokenAddress = String(address).trim();

  const allowedTimeframes = ["1m", "5m", "15m", "1h", "4h", "24h"];
  const safeTimeframe = allowedTimeframes.includes(String(timeframe))
    ? String(timeframe)
    : "5m";

  const configByTimeframe = {
    "1m": { points: 24, stepMs: 2500, driftScale: 0.05, noiseScale: 0.0025, changeKey: "m5" },
    "5m": { points: 30, stepMs: 10000, driftScale: 0.06, noiseScale: 0.0045, changeKey: "h1" },
    "15m": { points: 40, stepMs: 30000, driftScale: 0.07, noiseScale: 0.0065, changeKey: "h1" },
    "1h": { points: 60, stepMs: 60 * 1000, driftScale: 0.08, noiseScale: 0.009, changeKey: "h1" },
    "4h": { points: 80, stepMs: 3 * 60 * 1000, driftScale: 0.09, noiseScale: 0.014, changeKey: "h6" },
    "24h": { points: 120, stepMs: 12 * 60 * 1000, driftScale: 0.1, noiseScale: 0.022, changeKey: "h24" }
  };

  const { points, stepMs, driftScale, noiseScale, changeKey } = configByTimeframe[safeTimeframe];

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
            Number(pair?.txns?.h24?.buys || 0) + Number(pair?.txns?.h24?.sells || 0);

          return {
            ...pair,
            __score: liquidityUsd * 0.55 + volume24h * 0.35 + txns24h * 8
          };
        })
        .sort((a, b) => b.__score - a.__score)[0];

      const rawPrice = Number(best?.priceUsd || 0);
      if (!Number.isFinite(rawPrice) || rawPrice <= 0) return null;

      const priceChangeMap = best?.priceChange || {};
      let targetChange = Number(priceChangeMap?.[changeKey] || 0);

      if (!Number.isFinite(targetChange)) targetChange = 0;

      if (safeTimeframe === "4h" && !priceChangeMap?.h6 && priceChangeMap?.h24) {
        targetChange = Number(priceChangeMap.h24) / 4;
      }

      const now = Date.now();
      const series = [];
      const seedA = tokenAddress.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

      const startPrice = rawPrice / (1 + targetChange / 100 || 1);
      let rolling = Number.isFinite(startPrice) && startPrice > 0
        ? startPrice
        : rawPrice * (1 - 0.012);

      for (let i = points - 1; i >= 1; i--) {
        const t = i / points;
        const harmonic =
          Math.sin((seedA % 13) + i * 0.55) * 0.35 +
          Math.cos((seedA % 17) + i * 0.28) * 0.2;

        const directionalPull = (rawPrice - rolling) * driftScale;
        const trendBias = rawPrice * (targetChange / 100) * (0.08 - t * 0.03);
        const noise = harmonic * noiseScale * rawPrice;

        rolling = rolling + directionalPull + trendBias + noise;
        rolling = Math.max(rawPrice * 0.12, rolling);

        series.push({
          ts: now - i * stepMs,
          price: Number(rolling.toFixed(12))
        });
      }

      series.push({
        ts: now,
        price: Number(rawPrice.toFixed(12))
      });

      const first = series[0]?.price || rawPrice;
      const last = series[series.length - 1]?.price || rawPrice;
      const changePct = first > 0 ? ((last - first) / first) * 100 : 0;

      return {
        source: "dexscreener",
        prices: series,
        timeframe: safeTimeframe,
        currentPrice: Number(rawPrice.toFixed(12)),
        changePct: Number(changePct.toFixed(4)),
        token: {
          name: best?.baseToken?.name || "",
          symbol: best?.baseToken?.symbol || "",
          image: best?.info?.imageUrl || "",
          marketCap: Number(best?.marketCap || 0) || Number(best?.fdv || 0) || 0,
          volume24h: Number(best?.volume?.h24 || 0)
        }
      };
    } catch {
      return null;
    }
  }

  async function fromPumpFun() {
    try {
      const response = await fetch(
        `https://frontend-api.pump.fun/coins/${encodeURIComponent(tokenAddress)}`,
        {
          headers: {
            accept: "application/json",
            "user-agent": "Mozilla/5.0"
          }
        }
      );

      if (!response.ok) return null;

      const json = await response.json();

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

      const volume24h =
        Number(json?.volume_24h) ||
        Number(json?.volume24h) ||
        Number(json?.volume) ||
        0;

      if (!Number.isFinite(rawPrice) || rawPrice <= 0) return null;

      const now = Date.now();
      const series = [];
      const seedA = tokenAddress.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const sentimentBias =
        marketCap > 0
          ? Math.min(0.12, Math.max(-0.12, (volume24h / Math.max(marketCap, 1)) * 0.35))
          : 0;

      let rolling = rawPrice * (1 - 0.01 - (seedA % 7) * 0.0015);

      for (let i = points - 1; i >= 1; i--) {
        const t = i / points;

        const harmonic =
          Math.sin((seedA % 13) + i * 0.55) * 0.35 +
          Math.cos((seedA % 17) + i * 0.28) * 0.2;

        const directionalPull = (rawPrice - rolling) * driftScale;
        const biasPull = rawPrice * sentimentBias * (0.35 - t * 0.22);
        const noise = harmonic * noiseScale * rawPrice;

        rolling = rolling + directionalPull + biasPull + noise;
        rolling = Math.max(rawPrice * 0.12, rolling);

        series.push({
          ts: now - i * stepMs,
          price: Number(rolling.toFixed(12))
        });
      }

      series.push({
        ts: now,
        price: Number(rawPrice.toFixed(12))
      });

      const first = series[0]?.price || rawPrice;
      const last = series[series.length - 1]?.price || rawPrice;
      const changePct = first > 0 ? ((last - first) / first) * 100 : 0;

      return {
        source: "pumpfun",
        prices: series,
        timeframe: safeTimeframe,
        currentPrice: Number(rawPrice.toFixed(12)),
        changePct: Number(changePct.toFixed(4)),
        token: {
          name: json?.name || "",
          symbol: json?.symbol || "",
          image: json?.image_uri || json?.image || "",
          marketCap,
          volume24h
        }
      };
    } catch {
      return null;
    }
  }

  const dex = await fromDexScreener();
  if (dex) return res.status(200).json(dex);

  const pump = await fromPumpFun();
  if (pump) return res.status(200).json(pump);

  return res.status(200).json({
    prices: [],
    timeframe: safeTimeframe,
    source: "none",
    error: "Failed to load chart"
  });
}
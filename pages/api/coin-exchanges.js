import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function roundScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.round(clamp(n, 0, 100));
}

function getPairMood(score) {
  if (score >= 85) return { key: "euphoria", name: "Euphoria" };
  if (score >= 70) return { key: "content", name: "Content" };
  if (score >= 60) return { key: "optimism", name: "Optimism" };
  if (score >= 45) return { key: "neutral", name: "Neutral" };
  if (score >= 35) return { key: "doubt", name: "Doubt" };
  if (score >= 20) return { key: "concern", name: "Concern" };
  return { key: "frustration", name: "Frustration" };
}

function scorePair(ticker) {
  const trust = ticker.trust_score === "green" ? 18 : ticker.trust_score === "yellow" ? 8 : -6;
  const volume = Number(ticker.volume || 0);
  const bidAsk = Number(ticker.bid_ask_spread_percentage || 0);

  let score = 50 + trust;

  if (volume >= 1000000) score += 12;
  else if (volume >= 250000) score += 8;
  else if (volume >= 50000) score += 4;

  if (bidAsk <= 0.1) score += 8;
  else if (bidAsk <= 0.5) score += 4;
  else if (bidAsk >= 2) score -= 8;

  return roundScore(score);
}

export default async function handler(req, res) {
  try {
    const coin = String(req.query.coin || "bitcoin").toLowerCase();

    const result = await cachedJson(
      `coin-exchanges-${coin}`,
      async () => {
        return await fetchJsonWithRetry(
          cgUrl(`/coins/${encodeURIComponent(coin)}/tickers`, {
            include_exchange_logo: "true",
            depth: "false"
          }),
          {
            headers: cgHeaders(),
            timeoutMs: 8000,
            retries: 2
          }
        );
      },
      {
        ttlMs: 60000,
        staleMs: 900000
      }
    );

    const tickers = Array.isArray(result.data?.tickers) ? result.data.tickers : [];

    const pairs = tickers
      .filter((t) => t.market?.name && t.trade_url)
      .slice(0, 12)
      .map((t) => {
        const score = scorePair(t);
        const mood = getPairMood(score);

        return {
          exchange: t.market?.name || "Exchange",
          exchangeLogo: t.market?.logo || "",
          base: t.base || "",
          target: t.target || "",
          pair: `${t.base || ""}/${t.target || ""}`,
          lastPrice: t.last || null,
          volume: t.volume || 0,
          trustScore: t.trust_score || "unknown",
          spread: t.bid_ask_spread_percentage ?? null,
          tradeUrl: t.trade_url || "",
          score,
          mood
        };
      });

    res.status(200).json(pairs);
  } catch {
    res.status(200).json([]);
  }
}
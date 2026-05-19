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

function normalizeTrustScore(trustScore) {
  if (trustScore === "green") return 10;
  if (trustScore === "yellow") return 6;
  if (trustScore === "red") return 3;
  return 5;
}

function scorePair(ticker) {
  const volume = Number(
    ticker.converted_volume?.usd ||
    ticker.volume ||
    0
  );

  const spread = Number(ticker.bid_ask_spread_percentage || 0);
  const trust = normalizeTrustScore(ticker.trust_score);

  let score = 42;

  score += trust * 2;

  if (volume >= 100000000) score += 18;
  else if (volume >= 50000000) score += 14;
  else if (volume >= 10000000) score += 10;
  else if (volume >= 1000000) score += 6;
  else if (volume >= 100000) score += 3;
  else score -= 4;

  if (spread > 0 && spread <= 0.1) score += 6;
  else if (spread > 0 && spread <= 0.5) score += 3;
  else if (spread >= 2) score -= 6;

  return roundScore(clamp(score, 20, 88));
}

export default async function handler(req, res) {
  try {
    const coin = String(req.query.coin || "bitcoin").toLowerCase();

    const result = await cachedJson(
      `coin-exchanges-v2-${coin}`,
      async () => {
        return await fetchJsonWithRetry(
          cgUrl(`/coins/${encodeURIComponent(coin)}/tickers`, {
            include_exchange_logo: "true",
            depth: "false"
          }),
          {
            headers: cgHeaders(),
            timeoutMs: 12000,
            retries: 3
          }
        );
      },
      {
        ttlMs: 60000,
        staleMs: 900000
      }
    );

    const tickers = Array.isArray(result.data?.tickers)
      ? result.data.tickers
      : [];

    const pairs = tickers
      .filter((t) => t.market?.name && t.trade_url)
      .slice(0, 12)
      .map((t) => {
        const volume = Number(
          t.converted_volume?.usd ||
          t.volume ||
          0
        );

        const trustScore = normalizeTrustScore(t.trust_score);
        const score = scorePair(t);
        const mood = getPairMood(score);

        return {
          exchange: t.market?.name || "Exchange",
          exchangeLogo: t.market?.logo || "",
          base: t.base || "",
          target: t.target || "",
          pair: `${t.base || ""}/${t.target || ""}`,
          lastPrice: t.last || null,
          volume,
          trustScore,
          trustLabel: t.trust_score || "unknown",
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
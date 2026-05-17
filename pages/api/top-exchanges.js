import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function roundScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.round(clamp(n, 0, 100));
}

function getExchangeMood(score) {
  if (score >= 85) return { key: "euphoria", name: "Euphoria" };
  if (score >= 70) return { key: "content", name: "Content" };
  if (score >= 60) return { key: "optimism", name: "Optimism" };
  if (score >= 45) return { key: "neutral", name: "Neutral" };
  if (score >= 35) return { key: "doubt", name: "Doubt" };
  if (score >= 20) return { key: "concern", name: "Concern" };
  return { key: "frustration", name: "Frustration" };
}

function scoreExchange(exchange) {
  const trust = Number(exchange.trust_score || 0);
  const rank = Number(exchange.trust_score_rank || 999);
  const volume = Number(exchange.trade_volume_24h_btc || 0);

  let score = 50;

  score += trust * 4;
  if (rank <= 5) score += 15;
  else if (rank <= 10) score += 10;
  else if (rank <= 20) score += 5;

  if (volume >= 100000) score += 10;
  else if (volume >= 50000) score += 6;
  else if (volume >= 10000) score += 3;

  return roundScore(score);
}

export default async function handler(req, res) {
  try {
    const result = await cachedJson(
      "top-exchanges-10",
      async () => {
        return await fetchJsonWithRetry(
          cgUrl("/exchanges", {
            per_page: 10,
            page: 1
          }),
          {
            headers: cgHeaders(),
            timeoutMs: 7000,
            retries: 2
          }
        );
      },
      {
        ttlMs: 60000,
        staleMs: 900000
      }
    );

    const exchanges = (result.data || []).map((ex) => {
      const score = scoreExchange(ex);
      const mood = getExchangeMood(score);

      return {
        id: ex.id,
        name: ex.name,
        image: ex.image,
        country: ex.country || "Global",
        yearEstablished: ex.year_established || null,
        trustScore: ex.trust_score || 0,
        trustRank: ex.trust_score_rank || null,
        volumeBtc24h: ex.trade_volume_24h_btc || 0,
        url: ex.url || "",
        score,
        mood
      };
    });

    res.status(200).json(exchanges);
  } catch {
    res.status(200).json([]);
  }
}
import { cachedJson, fetchJsonWithRetry } from "../../lib/data-proxy";

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function classifyNews(headlines = []) {
  let score = 50;

  headlines.slice(0, 12).forEach((h) => {
    const title = String(h?.title || "").toLowerCase();

    if (title.includes("etf")) score += 6;
    if (title.includes("institution")) score += 5;
    if (title.includes("adoption")) score += 4;
    if (title.includes("rate cut")) score += 5;

    if (title.includes("hack")) score -= 10;
    if (title.includes("exploit")) score -= 10;
    if (title.includes("ban")) score -= 7;
    if (title.includes("regulation")) score -= 5;
    if (title.includes("war")) score -= 7;
    if (title.includes("rate hike")) score -= 5;
  });

  score = clamp(score, 0, 100);

  let signal = "neutral";
  if (score > 60) signal = "bullish";
  if (score < 40) signal = "bearish";

  return { score, signal };
}

function moodFromScore(score) {
  if (score >= 85) return "euphoria";
  if (score >= 70) return "content";
  if (score >= 60) return "optimism";
  if (score >= 45) return "neutral";
  if (score >= 35) return "doubt";
  if (score >= 20) return "concern";
  return "frustration";
}

function computeDriverScore(driverLabel) {
  const label = String(driverLabel || "").toLowerCase();

  if (label.includes("etf")) return 72;
  if (label.includes("institutional")) return 72;
  if (label.includes("rate cut")) return 64;
  if (label.includes("market flow")) return 50;
  if (label.includes("neutral macro")) return 50;
  if (label.includes("regulation")) return 35;
  if (label.includes("hack")) return 25;
  if (label.includes("insolvency")) return 25;
  if (label.includes("war")) return 28;
  if (label.includes("rate hike")) return 38;

  return 50;
}

function computeCompositeScore({ fearGreed, socialScore, driverScore }) {
  return Math.round(
    clamp(
      Number(fearGreed || 50) * 0.5 +
        Number(socialScore || 50) * 0.3 +
        Number(driverScore || 50) * 0.2,
      0,
      100
    )
  );
}

async function getFearGreed() {
  try {
    const json = await fetchJsonWithRetry(
      "https://api.alternative.me/fng/?limit=1&format=json",
      {
        timeoutMs: 5000,
        retries: 1
      }
    );

    const value = Number(json?.data?.[0]?.value || 50);
    return clamp(value, 0, 100);
  } catch {
    return 50;
  }
}

async function getNews() {
  const token = process.env.CRYPTOPANIC_TOKEN;

  if (!token) {
    return { headlines: [], score: 50, signal: "neutral" };
  }

  try {
    const json = await fetchJsonWithRetry(
      `https://cryptopanic.com/api/v1/posts/?auth_token=${encodeURIComponent(token)}&public=true&kind=news`,
      {
        timeoutMs: 6000,
        retries: 1
      }
    );

    const headlines = (json?.results || []).map((x) => ({
      title: x?.title || ""
    }));

    const classified = classifyNews(headlines);

    return {
      headlines,
      score: classified.score,
      signal: classified.signal
    };
  } catch {
    return { headlines: [], score: 50, signal: "neutral" };
  }
}

export default async function handler(req, res) {
  try {
    const result = await cachedJson(
      "sentiment",
      async () => {
        const [fearGreed, news] = await Promise.all([getFearGreed(), getNews()]);

        const driver =
          news.score < 35
            ? "Crypto hack / insolvency"
            : news.score < 43
              ? "Regulation crackdown"
              : news.score > 62
                ? "ETF / institutional adoption"
                : "Market flow / price action";

        const risk =
          fearGreed > 65
            ? "Risk-on"
            : fearGreed < 35
              ? "Defensive"
              : "Balanced";

        const narrative =
          news.score < 35
            ? "Negative headlines are damaging confidence quickly."
            : news.score > 62
              ? "Positive adoption-style headlines are supporting market confidence."
              : "Price action is leading sentiment with no major macro override.";

        const socialScore = Number(news.score || 50);
        const driverScore = computeDriverScore(driver);
        const score = computeCompositeScore({
          fearGreed,
          socialScore,
          driverScore
        });

        return {
          fearGreed,
          newsScore: socialScore,
          newsSignal: news.signal,

          socialScore,
          socialMood: moodFromScore(socialScore),

          driver,
          driverScore,
          driverMood: moodFromScore(driverScore),

          risk,
          narrative,

          score,
          mood: moodFromScore(score),

          headlinesCount: Array.isArray(news.headlines) ? news.headlines.length : 0
        };
      },
      {
        ttlMs: 60000,
        staleMs: 1200000
      }
    );

    res.status(200).json(result.data);
  } catch {
    const socialScore = 50;
    const driver = "Market flow / price action";
    const driverScore = 50;
    const fearGreed = 50;
    const score = 50;

    res.status(200).json({
      fearGreed,
      newsScore: socialScore,
      newsSignal: "neutral",

      socialScore,
      socialMood: "neutral",

      driver,
      driverScore,
      driverMood: "neutral",

      risk: "Balanced",
      narrative: "Price action is leading sentiment with no major macro override.",

      score,
      mood: "neutral",

      headlinesCount: 0
    });
  }
}
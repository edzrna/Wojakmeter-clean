import { cachedJson, fetchJsonWithRetry } from "../../lib/data-proxy";

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

score = Math.max(0, Math.min(100, score));

let signal = "neutral";
if (score > 60) signal = "bullish";
if (score < 40) signal = "bearish";

return { score, signal };
}

async function getFearGreed() {
try {
const json = await fetchJsonWithRetry("https://api.alternative.me/fng/?limit=1&format=json", {
timeoutMs: 5000,
retries: 1
});

const value = Number(json?.data?.[0]?.value || 50);  
return Math.max(0, Math.min(100, value));

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
https://cryptopanic.com/api/v1/posts/?auth_token=${encodeURIComponent(token)}&public=true&kind=news,
{
timeoutMs: 6000,
retries: 1
}
);

const headlines = (json?.results || []).map((x) => ({ title: x?.title || "" }));  
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
      fearGreed > 65 ? "Risk-on" :  
      fearGreed < 35 ? "Defensive" :  
      "Balanced";  

    const narrative =  
      news.score < 35  
        ? "Negative headlines are damaging confidence quickly."  
        : news.score > 62  
          ? "Positive adoption-style headlines are supporting market confidence."  
          : "Price action is leading sentiment with no major macro override.";  

    return {  
      fearGreed,  
      newsScore: news.score,  
      newsSignal: news.signal,  
      driver,  
      risk,  
      narrative  
    };  
  },  
  {  
    ttlMs: 60000,  
    staleMs: 1200000  
  }  
);  

res.status(200).json(result.data);

} catch {
res.status(200).json({
fearGreed: 50,
newsScore: 50,
newsSignal: "neutral",
driver: "Market flow / price action",
risk: "Balanced",
narrative: "Price action is leading sentiment with no major macro override."
});
}
}
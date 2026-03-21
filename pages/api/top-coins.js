const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

const IDS = [
  "bitcoin",
  "ethereum",
  "solana",
  "ripple",
  "binancecoin",
  "cardano",
  "dogecoin",
  "the-open-network",
  "avalanche-2",
  "tron"
];

export async function GET() {
  try {
    const headers = {
      accept: "application/json"
    };

    if (process.env.CG_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.CG_API_KEY;
    }

    const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${IDS.join(",")}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=1h,24h,7d`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({ error: `CoinGecko error: ${response.status} ${text}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const coins = await response.json();

    return new Response(JSON.stringify({ coins }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
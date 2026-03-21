const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function GET() {
  try {
    const headers = {
      accept: "application/json"
    };

    if (process.env.CG_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.CG_API_KEY;
    }

    const response = await fetch(`${COINGECKO_BASE}/global`, { headers });

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          error: `CoinGecko error: ${response.status} ${text || "Request failed"}`
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const json = await response.json();

    return new Response(
      JSON.stringify({
        data: json.data
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
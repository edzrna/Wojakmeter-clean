const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export default async function handler(req, res) {
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
      return res.status(500).json({
        error: `CoinGecko error: ${response.status} ${text || "Request failed"}`
      });
    }

    const json = await response.json();

    return res.status(200).json({
      data: json.data
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unknown error"
    });
  }
}
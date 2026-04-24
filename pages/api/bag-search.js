const CG_BASE = "https://api.coingecko.com/api/v3";

export default async function handler(req, res) {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({ results: [] });
  }

  try {
    const headers = {
      accept: "application/json"
    };

    if (process.env.COINGECKO_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
    }

    const searchUrl = `${CG_BASE}/search?query=${encodeURIComponent(q)}`;
    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();

    const coins = Array.isArray(searchData?.coins) ? searchData.coins.slice(0, 10) : [];

    const results = coins.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.large || coin.thumb || "",
      source: "CoinGecko",
      network: "",
      contract: ""
    }));

    return res.status(200).json({ results });
  } catch (error) {
    console.error("bag-search error:", error);
    return res.status(200).json({ results: [] });
  }
}

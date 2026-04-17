export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const { ca } = req.query;

  if (!ca || typeof ca !== "string") {
    return res.status(400).json({ error: "Missing CA" });
  }

  try {
    const endpoint = `https://frontend-api.pump.fun/coins/${encodeURIComponent(ca)}`;

    const r = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
        "cache-control": "no-cache"
      }
    });

    if (!r.ok) {
      return res.status(200).json({
        error: "Upstream failed",
        price: 0,
        marketCap: 0,
        volume: 0,
        buys: 0,
        sells: 0,
        change: 0,
        lastAction: "No data",
        recentTrades: [],
        meta: {
          name: "Unavailable",
          symbol: "---",
          image: "",
          source: "Pump.fun"
        },
        debug: {
          ok: false,
          status: r.status,
          statusText: r.statusText
        }
      });
    }

    const json = await r.json();

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

    const price =
      Number(json?.price_usd) ||
      Number(json?.priceUsd) ||
      Number(json?.price) ||
      ((marketCap > 0 && totalSupply > 0) ? marketCap / totalSupply : 0) ||
      0;

    const volume =
      Number(json?.volume_24h) ||
      Number(json?.volume24h) ||
      Number(json?.volume) ||
      0;

    const buys =
      Number(json?.buy_count_24h) ||
      Number(json?.buys) ||
      Number(json?.buyCount24h) ||
      0;

    const sells =
      Number(json?.sell_count_24h) ||
      Number(json?.sells) ||
      Number(json?.sellCount24h) ||
      0;

    const change =
      Number(json?.price_change_24h) ||
      Number(json?.change24h) ||
      Number(json?.change) ||
      0;

    const meta = {
      name: json?.name || "Unknown Token",
      symbol: json?.symbol || "---",
      image:
        json?.image_uri ||
        json?.image ||
        json?.imageUrl ||
        json?.metadata?.image ||
        "",
      source: "Pump.fun"
    };

    let lastAction = "Balanced";

    if (buys > sells) {
      lastAction = buys - sells >= 5 ? "Strong buy pressure" : "Buying pressure";
    } else if (sells > buys) {
      lastAction = sells - buys >= 5 ? "Strong sell pressure" : "Selling pressure";
    }

    return res.status(200).json({
      meta,
      price: Number.isFinite(price) ? price : 0,
      marketCap: Number.isFinite(marketCap) ? marketCap : 0,
      volume: Number.isFinite(volume) ? volume : 0,
      buys: Number.isFinite(buys) ? buys : 0,
      sells: Number.isFinite(sells) ? sells : 0,
      change: Number.isFinite(change) ? change : 0,
      lastAction,
      recentTrades: [],
      debug: {
        ok: true
      }
    });
  } catch (err) {
    return res.status(200).json({
      error: "Handler failed",
      price: 0,
      marketCap: 0,
      volume: 0,
      buys: 0,
      sells: 0,
      change: 0,
      lastAction: "No data",
      recentTrades: [],
      meta: {
        name: "Fallback",
        symbol: "---",
        image: "",
        source: "fallback"
      },
      debug: {
        ok: false,
        error: String(err?.message || err)
      }
    });
  }
}
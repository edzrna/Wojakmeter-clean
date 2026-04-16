export default async function handler(req, res) {
  const { ca, timeframe } = req.query;

  if (!ca) {
    return res.status(400).json({ error: "Missing CA" });
  }

  try {
    // Pump.fun NO da velas oficiales → simulamos historial simple
    const r = await fetch(`https://frontend-api.pump.fun/coins/${ca}`);
    const json = await r.json();

    const price = Number(json?.price_usd || 0);

    if (!price) {
      return res.status(200).json({ prices: [] });
    }

    const now = Date.now();

    // Generamos historial sintético basado en precio actual
    const points = [];
    const lengthMap = {
      "1m": 20,
      "5m": 30,
      "15m": 40,
      "1h": 60,
      "4h": 80,
      "24h": 120
    };

    const len = lengthMap[timeframe] || 40;

    let base = price;

    for (let i = len; i > 0; i--) {
      const variation = (Math.random() - 0.5) * 0.02;
      base = base * (1 + variation);

      points.push({
        ts: now - i * 60000,
        price: base
      });
    }

    points.push({
      ts: now,
      price
    });

    res.status(200).json({ prices: points });
  } catch (err) {
    res.status(200).json({ prices: [] });
  }
}

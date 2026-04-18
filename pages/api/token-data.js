export const config = {
  runtime: "nodejs",
};

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

function safeNum(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function getChange(pair) {
  return (
    safeNum(pair?.priceChange?.h1) ||
    safeNum(pair?.priceChange?.h24) ||
    safeNum(pair?.priceChange?.m5) ||
    0
  );
}

function getVolume(pair) {
  return (
    safeNum(pair?.volume?.h24) ||
    safeNum(pair?.volume?.h6) ||
    safeNum(pair?.volume?.h1) ||
    0
  );
}

function getLiquidity(pair) {
  return safeNum(pair?.liquidity?.usd, 0);
}

function isPumpToken(pair) {
  const url = pair?.url || "";
  return url.includes("pump.fun");
}

export default async function handler(req, res) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  try {
    // ============================
    // 1️⃣ DEX SCREENER (MAIN)
    // ============================
    const dexRes = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`
    );

    const dexJson = await dexRes.json();

    const pairs = dexJson?.pairs || [];

    if (pairs.length > 0) {
      const pair = pairs[0];

      const price = safeNum(pair.priceUsd);
      const marketCap =
        safeNum(pair.fdv) || safeNum(pair.marketCap) || price * 1e9;

      const change = getChange(pair);
      const volume = getVolume(pair);
      const liquidity = getLiquidity(pair);

      const isNew = isPumpToken(pair) || marketCap < 500000;

      return res.status(200).json({
        source: "dexscreener",
        address,
        price,
        marketCap,
        change,
        volume,
        liquidity,
        isNew,
        pairAddress: pair.pairAddress,
        dex: pair.dexId,
        url: pair.url,
      });
    }

    // ============================
    // 2️⃣ BIRDEYE FALLBACK
    // ============================
    if (BIRDEYE_API_KEY) {
      const birdRes = await fetch(
        `https://public-api.birdeye.so/defi/token_overview?address=${address}`,
        {
          headers: {
            "x-api-key": BIRDEYE_API_KEY,
          },
        }
      );

      const birdJson = await birdRes.json();
      const data = birdJson?.data;

      if (data) {
        return res.status(200).json({
          source: "birdeye",
          address,
          price: safeNum(data.price),
          marketCap: safeNum(data.marketCap),
          change: safeNum(data.priceChange24h),
          volume: safeNum(data.volume24h),
          liquidity: safeNum(data.liquidity),
          isNew: safeNum(data.marketCap) < 500000,
        });
      }
    }

    // ============================
    // 3️⃣ NO DATA
    // ============================
    return res.status(200).json({
      source: "none",
      address,
      price: 0,
      marketCap: 0,
      change: 0,
      volume: 0,
      liquidity: 0,
      isNew: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: "token_data_error",
      message: err?.message || "unknown",
    });
  }
}
export const config = { runtime: "nodejs" };

/* ===========================================================
   TOKEN DATA  (v2)

   EL BUG QUE ARREGLA:
   La versión anterior devolvía
     { source, address, price, marketCap, change, volume, liquidity, ... }

   Pero el frontend (loadMoodMarketSnapshot) lee
     market.meta.name · market.meta.symbol · market.meta.image
     market.meta.source · market.buys · market.sells · market.lastAction

   Ninguno de esos siete campos existía. Consecuencias reales:
     · nombre, símbolo e imagen del token nunca se cargaban
     · buys y sells quedaban en 0 → moodBuyVolume + moodSellVolume = 0
       → "Volume" decía "Reading" para siempre
       → "Flow" decía siempre "Balanced"

   Y lo más absurdo: la API SÍ devolvía el marketCap real de
   DexScreener (fdv), pero el frontend lo ignoraba y lo sustituía
   por `price * 1e9` inventado. El dato bueno llegaba y se tiraba.

   Ahora el contrato es explícito y coincide.
   =========================================================== */

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const FETCH_TIMEOUT_MS = 7000;

function safeNum(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* Elige el par con más liquidez, no el primero del array.
   DexScreener no garantiza orden, y el primero puede ser un
   par muerto con $30 de liquidez y un precio absurdo. */
function pickBestPair(pairs) {
  if (!Array.isArray(pairs) || !pairs.length) return null;
  return pairs.reduce((best, pair) => {
    const liq = safeNum(pair?.liquidity?.usd);
    const bestLiq = safeNum(best?.liquidity?.usd);
    return liq > bestLiq ? pair : best;
  }, pairs[0]);
}

/* Etiqueta legible de la última acción, derivada del desequilibrio
   de transacciones en la última hora. El frontend la usa tal cual
   y busca las palabras "buy"/"sell" para colorearla. */
function deriveLastAction(buys, sells) {
  const total = buys + sells;
  if (!total) return "Watching";

  const buyRatio = buys / total;
  const gap = Math.abs(buyRatio - 0.5);

  const strength = gap >= 0.25 ? "Strong" : gap >= 0.1 ? "Medium" : "Light";

  if (buyRatio > 0.52) return `${strength} buy`;
  if (buyRatio < 0.48) return `${strength} sell`;
  return "Balanced flow";
}

function emptyPayload(address, reason = "none") {
  return {
    ok: false,
    address,
    source: reason,
    meta: { name: "", symbol: "", image: "", source: "Unknown" },
    price: 0,
    marketCap: 0,
    marketCapIsReal: false,
    change: 0,
    volume: 0,
    liquidity: 0,
    buys: 0,
    sells: 0,
    lastAction: "Watching",
    isNew: true
  };
}

export default async function handler(req, res) {
  const address = String(req.query.address || "").trim();

  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  // ============================================================
  // 1. DEXSCREENER
  // ============================================================
  try {
    const dexRes = await fetchWithTimeout(
      `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`,
      { headers: { accept: "application/json" } }
    );

    if (dexRes.ok) {
      const dexJson = await dexRes.json();
      const pair = pickBestPair(dexJson?.pairs);

      if (pair) {
        const price = safeNum(pair.priceUsd);

        /* fdv y marketCap son datos REALES del proveedor.
           Si ninguno viene, marketCapIsReal queda en false y el
           frontend debe mostrar "--", nunca un número inventado. */
        const marketCap = safeNum(pair.marketCap) || safeNum(pair.fdv) || 0;

        /* DexScreener da txns por ventana. h1 es la más
           representativa del "ahora"; si está vacía, caemos a h24. */
        const txns = pair?.txns || {};
        const window = (txns.h1?.buys || txns.h1?.sells) ? txns.h1
                     : (txns.h6?.buys || txns.h6?.sells) ? txns.h6
                     : txns.h24 || {};

        const buys  = safeNum(window.buys);
        const sells = safeNum(window.sells);

        return res.status(200).json({
          ok: true,
          address,
          source: "dexscreener",

          // El frontend lee meta.* — antes no existía.
          meta: {
            name:   pair?.baseToken?.name   || "",
            symbol: pair?.baseToken?.symbol || "",
            image:  pair?.info?.imageUrl    || "",
            source: "DexScreener"
          },

          price,
          marketCap,
          marketCapIsReal: marketCap > 0,

          change: safeNum(pair?.priceChange?.h1)
               || safeNum(pair?.priceChange?.h24)
               || safeNum(pair?.priceChange?.m5)
               || 0,

          volume: safeNum(pair?.volume?.h24)
               || safeNum(pair?.volume?.h6)
               || safeNum(pair?.volume?.h1)
               || 0,

          liquidity: safeNum(pair?.liquidity?.usd),

          // Los tres campos que faltaban por completo.
          buys,
          sells,
          lastAction: deriveLastAction(buys, sells),

          isNew: String(pair?.url || "").includes("pump.fun") || marketCap < 500000,
          pairAddress: pair?.pairAddress || "",
          dex: pair?.dexId || "",
          url: pair?.url || ""
        });
      }
    }
  } catch (error) {
    console.error("token-data DexScreener error:", error?.message);
  }

  // ============================================================
  // 2. BIRDEYE (fallback)
  // ============================================================
  if (BIRDEYE_API_KEY) {
    try {
      const birdRes = await fetchWithTimeout(
        `https://public-api.birdeye.so/defi/token_overview?address=${encodeURIComponent(address)}`,
        { headers: { "x-api-key": BIRDEYE_API_KEY, accept: "application/json" } }
      );

      if (birdRes.ok) {
        const data = (await birdRes.json())?.data;

        if (data) {
          const buys  = safeNum(data.buy24h);
          const sells = safeNum(data.sell24h);
          const marketCap = safeNum(data.marketCap) || safeNum(data.mc) || 0;

          return res.status(200).json({
            ok: true,
            address,
            source: "birdeye",

            meta: {
              name:   data.name   || "",
              symbol: data.symbol || "",
              image:  data.logoURI || "",
              source: "Birdeye"
            },

            price: safeNum(data.price),
            marketCap,
            marketCapIsReal: marketCap > 0,
            change: safeNum(data.priceChange24hPercent) || safeNum(data.priceChange24h),
            volume: safeNum(data.v24hUSD) || safeNum(data.volume24h),
            liquidity: safeNum(data.liquidity),

            buys,
            sells,
            lastAction: deriveLastAction(buys, sells),

            isNew: marketCap > 0 && marketCap < 500000
          });
        }
      }
    } catch (error) {
      console.error("token-data Birdeye error:", error?.message);
    }
  }

  // ============================================================
  // 3. SIN DATOS
  // ============================================================
  return res.status(200).json(emptyPayload(address));
}

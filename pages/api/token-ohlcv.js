export const config = { runtime: "nodejs" };

/* ===========================================================
   TOKEN OHLCV — VELAS REALES

   EL PROBLEMA QUE RESUELVE:

   Hasta ahora el gráfico del token se construía en el navegador,
   consultando el precio cada 5 segundos desde que el usuario
   abría la página. Con eso, un gráfico de "5m" tenía tres o
   cuatro puntos unidos por rectas: una diagonal perfecta y una
   caída vertical al final. No era el mercado, era interpolación.

   DexScreener y Axiom muestran velas reales porque las piden a
   una fuente de velas. Nosotros no teníamos ninguna.

   GeckoTerminal ofrece OHLCV de pools de Solana SIN clave de
   API. Es la pieza que faltaba: datos históricos reales, con
   apertura, máximo, mínimo, cierre y volumen por intervalo.

   Límite: 30 peticiones por minuto. Por eso la caché de 30s y
   el Cache-Control agresivo — el CDN absorbe la mayoría.
   =========================================================== */

const BASE = "https://api.geckoterminal.com/api/v2";
const NETWORK = "solana";
const CACHE_TTL_MS = 30000;

const cache = new Map();

/* Los timeframes del sitio son INTERVALOS DE VELA, como en
   cualquier plataforma de trading: "5m" significa velas de cinco
   minutos, no "los últimos cinco minutos". Esa era otra fuente de
   confusión — el usuario elegía 5m y veía una ventana de cinco
   minutos con tres puntos. */
const TIMEFRAMES = {
  "1m":  { tf: "minute", aggregate: 1,  limit: 120 },
  "5m":  { tf: "minute", aggregate: 5,  limit: 120 },
  "15m": { tf: "minute", aggregate: 15, limit: 96 },
  "1h":  { tf: "hour",   aggregate: 1,  limit: 96 },
  "4h":  { tf: "hour",   aggregate: 4,  limit: 84 },
  "24h": { tf: "day",    aggregate: 1,  limit: 90 }
};

function safeNum(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json;version=20230302" },
      signal: controller.signal
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* Si no llega el pool, se resuelve desde la dirección del token.
   Un token puede tener varios pools; manda el de mayor liquidez,
   porque los demás dan precios que nadie está pagando. */
async function resolvePool(tokenAddress) {
  const data = await fetchJson(
    `${BASE}/networks/${NETWORK}/tokens/${encodeURIComponent(tokenAddress)}/pools?page=1`
  );

  const pools = Array.isArray(data?.data) ? data.data : [];
  if (!pools.length) return null;

  const best = pools.reduce((a, b) => {
    const la = safeNum(a?.attributes?.reserve_in_usd);
    const lb = safeNum(b?.attributes?.reserve_in_usd);
    return lb > la ? b : a;
  }, pools[0]);

  return best?.attributes?.address || null;
}

export default async function handler(req, res) {
  const address = String(req.query?.address || "").trim();
  const pool = String(req.query?.pool || "").trim();
  const timeframe = String(req.query?.timeframe || "5m").trim();

  if (!address && !pool) {
    return res.status(400).json({ ok: false, error: "Missing address or pool." });
  }

  const cfg = TIMEFRAMES[timeframe] || TIMEFRAMES["5m"];
  const key = `${pool || address}:${timeframe}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res.status(200).json({ ...cached.payload, cached: true });
  }

  try {
    const poolAddress = pool || (await resolvePool(address));

    if (!poolAddress) {
      return res.status(200).json({
        ok: false,
        candles: [],
        error: "no_pool_found"
      });
    }

    const url =
      `${BASE}/networks/${NETWORK}/pools/${encodeURIComponent(poolAddress)}` +
      `/ohlcv/${cfg.tf}?aggregate=${cfg.aggregate}&limit=${cfg.limit}&currency=usd`;

    const data = await fetchJson(url);
    const list = data?.data?.attributes?.ohlcv_list;

    if (!Array.isArray(list) || !list.length) {
      return res.status(200).json({
        ok: false,
        candles: [],
        pool: poolAddress,
        error: "no_ohlcv"
      });
    }

    /* El formato es [timestampSegundos, open, high, low, close, volume]
       y viene del más reciente al más antiguo. Se invierte, porque
       un gráfico se lee de izquierda a derecha en el tiempo. */
    const candles = list
      .map((row) => ({
        ts: safeNum(row[0]) * 1000,
        open: safeNum(row[1]),
        high: safeNum(row[2]),
        low: safeNum(row[3]),
        close: safeNum(row[4]),
        volume: safeNum(row[5])
      }))
      .filter((c) => c.close > 0 && Number.isFinite(c.ts))
      .sort((a, b) => a.ts - b.ts);

    const payload = {
      ok: true,
      pool: poolAddress,
      timeframe,
      interval: `${cfg.aggregate}${cfg.tf === "minute" ? "m" : cfg.tf === "hour" ? "h" : "d"}`,
      candles,
      count: candles.length
    };

    cache.set(key, { ts: Date.now(), payload });

    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res.status(200).json(payload);
  } catch (error) {
    console.error("token-ohlcv error:", error?.message);
    return res.status(200).json({
      ok: false,
      candles: [],
      error: error?.message || "ohlcv_failed"
    });
  }
}

import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

/* ===========================================================
   COIN CHART

   ARREGLADO (v2):

   1. El mapeo de timeframes estaba cruzado. Antes:
        "24h" → 30 días
        "7d"  → 90 días
        "30d" → no existía el case → default → 1 día
      O sea que "30d" mostraba MENOS datos que "24h" y ningún
      botón dibujaba lo que decía.

   2. Ahora devuelve OHLC real. Antes solo mandaba `prices`
      (línea), y el frontend fabricaba velas falsas usando el
      punto anterior como open y los vecinos como high/low.
      Eso no es OHLC: cualquier trader lo detecta.

   3. El parámetro `interval` se ha quitado. CoinGecko solo lo
      acepta en planes de pago; en el plan demo devuelve 401 y
      hacía que el retry gastara los tres intentos para nada.
      Sin él, CoinGecko elige la granularidad por sí mismo.
   =========================================================== */

/* Mapa timeframe → días. Cada valor es el rango que el usuario
   espera ver cuando pulsa ese botón. */
const TIMEFRAME_DAYS = {
  "1h":  1,
  "4h":  1,
  "24h": 1,
  "7d":  7,
  "30d": 30
};

/* CoinGecko solo acepta ciertos valores en /ohlc:
   1, 7, 14, 30, 90, 180, 365. Y la granularidad de la vela la
   fija él según el rango:
     1 día    → velas de 30 min
     7-30 días→ velas de 4 horas
     >30 días → velas diarias */
const TIMEFRAME_OHLC_DAYS = {
  "1h":  1,
  "4h":  1,
  "24h": 1,
  "7d":  7,
  "30d": 30
};

/* Cuántas velas conservar por timeframe. CoinGecko devuelve el
   rango completo; para "1h" queremos las últimas horas, no el
   día entero. Recortamos por el final. */
const TIMEFRAME_CANDLE_LIMIT = {
  "1h":  12,   // 12 velas de 30 min = 6 h de contexto
  "4h":  24,   // 12 h
  "24h": 48,   // el día completo
  "7d":  42,   // 7 días en velas de 4 h
  "30d": 30    // 30 velas diarias
};

function normalizeTimeframe(tf) {
  const clean = String(tf || "24h");
  return TIMEFRAME_DAYS[clean] ? clean : "24h";
}

export default async function handler(req, res) {
  const coin = String(req.query.coin || "bitcoin");
  const timeframe = normalizeTimeframe(req.query.timeframe);

  const days     = TIMEFRAME_DAYS[timeframe];
  const ohlcDays = TIMEFRAME_OHLC_DAYS[timeframe];
  const limit    = TIMEFRAME_CANDLE_LIMIT[timeframe];

  try {
    /* Las dos peticiones van en paralelo y cada una tiene su
       propia clave de caché, así que compartir el chart entre
       usuarios sigue funcionando. Si OHLC falla, la línea
       sobrevive: son independientes a propósito. */
    const [lineResult, ohlcResult] = await Promise.allSettled([
      cachedJson(
        `coin-chart:${coin}:${timeframe}`,
        () => fetchJsonWithRetry(
          cgUrl(`/coins/${encodeURIComponent(coin)}/market_chart`, {
            vs_currency: "usd",
            days
          }),
          { headers: cgHeaders(), timeoutMs: 7000, retries: 2 }
        ),
        { ttlMs: 30000, staleMs: 900000 }
      ),

      cachedJson(
        `coin-ohlc:${coin}:${timeframe}`,
        () => fetchJsonWithRetry(
          cgUrl(`/coins/${encodeURIComponent(coin)}/ohlc`, {
            vs_currency: "usd",
            days: ohlcDays
          }),
          { headers: cgHeaders(), timeoutMs: 7000, retries: 2 }
        ),
        { ttlMs: 60000, staleMs: 900000 }
      )
    ]);

    // --- Línea ---
    const rawPrices = lineResult.status === "fulfilled"
      ? (lineResult.value?.data?.prices || [])
      : [];

    /* market_chart con days=1 devuelve ~288 puntos de 5 min.
       Para "1h" y "4h" queremos solo el tramo final. */
    const lineLimit = { "1h": 24, "4h": 60, "24h": 288, "7d": 168, "30d": 180 }[timeframe];
    const prices = rawPrices.slice(-lineLimit);

    // --- Velas ---
    /* CoinGecko devuelve arrays [ts, open, high, low, close].
       Los normalizamos a objetos para que el frontend no tenga
       que acordarse del orden de los índices. */
    const rawOhlc = ohlcResult.status === "fulfilled"
      ? (ohlcResult.value?.data || [])
      : [];

    const candles = (Array.isArray(rawOhlc) ? rawOhlc : [])
      .filter((c) => Array.isArray(c) && c.length >= 5)
      .slice(-limit)
      .map(([ts, open, high, low, close]) => ({
        ts:    Number(ts),
        open:  Number(open),
        high:  Number(high),
        low:   Number(low),
        close: Number(close)
      }))
      .filter((c) =>
        Number.isFinite(c.open) && Number.isFinite(c.high) &&
        Number.isFinite(c.low)  && Number.isFinite(c.close)
      );

    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");

    res.status(200).json({
      ok: true,
      timeframe,
      days,
      prices,
      candles,
      /* El frontend necesita saber si las velas son reales para
         decidir si ofrece el modo candle o lo desactiva. Nunca
         debe dibujar velas inventadas. */
      hasCandles: candles.length >= 2,
      stale: Boolean(lineResult.value?.stale)
    });
  } catch (error) {
    res.status(200).json({
      ok: false,
      timeframe,
      prices: [],
      candles: [],
      hasCandles: false,
      error: error?.message || "chart_error"
    });
  }
}

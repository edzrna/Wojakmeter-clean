import { cachedJson, cgHeaders, cgUrl, fetchJsonWithRetry } from "../../lib/data-proxy";

/* ===========================================================
   COIN CHART

   ARREGLADO (v3) — dos fallos que se veían en pantalla:

   A) "30D era igual que 7D."
      El recorte se hacía por NÚMERO DE PUNTOS, no por tiempo,
      y el número estaba calculado suponiendo una granularidad
      que CoinGecko no usa. Para days=30 devuelve datos HORARIOS
      (~720 puntos); quedarse con los últimos 180 son las últimas
      180 horas = 7,5 días. Casi la misma ventana que 7D, con la
      misma forma. El mapeo de días estaba bien: lo que mentía
      era el slice.

   B) "1H y 4H salían vacíos."
      Dos causas sumadas. La primera, el mismo error de conteo:
      24 puntos de 5 minutos son 2 horas, no 1. La segunda y la
      que de verdad los vaciaba: 1h, 4h y 24h piden EXACTAMENTE
      lo mismo a CoinGecko (days=1) pero cada uno tenía su propia
      clave de caché, así que recorrer las cinco pestañas
      disparaba diez llamadas en pocos segundos. En el plan demo
      eso es un 429, los reintentos se agotan y la respuesta llega
      vacía — sin error visible, solo un rectángulo negro.

   LA REGLA NUEVA:
   se pide por DÍAS y se cachea por DÍAS; el timeframe solo
   decide cuánto tiempo se recorta al final. Así 1h/4h/24h
   comparten una sola llamada y un solo hueco de caché, y el
   recorte se hace en milisegundos reales en vez de contar
   puntos a ciegas.
   =========================================================== */

/* ===========================================================
   ARREGLADO (v4) — "7D y 30D no cargan nada".

   NO era un fallo de este archivo: era el limite de peticiones.

   Cada pestaña dispara DOS llamadas a CoinGecko (linea + velas).
   Con el mapa anterior habia TRES grupos de dias —1, 7 y 30—, o
   sea seis llamadas por moneda si recorres las pestañas, encima
   de las que ya gasta la portada en top coins, trending, memes y
   global. En el plan demo eso llega al 429; los reintentos se
   agotan, `Promise.allSettled` devuelve `rejected`, y el handler
   respondia `ok: true` con `prices: []`.

   Ese `ok: true` es lo que hacia el fallo INVISIBLE: el cliente
   recibia una respuesta valida y vacia, limpiaba el lienzo y ya
   esta. Y como el cliente cachea la respuesta 60 s, volver a
   pulsar tampoco arreglaba nada.

   24H seguia funcionando porque su grupo (d1) ya estaba caliente
   desde la primera carga. 7D y 30D entraban en frio, justo cuando
   quedaba menos cuota. De ahi que fallaran esas dos y no otra.

   DOS CAMBIOS:

   1. DOS GRUPOS DE DIAS, NO TRES. `7d` pasa a servirse del mismo
      dato que `30d` y se recorta por tiempo. No se pierde
      resolucion: CoinGecko devuelve granularidad HORARIA para
      cualquier peticion de 2 a 90 dias, asi que 7 dias sacados de
      days=30 traen exactamente los mismos puntos que days=7. Lo
      mismo con las velas, que son de 4 horas en todo ese rango.
      Resultado: dos grupos (d1 y d30) en vez de tres, y 7D sale
      instantaneo si ya miraste 30D, y al reves.

   2. SI NO HAY DATOS, SE DICE. Cuando las dos peticiones fallan,
      la respuesta ya no es `ok: true` con arrays vacios: es
      `ok: false` con el motivo. Un fallo que se ve se arregla; uno
      que se calla se convierte en "la pagina esta rota".
   =========================================================== */

/* Mapa timeframe → días que se le piden a CoinGecko.

   `7d` pide 30 a proposito: comparte grupo con `30d` y se recorta
   despues. Ver el punto 1 de arriba antes de "optimizarlo" a 7. */
const TIMEFRAME_DAYS = {
  "1h":  1,
  "4h":  1,
  "24h": 1,
  "7d":  30,
  "30d": 30
};

/* Cuánto tiempo se conserva, en milisegundos. Esto es lo que el
   usuario espera ver al pulsar el botón, y ahora se recorta por
   RELOJ, no por número de puntos: da igual que CoinGecko cambie
   la granularidad, la ventana sigue siendo la correcta. */
const HOUR = 3600 * 1000;
const TIMEFRAME_WINDOW_MS = {
  "1h":  1  * HOUR,
  "4h":  4  * HOUR,
  "24h": 24 * HOUR,
  "7d":  7  * 24 * HOUR,
  "30d": 30 * 24 * HOUR
};

/* Techo de puntos por serie, solo para no mandar 720 puntos al
   móvil cuando 300 se ven igual. Se aplica DESPUÉS del recorte
   temporal y submuestreando de forma uniforme, así que nunca
   acorta la ventana: solo la dibuja con menos densidad. */
const MAX_POINTS = 320;

function normalizeTimeframe(tf) {
  const clean = String(tf || "24h");
  return TIMEFRAME_DAYS[clean] ? clean : "24h";
}

/* Recorta una serie de pares [ts, valor] a la ventana pedida,
   contando hacia atrás desde el ÚLTIMO punto del dato (no desde
   Date.now(): si el proveedor va con retraso, contar desde ahora
   dejaría la ventana medio vacía). */
function sliceByTime(rows, windowMs, tsOf) {
  const valid = (Array.isArray(rows) ? rows : [])
    .filter((r) => Number.isFinite(Number(tsOf(r))));

  if (!valid.length) return [];

  const last = Number(tsOf(valid[valid.length - 1]));
  const cutoff = last - windowMs;

  const kept = valid.filter((r) => Number(tsOf(r)) >= cutoff);

  /* Si la ventana pedida es más corta que la separación entre
     puntos, quedarían 0 o 1: se devuelven los dos últimos para
     que el gráfico tenga algo que dibujar en vez de un lienzo
     negro. Un tramo corto es información; el vacío no. */
  return kept.length >= 2 ? kept : valid.slice(-2);
}

/* Submuestreo uniforme conservando SIEMPRE el primero y el
   último: son los que fijan la performance del periodo, y
   perderlos cambiaría el porcentaje que se muestra al lado. */
function downsample(rows, max) {
  if (rows.length <= max) return rows;
  const step = (rows.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) out.push(rows[Math.round(i * step)]);
  out[out.length - 1] = rows[rows.length - 1];
  return out;
}

export default async function handler(req, res) {
  const coin = String(req.query.coin || "bitcoin");
  const timeframe = normalizeTimeframe(req.query.timeframe);

  const days = TIMEFRAME_DAYS[timeframe];
  const windowMs = TIMEFRAME_WINDOW_MS[timeframe];

  try {
    /* CLAVE DE CACHÉ POR DÍAS, no por timeframe: 1h, 4h y 24h
       piden lo mismo, así que comparten una sola llamada. Eso
       corta a la mitad las peticiones al recorrer las pestañas,
       que era lo que disparaba el 429. */
    const [lineResult, ohlcResult] = await Promise.allSettled([
      cachedJson(
        `coin-chart:${coin}:d${days}`,
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
        `coin-ohlc:${coin}:d${days}`,
        () => fetchJsonWithRetry(
          cgUrl(`/coins/${encodeURIComponent(coin)}/ohlc`, {
            vs_currency: "usd",
            days
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

    const prices = downsample(
      sliceByTime(rawPrices, windowMs, (r) => r?.[0]),
      MAX_POINTS
    );

    // --- Velas ---
    /* CoinGecko devuelve arrays [ts, open, high, low, close].
       Los normalizamos a objetos para que el frontend no tenga
       que acordarse del orden de los índices. */
    const rawOhlc = ohlcResult.status === "fulfilled"
      ? (ohlcResult.value?.data || [])
      : [];

    const candles = sliceByTime(
      (Array.isArray(rawOhlc) ? rawOhlc : []).filter(
        (c) => Array.isArray(c) && c.length >= 5
      ),
      windowMs,
      (c) => c?.[0]
    )
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

    /* NADA QUE DIBUJAR = FALLO, y se dice.

       Antes esto salia como `ok: true` con `prices: []`, que para
       el cliente es indistinguible de "esta moneda no tiene
       historial". El lienzo se quedaba en negro sin una sola
       pista, ni en pantalla ni en la consola.

       Se mira `rawPrices`, no `prices`: si la peticion trajo datos
       pero el recorte los dejo fuera, el problema es otro y hay
       que poder distinguirlo. */
    if (!prices.length && !candles.length) {
      const motivo = lineResult.status === "rejected"
        ? (lineResult.reason?.message || "upstream_failed")
        : rawPrices.length
          ? "window_empty"
          : "upstream_empty";

      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({
        ok: false,
        timeframe,
        days,
        prices: [],
        candles: [],
        hasCandles: false,
        points: 0,
        /* `no-store` arriba y este aviso aqui: un vacio NO se
           cachea. Guardar media hora un fallo pasajero de cuota
           convierte un tropiezo de diez segundos en media hora de
           grafico roto. */
        error: motivo
      });
    }

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

      /* Los extremos reales de lo que se está mandando. Sirven
         para verificar de un vistazo —en la pestaña de red— que
         30D trae de verdad 30 días, que es justo lo que este
         arreglo corrige. */
      from: prices.length ? Number(prices[0][0]) : null,
      to:   prices.length ? Number(prices[prices.length - 1][0]) : null,
      points: prices.length,

      stale: Boolean(lineResult.value?.stale)
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
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

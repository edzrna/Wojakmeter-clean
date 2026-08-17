import { neon } from "@neondatabase/serverless";
import { computeIndex, computeBreadth, moodFromScore as indexMood }
  from "../../lib/market-index";

export const config = { runtime: "nodejs", maxDuration: 30 };

/* ===========================================================
   HISTORY SNAPSHOT

   Guarda una lectura del índice. Lo llama el cron externo
   (GitHub Actions) cada 15 minutos.

   POR QUÉ EXISTE ESTE ENDPOINT Y NO SE REUSA /api/global:
   El score que ve el usuario se calcula en el NAVEGADOR
   (script.js). El servidor nunca lo ha calculado. Aquí se
   replica la misma fórmula del modo "Raw Market", que es el
   modo por defecto y por tanto el número que la gente ve.

   ⚠️ SI CAMBIAS LA FÓRMULA EN script.js, CÁMBIALA AQUÍ TAMBIÉN.
   Es duplicación consciente: el frontend no puede importar de
   /lib porque es un script clásico, no un módulo.

   ── ÍNDICE NUEVO, EN PARALELO ──────────────────────────────

   Desde agosto este endpoint calcula ADEMÁS el índice nuevo de
   lib/market-index.js y lo guarda en sus propias columnas, junto
   al viejo. Nada de lo que se ve en la página cambia todavía.

   Se hace así por dos razones:

   1) Los z-scores necesitan 90 días de historia, y hoy no se
      guardan ni la amplitud ni la volatilidad en ninguna parte.
      Cada día que pase sin recolectarlas es un día que no se
      puede recuperar después. La recolección tiene que empezar
      antes que la sustitución.

   2) Con las dos series guardadas se puede comparar cuánto
      cambia de verdad el número antes de tocar lo que ve la
      gente, en vez de decidirlo a ojo.

   El bloque del índice nuevo va en su PROPIO try/catch: si algo
   falla ahí, el snapshot viejo se guarda igual. Perder el
   histórico de siempre por un fallo en la parte experimental
   sería el peor resultado posible.
   =========================================================== */

/* La conexión se crea DENTRO del handler, no a nivel de módulo.

   Antes esta línea corría al importar el archivo. Si
   DATABASE_URL no estaba disponible en ese instante exacto,
   neon() lanzaba una excepción ANTES de entrar al handler —
   fuera de cualquier try/catch. El síntoma era un 500 en 11ms
   sin una sola petición saliente, imposible de diagnosticar
   porque el mensaje de error nunca llegaba a la respuesta. */
function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined");
  return neon(url);
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function roundScore(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(clamp(n, 0, 100)) : 50;
}

/* ⚠️ ESPEJO DE script.js — mantener sincronizado.
   Curva tanh con escala adaptativa en vez del recorte lineal
   anterior. Si cambia allí, cambia aquí, o el histórico guardará
   un número distinto al que ve el usuario. */

const SIGMA_TO_SCALE = 2.5;

function tanh(x) {
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

function changeToScore(changePct, scale) {
  const change = Number(changePct || 0);
  const safeScale = Number(scale) > 0 ? Number(scale) : 1;
  return clamp(50 + 50 * tanh(change / (safeScale * SIGMA_TO_SCALE)) * 0.97, 0, 100);
}

function normalizeChangeToScore(changePct, sensitivity = 10) {
  const impliedScale = (50 / Math.max(sensitivity, 0.1)) / 3;
  return changeToScore(changePct, impliedScale);
}

function moodFromScore(score) {
  if (score >= 85) return "euphoria";
  if (score >= 70) return "content";
  if (score >= 60) return "optimism";
  if (score >= 45) return "neutral";
  if (score >= 35) return "doubt";
  if (score >= 20) return "concern";
  return "frustration";
}

/* Copia de computeMarketScoreFromInputs de script.js */
function computeMarketScore(change, trendingScore, memeScore, fearGreed = 50) {
  return roundScore(
    normalizeChangeToScore(change, 12) * 0.62 +
    trendingScore * 0.14 +
    memeScore * 0.08 +
    Number(fearGreed || 50) * 0.16
  );
}

function averageChange(coins) {
  if (!Array.isArray(coins) || !coins.length) return 0;
  const sum = coins.reduce(
    (acc, c) => acc + Number(c?.price_change_percentage_24h_in_currency || 0), 0
  );
  return sum / coins.length;
}

/* ---------------------------------------------------------
   VOLATILIDAD REALIZADA

   Sale de la serie de capitalización que /api/global ya devuelve,
   así que no hace falta ninguna fuente nueva: desviación típica
   de los cambios punto a punto, en porcentaje.

   Sin signo a propósito. La volatilidad mide agitación, no
   dirección: subir un 8% y caer un 8% son igual de volátiles. El
   signo se lo presta el retorno dentro del motor del índice.
   --------------------------------------------------------- */
function realizedVolatility(timeline) {
  const vals = (timeline || [])
    .map((e) => (Array.isArray(e) ? Number(e[1]) : Number(e)))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (vals.length < 4) return null;

  const rets = [];
  for (let i = 1; i < vals.length; i++) {
    rets.push(((vals[i] - vals[i - 1]) / vals[i - 1]) * 100);
  }

  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;

  /* Escalado al periodo completo: la desviación por punto
     multiplicada por la raíz del número de puntos. Es la
     convención estándar y hace la cifra comparable entre
     ventanas con distinta granularidad. */
  return Math.sqrt(variance) * Math.sqrt(rets.length);
}

async function getJson(baseUrl, path) {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { accept: "application/json" }
    });

    if (!res.ok) {
      return { __error: `HTTP ${res.status}` };
    }

    /* Si Deployment Protection intercepta, la respuesta es 200
       con HTML de login. Sin esta comprobación, .json() lanza y
       el fallo aparece como un null indistinguible de otros. */
    const type = res.headers.get("content-type") || "";
    if (!type.includes("application/json")) {
      return { __error: `non_json_response (${type.slice(0, 40)})` };
    }

    return await res.json();
  } catch (error) {
    return { __error: error?.message || "fetch_failed" };
  }
}

export default async function handler(req, res) {
  /* ---------------- AUTENTICACIÓN ----------------
     Vercel Cron invoca con GET y manda
     `Authorization: Bearer ${CRON_SECRET}`.

     Nota histórica: hubo una versión que aceptaba el user-agent
     `vercel-cron/` como alternativa, porque CRON_SECRET parecía
     no propagar. El problema real era otro (Deployment Protection
     interceptando las llamadas internas), así que ese rodeo se
     ha eliminado: el user-agent es falsificable y ya no hace
     falta. Solo manda el secreto. */

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";

  if (!secret) {
    return res.status(500).json({ ok: false, error: "missing_cron_secret" });
  }

  if (auth !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: "missing_database_url" });
  }

  /* ---------------- URL BASE INTERNA ----------------

     BUG QUE ARREGLA:
     Antes se usaba req.headers.host. Pero el cron de Vercel
     invoca el DOMINIO DE DESPLIEGUE
     (wojakmeter-clean-gersm....vercel.app), no el público.

     Ese dominio está detrás de Deployment Protection, que en el
     plan Pro viene activada por defecto: las llamadas a
     /api/global desde ahí reciben una página de login HTML en vez
     de JSON. fetch() no falla — devuelve 200 con HTML — y el
     .json() revienta, así que `global` quedaba null y el endpoint
     devolvía 502 sin explicar por qué.

     Solución: usar siempre el dominio público, que no está
     protegido. Configurable por si algún día cambia. */
  const baseUrl =
    process.env.PUBLIC_SITE_URL ||
    "https://wojakmeter.com";

  let sql;
  try {
    sql = getSql();
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "db_init_failed",
      detail: error?.message
    });
  }

  try {
    /* top-coins es nuevo aquí: es la fuente de la AMPLITUD, la
       señal que distingue un rally real de que BTC arrastre la
       media. Va en el mismo Promise.all para no añadir latencia. */
    const [global, sentiment, trending, memes, topCoins] = await Promise.all([
      getJson(baseUrl, "/api/global?timeframe=24h"),
      getJson(baseUrl, "/api/sentiment"),
      getJson(baseUrl, "/api/trending"),
      getJson(baseUrl, "/api/top-memes"),
      getJson(baseUrl, "/api/top-coins")
    ]);

    if (!global || global.__error) {
      return res.status(502).json({
        ok: false,
        error: "global_unavailable",
        /* El motivo concreto, en vez de un 502 mudo. */
        detail: global?.__error || "null_response",
        triedUrl: `${baseUrl}/api/global?timeframe=24h`
      });
    }

    // Las fuentes secundarias son opcionales: si fallan, se usan
    // valores neutros en vez de abortar el snapshot entero.
    const safeSentiment = sentiment?.__error ? null : sentiment;
    const safeTrending  = trending?.__error  ? null : trending;
    const safeMemes     = memes?.__error     ? null : memes;
    const safeTopCoins  = topCoins?.__error  ? null : topCoins;

    const raw = global.raw || {};

    const change = Number(global.change ?? 0);
    const volumeUsd = Number(global.volumeUsd ?? raw?.total_volume?.usd ?? 0);
    const marketCap = Number(global.marketCapUsd ?? raw?.total_market_cap?.usd ?? 0);

    const btcDominance = global.btcDominance && global.btcDominance !== "--"
      ? parseFloat(String(global.btcDominance).replace("%", ""))
      : Number(raw?.market_cap_percentage?.btc ?? 0);

    const trendingScore = Array.isArray(safeTrending) && safeTrending.length
      ? normalizeChangeToScore(averageChange(safeTrending), 3.5) : 50;

    const memeScore = Array.isArray(safeMemes) && safeMemes.length
      ? normalizeChangeToScore(averageChange(safeMemes), 3.2) : 50;

    const marketScore = computeMarketScore(change, trendingScore, memeScore, 50);

    /* El social score depende del newsScore de /api/sentiment.
       Copia de getSocialScoreFromMarket. */
    const newsScore = Number(safeSentiment?.newsScore ?? safeSentiment?.score ?? 50);
    const socialScore = roundScore(clamp(
      50 + change * 5 +
      (trendingScore - 50) * 0.12 +
      (memeScore - 50) * 0.10 +
      (newsScore - 50) * 0.55,
      0, 100
    ));

    const driver = safeSentiment?.driver || "Market flow / price action";

    /* Guardamos el score del modo RAW, que es el que ve por
       defecto quien entra. Los otros modos dependen de ajustes
       del usuario y no son comparables entre sesiones. */
    const score = marketScore;
    const mood = moodFromScore(score);

    /* ═══════════════ ÍNDICE NUEVO ═══════════════

       Todo este bloque está aislado: si falla, `newIndex` queda
       null y el snapshot de siempre se guarda igual. */
    let newIndex = null;
    let indexError = null;

    try {
      const breadth = computeBreadth(
        Array.isArray(safeTopCoins) ? safeTopCoins
          : (safeTopCoins?.coins || safeTopCoins?.data || [])
      );
      const volatility = realizedVolatility(global.timeline);

      /* La historia para los z-scores. Solo lo necesario: cuatro
         columnas de 90 días, no la tabla entera. */
      const rows = await sql`
        SELECT change_24h, volatility, volume_usd, btc_dominance
        FROM emotion_history
        WHERE ts > NOW() - INTERVAL '90 days'
        ORDER BY ts DESC
        LIMIT 9000;
      `;

      const history = {
        change:     rows.map((r) => Number(r.change_24h)).filter(Number.isFinite),
        volatility: rows.map((r) => Number(r.volatility)).filter(Number.isFinite),
        volume:     rows.map((r) => Number(r.volume_usd)).filter(Number.isFinite),
        dominance:  rows.map((r) => Number(r.btc_dominance)).filter(Number.isFinite)
      };

      const computed = computeIndex(
        { change, breadth, volatility, volume: volumeUsd,
          dominance: btcDominance, headlines: newsScore },
        history
      );

      newIndex = {
        ...computed,
        breadth,
        volatility,
        mood: computed.score === null ? null : indexMood(computed.score),
        samples: rows.length
      };
    } catch (error) {
      /* Se registra pero no se propaga: el histórico de siempre
         vale más que la parte experimental. */
      console.error("index engine error:", error);
      indexError = error?.message || "index_failed";
    }

    /* ON CONFLICT: si el bucket de 15 min ya existe, actualiza en
       vez de fallar. Vercel documenta que el cron puede invocar
       la misma ejecución más de una vez. */
    const [row] = await sql`
      INSERT INTO emotion_history
        (score, mood, market_score, social_score, driver_score,
         change_24h, volume_usd, market_cap, btc_dominance, driver, source,
         breadth, volatility, index_score, index_conf, index_parts)
      VALUES
        (${score}, ${mood}, ${marketScore}, ${socialScore}, ${50},
         ${change}, ${volumeUsd}, ${marketCap}, ${btcDominance}, ${driver}, 'cron',
         ${newIndex?.breadth ?? null},
         ${newIndex?.volatility ?? null},
         ${newIndex?.score ?? null},
         ${newIndex?.confidence ?? null},
         ${newIndex ? JSON.stringify(newIndex.parts) : null})
      ON CONFLICT (bucket) DO UPDATE SET
        score        = EXCLUDED.score,
        mood         = EXCLUDED.mood,
        market_score = EXCLUDED.market_score,
        social_score = EXCLUDED.social_score,
        change_24h   = EXCLUDED.change_24h,
        volume_usd   = EXCLUDED.volume_usd,
        market_cap   = EXCLUDED.market_cap,
        btc_dominance= EXCLUDED.btc_dominance,
        driver       = EXCLUDED.driver,
        breadth      = EXCLUDED.breadth,
        volatility   = EXCLUDED.volatility,
        index_score  = EXCLUDED.index_score,
        index_conf   = EXCLUDED.index_conf,
        index_parts  = EXCLUDED.index_parts
      RETURNING id, ts, score, mood;
    `;

    return res.status(200).json({
      ok: true,
      saved: row,
      /* Los dos números en la respuesta: así el cron log sirve
         para vigilar la divergencia sin abrir la base de datos. */
      index: newIndex ? {
        score: newIndex.score,
        mood: newIndex.mood,
        confidence: newIndex.confidence,
        breadth: newIndex.breadth,
        volatility: newIndex.volatility,
        missing: newIndex.missing,
        samples: newIndex.samples,
        deltaVsLegacy: newIndex.score === null ? null : newIndex.score - score
      } : null,
      indexError
    });
  } catch (error) {
    console.error("history-snapshot error:", error);
    return res.status(500).json({
      ok: false,
      error: "snapshot_failed",
      detail: error?.message,
      /* El nombre y la primera línea del stack distinguen un
         fallo de red de uno de SQL sin tener que adivinar. */
      name: error?.name,
      at: String(error?.stack || "").split("\n")[1]?.trim()
    });
  }
}

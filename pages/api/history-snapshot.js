import { neon } from "@neondatabase/serverless";

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
   /lib porque es un script clásico, no un módulo. La alternativa
   sería convertirlo a módulo ES, que es más trabajo del que
   justifica ahora mismo.
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

function normalizeChangeToScore(changePct, sensitivity = 10) {
  return clamp(50 + Number(changePct || 0) * sensitivity, 0, 100);
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

     HISTORIA DE ESTE BLOQUE:
     La versión anterior exigía CRON_SECRET y devolvía 500 si no
     existía. La variable ESTABA creada en el panel de Vercel y
     aun así process.env.CRON_SECRET llegaba undefined al runtime,
     incluso tras redesplegar sin caché.

     En vez de seguir persiguiendo por qué no propaga, se
     autentica con una señal que SÍ sabemos presente: en los logs
     de invocación se ve `User Agent: vercel-cron/1.0`.

     Orden de comprobación:
       1. Si CRON_SECRET existe, se exige (camino preferido).
       2. Si no existe, se acepta la invocación del cron de Vercel.
       3. Cualquier otra cosa, 401.

     COMPROMISO HONESTO: el user-agent es falsificable desde
     fuera. El riesgo real es bajo — lo peor que consigue un
     atacante es forzar un snapshot, y el índice único por bucket
     de 15 min impide que llene la tabla. Aun así, en cuanto
     CRON_SECRET propague, el camino 1 vuelve a mandar solo.
     Para cerrarlo del todo: define CRON_SECRET y elimina el paso 2. */

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  const userAgent = String(req.headers["user-agent"] || "");
  const isVercelCron = userAgent.startsWith("vercel-cron/");

  const authorized = secret
    ? auth === `Bearer ${secret}`
    : isVercelCron;

  if (!authorized) {
    return res.status(401).json({
      ok: false,
      error: "unauthorized",
      /* Pistas para diagnosticar sin exponer el secreto. */
      hasSecret: Boolean(secret),
      sawCronUA: isVercelCron
    });
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
    const [global, sentiment, trending, memes] = await Promise.all([
      getJson(baseUrl, "/api/global?timeframe=24h"),
      getJson(baseUrl, "/api/sentiment"),
      getJson(baseUrl, "/api/trending"),
      getJson(baseUrl, "/api/top-memes")
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

    /* ON CONFLICT: si el bucket de 15 min ya existe, actualiza en
       vez de fallar. Vercel documenta que el cron puede invocar
       la misma ejecución más de una vez. */
    const [row] = await sql`
      INSERT INTO emotion_history
        (score, mood, market_score, social_score, driver_score,
         change_24h, volume_usd, market_cap, btc_dominance, driver, source)
      VALUES
        (${score}, ${mood}, ${marketScore}, ${socialScore}, ${50},
         ${change}, ${volumeUsd}, ${marketCap}, ${btcDominance}, ${driver}, 'cron')
      ON CONFLICT (bucket) DO UPDATE SET
        score        = EXCLUDED.score,
        mood         = EXCLUDED.mood,
        market_score = EXCLUDED.market_score,
        social_score = EXCLUDED.social_score,
        change_24h   = EXCLUDED.change_24h,
        volume_usd   = EXCLUDED.volume_usd,
        market_cap   = EXCLUDED.market_cap,
        btc_dominance= EXCLUDED.btc_dominance,
        driver       = EXCLUDED.driver
      RETURNING id, ts, score, mood;
    `;

    return res.status(200).json({ ok: true, saved: row });
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

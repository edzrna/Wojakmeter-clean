import { neon } from "@neondatabase/serverless";
import { moodFromScore, WEIGHTS } from "../../lib/market-index";
import { PROFILES, PROFILE_ORDER, applyProfile, deriveAxes, disagreementFrom }
  from "../../lib/hero-profiles";

export const config = { runtime: "nodejs" };

/* ===========================================================
   INDEX SCORE — lectura del índice canónico

   GET /api/index-score?profile=straight

   Devuelve el último índice guardado por el cron, su desglose por
   componente y los cuatro ejes de expresión ya calculados.

   POR QUÉ AQUÍ NO SE CALCULA NADA:
   El índice lo produce el cron cada 15 minutos y se guarda. Este
   endpoint solo lee. Si calculara por su cuenta, dos visitantes
   podrían recibir números distintos del mismo instante, y el
   histórico dejaría de coincidir con lo que la gente vio.

   Una medición se hace una vez y se consulta muchas.

   EL PERFIL NO TOCA EL NÚMERO. `score` es canónico y es el mismo
   para todos; `expressive` es la lectura del perfil y solo sirve
   para elegir la cara. Los dos viajan juntos a propósito, para
   que la interfaz nunca tenga que elegir cuál es el dato.
   =========================================================== */

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined");
  return neon(url);
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ ok: false, error: "no_database" });
  }

  const profileId = PROFILES[String(req.query?.profile || "")] 
    ? String(req.query.profile) : "straight";

  let sql;
  try {
    sql = getSql();
  } catch (error) {
    return res.status(200).json({ ok: false, error: "db_init_failed", detail: error?.message });
  }

  try {
    /* La última lectura con índice nuevo. Puede no haber ninguna
       todavía: el cron lleva rellenando estas columnas desde que
       se desplegó, y antes de eso están vacías. */
    const [latest] = await sql`
      SELECT ts, score, index_score, index_conf, index_parts, mood,
             breadth, volatility, change_24h
      FROM emotion_history
      WHERE index_score IS NOT NULL
      ORDER BY ts DESC
      LIMIT 1;
    `;

    if (!latest) {
      return res.status(200).json({
        ok: false,
        error: "no_index_yet",
        /* Se dice cuántas lecturas hacen falta en vez de dejar un
           error mudo: el índice necesita historia para existir. */
        hint: "El cron aún no ha guardado ninguna lectura con el índice nuevo."
      });
    }

    /* El índice de hace una hora, para la derivada. Es lo que
       distingue "saltó de 40 a 62" de "lleva tres días en 62",
       que son el mismo número y dos situaciones opuestas. */
    const [hourAgo] = await sql`
      SELECT index_score
      FROM emotion_history
      WHERE index_score IS NOT NULL
        AND ts <= NOW() - INTERVAL '1 hour'
      ORDER BY ts DESC
      LIMIT 1;
    `;

    const canonical = Number(latest.index_score);
    const delta = hourAgo ? canonical - Number(hourAgo.index_score) : 0;

    /* Cuánto lleva el mercado en el mismo estado. Alimenta la
       fatiga: es el aburrimiento medido, no simulado. */
    const currentMood = moodFromScore(canonical);
    const [streak] = await sql`
      SELECT EXTRACT(EPOCH FROM (NOW() - COALESCE(
        (SELECT MAX(ts) FROM emotion_history
          WHERE index_score IS NOT NULL
            AND ts < NOW()
            AND (CASE
                  WHEN index_score >= 85 THEN 'euphoria'
                  WHEN index_score >= 70 THEN 'content'
                  WHEN index_score >= 60 THEN 'optimism'
                  WHEN index_score >= 45 THEN 'neutral'
                  WHEN index_score >= 35 THEN 'doubt'
                  WHEN index_score >= 20 THEN 'concern'
                  ELSE 'frustration' END) IS DISTINCT FROM ${currentMood}),
        (SELECT MIN(ts) FROM emotion_history)
      )))::bigint AS seconds;
    `;

    /* ── LAS VENTANAS, CALCULADAS AQUÍ ──

       El cliente las derivaba de /api/history, y eso resultó ser
       frágil por dos motivos: ese endpoint no devuelve
       index_score, así que el promedio salía de la columna `score`
       —la fórmula vieja— o no salía en absoluto, y entonces las
       tres pills mostraban el mismo número.

       Se calculan sobre emotion_history directamente, donde
       index_score sí existe, y viajan con el resto. El cliente
       deja de tener que reconstruir un dato que la base ya sabe.

       AVG para el nivel y primera/última lectura para el
       movimiento: la media dice cómo se sintió la ventana, el
       delta dice hacia dónde iba. */
    const [win] = await sql`
      WITH w AS (
        SELECT
          ts, index_score,
          CASE
            WHEN ts > NOW() - INTERVAL '24 hours' THEN '24h'
            WHEN ts > NOW() - INTERVAL '7 days'   THEN '7d'
            ELSE '30d'
          END AS bucket
        FROM emotion_history
        WHERE index_score IS NOT NULL
          AND ts > NOW() - INTERVAL '30 days'
      )
      SELECT
        ROUND(AVG(index_score) FILTER (WHERE ts > NOW() - INTERVAL '24 hours'))::int AS avg_24h,
        ROUND(AVG(index_score) FILTER (WHERE ts > NOW() - INTERVAL '7 days'))::int   AS avg_7d,
        ROUND(AVG(index_score))::int                                                  AS avg_30d,
        COUNT(*) FILTER (WHERE ts > NOW() - INTERVAL '24 hours')                      AS n_24h,
        COUNT(*) FILTER (WHERE ts > NOW() - INTERVAL '7 days')                        AS n_7d,
        COUNT(*)                                                                      AS n_30d,
        (SELECT index_score FROM w WHERE ts > NOW() - INTERVAL '24 hours'
           ORDER BY ts ASC LIMIT 1)                                                   AS first_24h,
        (SELECT index_score FROM w WHERE ts > NOW() - INTERVAL '7 days'
           ORDER BY ts ASC LIMIT 1)                                                   AS first_7d,
        (SELECT index_score FROM w ORDER BY ts ASC LIMIT 1)                            AS first_30d
      FROM w;
    `;

    /* Una ventana con menos de 3 lecturas no es una media, es una
       lectura suelta con pretensiones: se devuelve null y el
       cliente usa el índice del momento. */
    const ventana = (avg, first, n) => {
      const a = Number(avg);
      if (!Number.isFinite(a) || Number(n) < 3) return null;
      const f = Number(first);
      return {
        score: a,
        delta: Number.isFinite(f) ? canonical - f : 0,
        samples: Number(n)
      };
    };

    const windows = {
      "24h": ventana(win?.avg_24h, win?.first_24h, win?.n_24h),
      "7d":  ventana(win?.avg_7d,  win?.first_7d,  win?.n_7d),
      "30d": ventana(win?.avg_30d, win?.first_30d, win?.n_30d)
    };

    const parts = latest.index_parts || {};
    const volatilityZ = Number(latest.volatility) || 0;

    const expression = deriveAxes({
      canonicalScore: canonical,
      delta,
      volatilityZ,
      streakSeconds: Number(streak?.seconds || 0),
      disagreement: disagreementFrom(parts),
      profileId
    });

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

    return res.status(200).json({
      ok: true,
      ts: new Date(latest.ts).getTime(),

      /* ── EL DATO ── mismo para todo el mundo */
      score: canonical,
      mood: currentMood,
      confidence: Number(latest.index_conf ?? 0),
      parts,
      weights: WEIGHTS,
      missing: Object.keys(WEIGHTS).filter((k) =>
        parts[k] === null || parts[k] === undefined),

      /* Mediciones crudas, por si la interfaz quiere explicarlas */
      measurements: {
        change: Number(latest.change_24h),
        breadth: latest.breadth === null ? null : Number(latest.breadth),
        volatility: latest.volatility === null ? null : Number(latest.volatility)
      },

      /* Movimiento reciente: es lo que produce la reacción */
      delta,

      /* Media y movimiento por ventana. Es lo que mueven las pills
         del héroe; si una viene null, no hay datos suficientes y
         el cliente debe usar el índice del momento. */
      windows,
      streakSeconds: Number(streak?.seconds || 0),

      /* ── LA LENTE ── cambia con el perfil, nunca es el dato */
      profile: {
        id: profileId,
        name: PROFILES[profileId].name,
        tagline: PROFILES[profileId].tagline
      },
      expressive: expression.expressive,
      expressiveMood: expression.mood,
      axes: expression.axes,

      /* El índice leído por los cinco, para la interfaz de
         selección: se elige viendo qué cara pone cada uno. */
      profiles: PROFILE_ORDER.map((id) => ({
        id,
        name: PROFILES[id].name,
        tagline: PROFILES[id].tagline,
        blurb: PROFILES[id].blurb,
        score: applyProfile(canonical, id),
        mood: moodFromScore(applyProfile(canonical, id))
      })),

      /* El score viejo, mientras dure la transición */
      legacyScore: Number(latest.score)
    });
  } catch (error) {
    console.error("index-score error:", error);
    return res.status(200).json({
      ok: false,
      error: "read_failed",
      detail: error?.message,
      name: error?.name
    });
  }
}

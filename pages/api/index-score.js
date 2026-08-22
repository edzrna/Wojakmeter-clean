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

    const parts = latest.index_parts || {};
    const volatilityZ = Number(latest.volatility) || 0;
    const streakSeconds = Number(streak?.seconds || 0);
    const disagreement = disagreementFrom(parts);

    const expression = deriveAxes({
      canonicalScore: canonical,
      delta,
      volatilityZ,
      streakSeconds,
      disagreement,
      profileId
    });

    /* ===========================================================
       LAS VENTANAS

       El personaje no solo enseña un numero por ventana: enseña una
       REACCION por ventana. Y la reaccion sale de los ejes, no del
       score. Devolviendo solo `axes` —los del momento— las tres
       pills mostraban la misma agitacion aunque 24H hubiera caido
       40 puntos y 7D apenas 8: el numero cambiaba de sitio y la
       cara seguia temblando igual.

       Asi que cada ventana trae su score, su delta y SUS PROPIOS
       ejes, calculados con la misma `deriveAxes` que el momento. No
       hay una segunda formula: es la misma funcion con la entrada
       de esa ventana.

       Una sola consulta para las tres. Tres consultas separadas
       serian tres viajes a Neon para el mismo escaneo de tabla.
       =========================================================== */
    const windowRows = await sql`
      SELECT
        w.key                                              AS key,
        ROUND(AVG(e.index_score))::int                     AS score,
        AVG(e.volatility)                                  AS volatility,
        COUNT(*)::int                                      AS samples,
        (array_agg(e.index_score ORDER BY e.ts ASC))[1]    AS first_score,
        (array_agg(e.index_score ORDER BY e.ts DESC))[1]   AS last_score
      FROM (VALUES
        ('24h', '24 hours'),
        ('7d',  '7 days'),
        ('30d', '30 days')
      ) AS w(key, span)
      JOIN emotion_history e
        ON e.ts > NOW() - w.span::interval
       AND e.index_score IS NOT NULL
      GROUP BY w.key;
    `;

    /* Menos de tres lecturas no es una ventana, es una anecdota: se
       devuelve null y el cliente se queda con el indice del momento.
       Un numero peor antes que uno inventado. */
    const MIN_SAMPLES = 3;

    const windows = {};
    for (const row of windowRows) {
      if (Number(row.samples) < MIN_SAMPLES) continue;

      const wScore = Number(row.score);
      const wDelta = Math.round(Number(row.last_score) - Number(row.first_score));
      const wVol = row.volatility === null ? volatilityZ : Number(row.volatility);

      const wExpr = deriveAxes({
        canonicalScore: wScore,
        delta: wDelta,
        volatilityZ: wVol,
        /* La racha y el desacuerdo son del estado actual y no se
           pueden recortar por ventana con lo que hay guardado.
           Se pasan tal cual en vez de inventar una version por
           ventana que nadie ha medido. */
        streakSeconds,
        disagreement,
        profileId
      });

      windows[row.key] = {
        score: wScore,
        delta: wDelta,
        samples: Number(row.samples),
        mood: moodFromScore(wScore),
        expressive: wExpr.expressive,
        axes: wExpr.axes
      };
    }

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
      streakSeconds,

      /* Cada pill del heroe lee de aqui: score, delta y ejes
         propios. Si una ventana falta, el cliente usa el momento. */
      windows,

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

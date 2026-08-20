import { neon } from "@neondatabase/serverless";

export const config = { runtime: "nodejs" };

/* ===========================================================
   HISTORY (lectura)

   GET /api/history?range=7d

   Devuelve la serie temporal Y las estadísticas derivadas.
   Las estadísticas son lo que convierte esto en producto:
   una serie sola es un gráfico bonito; "llevas 6 días en Doubt,
   el tramo más largo desde marzo" es una razón para volver.
   =========================================================== */

/* Igual que en history-snapshot: la conexión se crea dentro del
   handler. A nivel de módulo, un DATABASE_URL ausente reventaba
   antes de entrar al handler y devolvía un 500 opaco. */
function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined");
  return neon(url);
}

/* Cada rango tiene su granularidad. Sin agregar, "90d" serían
   8.640 puntos para dibujar en 900px de ancho: absurdo de
   transferir y de renderizar. */
const RANGES = {
  "24h": { interval: "24 hours",  bucket: "30 minutes" },
  "7d":  { interval: "7 days",    bucket: "2 hours"    },
  "30d": { interval: "30 days",   bucket: "8 hours"    },
  "90d": { interval: "90 days",   bucket: "1 day"      },
  "all": { interval: "3650 days", bucket: "1 day"      }
};

function moodFromScore(score) {
  if (score >= 85) return "euphoria";
  if (score >= 70) return "content";
  if (score >= 60) return "optimism";
  if (score >= 45) return "neutral";
  if (score >= 35) return "doubt";
  if (score >= 20) return "concern";
  return "frustration";
}

export default async function handler(req, res) {
  const rangeKey = RANGES[String(req.query.range || "7d")] ? String(req.query.range) : "7d";
  const { interval, bucket } = RANGES[rangeKey];

  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ ok: false, error: "no_database", series: [], stats: null });
  }

  let sql;
  try {
    sql = getSql();
  } catch (error) {
    return res.status(200).json({
      ok: false, error: "db_init_failed", detail: error?.message,
      series: [], stats: null
    });
  }

  try {
    /* date_bin agrupa en cubos regulares. AVG del score dentro de
       cada cubo, más min/max para poder dibujar una banda de
       rango si algún día quieres mostrar dispersión. */
    const series = await sql`
      SELECT
        date_bin(${bucket}::interval, ts, TIMESTAMPTZ '2024-01-01') AS t,
        ROUND(AVG(score))::int AS score,
        MIN(score)::int        AS low,
        MAX(score)::int        AS high,
        -- index_score es el motor NUEVO; score es la fórmula
        -- antigua. Van en columnas separadas a propósito: durante
        -- la transición interesa poder comparar las dos series.
        -- index_n cuenta cuántas lecturas del cubo lo tienen.
        ROUND(AVG(index_score))::int AS index_score,
        COUNT(index_score)           AS index_n,
        ROUND(AVG(change_24h)::numeric, 2)::float AS change
      FROM emotion_history
      WHERE ts > NOW() - ${interval}::interval
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    const points = series.map((r) => {
      /* Un cubo puede mezclar lecturas con índice y sin él. Si
         ninguna lo tiene, se devuelve null en vez de un promedio
         de nada. */
      const idx = Number(r.index_n) > 0 ? r.index_score : null;

      return {
        ts: new Date(r.t).getTime(),
        score: r.score,
        index_score: idx,
        low: r.low,
        high: r.high,
        /* El mood sale del índice cuando existe: si la curva se
           dibuja con index_score, la etiqueta tiene que venir del
           mismo sitio. */
        mood: moodFromScore(idx ?? r.score),
        change: r.change
      };
    });

    /* ---------- Estadísticas ---------- */

    const [current] = await sql`
      SELECT score, mood, ts FROM emotion_history ORDER BY ts DESC LIMIT 1;
    `;

    /* Cuánto lleva el mercado en el mood actual.
       Buscamos el momento más reciente en que el mood era OTRO;
       todo lo posterior es la racha en curso. */
    const [streak] = current ? await sql`
      WITH last_change AS (
        SELECT MAX(ts) AS changed_at
        FROM emotion_history
        WHERE mood IS DISTINCT FROM ${current.mood}
      )
      SELECT
        COALESCE(changed_at, (SELECT MIN(ts) FROM emotion_history)) AS since,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(
          changed_at, (SELECT MIN(ts) FROM emotion_history)
        )))::bigint AS seconds
      FROM last_change;
    ` : [null];

    const [extremes] = await sql`
      SELECT
        MIN(score)::int AS min_score,
        MAX(score)::int AS max_score,
        ROUND(AVG(score))::int AS avg_score,
        COUNT(*)::int AS samples
      FROM emotion_history
      WHERE ts > NOW() - ${interval}::interval;
    `;

    /* Distribución por mood: qué porcentaje del periodo pasó el
       mercado en cada estado. Esto es material de contenido
       directo para X. */
    const distribution = await sql`
      SELECT mood, COUNT(*)::int AS n
      FROM emotion_history
      WHERE ts > NOW() - ${interval}::interval
      GROUP BY mood
      ORDER BY n DESC;
    `;

    const totalSamples = distribution.reduce((s, d) => s + d.n, 0) || 1;

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

    return res.status(200).json({
      ok: true,
      range: rangeKey,
      series: points,
      stats: {
        current: current
          ? { score: current.score, mood: current.mood, ts: new Date(current.ts).getTime() }
          : null,
        streakSeconds: streak ? Number(streak.seconds) : 0,
        streakSince: streak?.since ? new Date(streak.since).getTime() : null,
        min: extremes?.min_score ?? null,
        max: extremes?.max_score ?? null,
        avg: extremes?.avg_score ?? null,
        samples: extremes?.samples ?? 0,
        distribution: distribution.map((d) => ({
          mood: d.mood,
          pct: Math.round((d.n / totalSamples) * 100)
        }))
      }
    });
  } catch (error) {
    console.error("history error:", error);
    return res.status(200).json({
      ok: false,
      error: "history_failed",
      detail: error?.message,
      name: error?.name,
      series: [],
      stats: null
    });
  }
}

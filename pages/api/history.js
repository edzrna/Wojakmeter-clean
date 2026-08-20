import { neon } from "@neondatabase/serverless";

export const config = { runtime: "nodejs" };

/* ===========================================================
   HISTORY (lectura)

   GET /api/history?range=7d

   Devuelve la serie temporal Y las estadísticas derivadas.
   Las estadísticas son lo que convierte esto en producto:
   una serie sola es un gráfico bonito; "llevas 6 días en Doubt,
   el tramo más largo desde marzo" es una razón para volver.

   ---------------------------------------------------------
   DOS COLUMNAS DE SCORE — LA TRAMPA DE ESTE ENDPOINT

   `emotion_history` guarda DOS cifras por fila:

     score        fórmula vieja de script.js
     index_score  motor nuevo (lib/market-index.js)

   Las dos son números plausibles de 0 a 100, así que
   confundirlas NO da error: da una cifra creíble y equivocada.
   Hasta ahora este endpoint solo leía `score`, por lo que
   hero-rig.js no recibía `index_score` y las pills del héroe
   no podían mover el número al índice canónico.

   Ahora se devuelven LAS DOS, sin renombrar ninguna. `score`
   sigue significando exactamente lo que significaba, para no
   romper lo que ya lo consume (renderHistory,
   getHistoryRangePosition, buildHeroTimeline).
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

/* ===========================================================
   SONDA DE COLUMNA

   `market-index.sql` está en la lista de pendientes: no hay
   confirmación de que se ejecutara en Neon. Si la columna no
   existe y la pedimos a pelo, Postgres lanza 42703, el catch
   se traga TODO y el endpoint devuelve `series: []` — es decir,
   la sección de histórico entera desaparece por una columna que
   es opcional. Preguntamos una vez por instancia y elegimos
   consulta; el resultado se cachea en memoria del módulo.

   El SÍ se cachea para siempre: una columna no se borra sola.
   El NO se cachea 60 s y se vuelve a preguntar. Si se cachea el
   negativo de por vida, el día que ejecutes `market-index.sql`
   las instancias ya calientes seguirían sirviendo `hasIndex:
   false` hasta reciclarse, y parecería que el SQL no funcionó.
   =========================================================== */
const INDEX_PROBE_RETRY_MS = 60_000;
let indexColumnCache = null;
let indexColumnCheckedAt = 0;

/* Para arneses: permite volver al estado inicial sin recargar el
   módulo. En producción no lo llama nadie. */
export function resetIndexProbe() {
  indexColumnCache = null;
  indexColumnCheckedAt = 0;
}

async function hasIndexColumn(sql) {
  if (indexColumnCache === true) return true;
  if (indexColumnCache === false && Date.now() - indexColumnCheckedAt < INDEX_PROBE_RETRY_MS) {
    return false;
  }

  try {
    const rows = await sql`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'emotion_history'
        AND column_name = 'index_score'
      LIMIT 1;
    `;
    indexColumnCache = rows.length > 0;
  } catch {
    /* Si ni siquiera podemos mirar el catálogo, asumimos que no
       está: perder el índice es degradar, pedirlo sin que exista
       es romper. */
    indexColumnCache = false;
  }

  indexColumnCheckedAt = Date.now();
  return indexColumnCache;
}

/* ===========================================================
   REPARTO DE PORCENTAJES

   Redondear cada parte por separado no suma 100: con 60 y 36
   sobre 96 salía "Doubt 63% · Neutral 38%" = 101%. Método del
   resto mayor: se reparten los enteros y los puntos que sobran
   van a las partes con mayor decimal truncado.
   =========================================================== */
function distributePercentages(rows, total) {
  if (!rows.length || !total) return [];

  const raw = rows.map((d) => ({ mood: d.mood, exact: (d.n / total) * 100 }));
  const out = raw.map((r) => ({ mood: r.mood, pct: Math.floor(r.exact) }));

  let remainder = 100 - out.reduce((s, r) => s + r.pct, 0);

  const byFraction = raw
    .map((r, i) => ({ i, frac: r.exact - Math.floor(r.exact) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < byFraction.length && remainder > 0; k++, remainder--) {
    out[byFraction[k].i].pct += 1;
  }

  return out;
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
    const withIndex = await hasIndexColumn(sql);

    /* date_bin agrupa en cubos regulares. AVG del score dentro de
       cada cubo, más min/max para poder dibujar una banda de
       rango si algún día quieres mostrar dispersión.

       Dos variantes literales en vez de interpolar el nombre de
       la columna: el tagged template de neon parametriza valores,
       no identificadores, y montar SQL a mano aquí sería abrir
       inyección por la puerta de atrás.

       AVG ignora NULL, así que los cubos anteriores al motor
       nuevo devuelven `index_score: null` en vez de mentir con un
       número. El cliente decide si cae al score viejo. */
    const series = withIndex
      ? await sql`
          SELECT
            date_bin(${bucket}::interval, ts, TIMESTAMPTZ '2024-01-01') AS t,
            ROUND(AVG(score))::int AS score,
            MIN(score)::int        AS low,
            MAX(score)::int        AS high,
            ROUND(AVG(index_score))::int AS index_score,
            MIN(index_score)::int        AS index_low,
            MAX(index_score)::int        AS index_high,
            ROUND(AVG(change_24h)::numeric, 2)::float AS change
          FROM emotion_history
          WHERE ts > NOW() - ${interval}::interval
          GROUP BY 1
          ORDER BY 1 ASC;
        `
      : await sql`
          SELECT
            date_bin(${bucket}::interval, ts, TIMESTAMPTZ '2024-01-01') AS t,
            ROUND(AVG(score))::int AS score,
            MIN(score)::int        AS low,
            MAX(score)::int        AS high,
            NULL::int AS index_score,
            NULL::int AS index_low,
            NULL::int AS index_high,
            ROUND(AVG(change_24h)::numeric, 2)::float AS change
          FROM emotion_history
          WHERE ts > NOW() - ${interval}::interval
          GROUP BY 1
          ORDER BY 1 ASC;
        `;

    const points = series.map((r) => {
      const idx = r.index_score === null || r.index_score === undefined
        ? null
        : Number(r.index_score);

      return {
        ts: new Date(r.t).getTime(),
        score: r.score,
        low: r.low,
        high: r.high,
        mood: moodFromScore(r.score),

        /* Nombre en snake_case a propósito: es el que espera
           hero-rig.js (pointIndex) y el que tiene la columna.
           `indexScore` va como alias para el código que sigue
           el estilo camelCase del resto del cliente. */
        index_score: idx,
        indexScore:  idx,
        index_low:   r.index_low ?? null,
        index_high:  r.index_high ?? null,
        index_mood:  idx === null ? null : moodFromScore(idx),

        change: r.change
      };
    });

    /* ---------- Estadísticas ---------- */

    const [current] = withIndex
      ? await sql`
          SELECT score, index_score, mood, ts
          FROM emotion_history ORDER BY ts DESC LIMIT 1;
        `
      : await sql`
          SELECT score, NULL::int AS index_score, mood, ts
          FROM emotion_history ORDER BY ts DESC LIMIT 1;
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

    /* `samples` cuenta filas; `indexSamples` cuenta filas que YA
       traen índice. La diferencia entre ambos es exactamente el
       dato que hacía falta para comparar índice viejo vs nuevo
       (la consulta de market-index.sql) y para que el cliente
       sepa si puede fiarse del índice en esta ventana. */
    const [extremes] = withIndex
      ? await sql`
          SELECT
            MIN(score)::int AS min_score,
            MAX(score)::int AS max_score,
            ROUND(AVG(score))::int AS avg_score,
            COUNT(*)::int AS samples,
            MIN(index_score)::int AS min_index,
            MAX(index_score)::int AS max_index,
            ROUND(AVG(index_score))::int AS avg_index,
            COUNT(index_score)::int AS index_samples
          FROM emotion_history
          WHERE ts > NOW() - ${interval}::interval;
        `
      : await sql`
          SELECT
            MIN(score)::int AS min_score,
            MAX(score)::int AS max_score,
            ROUND(AVG(score))::int AS avg_score,
            COUNT(*)::int AS samples,
            NULL::int AS min_index,
            NULL::int AS max_index,
            NULL::int AS avg_index,
            0::int AS index_samples
          FROM emotion_history
          WHERE ts > NOW() - ${interval}::interval;
        `;

    /* Distribución por mood: qué porcentaje del periodo pasó el
       mercado en cada estado. Esto es material de contenido
       directo para X.

       Sigue saliendo de la columna `mood`, que es la del score
       viejo. Cambiarla al índice aquí, en silencio, movería los
       porcentajes sin que nada lo anuncie: es una decisión de
       producto, no de fontanería. */
    const distribution = await sql`
      SELECT mood, COUNT(*)::int AS n
      FROM emotion_history
      WHERE ts > NOW() - ${interval}::interval
      GROUP BY mood
      ORDER BY n DESC;
    `;

    const totalSamples = distribution.reduce((s, d) => s + d.n, 0) || 1;

    const currentIndex = current && current.index_score !== null && current.index_score !== undefined
      ? Number(current.index_score)
      : null;

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

    return res.status(200).json({
      ok: true,
      range: rangeKey,

      /* Bandera explícita para el cliente y para el aviso de
         consola de hero-rig.js: distingue "la columna no existe"
         de "existe pero aún no hay filas con índice". */
      hasIndex: withIndex,

      series: points,
      stats: {
        current: current
          ? {
              score: current.score,
              indexScore: currentIndex,
              index_score: currentIndex,
              mood: current.mood,
              indexMood: currentIndex === null ? null : moodFromScore(currentIndex),
              ts: new Date(current.ts).getTime()
            }
          : null,
        streakSeconds: streak ? Number(streak.seconds) : 0,
        streakSince: streak?.since ? new Date(streak.since).getTime() : null,
        min: extremes?.min_score ?? null,
        max: extremes?.max_score ?? null,
        avg: extremes?.avg_score ?? null,
        samples: extremes?.samples ?? 0,

        /* Estadísticas del índice, en claves propias. Nunca
           sobrescriben min/max/avg: quien lea `avg` sigue leyendo
           la media del score viejo, como antes. */
        minIndex: extremes?.min_index ?? null,
        maxIndex: extremes?.max_index ?? null,
        avgIndex: extremes?.avg_index ?? null,
        indexSamples: extremes?.index_samples ?? 0,

        distribution: distributePercentages(distribution, totalSamples)
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

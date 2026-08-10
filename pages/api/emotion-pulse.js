import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

export const config = { runtime: "nodejs" };

/* ===========================================================
   EMOTION PULSE

   GET  /api/emotion-pulse?window=24h&voter=<uuid>
   POST /api/emotion-pulse  { emotion, voter, marketScore, marketMood }

   QUE CAMBIA RESPECTO A ANTES:
   El panel arrancaba con 38 votos escritos a mano en script.js y
   los votos vivian en memoria: al recargar volvian a los mismos 38.
   Ese numero entraba al indice compuesto con peso 0.10, o sea que
   un dato inventado movia el score que ve la gente.

   AHORA:
   - Una fila por voto en Postgres, no contadores.
   - Ventana rodante de 24h. Un acumulado desde el dia uno se
     congela y vuelve a ser decorativo; "right now" tiene que
     significar algo.
   - Un voto vigente por votante dentro de la ventana. Volver a
     votar ACTUALIZA el voto, no suma otro.
   - Se guarda el market_score del momento del voto. Sin eso no se
     puede reconstruir despues si la comunidad acerto o no, que es
     la unica razon por la que este panel merece existir.

   PRIVACIDAD:
   Ni el id del votante ni la IP se guardan en claro. Ambos entran
   hasheados con sal (PULSE_SALT). La tabla no permite volver a
   ninguna persona.
   =========================================================== */

/* Igual que en history.js y history-snapshot.js: la conexion se crea
   DENTRO del handler. A nivel de modulo, un DATABASE_URL ausente
   revienta antes de entrar y devuelve un 500 opaco. */
function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined");
  return neon(url);
}

/* ESPEJO de PULSE_WEIGHTS en script.js. Si cambian alli, cambian
   aqui, o el score guardado no sera el que ve el usuario. Mismo
   contrato que la formula tanh de history-snapshot. */
const PULSE_WEIGHTS = {
  frustration: 10, concern: 25, doubt: 40, neutral: 50,
  optimism: 65, content: 75, euphoria: 90
};

const EMOTIONS = Object.keys(PULSE_WEIGHTS);

const WINDOWS = {
  "1h":  "1 hour",
  "6h":  "6 hours",
  "24h": "24 hours",
  "7d":  "7 days"
};

/* Un voto cada 60s por votante. No es seguridad, es anti doble
   click: la identidad es un UUID de localStorage y cualquiera puede
   borrarlo. El limite por red de abajo es el que hace el trabajo. */
const VOTE_COOLDOWN_MS = 60 * 1000;

/* Votos distintos permitidos desde una misma red en la ventana. Un
   numero bajo bloquearia oficinas y universidades enteras detras de
   un NAT; uno alto invita al relleno. 8 es el punto medio. */
const MAX_VOTES_PER_NETWORK = 8;

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function roundScore(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(clamp(n, 0, 100)) : 50;
}

/* ESPEJO de moodFromScore en history.js y script.js. */
function moodFromScore(score) {
  if (score >= 85) return "euphoria";
  if (score >= 70) return "content";
  if (score >= 60) return "optimism";
  if (score >= 45) return "neutral";
  if (score >= 35) return "doubt";
  if (score >= 20) return "concern";
  return "frustration";
}

function getSalt() {
  /* PULSE_SALT es lo correcto. El fallback a CRON_SECRET evita que
     el endpoint quede inutilizable si falta la variable, pero
     conviene definir la propia: si algun dia rotas CRON_SECRET, sin
     PULSE_SALT todas las identidades cambian de golpe y la ventana
     se llena de votos duplicados. */
  return process.env.PULSE_SALT || process.env.CRON_SECRET || "wojakmeter-pulse-v1";
}

function hashValue(value) {
  return createHash("sha256")
    .update(`${getSalt()}::${String(value || "")}`)
    .digest("hex")
    .slice(0, 40);
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd.length) return String(fwd[0]).trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function emptyCounts() {
  const out = {};
  EMOTIONS.forEach((k) => { out[k] = 0; });
  return out;
}

function scoreFromCounts(counts) {
  let total = 0;
  let sum = 0;
  EMOTIONS.forEach((k) => {
    const n = Number(counts[k] || 0);
    total += n;
    sum += PULSE_WEIGHTS[k] * n;
  });
  if (!total) return { total: 0, score: 50 };
  return { total, score: roundScore(sum / total) };
}

/* Lectura agregada de la ventana. Se usa en GET y tambien al final
   del POST, para que el cliente reciba el estado real en vez de
   quedarse con su suma optimista. */
async function readWindow(sql, interval, voterHash) {
  const rows = await sql`
    SELECT emotion, COUNT(*)::int AS n
    FROM emotion_pulse_votes
    WHERE created_at > NOW() - ${interval}::interval
    GROUP BY emotion;
  `;

  const counts = emptyCounts();
  rows.forEach((r) => {
    if (Object.prototype.hasOwnProperty.call(counts, r.emotion)) {
      counts[r.emotion] = r.n;
    }
  });

  let myVote = null;
  let cooldownMs = 0;

  if (voterHash) {
    const [mine] = await sql`
      SELECT emotion, updated_at
      FROM emotion_pulse_votes
      WHERE voter_hash = ${voterHash}
        AND created_at > NOW() - ${interval}::interval
      ORDER BY updated_at DESC
      LIMIT 1;
    `;
    if (mine) {
      myVote = mine.emotion;
      const elapsed = Date.now() - new Date(mine.updated_at).getTime();
      cooldownMs = Math.max(0, VOTE_COOLDOWN_MS - elapsed);
    }
  }

  const { total, score } = scoreFromCounts(counts);

  return {
    counts,
    total,
    score,
    mood: total ? moodFromScore(score) : null,
    myVote,
    cooldownMs
  };
}

export default async function handler(req, res) {
  const windowKey = WINDOWS[String(req.query?.window || "24h")] ? String(req.query.window) : "24h";
  const interval = WINDOWS[windowKey];

  /* Sin base de datos el panel no debe inventarse nada: devuelve
     ok:false y el cliente pinta el estado "unavailable". */
  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ ok: false, error: "no_database" });
  }

  let sql;
  try {
    sql = getSql();
  } catch (error) {
    return res.status(200).json({ ok: false, error: "db_init_failed", detail: error?.message });
  }

  /* ------------------------------ GET ------------------------------ */
  if (req.method === "GET") {
    try {
      const voterHash = req.query?.voter ? hashValue(req.query.voter) : null;
      const data = await readWindow(sql, interval, voterHash);

      /* Sin cache compartida: la respuesta incluye myVote, que es
         distinto para cada visitante. Un s-maxage aqui serviria el
         voto de una persona a todas las demas. */
      res.setHeader("Cache-Control", "private, no-store");

      return res.status(200).json({ ok: true, window: windowKey, ...data });
    } catch (error) {
      console.error("emotion-pulse GET error:", error);
      return res.status(200).json({
        ok: false, error: "pulse_read_failed", detail: error?.message, name: error?.name
      });
    }
  }

  /* ------------------------------ POST ----------------------------- */
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const emotion = String(body.emotion || "");
  if (!PULSE_WEIGHTS[emotion]) {
    return res.status(400).json({ ok: false, error: "invalid_emotion" });
  }

  const voterRaw = String(body.voter || "");
  if (voterRaw.length < 8 || voterRaw.length > 128) {
    return res.status(400).json({ ok: false, error: "invalid_voter" });
  }

  const voterHash = hashValue(voterRaw);
  const ipHash = hashValue(getClientIp(req));

  const marketScore = Number.isFinite(Number(body.marketScore))
    ? roundScore(body.marketScore)
    : null;
  const marketMood = typeof body.marketMood === "string" && body.marketMood.length <= 20
    ? body.marketMood
    : (marketScore === null ? null : moodFromScore(marketScore));

  try {
    /* 1. Voto vigente de este votante dentro de la ventana. */
    const [existing] = await sql`
      SELECT id, emotion, updated_at
      FROM emotion_pulse_votes
      WHERE voter_hash = ${voterHash}
        AND created_at > NOW() - ${interval}::interval
      ORDER BY updated_at DESC
      LIMIT 1;
    `;

    if (existing) {
      const elapsed = Date.now() - new Date(existing.updated_at).getTime();
      if (elapsed < VOTE_COOLDOWN_MS) {
        return res.status(429).json({
          ok: false,
          error: "cooldown",
          cooldownMs: Math.max(0, VOTE_COOLDOWN_MS - elapsed)
        });
      }
    } else {
      /* 2. Limite por red, solo para votantes nuevos: si ya tienes
            voto en la ventana estas actualizando, no anadiendo. */
      const [{ n }] = await sql`
        SELECT COUNT(DISTINCT voter_hash)::int AS n
        FROM emotion_pulse_votes
        WHERE ip_hash = ${ipHash}
          AND created_at > NOW() - ${interval}::interval;
      `;
      if (Number(n) >= MAX_VOTES_PER_NETWORK) {
        return res.status(429).json({ ok: false, error: "rate_limited" });
      }
    }

    const pulseValue = PULSE_WEIGHTS[emotion];

    if (existing) {
      await sql`
        UPDATE emotion_pulse_votes
        SET emotion      = ${emotion},
            pulse_value  = ${pulseValue},
            market_score = COALESCE(${marketScore}, market_score),
            market_mood  = COALESCE(${marketMood}, market_mood),
            updated_at   = NOW()
        WHERE id = ${existing.id};
      `;
    } else {
      await sql`
        INSERT INTO emotion_pulse_votes
          (voter_hash, ip_hash, emotion, pulse_value, market_score, market_mood)
        VALUES
          (${voterHash}, ${ipHash}, ${emotion}, ${pulseValue}, ${marketScore}, ${marketMood});
      `;
    }

    /* Se devuelve la ventana recalculada, no un ok pelado: asi el
       cliente reemplaza su suma optimista por el conteo real y dos
       pestanas abiertas no acaban mostrando numeros distintos. */
    const data = await readWindow(sql, interval, voterHash);

    return res.status(200).json({
      ok: true,
      window: windowKey,
      updated: Boolean(existing),
      ...data,
      cooldownMs: VOTE_COOLDOWN_MS
    });
  } catch (error) {
    console.error("emotion-pulse POST error:", error);
    return res.status(500).json({
      ok: false,
      error: "vote_failed",
      detail: error?.message,
      name: error?.name,
      at: String(error?.stack || "").split("\n")[1]?.trim()
    });
  }
}

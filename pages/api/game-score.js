import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

export const config = { runtime: "nodejs" };

/* ===========================================================
   EMOTION RUSH — puntuaciones

   GET  /api/game-score?window=7d
   POST /api/game-score  { player, name, score, rounds, bestStreak,
                           marketScore, marketMood, durationMs }

   Misma identidad anonima que el Emotion Pulse: un UUID de
   localStorage que aqui se guarda hasheado con sal. No hay
   cuentas, ni correos, ni forma de volver a una persona.

   Se guarda el estado del mercado en el momento de la partida.
   Igual que en el pulse, esa columna es la que convierte una
   tabla de numeros en algo que se puede contar: si la gente
   puntua peor cuando el mercado esta en Frustration, eso es un
   dato sobre el mercado, no sobre el juego.
   =========================================================== */

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined");
  return neon(url);
}

const WINDOWS = { "24h": "24 hours", "7d": "7 days", "30d": "30 days", "all": "3650 days" };

const EMOTIONS = [
  "frustration", "concern", "doubt", "neutral", "optimism", "content", "euphoria"
];

/* ---------------------------------------------------------
   LIMITES DE CORDURA

   El cliente puede mandar lo que quiera: es JavaScript en el
   navegador del jugador. Nada de esto impide que alguien
   decidido falsee una puntuacion, y no hace falta que lo
   impida —no hay premio. Lo que si evita es que un 999999999
   accidental o un bot tonto arruinen la tabla para todos.

   El limite real es la coherencia: una puntuacion tiene que
   caber en las rondas declaradas, y las rondas tienen que
   caber en el tiempo declarado.
   --------------------------------------------------------- */

const MAX_POINTS_PER_ROUND = 500;
const MIN_MS_PER_ROUND = 260;
const MAX_SCORE = 200000;
const MAX_ROUNDS = 500;

function getSalt() {
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

/* Solo se permite lo imprimible y corriente. Sin esto, el nombre
   es un vector de inyeccion en cualquier sitio donde se muestre
   sin escapar, y una invitacion a rellenar la tabla de basura. */
function cleanName(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 18);
  if (!trimmed) return null;
  if (!/^[\p{L}\p{N} ._-]+$/u.test(trimmed)) return null;
  return trimmed;
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ ok: false, error: "no_database", top: [] });
  }

  let sql;
  try {
    sql = getSql();
  } catch (error) {
    return res.status(200).json({ ok: false, error: "db_init_failed", detail: error?.message, top: [] });
  }

  const windowKey = WINDOWS[String(req.query?.window || "7d")] ? String(req.query.window) : "7d";
  const interval = WINDOWS[windowKey];

  /* ------------------------------ GET ------------------------------ */
  if (req.method === "GET") {
    try {
      /* Una entrada por jugador: su mejor partida. Sin el
         DISTINCT ON, el primero que juegue veinte veces ocupa la
         tabla entera y nadie mas aparece nunca. */
      const top = await sql`
        SELECT DISTINCT ON (player_hash)
          player_hash, name, score, rounds, best_streak, market_mood, created_at
        FROM game_scores
        WHERE created_at > NOW() - ${interval}::interval
        ORDER BY player_hash, score DESC
      `;

      const ranked = top
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((r) => ({
          name: r.name,
          score: r.score,
          rounds: r.rounds,
          best_streak: r.best_streak,
          market_mood: r.market_mood
        }));

      res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
      return res.status(200).json({ ok: true, window: windowKey, top: ranked });
    } catch (error) {
      console.error("game-score GET error:", error);
      return res.status(200).json({ ok: false, error: "read_failed", detail: error?.message, top: [] });
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

  const playerRaw = String(body.player || "");
  if (playerRaw.length < 8 || playerRaw.length > 128) {
    return res.status(400).json({ ok: false, error: "invalid_player" });
  }

  const score  = Math.floor(Number(body.score));
  const rounds = Math.floor(Number(body.rounds));
  const streak = Math.floor(Number(body.bestStreak || 0));
  const durationMs = Math.floor(Number(body.durationMs || 0));

  if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE) {
    return res.status(400).json({ ok: false, error: "invalid_score" });
  }
  if (!Number.isFinite(rounds) || rounds <= 0 || rounds > MAX_ROUNDS) {
    return res.status(400).json({ ok: false, error: "invalid_rounds" });
  }

  /* Coherencia interna: mas puntos de los que caben en esas
     rondas, o mas rondas de las que caben en ese tiempo. */
  if (score > rounds * MAX_POINTS_PER_ROUND) {
    return res.status(400).json({ ok: false, error: "implausible_score" });
  }
  if (durationMs > 0 && durationMs < rounds * MIN_MS_PER_ROUND) {
    return res.status(400).json({ ok: false, error: "implausible_duration" });
  }

  const playerHash = hashValue(playerRaw);
  const ipHash = hashValue(getClientIp(req));
  const name = cleanName(body.name);

  const marketScore = Number.isFinite(Number(body.marketScore))
    ? Math.max(0, Math.min(100, Math.round(Number(body.marketScore))))
    : null;

  const marketMood = EMOTIONS.includes(String(body.marketMood)) ? String(body.marketMood) : null;

  try {
    /* Antiflood por red: 40 partidas al dia desde una misma IP.
       Es alto a proposito —una casa o una oficina comparten IP y
       el juego se juega en rachas— pero corta un bucle
       automatizado. */
    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n
      FROM game_scores
      WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '24 hours';
    `;

    if (Number(n) >= 40) {
      return res.status(429).json({ ok: false, error: "rate_limited" });
    }

    await sql`
      INSERT INTO game_scores
        (player_hash, ip_hash, name, score, rounds, best_streak,
         market_score, market_mood, duration_ms)
      VALUES
        (${playerHash}, ${ipHash}, ${name}, ${score}, ${rounds}, ${streak},
         ${marketScore}, ${marketMood}, ${durationMs || null});
    `;

    /* El puesto se calcula sobre el mejor de cada jugador, igual
       que la tabla, o alguien con veinte intentos mediocres
       apareceria por delante de una gran partida unica. */
    const [rank] = await sql`
      WITH bests AS (
        SELECT player_hash, MAX(score) AS best
        FROM game_scores
        WHERE created_at > NOW() - ${interval}::interval
        GROUP BY player_hash
      )
      SELECT
        (SELECT COUNT(*)::int FROM bests WHERE best > ${score}) + 1 AS rank,
        (SELECT COUNT(*)::int FROM bests) AS total;
    `;

    const top = await sql`
      SELECT DISTINCT ON (player_hash) player_hash, name, score, market_mood
      FROM game_scores
      WHERE created_at > NOW() - ${interval}::interval
      ORDER BY player_hash, score DESC
    `;

    const ranked = top
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => ({ name: r.name, score: r.score, market_mood: r.market_mood }));

    return res.status(200).json({
      ok: true,
      rank: rank?.rank ?? null,
      total: rank?.total ?? null,
      top: ranked
    });
  } catch (error) {
    console.error("game-score POST error:", error);
    return res.status(500).json({
      ok: false,
      error: "save_failed",
      detail: error?.message,
      name: error?.name
    });
  }
}

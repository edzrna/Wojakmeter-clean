// ===============================
// WOJAKMETER — DESK SESSION
// lib/desk/session.js
//
// The one definition of the desk session cookie, shared by
// middleware.js (Edge runtime) and the API routes (Node runtime).
// Web Crypto only, because that is what both runtimes have.
//
//   token = "s2" . exp . hex(HMAC-SHA256(DESK_SECRET, "wm-desk-session\ns2\n" + exp))
//
// v1 kept two copies of this logic (middleware and bot.js) that could
// drift apart. The "wm-desk-session" prefix keeps this signature from
// ever being valid anywhere else the same secret might be used.
//
// Rotating DESK_SECRET logs every session out. Changing the format
// again means changing the "s2" prefix, which does the same.
// ===============================

export const COOKIE_NAME = "wm_desk";
export const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

const PREFIX = "s2";
const DOMAIN = "wm-desk-session";
const encoder = new TextEncoder();

function subtle() {
  const s = globalThis.crypto && globalThis.crypto.subtle;
  if (!s) throw new Error("Web Crypto is not available — the desk needs Node 20 or newer");
  return s;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret, message) {
  const key = await subtle().importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await subtle().sign("HMAC", key, encoder.encode(message)));
}

// Constant time for equal lengths; the lengths here are fixed (64 hex)
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Session length from DESK_SESSION_MS, bounded to something sane
export function sessionTtlMs(raw = process.env.DESK_SESSION_MS) {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return DEFAULT_TTL_MS;
  return Math.min(Math.max(n, 5 * 60 * 1000), 30 * 24 * 60 * 60 * 1000);
}

export async function issueSession({ secret, now = Date.now(), ttlMs = DEFAULT_TTL_MS }) {
  if (!secret) throw new Error("DESK_SECRET is not set");
  const exp = now + ttlMs;
  const sig = await hmacHex(secret, `${DOMAIN}\n${PREFIX}\n${exp}`);
  return { token: `${PREFIX}.${exp}.${sig}`, exp };
}

// → { ok: true, exp } or { ok: false, reason }
// reason: "not-configured" | "missing" | "malformed" | "expired" | "invalid"
export async function verifySession(token, { secret, now = Date.now(), ttlMs = DEFAULT_TTL_MS }) {
  if (!secret) return { ok: false, reason: "not-configured" };
  if (!token) return { ok: false, reason: "missing" };

  const parts = String(token).split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, reason: "malformed" };

  const [, expStr, sig] = parts;
  if (!/^\d{13}$/.test(expStr) || !/^[0-9a-f]{64}$/.test(sig)) return { ok: false, reason: "malformed" };

  const exp = Number(expStr);
  if (now >= exp) return { ok: false, reason: "expired" };

  // Nothing this server issues outlives the configured session (plus a
  // minute of clock slack between instances)
  if (exp - now > ttlMs + 60 * 1000) return { ok: false, reason: "invalid" };

  const expected = await hmacHex(secret, `${DOMAIN}\n${PREFIX}\n${exp}`);
  return safeEqual(sig, expected) ? { ok: true, exp } : { ok: false, reason: "invalid" };
}

export function sessionCookie(token, { maxAgeSec, secure }) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearedCookie({ secure }) {
  return sessionCookie("", { maxAgeSec: 0, secure });
}

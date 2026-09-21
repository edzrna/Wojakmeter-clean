// ===============================
// WOJAKMETER — DESK PROXY LOGIC
// lib/desk/proxy.js  (Node runtime: used by pages/api/desk/bot.js)
//
// What the browser may ask the bot for, and how the request is signed.
//
// ALLOWLIST — every action names its method, its bot path and the
// exact parameters it accepts, each with the values it accepts. An
// unknown action, an unknown parameter, a value outside the list or a
// parameter sent twice is a 400 with the reason. v1 forwarded a
// `horizon` it never validated against the route, and let the query
// string travel outside the signature.
//
// SIGNATURE v2 — must match bot-v2/lib/desk-auth.js byte for byte:
//
//   "v2" \n ts \n nonce \n METHOD \n path-with-query \n sha256(body bytes)
//
// The path that is signed is taken from the final URL object, so it
// is exactly what the bot's Express sees as req.originalUrl.
// ===============================

import crypto from "crypto";

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export const ACTIONS = Object.freeze({
  "lab-status": { method: "GET", path: "/desk/lab/status", params: {} },
  "lab-state": { method: "GET", path: "/desk/lab/state", params: { model: ["hex", "hex2"] } },
  "lab-report": { method: "GET", path: "/desk/lab/report", params: { model: ["hex", "hex2", "linear"] } }
});

// Bot v1 actions. Bot v2 phase 1 does not trade, so these answer 410
// with the reason instead of a bare "unknown action" — an old desk
// panel that still calls them says why it is empty.
export const RETIRED = Object.freeze([
  "status", "positions", "history", "signals", "pause", "resume", "close", "recover", "edge", "divergence"
]);

function fail(status, error, extra = {}) {
  return { ok: false, status, error, ...extra };
}

// query: Next's req.query (values are string or string[])
export function resolveRequest(query, method) {
  const action = query?.action;

  if (action === undefined) return fail(400, "Missing action");
  if (typeof action !== "string") return fail(400, "action must appear once");

  if (RETIRED.includes(action)) {
    return fail(410, `"${action}" belonged to bot v1. Bot v2 phase 1 only serves the lab: ${Object.keys(ACTIONS).join(", ")}.`);
  }

  if (!own(ACTIONS, action)) return fail(400, `Unknown action: ${action}`);
  const route = ACTIONS[action];

  if (method !== route.method) return fail(405, `${action} requires ${route.method}`, { allow: route.method });

  for (const [key, value] of Object.entries(query)) {
    if (key === "action") continue;
    if (!own(route.params, key)) return fail(400, `${action} does not take "${key}"`);
    if (typeof value !== "string") return fail(400, `${key} must appear once`);
    if (!route.params[key].includes(value)) {
      return fail(400, `${key}: expected one of ${route.params[key].join(", ")}`);
    }
  }

  // Fixed order, whatever order the browser used
  const search = new URLSearchParams();
  for (const key of Object.keys(route.params)) {
    if (typeof query[key] === "string") search.set(key, query[key]);
  }
  const qs = search.toString();

  return { ok: true, action, route, pathWithQuery: route.path + (qs ? `?${qs}` : "") };
}

// BOT_API_URL may carry a path prefix; keep it. Throws on a bad URL.
export function upstreamTarget(botUrl, pathWithQuery) {
  const base = new URL(botUrl);
  if (base.protocol !== "https:" && base.protocol !== "http:") throw new Error("BOT_API_URL must be http(s)");
  const prefix = base.pathname.replace(/\/+$/, "");
  const target = new URL(prefix + pathWithQuery, base.origin);
  return { url: target.toString(), signedPath: target.pathname + target.search };
}

export function sha256Hex(data) {
  return crypto.createHash("sha256").update(data || "").digest("hex");
}

export function canonical({ ts, nonce, method, pathWithQuery, bodyHash }) {
  return ["v2", String(ts), String(nonce), String(method).toUpperCase(), String(pathWithQuery), String(bodyHash)].join("\n");
}

export function signedHeaders({
  secret,
  method,
  pathWithQuery,
  body = "",
  now = Date.now(),
  nonce = crypto.randomBytes(16).toString("hex")
}) {
  const ts = String(now);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(canonical({ ts, nonce, method, pathWithQuery, bodyHash: sha256Hex(body) }))
    .digest("hex");

  return {
    "X-WM-Sig-Version": "2",
    "X-WM-Timestamp": ts,
    "X-WM-Nonce": nonce,
    "X-WM-Signature": signature
  };
}

// ===============================
// WOJAKMETER — DESK LOGIN
// pages/api/desk/auth.js
//
//   POST   { password }  → sets the session cookie
//   DELETE               → clears it (log out)
//
// The session format lives in lib/desk/session.js, shared with the
// middleware, so there is exactly one definition of a valid cookie.
//
// The password is compared as two HMACs of equal length, so timing
// leaks neither its content nor its length (v1 returned early when
// the lengths differed).
//
// The attempt limit is per server instance: a brake that makes
// guessing slow, not a wall. The real protection is a long, random
// DESK_PASSWORD.
// ===============================

import crypto from "crypto";
import {
  issueSession,
  sessionCookie,
  clearedCookie,
  sessionTtlMs
} from "../../../lib/desk/session";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED = 5000;
const attempts = new Map(); // ip → { count, first }

// On Vercel both headers are set by the platform, not by the client
function clientIp(req) {
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real) return real.trim();
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function isLimited(ip, now) {
  const record = attempts.get(ip);
  if (!record) return false;
  if (now - record.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip, now) {
  // Never let a flood of addresses grow the map without bound
  if (attempts.size >= MAX_TRACKED) {
    for (const [key, r] of attempts) if (now - r.first > WINDOW_MS) attempts.delete(key);
    if (attempts.size >= MAX_TRACKED) attempts.delete(attempts.keys().next().value);
  }

  const record = attempts.get(ip);
  if (!record || now - record.first > WINDOW_MS) attempts.set(ip, { count: 1, first: now });
  else record.count += 1;
}

function passwordMatches(submitted, password, key) {
  const a = crypto.createHmac("sha256", key).update(submitted).digest();
  const b = crypto.createHmac("sha256", key).update(password).digest();
  return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const secure = process.env.NODE_ENV === "production";

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearedCookie({ secure }));
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const secret = process.env.DESK_SECRET;
  const password = process.env.DESK_PASSWORD;

  if (!secret || !password) {
    return res.status(503).json({ ok: false, error: "Desk not configured. Set DESK_SECRET and DESK_PASSWORD." });
  }

  const now = Date.now();
  const ip = clientIp(req);

  if (isLimited(ip, now)) {
    return res.status(429).json({ ok: false, error: "Too many attempts. Wait 15 minutes." });
  }

  const submitted = typeof req.body?.password === "string" ? req.body.password : "";

  if (!submitted || !passwordMatches(submitted, password, secret)) {
    recordFailure(ip, now);
    return res.status(401).json({ ok: false, error: "Invalid password" });
  }

  attempts.delete(ip);

  const ttlMs = sessionTtlMs();
  const { token, exp } = await issueSession({ secret, now, ttlMs });
  res.setHeader("Set-Cookie", sessionCookie(token, { maxAgeSec: ttlMs / 1000, secure }));

  return res.status(200).json({ ok: true, expiresAt: exp });
}

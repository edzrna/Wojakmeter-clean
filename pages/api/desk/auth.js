// ===============================
// WOJAKMETER — DESK LOGIN
// pages/api/desk/auth.js
//
// Verifies the desk password and issues the signed session cookie
// that middleware.js checks. The cookie is httpOnly so client-side
// JavaScript — including anything injected — cannot read it.
// ===============================

import crypto from "crypto";

const COOKIE_NAME = "wm_desk";

// How long a session lasts before you must log in again
const SESSION_MS = Number(process.env.DESK_SESSION_MS || 12 * 60 * 60 * 1000);

// Simple in-memory brute-force brake. Resets when the lambda recycles,
// which is fine — it only needs to make guessing impractical.
const attempts = new Map();
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function sign(message, secret) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));

  if (bufA.length !== bufB.length) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const record = attempts.get(ip);

  if (!record) return false;

  if (Date.now() - record.first > ATTEMPT_WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const record = attempts.get(ip);

  if (!record || Date.now() - record.first > ATTEMPT_WINDOW_MS) {
    attempts.set(ip, { count: 1, first: Date.now() });
    return;
  }

  record.count += 1;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const secret = process.env.DESK_SECRET;
  const password = process.env.DESK_PASSWORD;

  if (!secret || !password) {
    return res.status(503).json({
      ok: false,
      error: "Desk not configured. Set DESK_SECRET and DESK_PASSWORD."
    });
  }

  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return res.status(429).json({
      ok: false,
      error: "Too many attempts. Wait 15 minutes."
    });
  }

  const submitted = String(req.body?.password || "");

  if (!submitted || !safeEqual(submitted, password)) {
    recordFailure(ip);
    // Deliberately vague — do not confirm whether the user exists
    return res.status(401).json({ ok: false, error: "Invalid password" });
  }

  attempts.delete(ip);

  const exp = Date.now() + SESSION_MS;
  const token = `${exp}.${sign(String(exp), secret)}`;

  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  res.setHeader("Set-Cookie", parts.join("; "));

  return res.status(200).json({ ok: true, expiresAt: exp });
}

// ===============================
// WOJAKMETER — BOT PROXY
// pages/api/desk/bot.js
//
// The browser never talks to Railway directly and never sees
// BOT_API_SECRET. It calls this route, this route re-signs the
// request server-side and forwards it to the bot.
//
// It also re-verifies the desk cookie: middleware only guards
// page routes, so API routes must check for themselves.
// ===============================

import crypto from "crypto";

const COOKIE_NAME = "wm_desk";

// Only these bot endpoints can be reached from the browser.
// An allowlist means a bug in the UI cannot reach something
// dangerous that was never meant to be exposed.
const ALLOWED = {
  recover:   { method: "POST", path: "/desk/recover" },
  status:    { method: "GET",  path: "/desk/status" },
  positions: { method: "GET",  path: "/desk/positions" },
  history:   { method: "GET",  path: "/desk/history" },
  signals:   { method: "GET",  path: "/desk/signals" },
  pause:     { method: "POST", path: "/desk/pause" },
  resume:    { method: "POST", path: "/desk/resume" },
  close:     { method: "POST", path: "/desk/close" }
};

function sign(message, secret) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function hasValidSession(req) {
  const secret = process.env.DESK_SECRET;
  if (!secret) return false;

  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return false;

  const [expStr, signature] = String(raw).split(".");
  const exp = Number(expStr);

  if (!expStr || !signature || !Number.isFinite(exp)) return false;
  if (Date.now() > exp) return false;

  return safeEqual(signature, sign(expStr, secret));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!hasValidSession(req)) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  const botUrl = process.env.BOT_API_URL;
  const botSecret = process.env.BOT_API_SECRET;

  if (!botUrl || !botSecret) {
    return res.status(503).json({
      ok: false,
      error: "Bot link not configured. Set BOT_API_URL and BOT_API_SECRET."
    });
  }

  const action = String(req.query.action || "status");
  const route = ALLOWED[action];

  if (!route) {
    return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
  }

  if (route.method === "POST" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "This action requires POST" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const body = route.method === "POST"
      ? JSON.stringify(req.body || {})
      : undefined;

    // Timestamped signature so a captured request cannot be replayed later
    const ts = Date.now().toString();
    const payload = `${ts}.${route.path}.${body || ""}`;

    const upstream = await fetch(`${botUrl.replace(/\/$/, "")}${route.path}`, {
      method: route.method,
      headers: {
        "Content-Type": "application/json",
        "X-WM-Timestamp": ts,
        "X-WM-Signature": sign(payload, botSecret)
      },
      body,
      signal: controller.signal
    });

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, error: "Bot returned invalid JSON", raw: text.slice(0, 400) };
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    const offline = err.name === "AbortError";

    return res.status(502).json({
      ok: false,
      error: offline
        ? "Bot did not respond in time. It may be restarting on Railway."
        : `Could not reach bot: ${err.message}`
    });
  } finally {
    clearTimeout(timer);
  }
}

// ===============================
// WOJAKMETER — BOT PROXY
// pages/api/desk/bot.js
//
//   GET /api/desk/bot?action=lab-report&model=linear
//
// The browser never talks to Railway and never sees BOT_API_SECRET.
// This route checks the desk session, checks the request against the
// allowlist (lib/desk/proxy.js), signs it with signature v2 and
// forwards it. The bot's answer comes back as is, status included.
//
// The middleware already guards /api/desk/*; the session is checked
// again here so this route stays closed even if the matcher changes.
// ===============================

import { COOKIE_NAME, verifySession, sessionTtlMs } from "../../../lib/desk/session";
import { resolveRequest, signedHeaders, upstreamTarget } from "../../../lib/desk/proxy";

const TIMEOUT_MS = 15_000;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");

  const session = await verifySession(req.cookies?.[COOKIE_NAME], {
    secret: process.env.DESK_SECRET,
    ttlMs: sessionTtlMs()
  });

  if (!session.ok) {
    if (session.reason === "not-configured") {
      return res.status(503).json({ ok: false, error: "Desk not configured. Set DESK_SECRET." });
    }
    return res.status(401).json({ ok: false, error: session.reason === "expired" ? "Session expired" : "Not authenticated" });
  }

  const botUrl = process.env.BOT_API_URL;
  const botSecret = process.env.BOT_API_SECRET;

  if (!botUrl || !botSecret) {
    return res.status(503).json({ ok: false, error: "Bot link not configured. Set BOT_API_URL and BOT_API_SECRET." });
  }

  const resolved = resolveRequest(req.query, req.method);

  if (!resolved.ok) {
    if (resolved.allow) res.setHeader("Allow", resolved.allow);
    return res.status(resolved.status).json({ ok: false, error: resolved.error });
  }

  let target;
  try {
    target = upstreamTarget(botUrl, resolved.pathWithQuery);
  } catch (err) {
    return res.status(503).json({ ok: false, error: `BOT_API_URL is not usable: ${err.message}` });
  }

  const { method } = resolved.route;

  // The exact bytes that are hashed are the bytes that are sent
  const body = method === "GET" ? "" : JSON.stringify(req.body ?? {});
  const headers = signedHeaders({ secret: botSecret, method, pathWithQuery: target.signedPath, body });
  headers.Accept = "application/json";
  if (body) headers["Content-Type"] = "application/json";

  let upstream;
  try {
    upstream = await fetch(target.url, {
      method,
      headers,
      body: body || undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (err) {
    const timedOut = err.name === "TimeoutError" || err.name === "AbortError";
    return res.status(502).json({
      ok: false,
      error: timedOut
        ? "The bot did not answer within 15 s. It may be restarting on Railway."
        : `Could not reach the bot: ${err.message}`
    });
  }

  const text = await upstream.text();

  try {
    return res.status(upstream.status).json(JSON.parse(text));
  } catch {
    // Not JSON: something in front of the bot answered (Railway's edge)
    const hint = upstream.status === 502
      ? " Railway could not reach the service: check that the domain's Target Port equals the port the bot prints at startup."
      : "";
    return res.status(502).json({
      ok: false,
      error: `The bot answered HTTP ${upstream.status} without JSON.${hint}`,
      raw: text.slice(0, 300)
    });
  }
}

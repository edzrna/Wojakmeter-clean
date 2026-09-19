// ===============================
// WOJAKMETER — PRIVATE DESK GATE
// middleware.js — at the ROOT of the project (next to package.json)
//
// Everything under /desk and /api/desk needs a valid session cookie,
// except the login page and the login endpoint themselves.
//
// v1 only matched /desk/:path*, so the API routes were outside the
// gate and each had to remember to check the cookie itself. They
// still do (defence in depth), but the gate now covers them too:
// an API route added later without its own check is not an open door.
//
// Pages get a redirect to /desk/login; API calls get a 401 JSON.
// Every desk response is marked private, not indexable, not framable.
// ===============================

import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySession, sessionTtlMs } from "./lib/desk/session";

export const config = {
  matcher: ["/desk/:path*", "/api/desk/:path*"]
};

const PUBLIC = new Set(["/desk/login", "/api/desk/auth"]);

function harden(res) {
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "same-origin");
  return res;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (PUBLIC.has(pathname)) return harden(NextResponse.next());

  const secret = process.env.DESK_SECRET;

  // Fail closed: no secret means no desk at all
  if (!secret) {
    return isApi
      ? NextResponse.json({ ok: false, error: "Desk not configured. Set DESK_SECRET." }, { status: 503 })
      : new NextResponse("Desk is not configured. Set DESK_SECRET in the environment.", { status: 503 });
  }

  const session = await verifySession(request.cookies.get(COOKIE_NAME)?.value, {
    secret,
    ttlMs: sessionTtlMs()
  });

  if (session.ok) return harden(NextResponse.next());

  if (isApi) {
    return harden(
      NextResponse.json(
        { ok: false, error: session.reason === "expired" ? "Session expired" : "Not authenticated" },
        { status: 401 }
      )
    );
  }

  const loginUrl = new URL("/desk/login", request.url);
  if (session.reason === "expired") loginUrl.searchParams.set("expired", "1");
  return NextResponse.redirect(loginUrl);
}

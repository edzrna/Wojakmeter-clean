// ===============================
// WOJAKMETER — PRIVATE DESK GATE
// Place this file at the ROOT of the project (next to package.json)
//
// Everything under /desk is unreachable without a valid session
// cookie. The cookie is an HMAC signature the browser cannot forge,
// so there is no database lookup and it works on the Edge runtime.
// ===============================

import { NextResponse } from "next/server";

export const config = {
  // Only guard the desk. The public site is untouched.
  matcher: ["/desk/:path*"]
};

const COOKIE_NAME = "wm_desk";

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(message, secret) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );

  return toHex(signature);
}

// Constant-time compare so timing cannot leak the signature
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // The login page itself must stay reachable
  if (pathname === "/desk/login") {
    return NextResponse.next();
  }

  const secret = process.env.DESK_SECRET;

  // Fail closed: no secret configured means no access at all
  if (!secret) {
    return new NextResponse(
      "Desk is not configured. Set DESK_SECRET in the environment.",
      { status: 503 }
    );
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value || "";
  const [expStr, signature] = cookie.split(".");
  const exp = Number(expStr);

  const loginUrl = new URL("/desk/login", request.url);

  if (!expStr || !signature || !Number.isFinite(exp)) {
    return NextResponse.redirect(loginUrl);
  }

  if (Date.now() > exp) {
    loginUrl.searchParams.set("expired", "1");
    return NextResponse.redirect(loginUrl);
  }

  const expected = await hmac(expStr, secret);

  if (!safeEqual(signature, expected)) {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side gate for /admin/* — verifies the HMAC session cookie BEFORE the
 * page renders and redirects unauthenticated visitors to /login (the only
 * login page; admins are then routed straight into the panel).
 * (Role checks + data access remain enforced on every admin API via requireAdmin.)
 */
const COOKIE = "pea_session";
const SECRET = process.env.AUTH_SECRET || "payam-e-adab-secret-key-2024";
const MAX_AGE_MS = 60 * 60 * 24 * 30 * 1000;

function b64urlToBuf(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function hexToBuf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const expected = new Uint8Array(mac);
    const given = hexToBuf(sig);
    if (expected.length !== given.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i];
    if (diff !== 0) return false;
    const data = JSON.parse(new TextDecoder().decode(b64urlToBuf(payload)));
    return typeof data.ts === "number" && Date.now() - data.ts < MAX_AGE_MS;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ONE login page: the public /login. Unauthenticated /admin/* visitors —
  // including the legacy /admin/login URL — go there; after signing in, an
  // ADMIN is routed straight into the panel by the login page itself.
  // (Checked against the slash-normalized path so /admin/ is gated too.)
  const canonical = pathname.replace(/\/+$/, "") || "/";
  if (canonical === "/admin" || canonical.startsWith("/admin/")) {
    const token = req.cookies.get(COOKIE)?.value;
    const valid = token ? await verifyToken(token) : false;
    if (!valid) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // legacy bookmark: authenticated admins asking for the old admin-login
    // page simply land in the panel (a dead session still exits via the
    // panel layout to /login, so this cannot ping-pong).
    if (canonical === "/admin/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // The platform preview proxy 301s directory-style paths to their
  // trailing-slash form (/dashboard?tab=profile → /dashboard/?tab=profile)
  // while Next itself 308s the slashed form back to the bare one — the two
  // redirects ping-pong until the browser gives up with
  // ERR_TOO_MANY_REDIRECTS ("redirected you too many times"). Serve the page
  // directly instead of redirecting: rewrite the slashed path to its
  // canonical form and let the browser keep the URL it requested.
  if (pathname.length > 1 && pathname.endsWith("/") && !pathname.startsWith("/_next")) {
    const url = req.nextUrl.clone();
    url.pathname = canonical;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // run on everything except API routes and Next internals — the slash
  // rewrite must see page requests before Next's own trailing-slash 308
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};

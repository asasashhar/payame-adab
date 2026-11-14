import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { setSessionCookie, logActivity } from "@/lib/auth";
import { getSettings } from "@/lib/site";

/**
 * GET /api/auth/google — real Google OAuth 2.0 sign-in.
 * Enabled from the Admin Panel → Settings (googleEnabled + Client ID/Secret).
 *
 * Flow:
 *   1. No `code` param → redirect to Google's consent screen (state cookie).
 *   2. With `code`     → exchange for tokens, read the verified e-mail out of
 *      the ID token, find-or-create the account, mint a session cookie and
 *      redirect to /admin (administrators) or /dashboard (everyone else).
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const STATE_COOKIE = "pea_oauth_state";

type Intent = "user" | "admin";

function b64urlJson(segment: string): Record<string, unknown> | null {
  try {
    const json = Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const settings = await getSettings();
  const clientId = settings.googleClientId ?? "";
  const clientSecret = settings.googleClientSecret ?? "";
  const configured =
    settings.googleEnabled === "1" && clientId.length > 0 && clientSecret.length > 0;

  const fail = (message: string, back: Intent) =>
    NextResponse.redirect(
      new URL(`${back === "admin" ? "/admin/login" : "/login"}?google_msg=${encodeURIComponent(message)}`, url.origin)
    );

  if (!configured) {
    return fail("گوگل سائن اِن ابھی ترتیب سے باہر ہے — ایڈمن پینل میں Google Client ID/Secret محفوظ کریں۔", "user");
  }

  const base =
    (settings.siteUrl ?? "").trim().replace(/\/+$/, "") || url.origin;
  const redirectUri = `${base}/api/auth/google`;

  // ---------- step 1: go to Google ----------
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  if (!code) {
    const intent: Intent = url.searchParams.get("intent") === "admin" ? "admin" : "user";
    const nonce = crypto.randomBytes(16).toString("hex");
    const res = NextResponse.redirect(
      `${AUTH_ENDPOINT}?${new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state: `${nonce}:${intent}`,
        prompt: "select_account",
        access_type: "online",
      })}`
    );
    res.cookies.set(STATE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
      secure: url.protocol === "https:",
    });
    return res;
  }

  // ---------- step 2: verify state ----------
  const [nonce, intentRaw] = state.split(":");
  const intent: Intent = intentRaw === "admin" ? "admin" : "user";
  const expectedNonce = req.cookies.get(STATE_COOKIE)?.value ?? "";
  if (!nonce || nonce !== expectedNonce) {
    return fail("سیشن کی تصدیق ناکام — دوبارہ کوشش کریں۔", intent);
  }

  // ---------- step 3: exchange the code ----------
  let email = "";
  let name = "";
  let picture = "";
  let emailVerified = false;
  try {
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
    const tokens = (await tokenRes.json()) as { id_token?: string };
    const payload = tokens.id_token ? b64urlJson(tokens.id_token.split(".")[1] ?? "") : null;
    if (!payload || typeof payload.email !== "string") throw new Error("id_token email");
    email = String(payload.email).toLowerCase();
    name = typeof payload.name === "string" ? payload.name : "";
    picture = typeof payload.picture === "string" ? payload.picture : "";
    emailVerified = payload.email_verified === true;
  } catch {
    return fail("گوگل سے تصدیق نہیں ہو سکی — دوبارہ کوشش کریں۔", intent);
  }
  if (!emailVerified) {
    return fail("آپ کا Google ای میل ابھی تصدیق شدہ نہیں ہے۔", intent);
  }

  // ---------- step 4: find-or-create the account ----------
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    if (intent === "admin") {
      return fail("یہ ای میل کسی مجاز ایڈمنسٹریٹر سے متعلق نہیں ہے۔", intent);
    }
    if (settings.googleSignup !== "1") {
      return fail("اس ای میل سے متعلق کوئی رجسٹرڈ اکاؤنٹ نہیں ملا — پہلے اکاؤنٹ بنائیں۔", intent);
    }
    user = await db.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        photoUrl: picture || null,
        passwordHash: crypto.randomBytes(32).toString("hex") + ":disabled",
        emailVerified: true,
      },
    });
  }
  if (intent === "admin" && user.role !== "ADMIN") {
    return fail("یہ اکاؤنٹ ایڈمنسٹریٹر نہیں ہے۔", intent);
  }
  if (user.status === "SUSPENDED") {
    return fail("آپ کا اکاؤنٹ معطل ہے۔", intent);
  }
  if (!user.photoUrl && picture) {
    await db.user.update({ where: { id: user.id }, data: { photoUrl: picture } }).catch(() => {});
  }
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

  await setSessionCookie(user.id, true);
  await logActivity("google-login", email, email);

  const dest = intent === "admin" && user.role === "ADMIN" ? "/admin" : "/dashboard";
  return NextResponse.redirect(new URL(dest, url.origin));
}

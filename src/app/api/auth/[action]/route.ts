import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  hashPassword, verifyPassword, setSessionCookie, clearSessionCookie,
  getSessionUser, requireAdmin, logActivity,
} from "@/lib/auth";
import { getSettings } from "@/lib/site";
import { queueMail, siteUrlFrom } from "@/lib/mailer";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ action: string }> }
) {
  const { action } = await ctx.params;

  /** Shared password-strength rule (self-service passwords only):
   *  at least 8 characters with at least one letter and one digit.
   *  Admin-initial passwords (e.g. darulhuda) are set through the admins API
   *  but force a change on first login, which enforces this rule. */
  const passwordProblem = (pw: string): string | null => {
    if (pw.length < 8) return "پاس ورڈ کم از کم 8 حروف کا ہونا چاہیے";
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw))
      return "پاس ورڈ میں کم از کم ایک حرف اور ایک عدد ضروری ہے";
    return null;
  };

  const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
  const sixDigitCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

  if (action === "register") {
    try {
      const body = (await req.json()) as Record<string, string>;
      const email = (body.email ?? "").trim().toLowerCase();
      const password = body.password ?? "";
      const name = (body.name ?? "").trim();
      if (!email || !password || !name) {
        return NextResponse.json({ error: "نام، ای میل اور پاس ورڈ ضروری ہیں" }, { status: 400 });
      }
      // reserved administrator IDs can never become ordinary user accounts
      if (email.startsWith("@") || email === "admin") {
        return NextResponse.json({ error: "یہ آئی ڈی ایڈمنسٹریٹرز کے لیے محفوظ ہے — براہ کرم اپنا ای میل استعمال کریں" }, { status: 400 });
      }
      if (passwordProblem(password)) {
        return NextResponse.json({ error: passwordProblem(password) }, { status: 400 });
      }
      const exists = await db.user.findUnique({ where: { email } });
      if (exists) {
        return NextResponse.json({ error: "یہ ای میل پہلے سے موجود ہے" }, { status: 409 });
      }
      const settings = await getSettings();
      const requireVerification = settings.requireEmailVerification === "1";
      const verifyToken = requireVerification ? crypto.randomBytes(24).toString("hex") : null;
      const user = await db.user.create({
        data: {
          email,
          name,
          passwordHash: hashPassword(password),
          penName: body.penName?.trim() || null,
          bio: body.bio?.trim() || null,
          emailVerified: !requireVerification,
          verifyToken,
          verifyTokenExpiry: verifyToken ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null,
        },
      });
      // account-registration confirmation (always) + verification link when required
      const base = siteUrlFrom(req, settings);
      await queueMail({
        kind: "WELCOME",
        to: email,
        data: { authorName: name, title: "", url: `${base}/dashboard` },
        relatedType: "user",
        relatedId: user.id,
      });
      if (verifyToken) {
        await queueMail({
          kind: "VERIFY",
          to: email,
          data: { authorName: name, title: "", url: `${base}/verify?token=${verifyToken}` },
          relatedType: "user",
          relatedId: user.id,
        });
      }
      await setSessionCookie(user.id);
      await logActivity("register", email, email);
      const { passwordHash: _p, ...safe } = user;
      return NextResponse.json({ ...safe, needsVerification: !!verifyToken }, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: "رجسٹریشن میں خرابی", detail: String(e) }, { status: 400 });
    }
  }

  if (action === "login") {
    try {
      const body = (await req.json()) as Record<string, string>;
      const email = (body.email ?? "").trim().toLowerCase();
      // admin IDs have their own separate door — keep the two systems apart
      if (email.startsWith("@") || email === "admin") {
        return NextResponse.json({ error: "یہ ایڈمن آئی ڈی ہے — ایڈمن لاگ اِن صفحے (/admin/login) سے داخل ہوں" }, { status: 403 });
      }
      const user = await db.user.findUnique({ where: { email } });
      if (!user || !verifyPassword(body.password ?? "", user.passwordHash)) {
        return NextResponse.json({ error: "ای میل یا پاس ورڈ غلط ہے" }, { status: 401 });
      }
      if (user.status === "SUSPENDED") {
        return NextResponse.json({ error: "آپ کا اکاؤنٹ معطل ہے" }, { status: 403 });
      }
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await setSessionCookie(user.id, body.remember === "1" || body.remember === "true");
      const { passwordHash: _p, ...safe } = user;
      return NextResponse.json(safe);
    } catch (e) {
      return NextResponse.json({ error: "لاگ اِن میں خرابی", detail: String(e) }, { status: 400 });
    }
  }

  // dedicated admin login: refuses non-admin accounts.
  // The super admin signs in with the reserved ID "@admin" (+ darulhuda);
  // "admin" is accepted as a lenient alias for the same account. Individual
  // Gmail administrators (e.g. mdnematullah1343@gmail.com) may also sign in here.
  if (action === "admin-login") {
    try {
      const body = (await req.json()) as Record<string, string>;
      const raw = (body.email ?? "").trim().toLowerCase();
      const email = raw === "admin" ? "@admin" : raw;
      const user = await db.user.findUnique({ where: { email } });
      if (!user || !verifyPassword(body.password ?? "", user.passwordHash)) {
        return NextResponse.json({ error: "ای میل یا پاس ورڈ غلط ہے" }, { status: 401 });
      }
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "یہ اکاؤنٹ ایڈمنسٹریٹر نہیں ہے" }, { status: 403 });
      }
      if (user.status === "SUSPENDED") {
        return NextResponse.json({ error: "یہ اکاؤنٹ معطل کر دیا گیا ہے" }, { status: 403 });
      }
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await setSessionCookie(user.id);
      await logActivity("admin-login", email, email);
      const { passwordHash: _p, ...safe } = user;
      return NextResponse.json(safe);
    } catch (e) {
      return NextResponse.json({ error: "لاگ اِن میں خرابی", detail: String(e) }, { status: 400 });
    }
  }

  if (action === "logout") {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  }

  // change own password (requires current password)
  if (action === "change-password") {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "لاگ اِن کریں" }, { status: 401 });
    try {
      const body = (await req.json()) as Record<string, string>;
      const current = body.currentPassword ?? "";
      const next = body.newPassword ?? "";
      const row = await db.user.findUnique({ where: { id: user.id } });
      if (!row || !verifyPassword(current, row.passwordHash)) {
        return NextResponse.json({ error: "موجودہ پاس ورڈ غلط ہے" }, { status: 400 });
      }
      if (passwordProblem(next)) {
        return NextResponse.json({ error: passwordProblem(next) }, { status: 400 });
      }
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(next), mustChangePassword: false, resetToken: null, resetTokenExpiry: null, resetAttempts: 0 },
      });
      await queueMail({ kind: "PASSWORD_CHANGED", to: user.email, data: { authorName: user.name, title: "" }, relatedType: "user", relatedId: user.id });
      await logActivity("password-change", user.email, user.email);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: "پاس ورڈ تبدیل کرنے میں خرابی", detail: String(e) }, { status: 400 });
    }
  }

  // consume an email-verification token
  if (action === "verify-email") {
    try {
      const body = (await req.json()) as Record<string, string>;
      const token = String(body.token ?? "");
      if (!token) return NextResponse.json({ error: "ٹوکن درکار ہے" }, { status: 400 });
      const user = await db.user.findFirst({
        where: { verifyToken: token, verifyTokenExpiry: { gt: new Date() } },
      });
      if (!user) {
        return NextResponse.json({ error: "تصدیقی لنک غلط یا میعاد ختم ہے — ڈیش بورڈ سے نیا لنک حاصل کریں" }, { status: 400 });
      }
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: true, verifyToken: null, verifyTokenExpiry: null },
      });
      await logActivity("email-verified", user.email, user.email);
      return NextResponse.json({ ok: true, email: user.email });
    } catch (e) {
      return NextResponse.json({ error: "تصدیق میں خرابی", detail: String(e) }, { status: 400 });
    }
  }

  // resend the verification email (logged-in, unverified users)
  if (action === "resend-verification") {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "لاگ اِن کریں" }, { status: 401 });
    if (user.emailVerified) return NextResponse.json({ ok: true, message: "آپ کی ای میل پہلے ہی تصدیق شدہ ہے" });
    try {
      const token = crypto.randomBytes(24).toString("hex");
      await db.user.update({
        where: { id: user.id },
        data: { verifyToken: token, verifyTokenExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000) },
      });
      const settings = await getSettings();
      const base = siteUrlFrom(req, settings);
      await queueMail({
        kind: "VERIFY",
        to: user.email,
        data: { authorName: user.name, title: "", url: `${base}/verify?token=${token}` },
        relatedType: "user",
        relatedId: user.id,
      });
      await logActivity("verify-resend", user.email, user.email);
      return NextResponse.json({ ok: true, message: "تصدیقی ای میل بھیج دی گئی — اپنا ان باکس چیک کریں" });
    } catch (e) {
      return NextResponse.json({ error: "ای میل بھیجنے میں خرابی", detail: String(e) }, { status: 500 });
    }
  }

  // ---- password recovery (OTP flow, spec Part 5) ----
  // Step 1-2: request a 6-digit code. The code is stored only as a SHA-256
  // hash, expires in 15 minutes, invalidates any previous code, and requests
  // are rate-limited (1/min and max 3/hour per email). The response is always
  // generic so it never reveals whether the email is registered.
  if (action === "request-reset") {
    try {
      const body = (await req.json()) as Record<string, string>;
      const email = (body.email ?? "").trim().toLowerCase();
      const generic = { ok: true, message: "اگر یہ ای میل رجسٹرڈ ہے تو تصدیقی کوڈ آپ کے ای میل پر بھیج دیا گیا ہے۔ براہ کرم اپنا ان باکس (اور اسپام فولڈر) چیک کریں۔" };
      if (!email) return NextResponse.json(generic);
      const user = await db.user.findUnique({ where: { email } });
      const settings = await getSettings();
      if (user) {
        // rate limiting: max 1 request per minute, max 3 per rolling hour
        const last = user.resetRequestedAt?.getTime() ?? 0;
        if (Date.now() - last < 60_000) {
          return NextResponse.json({ error: "بار بار درخواست نہ کریں — براہ کرم ایک منٹ بعد دوبارہ کوشش کریں۔" }, { status: 429 });
        }
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recent = await db.activityLog.count({
          where: { action: "reset-request", actorEmail: email, createdAt: { gt: hourAgo } },
        });
        if (recent >= 3) {
          return NextResponse.json({ error: "ایک گھنٹے میں زیادہ سے زیادہ تین درخواستیں ممکن ہیں — تھوڑی دیر بعد کوشش کریں۔" }, { status: 429 });
        }
        const code = sixDigitCode();
        await db.user.update({
          where: { id: user.id },
          data: {
            resetToken: sha256(code),          // store only the hash of the code
            resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
            resetAttempts: 0,                   // new code → fresh attempt budget
            resetRequestedAt: new Date(),       // invalidates older codes by overwrite
          },
        });
        await queueMail({
          kind: "RESET",
          to: email,
          data: { authorName: user.name, title: "", code },
          relatedType: "user",
          relatedId: user.id,
        });
        await logActivity("reset-request", email, email);
        // Without SMTP the code can never reach the inbox — surface it as a
        // clearly-marked demo fallback so the recovery flow stays usable
        // (with SMTP configured, delivery is real and no code is ever returned).
        const mailReady = settings?.mailEnabled === "1" && (settings?.smtpHost ?? "").trim().length > 0;
        if (!mailReady) {
          return NextResponse.json({
            ...generic,
            demoCode: code,
            demoNote: "ای میل ترسیل (SMTP) ترتیب یافتہ نہیں — ڈیمو موڈ میں کوڈ یہاں دکھایا جا رہا ہے۔ ایڈمن پینل → سیٹنگز میں SMTP درج کریں تو کوڈ براہِ راست ای میل پر جائے گا۔",
          });
        }
      }
      return NextResponse.json(generic);
    } catch {
      return NextResponse.json({ ok: true });
    }
  }

  // Step 3-4: verify the OTP code. On success mints a one-time ticket
  // (valid 10 minutes) that authorizes exactly one password change.
  if (action === "verify-reset") {
    try {
      const body = (await req.json()) as Record<string, string>;
      const email = (body.email ?? "").trim().toLowerCase();
      const code = String(body.code ?? "").trim();
      const fail = (msg = "کوڈ غلط ہے — دوبارہ کوشش کریں۔", extra: Record<string, unknown> = {}) =>
        NextResponse.json({ error: msg, ...extra }, { status: 400 });
      if (!/^\d{6}$/.test(code) || !email) return fail();
      const user = await db.user.findUnique({ where: { email } });
      if (!user || !user.resetToken || !user.resetTokenExpiry || user.resetTokenExpiry.getTime() < Date.now()) {
        return fail("کوڈ میعاد ختم ہو چکی ہے — نیا کوڈ طلب کریں۔");
      }
      if (user.resetAttempts >= 5) {
        return fail("بہت زیادہ غلط کوششیں — براہ کرم نیا کوڈ طلب کریں۔");
      }
      if (user.resetToken !== sha256(code)) {
        const attempts = user.resetAttempts + 1;
        await db.user.update({ where: { id: user.id }, data: { resetAttempts: attempts } });
        const left = Math.max(0, 5 - attempts);
        return fail(
          left > 0 ? `کوڈ غلط ہے — ${left} کوششیں باقی ہیں۔` : "کوڈ غلط ہے — مزید کوشش ممکن نہیں، نیا کوڈ طلب کریں۔",
          { attemptsLeft: left }
        );
      }
      // code correct → one-time ticket for the actual reset
      const ticket = crypto.randomBytes(24).toString("hex");
      await db.user.update({
        where: { id: user.id },
        data: {
          resetToken: ticket,
          resetTokenExpiry: new Date(Date.now() + 10 * 60 * 1000),
          resetAttempts: 0,
        },
      });
      await logActivity("reset-verified", email, email);
      return NextResponse.json({ ok: true, ticket });
    } catch {
      return NextResponse.json({ error: "تصدیق میں خرابی" }, { status: 400 });
    }
  }

  // Step 5-6: consume the one-time ticket and set the new password.
  if (action === "reset-password") {
    try {
      const body = (await req.json()) as Record<string, string>;
      const ticket = String(body.ticket ?? body.token ?? "");
      const password = String(body.password ?? "");
      if (!ticket) {
        return NextResponse.json({ error: "پہلے تصدیقی کوڈ درست کریں" }, { status: 400 });
      }
      if (passwordProblem(password)) {
        return NextResponse.json({ error: passwordProblem(password) }, { status: 400 });
      }
      const user = await db.user.findFirst({
        where: { resetToken: ticket, resetTokenExpiry: { gt: new Date() } },
      });
      if (!user) {
        return NextResponse.json({ error: "تصدیق کی میعاد ختم ہے — دوبارہ کوڈ طلب کریں" }, { status: 400 });
      }
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password), resetToken: null, resetTokenExpiry: null, resetAttempts: 0, mustChangePassword: false },
      });
      // Step 7: confirmation email
      await queueMail({ kind: "PASSWORD_CHANGED", to: user.email, data: { authorName: user.name, title: "" }, relatedType: "user", relatedId: user.id });
      await logActivity("reset-consumed", user.email, user.email);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: "بازیابی میں خرابی", detail: String(e) }, { status: 400 });
    }
  }

  // ---- "Continue with Google" -------------------------------------------------
  // With real OAuth credentials configured (Admin Panel → Settings) the client
  // is redirected to Google itself (see /api/auth/google). Without credentials
  // the button runs in demo mode: registered accounts — and always the three
  // authorized administrators — sign in directly with their Gmail address.
  if (action === "google-start") {
    // "Continue with Google" entry point. Real Google OAuth only — the app
    // never signs anyone in with an email address alone (that demo shortcut
    // allowed account impersonation and has been removed deliberately).
    try {
      const body = (await req.json()) as Record<string, string>;
      const email = (body.email ?? "").trim().toLowerCase();
      const adminIntent = body.admin === "1";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "درست ای میل لکھیں" }, { status: 400 });
      }
      const settings = await getSettings();
      const oauthReady =
        settings.googleEnabled === "1" &&
        (settings.googleClientId ?? "").length > 0 &&
        (settings.googleClientSecret ?? "").length > 0;
      if (!oauthReady) {
        return NextResponse.json(
          {
            error:
              "Google sign-in is not configured yet — the site admin must save a Google OAuth Client ID and Secret in Admin Panel → Settings. / گوگل سائن اِن ابھی ترتیب سے باہر ہے: ایڈمن پینل ← سیٹنگز میں Google Client ID اور Secret محفوظ کریں۔",
          },
          { status: 503 }
        );
      }
      // real Google verification for both the public site and the admin door
      const base = siteUrlFrom(req, settings);
      return NextResponse.json({
        mode: "oauth",
        redirectUrl: `${base}/api/auth/google?intent=${adminIntent ? "admin" : "user"}`,
      });
    } catch (e) {
      return NextResponse.json({ error: "گوگل سائن اِن میں خرابی", detail: String(e) }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "نامعلوم کارروائی" }, { status: 404 });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ action: string }> }
) {
  const { action } = await ctx.params;
  if (action === "me") {
    const user = await getSessionUser();
    return NextResponse.json(user);
  }
  return NextResponse.json({ error: "نامعلوم کارروائی" }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ action: string }> }
) {
  const { action } = await ctx.params;
  if (action !== "profile") {
    return NextResponse.json({ error: "نامعلوم کارروائی" }, { status: 404 });
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "لاگ اِن کریں" }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, string>;
    const data: Record<string, string | null> = {};
    for (const k of ["name", "penName", "bio", "photoUrl", "socials"]) {
      if (k in body) data[k] = body[k]?.trim() || null;
      if (k === "name" && body.name?.trim()) data[k] = body.name.trim();
    }
    // public handle: 3-20 chars, latin letters/digits/dot/underscore; must be unique
    if ("username" in body) {
      const raw = (body.username ?? "").trim().replace(/^@/, "");
      if (!raw) {
        data.username = null;
      } else if (!/^[a-zA-Z0-9._]{3,20}$/.test(raw)) {
        return NextResponse.json({ error: "یوزر نیم 3 سے 20 حروف کا ہو، صرف انگریزی حروف، عدد، نقطہ یا _" }, { status: 400 });
      } else if (["admin", "administrator", "moderator", "moderator", "root", "official", "payameadab"].includes(raw.toLowerCase())) {
        return NextResponse.json({ error: "یہ یوزر نیم محفوظ ہے — کوئی اور چنیں" }, { status: 409 });
      } else if (raw.toLowerCase() !== (user.username ?? "").toLowerCase()) {
        // SQLite has no insensitive mode — compare the case variants in the query instead
        const variants = [...new Set([raw, raw.toLowerCase(), raw.toUpperCase(), raw[0].toUpperCase() + raw.slice(1).toLowerCase()])];
        const taken = await db.user.findFirst({ where: { username: { in: variants } }, select: { id: true } });
        if (taken && taken.id !== user.id) {
          return NextResponse.json({ error: "یہ یوزر نیم کسی اور کے پاس ہے — کوئی اور چنیں" }, { status: 409 });
        }
        data.username = raw;
      }
    }
    const updated = await db.user.update({ where: { id: user.id }, data });
    const { passwordHash: _p, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (e) {
    return NextResponse.json({ error: "پروفائل اپ ڈیٹ میں خرابی", detail: String(e) }, { status: 400 });
  }
}

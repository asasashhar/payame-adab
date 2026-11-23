// End-to-end user-flow verification (the owner's 10-point checklist, API level):
// register → password → profile setup (username/bio) → save → logout → login →
// password reset via OTP → login with new password → profile persists → cleanup.
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
function check(name, expected, actual) {
  const ok = expected === actual;
  if (ok) pass++; else { fail++; console.log(`  FAIL: ${name} (expected ${expected}, got ${JSON.stringify(actual)})`); }
  if (ok) console.log(`  PASS: ${name}`);
}
const jar = [];
async function req(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const m = setCookie.match(/pea_session=[^;]+/);
    if (m) jar.push(m[0]);
  }
  return { status: res.status, body: data };
}
const cookie = () => jar[jar.length - 1] ?? "";

(async () => {
  const stamp = Date.now();
  const email = `flow-${stamp}@payameadab.com`;
  const password = "flowtest123";

  console.log("== 1-2. register (creates own password) ==");
  const reg = await req("/api/auth/register", { method: "POST", body: { name: "Flow Tester", email, password, confirm: password, agree: true } });
  check("register succeeds", 201, reg.status);

  console.log("== 3. session active right after register ==");
  const me1 = await req("/api/auth/me", { cookie: cookie() });
  check("session cookie works", email, me1.body?.email);

  console.log("== 4. profile setup: save username, pen name, bio ==");
  const uname = `flowwriter${String(stamp).slice(-6)}`;
  const prof = await req("/api/auth/profile", { method: "PUT", cookie: cookie(), body: { name: "Flow Tester", username: uname, penName: "قلمِ تجربہ", bio: "تبصہ نگار و شاعر — پروفائل سیٹ اپ ٹیسٹ۔" } });
  check("profile saved", 200, prof.status);
  check("username stored", uname, prof.body?.username);

  console.log("== username validation ==");
  const dup = await req("/api/auth/profile", { method: "PUT", cookie: cookie(), body: { username: "admin" } });
  check("taken username rejected", 409, dup.status);
  const bad = await req("/api/auth/profile", { method: "PUT", cookie: cookie(), body: { username: "!!" } });
  check("invalid username rejected", 400, bad.status);

  console.log("== 4b. public profile page shows the new member's data ==");
  const profPage = await fetch(`${BASE}/profile/${me1.body.id}`);
  const profHtml = await profPage.text();
  check("public profile 200", 200, profPage.status);
  check("pen name visible on public profile", true, profHtml.includes("قلمِ تجربہ"));
  check("bio visible on public profile", true, profHtml.includes("تبصہ نگار و شاعر"));
  check("zero-works empty state shown", true, profHtml.includes("ابھی کوئی شاعری شائع نہیں ہوئی"));

  console.log("== 5. logout and log back in ==");
  await req("/api/auth/logout", { method: "POST", cookie: cookie() });
  jar.length = 0; // logout clears the cookie in the browser — mirror that here
  const meOut = await req("/api/auth/me", { cookie: "" });
  check("logged out", "null", JSON.stringify(meOut.body?.id ?? null));
  const login = await req("/api/auth/login", { method: "POST", body: { email, password } });
  check("login works", 200, login.status);
  const me2 = await req("/api/auth/me", { cookie: cookie() });
  check("profile persisted after re-login", uname, me2.body?.username);

  console.log("== 6. password reset via OTP ==");
  const rr = await req("/api/auth/request-reset", { method: "POST", body: { email } });
  check("reset code requested", 200, rr.status);
  const { PrismaClient } = await import("@prisma/client");
  // same database the app uses: Turso/libSQL when configured, local file otherwise
  const db = process.env.TURSO_DATABASE_URL
    ? new PrismaClient({
        adapter: new (require("@prisma/adapter-libsql").PrismaLibSQL)({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN ?? "",
        }),
      })
    : new PrismaClient();
  const mail = await db.mailLog.findFirst({ where: { toEmail: email, kind: "RESET" }, orderBy: { createdAt: "desc" } });
  const codeMatch = mail?.bodyHtml?.match(/\b(\d{6})\b/);
  const code = rr.body?.demoCode ?? codeMatch?.[1];
  check("reset email with 6-digit code sent", true, Boolean(code));
  const vr = await req("/api/auth/verify-reset", { method: "POST", body: { email, code } });
  check("code verified, ticket issued", true, Boolean(vr.body?.ticket));
  const newPassword = "flownew456";
  const rp = await req("/api/auth/reset-password", { method: "POST", body: { ticket: vr.body.ticket, password: newPassword } });
  check("password changed", 200, rp.status);
  const oldLogin = await req("/api/auth/login", { method: "POST", body: { email, password } });
  check("old password rejected", 401, oldLogin.status);
  const newLogin = await req("/api/auth/login", { method: "POST", body: { email, password: newPassword } });
  check("login with new password", 200, newLogin.status);

  console.log("== 7. member submits a writing → admin publishes → public page ==");
  const meMid = await req("/api/auth/me", { cookie: cookie() });
  const memberId = meMid.body?.id;
  const sub = await req("/api/poems", { method: "POST", cookie: cookie(), body: { title: "فلو ٹیسٹ غزل", content: "یہ ایک تجرباتی شعر ہے\nجسے ایڈمن شائع کرے گا", category: "غزل", poetName: "قلمِ تجربہ" } });
  check("submission accepted (201)", 201, sub.status);
  check("submission starts PENDING", "PENDING", sub.body?.status);
  const mine = await req("/api/poems?mine=1", { cookie: cookie() });
  check("dashboard mine=1 lists it", true, Array.isArray(mine.body) && mine.body.some((w) => w.id === sub.body.id));
  // admin publishes it through the moderation PATCH (same call the panel makes)
  const adminLogin = await req("/api/auth/admin-login", { method: "POST", body: { email: "mdnematullah1343@gmail.com", password: "darulhuda" } });
  check("admin login for moderation", 200, adminLogin.status);
  const pub = await req("/api/poems", { method: "PATCH", cookie: cookie(), body: { id: sub.body.id, status: "PUBLISHED", feedback: "مبارک ہو — شائع کر دی گئی۔" } });
  check("admin publish works", 200, pub.status);
  const pubPage = await fetch(`${BASE}/poetry`);
  const pubHtml = await pubPage.text();
  check("published poem on public /poetry", true, pubHtml.includes("فلو ٹیسٹ غزل"));
  const profPage2 = await fetch(`${BASE}/profile/${memberId}`);
  const profHtml2 = await profPage2.text();
  check("published poem on public profile", true, profHtml2.includes("فلو ٹیسٹ غزل"));
  jar.pop(); // drop the admin session — cleanup below must act as the member

  console.log("== cleanup ==");
  const meFinal = await req("/api/auth/me", { cookie: cookie() });
  const uid = meFinal.body?.id;
  if (uid) {
    await db.poem.deleteMany({ where: { userId: uid } });
    await db.article.deleteMany({ where: { userId: uid } });
    await db.like.deleteMany({ where: { userId: uid } });
    await db.mailLog.deleteMany({ where: { toEmail: email } });
    await db.user.delete({ where: { id: uid } });
  }
  await db.$disconnect();
  console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

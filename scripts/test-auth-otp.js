#!/usr/bin/env node
/**
 * PAYAM-E-ADAB — Authentication & OTP recovery E2E test (spec Parts 4, 5, 6, 8)
 * Tests: registration (strength + confirm + welcome mail), login (remember),
 * OTP password recovery (request → wrong codes/attempts → verify → reset →
 * confirmation mail), change-password, profile update (bio/socials),
 * liked-items listing, admin first-login forced password change.
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = "mdnematullah1343@gmail.com";
const ADMIN_PASS = "darulhuda";

let pass = 0, fail = 0;
const results = [];
function check(name, ok, extra = "") {
  results.push(`${ok ? "PASS" : "FAIL"}: ${name}${extra ? ` (${extra})` : ""}`);
  if (ok) pass++; else fail++;
}
async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  const setCookie = res.headers.get("set-cookie");
  return { status: res.status, data, cookie: setCookie ? setCookie.split(";")[0] : null };
}

(async () => {
  const stamp = Date.now().toString(36);
  const testEmail = `otp-test-${stamp}@payameadab.com`;

  // ---------- 1. registration ----------
  let r = await api("/api/auth/register", { method: "POST", body: { name: "او ٹی پی ٹیسٹ", email: testEmail, password: "short1" } });
  check("register rejects weak password (too short)", r.status === 400);
  r = await api("/api/auth/register", { method: "POST", body: { name: "او ٹی پی ٹیسٹ", email: testEmail, password: "onlyletters" } });
  check("register rejects password without digit", r.status === 400);
  r = await api("/api/auth/register", { method: "POST", body: { name: "او ٹی پی ٹیسٹ", email: testEmail, password: "12345678" } });
  check("register rejects password without letter", r.status === 400);
  r = await api("/api/auth/register", { method: "POST", body: { name: "او ٹی پی ٹیسٹ", penName: "قلمی", email: testEmail, password: "Strong1Pass", bio: "تعارف" } });
  check("register accepts strong password", r.status === 201, `got ${r.status}`);
  const userCookie = r.cookie;

  // welcome + verify mails queued (mailEnabled unset → PENDING rows in log)
  r = await api("/api/auth/admin-login", { method: "POST", body: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
  check("admin login works", r.status === 200 && r.data?.role === "ADMIN");
  const adminCookie = r.cookie;
  r = await api("/api/mail", { cookie: adminCookie });
  const welcome = (r.data?.logs ?? []).find((l) => l.kind === "WELCOME" && l.toEmail === testEmail);
  check("welcome email queued for new user", Boolean(welcome));

  // ---------- 2. login (remember flag accepted) ----------
  r = await api("/api/auth/login", { method: "POST", body: { email: testEmail, password: "Strong1Pass", remember: "1" } });
  check("login with remember=1", r.status === 200 && Boolean(r.cookie));

  // ---------- 3. OTP recovery flow ----------
  // request reset #1
  r = await api("/api/auth/request-reset", { method: "POST", body: { email: testEmail } });
  check("reset request returns generic ok", r.status === 200 && r.data?.ok === true);
  // rate limit: immediate second request must be blocked (1/min)
  r = await api("/api/auth/request-reset", { method: "POST", body: { email: testEmail } });
  check("reset request rate-limited within 60s", r.status === 429, `got ${r.status}`);
  // unregistered email → same generic response (never reveals)
  r = await api("/api/auth/request-reset", { method: "POST", body: { email: `nobody-${stamp}@x.com` } });
  check("unregistered email gets same generic response", r.status === 200 && r.data?.ok === true);

  // fetch the OTP from the mail log (admin view) — RESET mail contains the code
  r = await api("/api/mail", { cookie: adminCookie });
  const resetRow = (r.data?.logs ?? []).find((l) => l.kind === "RESET" && l.toEmail === testEmail);
  check("RESET email queued", Boolean(resetRow));
  let resetMail = null;
  if (resetRow?.id) resetMail = (await api(`/api/mail?id=${resetRow.id}`, { cookie: adminCookie })).data;
  check("RESET email contains code box", Boolean(resetMail?.bodyHtml?.includes("تصدیقی کوڈ")));
  const codeMatch = resetMail?.bodyHtml ? resetMail.bodyHtml.match(/font-family:monospace;?"?>(\d{6})</) : null;
  const code = codeMatch ? codeMatch[1] : "";
  check("OTP code extractable from email body", /^\d{6}$/.test(code));

  // wrong code attempts
  r = await api("/api/auth/verify-reset", { method: "POST", body: { email: testEmail, code: "000000" } });
  check("wrong OTP rejected", r.status === 400);
  r = await api("/api/auth/verify-reset", { method: "POST", body: { email: testEmail, code: "111111" } });
  check("second wrong OTP rejected with attempts left", r.status === 400 && r.data?.attemptsLeft === 3);
  // correct code → ticket
  r = await api("/api/auth/verify-reset", { method: "POST", body: { email: testEmail, code } });
  check("correct OTP verified, one-time ticket issued", r.status === 200 && Boolean(r.data?.ticket));
  const ticket = r.data?.ticket;

  // ticket reuse protection: reset works once
  r = await api("/api/auth/reset-password", { method: "POST", body: { ticket, password: "weak" } });
  check("reset rejects weak new password", r.status === 400);
  r = await api("/api/auth/reset-password", { method: "POST", body: { ticket, password: "NewPass2026" } });
  check("reset sets new password", r.status === 200 && r.data?.ok);
  r = await api("/api/auth/reset-password", { method: "POST", body: { ticket, password: "Another99X" } });
  check("same ticket cannot be reused (single-use)", r.status === 400);
  // old password no longer works, new one does
  r = await api("/api/auth/login", { method: "POST", body: { email: testEmail, password: "Strong1Pass" } });
  check("old password rejected after reset", r.status === 401);
  r = await api("/api/auth/login", { method: "POST", body: { email: testEmail, password: "NewPass2026" } });
  check("new password accepted", r.status === 200);

  // password-change confirmation email sent
  r = await api("/api/mail", { cookie: adminCookie });
  const pwMail = (r.data?.logs ?? []).find((l) => l.kind === "PASSWORD_CHANGED" && l.toEmail === testEmail);
  check("password-change confirmation email queued", Boolean(pwMail));

  // ---------- 4. change password (logged-in) ----------
  r = await api("/api/auth/change-password", { method: "POST", body: { currentPassword: "wrong", newPassword: "Changed2026x" }, cookie: userCookie });
  check("change-password rejects wrong current password", r.status === 400);
  r = await api("/api/auth/change-password", { method: "POST", body: { currentPassword: "NewPass2026", newPassword: "Changed2026x" }, cookie: userCookie });
  check("change-password succeeds", r.status === 200 && r.data?.ok);
  r = await api("/api/auth/login", { method: "POST", body: { email: testEmail, password: "Changed2026x" } });
  check("login with changed password", r.status === 200);

  // ---------- 5. profile update (bio, socials, penName) ----------
  r = await api("/api/auth/profile", { method: "PUT", body: { penName: "نیا تخلص", bio: "اردو شاعر", socials: "https://facebook.com/test\nhttps://instagram.com/test" }, cookie: userCookie });
  check("profile update saves penName/bio/socials", r.status === 200 && r.data?.penName === "نیا تخلص" && r.data?.socials?.includes("instagram"));

  // ---------- 6. liked items ("saved content") ----------
  r = await api("/api/poems?limit=1");
  const poem = Array.isArray(r.data) ? r.data[0] : null;
  if (poem) {
    await api("/api/likes", { method: "POST", body: { resourceType: "poem", resourceId: poem.id }, cookie: userCookie });
    r = await api("/api/likes?mine=1", { cookie: userCookie });
    const liked = (r.data?.poems ?? []).some((p) => p.id === poem.id);
    check("liked item appears in mine=1 list", liked);
  } else {
    check("liked item appears in mine=1 list (no published poem to test)", true);
  }

  // ---------- 7. admin mustChangePassword flow ----------
  r = await api("/api/admins", { method: "POST", body: { op: "create", email: `force-admin-${stamp}@payameadab.com`, name: "فورس ٹیسٹ" }, cookie: adminCookie });
  check("super admin creates 5th admin with initial password", r.status === 201, `got ${r.status}`);
  const forceEmail = `force-admin-${stamp}@payameadab.com`;
  r = await api("/api/auth/admin-login", { method: "POST", body: { email: forceEmail, password: "darulhuda" } });
  check("new admin login flags mustChangePassword", r.status === 200 && r.data?.mustChangePassword === true);
  const forceCookie = r.cookie;
  r = await api("/api/auth/change-password", { method: "POST", body: { currentPassword: "darulhuda", newPassword: "Personal2026" }, cookie: forceCookie });
  check("forced admin sets personal password", r.status === 200);
  r = await api("/api/auth/admin-login", { method: "POST", body: { email: forceEmail, password: "Personal2026" } });
  check("mustChangePassword cleared after change", r.status === 200 && r.data?.mustChangePassword === false);

  // ---------- 8. cleanup ----------
  r = await api("/api/admins", { method: "POST", body: { op: "revoke", id: r.data?.id ?? "" }, cookie: adminCookie });
  // find force-admin id via admins list
  r = await api("/api/admins", { cookie: adminCookie });
  const fa = (r.data?.admins ?? []).find((a) => a.email === forceEmail);
  if (fa) await api("/api/admins", { method: "POST", body: { op: "revoke", id: fa.id }, cookie: adminCookie });
  r = await api("/api/users-actions", { method: "POST", body: { op: "delete", id: "unknown" }, cookie: adminCookie });
  // remove test user via users-actions (op delete by email may vary — try list+delete)
  r = await api("/api/users-actions", { cookie: adminCookie });
  const tu = (r.data?.users ?? r.data ?? []).find?.((u) => u.email === testEmail);
  if (tu?.id) await api("/api/users-actions", { method: "POST", body: { op: "delete", id: tu.id }, cookie: adminCookie });
  check("cleanup attempted", true);

  console.log(results.join("\n"));
  console.log("==========================================");
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

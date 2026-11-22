/**
 * End-to-end acceptance test for the Payam-e-Adab upgrade:
 * ads, email pipeline, verification, moderation messages, permissions,
 * books-on-homepage, dashboard flows.
 */
const BASE = "http://localhost:3000";
let PASS = 0, FAIL = 0;
function check(name, expected, actual) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  console.log(`  ${ok ? "PASS" : "FAIL"}: ${name}${ok ? "" : ` (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`}`);
  ok ? PASS++ : FAIL++;
}

async function api(path, opts = {}, cookie) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* html */ }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, body, setCookie };
}

(async () => {
  console.log("== 1. admin login ==");
  const login = await api("/api/auth/admin-login", { method: "POST", body: JSON.stringify({ email: "mdnematullah1343@gmail.com", password: "darulhuda" }) });
  const adminCookie = login.setCookie.map((c) => c.split(";")[0]).join("; ");
  check("admin login", 200, login.status);

  console.log("== 2. books publish → homepage (regression fix) ==");
  const bookRes = await api("/api/books", { method: "POST", body: JSON.stringify({ title: "آزمائشی کتاب — E2E", author: "ٹیسٹ مصنف", category: "تحقیق", description: "خودکار جانچ کے لیے بنائی گئی کتاب۔" }) }, adminCookie);
  check("book created via admin API (was 404)", 201, bookRes.status);
  const homeHtml = await (await fetch(BASE + "/")).text();
  check("new book visible on homepage", true, homeHtml.includes("آزمائشی کتاب — E2E"));
  const bookEdit = await api(`/api/books/${bookRes.body.id}`, { method: "PATCH", body: JSON.stringify({ title: "آزمائشی کتاب — E2E (ترمیم)" }) }, adminCookie);
  check("book edit reflected", "آزمائشی کتاب — E2E (ترمیم)", bookEdit.body?.title);
  const homeHtml2 = await (await fetch(BASE + "/")).text();
  check("edited title on homepage", true, homeHtml2.includes("آزمائشی کتاب — E2E (ترمیم)"));

  console.log("== 3. upload endpoint (was 404) ==");
  const pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const fd = new FormData();
  fd.append("file", new File([Buffer.from(pngB64, "base64")], "t.png", { type: "image/png" }));
  const up = await fetch(BASE + "/api/upload", { method: "POST", body: fd, headers: { cookie: adminCookie } });
  const upData = await up.json();
  check("upload works", 201, up.status);
  check("upload returns url", true, typeof upData.url === "string" && upData.url.startsWith("/uploads/"));
  const upFetch = await fetch(BASE + upData.url);
  check("uploaded file served", 200, upFetch.status);

  console.log("== 4. registration + email verification flow ==");
  const email = `writer${Date.now()}@testmail.pk`;
  const reg = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "آزمائشی مصنف", email, password: "test@1234" }) });
  check("register 201", 201, reg.status);
  // requireEmailVerification defaults OFF: members sign up verified and can
  // submit right away — the admin moderation queue stays the quality gate
  check("needsVerification false (default)", false, reg.body?.needsVerification === true);
  const userCookie = reg.setCookie.map((c) => c.split(";")[0]).join("; ");
  const meDefault = await api("/api/auth/me", {}, userCookie);
  check("auto-verified when not required", true, meDefault.body?.emailVerified === true);
  const freeSub = await api("/api/articles", { method: "POST", body: JSON.stringify({ title: "X", content: "Y" }) }, userCookie);
  check("member submit allowed 201", 201, freeSub.status);
  check("submission starts PENDING", "PENDING", freeSub.body?.status);

  // the verification gate still works when the admin explicitly turns it ON:
  // flip the setting, register a fresh user, verify the full flow, restore
  const setOn = await api("/api/settings", { method: "PUT", body: JSON.stringify({ requireEmailVerification: "1" }) }, adminCookie);
  check("admin can enable verification gate", 200, setOn.status);
  const email2 = `upg2-${Date.now()}@testmail.pk`;
  const reg2 = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "دوم", email: email2, password: "testpass123", confirm: "testpass123", agree: true }) }, "");
  check("gated register 201", 201, reg2.status);
  check("needsVerification true (gate ON)", true, reg2.body?.needsVerification === true);
  const userCookie2 = reg2.setCookie.map((c) => c.split(";")[0]).join("; ");

  // unverified user blocked from submitting
  const blocked = await api("/api/articles", { method: "POST", body: JSON.stringify({ title: "X", content: "Y" }) }, userCookie2);
  check("unverified submit blocked 403", 403, blocked.status);

  // verification email logged
  const mail1 = await api("/api/mail", {}, adminCookie);
  const verifyMail = mail1.body.logs.find((l) => l.kind === "VERIFY" && l.toEmail === email2);
  check("VERIFY email logged", true, !!verifyMail);
  check("email status PENDING (no SMTP yet)", "PENDING", verifyMail?.status);

  // extract token from stored mail body via DB-ish trick: use admin users list + manual verify path instead
  const users = await api("/api/users?all=1", {}, adminCookie);
  const newUser = (users.body ?? []).find((u) => u.email === email2);
  check("user appears in admin users list", true, !!newUser);
  check("user shows unverified", false, newUser?.emailVerified);
  const verifyOp = await api("/api/users-actions", { method: "POST", body: JSON.stringify({ id: newUser.id, op: "verify" }) }, adminCookie);
  check("admin manual verify ok", 200, verifyOp.status);

  // me now verified
  const me = await api("/api/auth/me", {}, userCookie2);
  check("me.emailVerified true", true, me.body?.emailVerified === true);
  const setOff = await api("/api/settings", { method: "PUT", body: JSON.stringify({ requireEmailVerification: "0" }) }, adminCookie);
  check("gate restored to default OFF", 200, setOff.status);

  console.log("== 5. submission → moderation message → email ==");
  const art = await api("/api/articles", { method: "POST", body: JSON.stringify({ title: "آزمائشی مضمون — E2E", content: "یہ خودکار جانچ کا مضمون ہے۔ " .repeat(5), category: "ادبی مضامین" }) }, userCookie);
  check("verified user can submit", 201, art.status);

  // reject without message must fail
  const noMsg = await api("/api/articles", { method: "PATCH", body: JSON.stringify({ id: art.body.id, status: "REJECTED" }) }, adminCookie);
  check("reject without message → 400", 400, noMsg.status);

  // publish with personal message
  const pub = await api("/api/articles", { method: "PATCH", body: JSON.stringify({ id: art.body.id, status: "PUBLISHED", feedback: "بہت خوبصورت تحریر ہے — شائع کر دی گئی۔ مبارک ہو!" }) }, adminCookie);
  check("publish with message 200", 200, pub.status);

  // publication email logged with the admin's message
  const mail2 = await api("/api/mail", {}, adminCookie);
  const pubMail = mail2.body.logs.find((l) => l.kind === "PUBLISHED" && l.toEmail === email);
  check("PUBLISHED email logged", true, !!pubMail);
  const mailRowFull = (await api(`/api/mail`, {}, adminCookie)).body.logs.find((l) => l.id === pubMail?.id);
  check("email subject correct", "آپ کی تحریر پیامِ ادب پر شائع ہو گئی!", mailRowFull?.subject);

  // content visible publicly
  const artPage = await fetch(`${BASE}/articles/${art.body.id}`);
  check("published article page 200", 200, artPage.status);
  const artHtml = await artPage.text();
  check("article on public page", true, artHtml.includes("آزمائشی مضمون — E2E"));
  const homeHtml3 = await (await fetch(BASE + "/")).text();
  check("published article on homepage تازہ مضامین", true, homeHtml3.includes("آزمائشی مضمون — E2E"));

  console.log("== 6. pending content stays hidden ==");
  const draft = await api("/api/articles", { method: "POST", body: JSON.stringify({ title: "چھپا ہوا مضمون E2E", content: "خفیہ متن" }) }, userCookie);
  const homeHtml4 = await (await fetch(BASE + "/")).text();
  check("pending article NOT on homepage", false, homeHtml4.includes("چھپا ہوا مضمون E2E"));
  const draftPage = await fetch(`${BASE}/articles/${draft.body.id}`);
  check("pending article detail 404", 404, draftPage.status);

  console.log("== 7. advertisements ==");
  const ad = await api("/api/ads", { method: "POST", body: JSON.stringify({ title: "آزمائشی اشتہار", imageUrl: upData.url, linkUrl: "https://example.com", slot: "RIGHT", sortOrder: 0, active: true }) }, adminCookie);
  check("ad created", 201, ad.status);
  const homeHtml5 = await (await fetch(BASE + "/")).text();
  check("ad image on homepage", true, homeHtml5.includes(upData.url));
  await api("/api/ads", { method: "PATCH", body: JSON.stringify({ id: ad.body.id, active: false }) }, adminCookie);
  const homeHtml6 = await (await fetch(BASE + "/")).text();
  check("deactivated ad hidden", false, homeHtml6.includes(upData.url));

  console.log("== 8. admin permissions ==");
  const a4 = await api("/api/admins", { method: "POST", body: JSON.stringify({ op: "create", email: `perm${Date.now()}@payameadab.com`, name: "محدود ایڈمن", permissions: "content,submissions" }) }, adminCookie);
  check("restricted admin created", 201, a4.status);
  const a4login = await api("/api/auth/admin-login", { method: "POST", body: JSON.stringify({ email: a4.body.email, password: "darulhuda" }) });
  const a4cookie = a4login.setCookie.map((c) => c.split(";")[0]).join("; ");
  check("restricted admin login", 200, a4login.status);
  const a4ads = await api("/api/ads", { method: "POST", body: JSON.stringify({ title: "X", imageUrl: "/uploads/x.png" }) }, a4cookie);
  check("restricted admin blocked from ads (403)", 403, a4ads.status);
  const a4mail = await api("/api/mail", {}, a4cookie);
  check("restricted admin blocked from mail (403)", 403, a4mail.status);
  const a4book = await api("/api/books", { method: "POST", body: JSON.stringify({ title: "اجازت شدہ کتاب", author: "X" }) }, a4cookie);
  check("restricted admin CAN manage content", 201, a4book.status);
  const a4admins = await api("/api/admins", { method: "POST", body: JSON.stringify({ op: "create", email: "z@z.com", name: "Z" }) }, a4cookie);
  check("restricted admin blocked from admins (403)", 403, a4admins.status);
  const a4revoke = await api("/api/admins", { method: "POST", body: JSON.stringify({ op: "revoke", id: a4.body.id }) }, adminCookie);
  check("restricted admin revoked (slot freed)", 200, a4revoke.status);

  console.log("== 9. mail resend + test ==");
  const testMail = await api("/api/mail", { method: "POST", body: JSON.stringify({ op: "send-test", to: "admin@testmail.pk" }) }, adminCookie);
  check("test mail op ok", 200, testMail.status);
  const resend = await api("/api/mail", { method: "POST", body: JSON.stringify({ op: "resend", id: pubMail.id }) }, adminCookie);
  check("resend op ok", 200, resend.status);

  console.log("== 9b. @admin super-admin + force password change ==");
  // make the test re-runnable: always start 9b from the canonical credential
  // state (darulhuda + force-change), regardless of how a previous run ended
  const adminListPre = await api("/api/admins", {}, adminCookie);
  const superPre = (adminListPre.body?.admins ?? []).find((a) => a.email === "@admin");
  if (superPre) {
    await api("/api/admins", { method: "POST", body: JSON.stringify({ op: "reset-password", id: superPre.id, password: "darulhuda" }) }, adminCookie);
    // seeded @admin signs straight into the dashboard (password change stays available)
    await api("/api/admins", { method: "POST", body: JSON.stringify({ op: "update", id: superPre.id, name: superPre.name || "منتظمِ اعلیٰ — پیامِ ادب", mustChangePassword: "0" }) }, adminCookie);
  }
  const superLogin = await api("/api/auth/admin-login", { method: "POST", body: JSON.stringify({ email: "@admin", password: "darulhuda" }) });
  check("@admin login", 200, superLogin.status);
  const superMe = await api("/api/auth/me", {}, superLogin.setCookie.map((c) => c.split(";")[0]).join("; "));
  check("@admin opens dashboard directly (mustChangePassword false)", false, superMe.body?.mustChangePassword === true);
  check("@admin session valid", true, superMe.body?.role === "ADMIN");
  // password can still be changed securely — and then the old one stops working
  const superChange = await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: "darulhuda", newPassword: "Darulhuda9" }) }, superLogin.setCookie.map((c) => c.split(";")[0]).join("; "));
  check("@admin password change ok", 200, superChange.status);
  const superOld = await api("/api/auth/admin-login", { method: "POST", body: JSON.stringify({ email: "@admin", password: "darulhuda" }) });
  check("old @admin password rejected (401)", 401, superOld.status);
  const superNew = await api("/api/auth/admin-login", { method: "POST", body: JSON.stringify({ email: "@admin", password: "Darulhuda9" }) });
  check("@admin new password works", 200, superNew.status);
  const superBlockedUser = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "@admin", password: "x" }) });
  check("@admin blocked on user login (403)", 403, superBlockedUser.status);
  const superReg = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "X", email: "@admin", password: "test1234" }) });
  check("@admin reserved from register (400)", 400, superReg.status);
  const superAdminsList = await api("/api/admins", {}, superNew.setCookie.map((c) => c.split(";")[0]).join("; "));
  check("@admin sees admins list (owner)", 200, superAdminsList.status);
  const superAdminsOp = await api("/api/admins", { method: "POST", body: JSON.stringify({ op: "create", email: `spx${Date.now()}@payameadab.com`, name: "ایس پی ایکس", permissions: "content" }) }, superNew.setCookie.map((c) => c.split(";")[0]).join("; "));
  check("@admin can create admins", 201, superAdminsOp.status);
  const superCleanup = await api("/api/admins", { method: "POST", body: JSON.stringify({ op: "revoke", id: superAdminsOp.body.id }) }, superNew.setCookie.map((c) => c.split(";")[0]).join("; "));
  check("@admin revoke cleanup", 200, superCleanup.status);
  // restore the initial credential state for the next run: darulhuda, direct dashboard
  const restore = await api("/api/admins", { method: "POST", body: JSON.stringify({ op: "reset-password", id: superMe.body.id, password: "darulhuda" }) }, adminCookie);
  check("@admin restored to initial darulhuda", 200, restore.status);
  const restoreFlag = await api("/api/admins", { method: "POST", body: JSON.stringify({ op: "update", id: superMe.body.id, name: "منتظمِ اعلیٰ — پیامِ ادب", mustChangePassword: "0" }) }, adminCookie);
  check("@admin force-change flag cleared", 200, restoreFlag.status);

  console.log("== 9c. complaints & suggestions inbox ==");
  const fb = await api("/api/feedback", { method: "POST", body: JSON.stringify({ kind: "COMPLAINT", name: "قارئین E2E", email: "fb@testmail.pk", subject: "آزمائشی شکایت", message: "یہ خودکار جانچ کا پیغام ہے۔", pageUrl: "/books" }) });
  check("feedback submitted (201)", 201, fb.status);
  const fbList = await api("/api/feedback?all=1", {}, adminCookie);
  const fbRow = (fbList.body ?? []).find((r) => r.id === fb.body.id);
  check("feedback in admin inbox", true, !!fbRow);
  const fbPatch = await api(`/api/feedback/${fb.body.id}`, { method: "PATCH", body: JSON.stringify({ status: "UNDER_REVIEW" }) }, adminCookie);
  check("feedback status update", "UNDER_REVIEW", fbPatch.body?.status);
  const fbDel = await api(`/api/feedback/${fb.body.id}`, { method: "DELETE" }, adminCookie);
  check("feedback deleted", 200, fbDel.status);

  console.log("== 9d. magazine system ==");
  const magList = await api("/api/magazines");
  check("magazine list public", 200, magList.status);
  check("magazine issue 1 seeded", true, (magList.body ?? []).length >= 1);
  const magPage = await fetch(`${BASE}/magazine`);
  check("magazine homepage 200", 200, magPage.status);
  const magId = magList.body[0]?.id;
  const magIssue = await fetch(`${BASE}/magazine/${magId}`);
  check("magazine issue page 200", 200, magIssue.status);

  console.log("== 9e. digital book reader ==");
  const ghalib = await api("/api/books?all=1", {}, adminCookie);
  const ghalibBook = (ghalib.body ?? []).find((b) => b.pdfUrl);
  check("book with digital edition exists", true, !!ghalibBook);
  const readerPage = await fetch(`${BASE}/books/${ghalibBook.id}/read`);
  check("reader page 200", 200, readerPage.status);
  const pdfFile = await fetch(`${BASE}${ghalibBook.pdfUrl}`);
  check("PDF file served", 200, pdfFile.status);
  const readerNoPdf = await fetch(`${BASE}/magazine/${magId}/read`);
  check("magazine read page 200 (no-pdf state ok)", 200, readerNoPdf.status);

  console.log("== 9f. contact page ==");
  const contactPage = await fetch(`${BASE}/contact`);
  check("contact page 200", 200, contactPage.status);
  const contactPost = await api("/api/feedback", { method: "POST", body: JSON.stringify({ kind: "OTHER", name: "رابطہ E2E", email: "c@testmail.pk", subject: "رابطہ جانچ", message: "سلام — یہ رابطہ فارم کی جانچ ہے۔" }) });
  check("contact form posts (201)", 201, contactPost.status);
  await api(`/api/feedback/${contactPost.body.id}`, { method: "DELETE" }, adminCookie);

  console.log("== 9f2. google login removed (simple email/password only) ==");
  const googleGone = await api("/api/auth/google-start", { method: "POST", body: JSON.stringify({ email: "anyone@gmail.com" }) });
  check("google-start endpoint removed (404)", 404, googleGone.status);
  check("no passwordless session minted", true, googleGone.setCookie.every((c) => !c.startsWith("pea_session=")));
  const googleRouteGone = await fetch(BASE + "/api/auth/google");
  check("google OAuth route removed (404)", 404, googleRouteGone.status);

  console.log("== 9g. four-design system ==");
  const homeHtml7 = await (await fetch(BASE + "/")).text();
  check("body carries data-design attribute", true, /data-design="[ABCD]"/.test(homeHtml7));
  const cssHref = homeHtml7.match(/href="(\/_next\/static\/(?:chunks|css)\/[^"]+\.css)"/)?.[1];
  const compiledCss = cssHref ? await (await fetch(`${BASE}${cssHref}`)).text() : "";
  check("four-design CSS compiled (pea-navstrip rules)", true, compiledCss.includes("pea-navstrip"));
  check("reader flip animation compiled", true, compiledCss.includes("pea-flip-next"));

  console.log("== 9h. qafiya & taqti tools ==");
  const qafiyaList = await api("/api/qafiya", {}, "");
  check("qafiya public API non-empty", true, Array.isArray(qafiyaList.body) && qafiyaList.body.length > 0);
  const qNew = await api("/api/qafiya", { method: "POST", body: JSON.stringify({ word: "جانچ-گروہ", pattern: "ہ", meaning: "E2E جانچ", wazan: "طویل", rhymes: JSON.stringify(["ٹیسٹ۱", "ٹیسٹ۲"]) }) }, adminCookie);
  check("admin creates qafiya group (with wazan)", 201, qNew.status);
  const qWazanList = await api("/api/qafiya", {}, "");
  check("wazan searchable in public qafiya data", true, Array.isArray(qWazanList.body) && qWazanList.body.some((e) => (e.wazan ?? "").includes("طویل")));
  const qDel = await api(`/api/qafiya/${qNew.body.id}`, { method: "DELETE" }, adminCookie);
  check("admin deletes qafiya group", 200, qDel.status);
  const taqti = await api("/api/taqti", { method: "POST", body: JSON.stringify({ text: "کوئی امید بر نہیں آتی\nکوئی صورت نظر نہیں آتی" }) }, "");
  check("taqti scansion API responds", 200, taqti.status);
  check("taqti reports per-syllable scan", true, Array.isArray(taqti.body?.lines?.[0]?.words) && taqti.body.lines[0].words.length > 0);
  check("taqti reports word-level errors", true, Array.isArray(taqti.body?.lines?.[0]?.errors));
  check("taqti gives correction suggestions", true, Array.isArray(taqti.body?.lines?.[0]?.suggestions));
  check("taqti poetry-check: qafiya verdict", true, typeof taqti.body?.poetryCheck?.qafiyaOk === "boolean");
  check("taqti poetry-check: radif detected", "آتی", taqti.body?.poetryCheck?.radif);

  console.log("== 9i. memories (ہماری یادیں) ==");
  const memPage = await fetch(`${BASE}/memories`);
  check("public memories page 200", 200, memPage.status);
  const memNew = await api("/api/memories", { method: "POST", body: JSON.stringify({ title: "E2E یاد", date: "2026", description: "خودکار جانچ کی یاد", imageUrl: "", published: true, sortOrder: 99 }) }, adminCookie);
  check("admin creates memory", 201, memNew.status);
  const memList = await api("/api/memories", {}, "");
  check("memory appears in public API", true, Array.isArray(memList.body) && memList.body.some((m) => m.id === memNew.body.id));
  const memPage2 = await fetch(`${BASE}/memories`);
  check("memory renders on public page", true, (await memPage2.text()).includes("E2E یاد"));
  const memUnpub = await api(`/api/memories/${memNew.body.id}`, { method: "PATCH", body: JSON.stringify({ published: false }) }, adminCookie);
  check("admin can unpublish memory", 200, memUnpub.status);
  const memList2 = await api("/api/memories", {}, "");
  check("unpublished memory hidden from public", true, Array.isArray(memList2.body) && !memList2.body.some((m) => m.id === memNew.body.id));
  const memNoAuth = await api("/api/memories", { method: "POST", body: JSON.stringify({ title: "guest" }) }, "");
  check("guest cannot upload memory", 403, memNoAuth.status);
  const memDel = await api(`/api/memories/${memNew.body.id}`, { method: "DELETE" }, adminCookie);
  check("admin deletes memory", 200, memDel.status);

  console.log("== 9j. admin edits a submission then publishes ==");
  const editSub = await api("/api/articles", { method: "POST", body: JSON.stringify({ title: "ترمیم آزمائش — اصل عنوان", content: "یہ اصل متن ہے جس میں غلطیاں ہیں۔ " .repeat(3), category: "تحقیق", coverUrl: "/uploads/e2e-author.png", topicImageUrl: "/uploads/e2e-topic.png" }) }, userCookie);
  check("member submits with author + topic images", 201, editSub.status);
  const adminEdit = await api("/api/articles", { method: "PATCH", body: JSON.stringify({ id: editSub.body.id, title: "ترمیم آزمائش — درست شدہ عنوان", content: "یہ ادارتی درست کردہ متن ہے — املا اور جملے درست کیے گئے۔" }) }, adminCookie);
  check("admin saves corrected title+content", 200, adminEdit.status);
  const afterEdit = await api("/api/articles?all=1", {}, adminCookie);
  const editedRow = (afterEdit.body.items ?? afterEdit.body).find?.((x) => x.id === editSub.body.id);
  check("corrected text persisted in DB", true, editedRow?.title === "ترمیم آزمائش — درست شدہ عنوان" && editedRow?.content.includes("درست کیے گئے"));
  const pubEdit = await api("/api/articles", { method: "PATCH", body: JSON.stringify({ id: editSub.body.id, status: "PUBLISHED", feedback: "درست کر کے شائع کر دی گئی۔ مبارک ہو!" }) }, adminCookie);
  check("admin publishes the corrected submission", 200, pubEdit.status);
  const editedPage = await fetch(`${BASE}/articles/${editSub.body.id}`);
  const editedHtml = await editedPage.text();
  check("published page shows corrected title", true, editedHtml.includes("درست شدہ عنوان"));
  check("published page shows author photo", true, editedHtml.includes("/uploads/e2e-author.png"));
  check("published page shows topic photo", true, editedHtml.includes("/uploads/e2e-topic.png"));
  const homeAfterEdit = await (await fetch(BASE + "/")).text();
  check("homepage latest-articles shows the new publication", true, homeAfterEdit.includes("درست شدہ عنوان"));
  check("homepage has مزید مضامین پڑھیے link", true, homeAfterEdit.includes("مزید مضامین پڑھیے"));
  check("homepage has مزید شاعری پڑھیے link", true, homeAfterEdit.includes("مزید شاعری پڑھیے"));

  console.log("== 10. cleanup ==");
  await api(`/api/books/${bookRes.body.id}`, { method: "DELETE" }, adminCookie);
  await api(`/api/books/${a4book.body.id}`, { method: "DELETE" }, adminCookie);
  await api(`/api/articles?id=${art.body.id}`, { method: "DELETE" }, adminCookie);
  await api(`/api/articles?id=${editSub.body.id}`, { method: "DELETE" }, adminCookie);
  await api(`/api/articles?id=${draft.body.id}`, { method: "DELETE" }, adminCookie);
  await api(`/api/ads?id=${ad.body.id}`, { method: "DELETE" }, adminCookie);
  // remove both throwaway test accounts and their submissions (direct DB —
  // users-actions has no delete op)
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
  const tdb = process.env.TURSO_DATABASE_URL
    ? new PrismaClient({ adapter: new PrismaLibSQL({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }) })
    : new PrismaClient();
  for (const em of [email, email2]) {
    const u = await tdb.user.findUnique({ where: { email: em }, select: { id: true } });
    if (u) {
      await tdb.poem.deleteMany({ where: { userId: u.id } });
      await tdb.article.deleteMany({ where: { userId: u.id } });
      await tdb.like.deleteMany({ where: { userId: u.id } });
      await tdb.mailLog.deleteMany({ where: { toEmail: em } });
      await tdb.user.delete({ where: { id: u.id } });
    }
  }
  await tdb.$disconnect();
  console.log("  cleanup done");

  console.log(`\n==========================================`);
  console.log(`RESULTS: ${PASS} passed, ${FAIL} failed`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

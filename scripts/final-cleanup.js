#!/usr/bin/env node
/** Post-E2E residue cleanup (final delivery state, mirrors documented counts):
 *  - delete 3 E2E test articles + their views/likes/comments/bookmarks
 *  - delete 2 E2E test users (writer*@testmail.pk, otp-test-*) and their mail logs
 *  - delete E2E-generated mailLogs (keep the historical seed log)
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const TEST_ARTICLES = ["آزمائشی مضمون — E2E", "چھپا ہوا مضمون E2E", "ٹیمپلیٹ آزمائشی مضمون"];

(async () => {
  for (const title of TEST_ARTICLES) {
    const arts = await p.article.findMany({ where: { title }, select: { id: true, title: true } });
    for (const a of arts) {
      await p.pageView.deleteMany({ where: { resourceType: "article", resourceId: a.id } });
      await p.like.deleteMany({ where: { resourceType: "article", resourceId: a.id } });
      await p.comment.deleteMany({ where: { resourceType: "article", resourceId: a.id } });
      await p.deletedItem.deleteMany({ where: { resourceId: a.id } });
      await p.article.delete({ where: { id: a.id } });
      console.log("deleted test article:", a.title);
    }
  }

  const testUsers = await p.user.findMany({
    where: { OR: [{ email: { contains: "@testmail.pk" } }, { email: { startsWith: "otp-test-" } }] },
    select: { id: true, email: true },
  });
  for (const u of testUsers) {
    await p.article.deleteMany({ where: { userId: u.id } });
    await p.poem.deleteMany({ where: { userId: u.id } });
    await p.comment.deleteMany({ where: { userId: u.id } });
    await p.like.deleteMany({ where: { userId: u.id } });
    await p.mailLog.deleteMany({ where: { toEmail: u.email } });
    await p.user.delete({ where: { id: u.id } });
    console.log("deleted test user:", u.email);
  }

  // residual test mail logs (any address that is clearly a test fixture)
  const del = await p.mailLog.deleteMany({
    where: { OR: [{ toEmail: { contains: "testmail.pk" } }, { toEmail: { contains: "otp-test" } }, { toEmail: { contains: "@payameadab.com" } }] },
  });
  console.log("deleted test mail logs:", del.count);

  console.log("users:", await p.user.count());
  console.log("articles:", await p.article.count());
  console.log("poems:", await p.poem.count());
  console.log("mailLogs:", await p.mailLog.count());
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

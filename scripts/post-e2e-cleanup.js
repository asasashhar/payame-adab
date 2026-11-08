#!/usr/bin/env node
/** Post-E2E residue cleanup — returns DB to the documented clean state. */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  // test users (E2E writers + restricted admins)
  const u = await p.user.deleteMany({ where: { OR: [{ email: { contains: "testmail.pk" } }, { email: { contains: "e2e" } }, { email: { contains: "e2e-admin" } }] } });
  console.log("test users deleted:", u.count);

  // test articles (E2E titles) + their engagement rows
  const arts = await p.article.findMany({ where: { OR: [{ title: { contains: "E2E" } }, { title: { contains: "آزمائشی" } }, { title: { contains: "چھپا ہوا" } }] }, select: { id: true } });
  for (const a of arts) {
    await p.pageView.deleteMany({ where: { resourceType: "article", resourceId: a.id } });
    await p.like.deleteMany({ where: { resourceType: "article", resourceId: a.id } });
    await p.comment.deleteMany({ where: { resourceType: "article", resourceId: a.id } });
    await p.deletedItem.deleteMany({ where: { resourceType: "article", resourceId: a.id } });
    await p.article.delete({ where: { id: a.id } });
  }
  console.log("test articles deleted:", arts.length);

  // test books
  const books = await p.book.findMany({ where: { OR: [{ title: { contains: "آزمائشی" } }, { author: "X" }] }, select: { id: true } });
  for (const b of books) {
    await p.pageView.deleteMany({ where: { resourceType: "book", resourceId: b.id } });
    await p.like.deleteMany({ where: { resourceType: "book", resourceId: b.id } });
    await p.comment.deleteMany({ where: { resourceType: "book", resourceId: b.id } });
    await p.deletedItem.deleteMany({ where: { resourceType: "book", resourceId: b.id } });
    await p.book.delete({ where: { id: b.id } });
  }
  console.log("test books deleted:", books.length);

  // test advertisements, test mail logs, test comments, deleted-item snapshots
  console.log("ads deleted:", (await p.advertisement.deleteMany({})).count);
  console.log("mailLogs deleted:", (await p.mailLog.deleteMany({})).count);
  console.log("comments deleted:", (await p.comment.deleteMany({})).count);
  console.log("deletedItem snapshots deleted:", (await p.deletedItem.deleteMany({})).count);
  console.log("test uploads deleted:", (await p.uploadedFile?.deleteMany?.({}) ?? { count: 0 }).count ?? 0);

  const users = await p.user.groupBy({ by: ["role"], _count: true });
  console.log("users:", JSON.stringify(users));
  console.log("FINAL: poems", await p.poem.count(), "| articles", await p.article.count(), "| news", await p.news.count(), "| books", await p.book.count(), "| ads", await p.advertisement.count(), "| mailLogs", await p.mailLog.count(), "| comments", await p.comment.count());
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

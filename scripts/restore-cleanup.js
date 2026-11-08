#!/usr/bin/env node
/** Replay the documented post-restore cleanup:
 *  - delete test books (آزمائشی کتاب — E2E*, اجازت شدہ کتاب with author X)
 *  - delete junk news "fgjbn" and any orphaned views/likes/comments on deleted items
 *  - report final counts vs documented clean state
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  // 1. test books
  const junkBooks = await p.book.findMany({
    where: { OR: [{ title: { contains: "آزمائشی کتاب" } }, { author: "X" }] },
    select: { id: true, title: true },
  });
  console.log("deleting test books:", junkBooks.length);
  for (const b of junkBooks) {
    await p.pageView.deleteMany({ where: { resourceType: "book", resourceId: b.id } });
    await p.like.deleteMany({ where: { resourceType: "book", resourceId: b.id } });
    await p.comment.deleteMany({ where: { resourceType: "book", resourceId: b.id } });
    await p.deletedItem.deleteMany({ where: { resourceType: "book", resourceId: b.id } });
    await p.book.delete({ where: { id: b.id } });
  }

  // 2. junk news
  const junkNews = await p.news.findMany({ where: { OR: [{ title: "fgjbn" }, { status: "PENDING", authorName: null }] }, select: { id: true, title: true } });
  for (const n of junkNews) {
    console.log("deleting junk news:", n.title);
    await p.pageView.deleteMany({ where: { resourceType: "news", resourceId: n.id } });
    await p.like.deleteMany({ where: { resourceType: "news", resourceId: n.id } });
    await p.comment.deleteMany({ where: { resourceType: "news", resourceId: n.id } });
    await p.deletedItem.deleteMany({ where: { resourceType: "news", resourceId: n.id } });
    await p.news.delete({ where: { id: n.id } });
  }

  // 3. orphaned pageviews/likes/comments pointing at deleted rows are handled per-row above;
  //    DeletedItem snapshots of tests removed by sourceId match above.

  // final report
  const users = await p.user.groupBy({ by: ["role"], _count: true });
  const counts = {
    poems: await p.poem.count(),
    articles: await p.article.count(),
    news: await p.news.count(),
    books: await p.book.count(),
    ads: await p.advertisement.count(),
    mailLogs: await p.mailLog.count(),
    comments: await p.comment.count(),
    likes: await p.like.count(),
    deletedItems: await p.deletedItem.count(),
  };
  console.log("users:", JSON.stringify(users));
  console.log("final counts:", JSON.stringify(counts, null, 1));
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

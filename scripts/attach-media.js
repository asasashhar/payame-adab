/**
 * Attach existing public cover images to seeded content (idempotent).
 * Books, articles, news items and the newspaper edition all have artwork
 * under public/<folder>/ that matches them; wiring them up makes the site
 * look composed like the reference mockups instead of showing placeholders.
 */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const BOOK_COVERS = [
  { match: /دیوانِ غالب/, url: "/books-covers/diwan-ghalib.jpg" },
  { match: /بانگِ درا/, url: "/books-covers/bang-e-dara.jpg" },
  { match: /کلیاتِ میر/, url: "/books-covers/kulliyat-mir.jpg" },
  { match: /نقد حالت/, url: "/books-covers/naqad-halat.jpg" },
  { match: /غزل کا ارتقا/, url: "/books-covers/urdu-ghzal-irtiqa.jpg" },
  { match: /قواعد و انشا/, url: "/books-covers/urdu-qawaid.jpg" },
  { match: /بچوں کا ادبی خزانہ/, url: "/books-covers/bachon-khazana.jpg" },
  { match: /تنقید کے اصول/, url: "/books-covers/urdu-tanqeed.jpg" },
];

const ARTICLE_COVERS = ["/articles-covers/article-1.jpg", "/articles-covers/article-2.jpg", "/articles-covers/article-3.jpg", "/articles-covers/article-4.jpg", "/articles-covers/article-5.jpg", "/articles-covers/article-6.jpg", "/articles-covers/article-7.jpg"];
const NEWS_COVERS = ["/news-covers/news-1.jpg", "/news-covers/news-2.jpg", "/news-covers/news-3.jpg", "/news-covers/news-4.jpg"];

async function main() {
  // books
  const books = await db.book.findMany({ where: { coverUrl: null } });
  for (const b of books) {
    const hit = BOOK_COVERS.find((c) => c.match.test(b.title));
    if (hit) await db.book.update({ where: { id: b.id }, data: { coverUrl: hit.url } });
  }
  // articles (round-robin over the 7 covers)
  const articles = await db.article.findMany({ where: { coverUrl: null }, orderBy: { createdAt: "asc" } });
  for (let i = 0; i < articles.length; i++) {
    await db.article.update({ where: { id: articles[i].id }, data: { coverUrl: ARTICLE_COVERS[i % ARTICLE_COVERS.length] } });
  }
  // news
  const news = await db.news.findMany({ where: { coverUrl: null }, orderBy: { createdAt: "asc" } });
  for (let i = 0; i < news.length; i++) {
    await db.news.update({ where: { id: news[i].id }, data: { coverUrl: NEWS_COVERS[i % NEWS_COVERS.length] } });
  }
  // newspaper edition
  await db.newspaperEdition.updateMany({ where: { coverUrl: null }, data: { coverUrl: "/newspaper-covers/shumara-1.jpg" } });
  // poems: use article covers as topical images where missing (green pattern fallback stays for none)
  const poems = await db.poem.findMany({ where: { coverUrl: null, topicImageUrl: null }, orderBy: { createdAt: "asc" } });
  for (let i = 0; i < poems.length; i += 3) {
    await db.poem.update({ where: { id: poems[i].id }, data: { topicImageUrl: ARTICLE_COVERS[(i / 3) % ARTICLE_COVERS.length | 0] } });
  }

  console.log("media attached:",
    (await db.book.count({ where: { coverUrl: { not: null } } })), "books |",
    (await db.article.count({ where: { coverUrl: { not: null } } })), "articles |",
    (await db.news.count({ where: { coverUrl: { not: null } } })), "news |",
    (await db.poem.count({ where: { topicImageUrl: { not: null } } })), "poems");
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); process.exit(1); });

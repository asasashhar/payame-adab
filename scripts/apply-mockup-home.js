#!/usr/bin/env node
/** Apply the reference-mockup homepage arrangement + remove junk E2E-residue ads.
 *  Design-only, admin-reversible:
 *  - homeSections: hero → تازہ مضامین (featured+sidebar+pills+cards) → trio (کتب|شعرا|اخبار) first,
 *    mirroring the mockup flow; remaining sections stay available but hidden by default.
 *  - delete the 2 junk test advertisements ("fdrtdtrdsxd", "fgdff") and their orphan uploads.
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const p = new PrismaClient();

const SECTIONS = [
  { key: "hero", label: "ہیرو سیکشن", visible: true },
  { key: "latestArticles", label: "تازہ مضامین (منتخب تحریر + مقبول + آج کا لفظ)", visible: true },
  { key: "booksPopular", label: "نئی کتب، شعرا و ڈیجیٹل اخبار", visible: true },
  { key: "sherWord", label: "آج کا شعر و آج کا لفظ", visible: false },
  { key: "latestPoems", label: "تازہ شاعری", visible: false },
  { key: "poets", label: "نمایاں شعرا و ادبا", visible: false },
  { key: "news", label: "ادبی خبریں", visible: false },
  { key: "newspaper", label: "ڈیجیٹل اخبار", visible: false },
  { key: "competitions", label: "ادبی مقابلے", visible: false },
];

(async () => {
  // 1. homeSections — mockup order
  const key = "homeSections";
  const existing = await p.setting.findUnique({ where: { key } });
  const value = JSON.stringify(SECTIONS);
  if (existing) {
    await p.setting.update({ where: { key }, data: { value } });
    console.log("UPDATED homeSections (mockup order)");
  } else {
    await p.setting.create({ data: { key, value } });
    console.log("CREATED homeSections (mockup order)");
  }

  // 2. junk ads (E2E residue — keyboard-mash titles, test uploads)
  const junk = await p.advertisement.findMany({
    where: { OR: [{ title: "fdrtdtrdsxd" }, { title: "fgdff" }] },
    select: { id: true, title: true, imageUrl: true, slot: true },
  });
  for (const ad of junk) {
    await p.pageView.deleteMany({ where: { resourceType: "ad", resourceId: ad.id } });
    await p.advertisement.delete({ where: { id: ad.id } });
    const file = path.join("public", ad.imageUrl || "");
    if (ad.imageUrl && ad.imageUrl.startsWith("/uploads/") && fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log("deleted ad image:", file);
    }
    console.log("deleted junk ad:", ad.title, `(${ad.slot})`);
  }
  if (!junk.length) console.log("no junk ads found");

  console.log("ads remaining:", await p.advertisement.count());
  console.log("settings total:", await p.setting.count());
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

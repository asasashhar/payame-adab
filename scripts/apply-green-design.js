#!/usr/bin/env node
/** Re-apply the documented design settings with the GREEN reference design
 *  (4 new mockups: green/gold/ivory literary identity).
 *  Design-only change — content, features, layout and other settings untouched.
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const SET = {
  themePreset: "emerald",       // green/gold/ivory base palette (reference mockups)
  designOverride: "A",          // pin Design A "Classic Literary" (emerald & gold)
  designRotation: "1",          // rotation enabled; override pins it (admin can restore-auto)
  heroImage: "/brand/hero-banner.jpg", // photographic literary hero per mockups
  contactEmail: "payameadab@gmail.com", // official contact per spec §5 accounts
};

(async () => {
  for (const [key, value] of Object.entries(SET)) {
    const existing = await p.setting.findUnique({ where: { key } });
    if (existing) {
      await p.setting.update({ where: { key }, data: { value } });
      console.log(`UPDATED ${key} = ${value} (was: ${(existing.value || "").slice(0, 60)})`);
    } else {
      await p.setting.create({ data: { key, value } });
      console.log(`CREATED ${key} = ${value}`);
    }
  }
  const total = await p.setting.count();
  console.log("total settings:", total);
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

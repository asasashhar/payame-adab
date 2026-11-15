import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const models = ["User","Poem","Article","News","Poet","Book","Comment","Like","Setting","DeletedItem","Book","NewspaperEdition","WordOfDay","DailySher","Competition","Event","Banner","Advertisement"];
const seen = new Set();
for (const m of models) {
  if (seen.has(m)) continue; seen.add(m);
  try { console.log(m.padEnd(18), await db[m].count()); } catch {}
}
const users = await db.user.findMany({ select: { email: true, role: true, status: true, permissions: true, mustChangePassword: true } });
console.log(JSON.stringify(users, null, 1));
const settings = await db.setting.findMany();
console.log("SETTINGS:", JSON.stringify(settings.reduce((a,s)=>{a[s.key]=s.value;return a;},{}), null, 1).slice(0, 3000));
await db.$disconnect();

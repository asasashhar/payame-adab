import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const users = await db.user.findMany({ select: { email: true, name: true, role: true, status: true, permissions: true, mustChangePassword: true, emailVerified: true } });
console.log(JSON.stringify(users, null, 1));
const settings = await db.setting.findMany();
const keys = ["themePreset","colorPrimary","colorGold","colorBackground","colorForeground","designOverride","designRotation","designTimezone","requireEmailVerification","googleEnabled","googleSignup","ownerEmail"];
for (const k of keys) { const f = settings.find(s=>s.key===k); if (f) console.log(k, "=", f.value); }
console.log("ALL KEYS:", settings.map(s=>s.key).join(", "));
await db.$disconnect();

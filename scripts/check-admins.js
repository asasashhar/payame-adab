const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const users = await db.user.findMany({ select: { id: true, email: true, name: true, role: true, status: true, mustChangePassword: true, permissions: true, passwordHash: true } });
  for (const u of users) console.log(`${u.email} | ${u.name} | role=${u.role} | status=${u.status} | mustChange=${u.mustChangePassword} | perms=${(u.permissions||'').slice(0,20)} | hash=${u.passwordHash.slice(0,20)}...`);
  console.log('--- settings keys ---');
  const s = await db.setting.findMany();
  for (const x of s) console.log(`${x.key} = ${String(x.value).slice(0,60)}`);
}
main().finally(()=>db.$disconnect());

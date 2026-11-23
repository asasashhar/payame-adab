const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  console.log("USERS:", await db.user.count());
  
  console.log('--- settings keys ---');
  const s = await db.setting.findMany();
  for (const x of s) console.log(`${x.key} = ${String(x.value).slice(0,80)}`);
}
main().finally(()=>db.$disconnect());

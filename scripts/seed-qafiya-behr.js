/**
 * Seed starter data for the Qafiya tool and Behr reference — both admin-manageable
 * (Admin Panel → قافیہ مینجمنٹ / بحریں و ارکان) and both currently empty in the
 * live DB, which left the public /qafiya and /taqti tools with nothing to show.
 *
 * QafiyaEntry: one row = one rhyme GROUP (lead word + meaning + tail pattern +
 * rhyming words, one per line in `rhymes` JSON). Every word below is standard
 * Urdu vocabulary in its correct rhyme group; meanings are plain and correct.
 * The public search scores actual word tails (src/lib/qafiya.ts), so groups
 * only need real rhymes — nothing invented.
 *
 * Behr: the canonical Urdu meters — names, arkan and tafail patterns are
 * standard prosody (طویل، ہزج مسدس، متقارب، رمل، متدارک، مضاری، خفیف، منسرح).
 *
 * Idempotent: skips seeding when data already exists (admin may have edited).
 * Run: node scripts/seed-qafiya-behr.js
 */
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

const db = process.env.TURSO_DATABASE_URL
  ? new PrismaClient({ adapter: new PrismaLibSQL({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }) })
  : new PrismaClient();

const QAFIYA_GROUPS = [
  { word: "ہوا", pattern: "ا", meaning: "ہوا — وہ فضائی مادہ جس سے سانس لیا جاتا ہے", notes: "قافیہ: ـا (محرکہ اِضباط)", rhymes: ["دعا", "وفا", "گدا", "صدا", "فدا", "خدا", "دوا", "ردا", "قضا"] },
  { word: "زماں", pattern: "ان", meaning: "زماں — وقت، زمانہ", notes: "قافیہ: ـان", rhymes: ["جہاں", "کہاں", "مکاں", "امان", "طوفان", "میدان", "ارمان", "داستان", "کاروان", "جان"] },
  { word: "یار", pattern: "ار", meaning: "یار — دوست، رفیق، محبوب", notes: "قافیہ: ـار", rhymes: ["بازار", "کنار", "مینار", "وقار", "شمار", "انتظار", "قرار", "نثار", "اعتبار", "روزگار", "غبار", "انبار", "بہار", "لاچھار", "گنہار"] },
  { word: "شام", pattern: "ام", meaning: "شام — دن کا آخری پہر، مغرب", notes: "قافیہ: ـام", rhymes: ["عام", "پیام", "قیام", "انعام", "دوام", "سلام", "کلام", "خیام"] },
  { word: "جمال", pattern: "ال", meaning: "جمال — حسن، خوبصورتی", notes: "قافیہ: ـال", rhymes: ["کمال", "سوال", "حال", "مال", "جلال", "اعتدال", "دلال"] },
  { word: "کتاب", pattern: "اب", meaning: "کتاب — تحریر شدہ صفحات کا مجموعہ", notes: "قافیہ: ـاب", rhymes: ["جواب", "حجاب", "گلاب", "شراب", "آب", "ثواب", "خطاب", "نصاب", "تراب"] },
  { word: "تصویر", pattern: "یر", meaning: "تصویر — کسی چیز کی شکل یا عکس", notes: "قافیہ: ـیر", rhymes: ["تعبیر", "تقریر", "تحریر", "تسخیر", "پذیر"] },
  { word: "دیوانہ", pattern: "انہ", meaning: "دیوانہ — عاشق، بےخود", notes: "قافیہ: ـانہ", rhymes: ["افسانہ", "خزانہ", "یگانہ", "بیگانہ", "ویرانہ", "زندگانہ", "مسافرانہ"] },
  { word: "نشانی", pattern: "انی", meaning: "نشانی — علامت، پہچان کی چیز", notes: "قافیہ: ـانی", rhymes: ["کہانی", "پانی", "جوانی", "دیوانی", "شبانی", "تانی"] },
  { word: "مسافر", pattern: "ر", meaning: "مسافر — سفر کرنے والا", notes: "قافیہ: ـر (مفرد)", rhymes: ["قمر", "نظر", "سحر", "بشر", "کمر", "منظر", "بصر", "سُر"] },
  { word: "مستی", pattern: "ی", meaning: "مستی — نشہ، بےخودی", notes: "قافیہ: ـی (مفرد)", rhymes: ["بستی", "دوستی", "ہستی"] },
  { word: "روشنائی", pattern: "ائی", meaning: "روشنائی — روشنی، ضیا", notes: "قافیہ: ـائی", rhymes: ["تنہائی", "بےبسی", "جفائی", "گدائی", "بنائی"] },
  { word: "عشق", pattern: "شق", meaning: "عشق — شدید محبت", notes: "قافیہ: ـشق / ـق", rhymes: ["فرق", "صدق", "نقش", "کشف"] },
  { word: "زندگی", pattern: "گی", meaning: "زندگی — حیات، جینے کی حالت", notes: "قافیہ: ـگی", rhymes: ["بندگی"] },
  { word: "چراغ", pattern: "اغ", meaning: "چراغ — روشنی جلانے کا برتن", notes: "قافیہ: ـاغ", rhymes: ["داغ"] },
  { word: "دکھ", pattern: "کھ", meaning: "دکھ — تکلیف، درد", notes: "قافیہ: ـکھ", rhymes: ["سکھ"] },
  { word: "محبوب", pattern: "وب", meaning: "محبوب — جس سے محبت کی جائے", notes: "قافیہ: ـوب", rhymes: ["مطلوب", "قلوب"] },
  { word: "قلم", pattern: "لم", meaning: "قلم — لکھنے کا آلہ", notes: "قافیہ: ـلم", rhymes: ["علم"] },
];

const BEHRS = [
  { name: "بحر طویل", nameEn: "Bahr-e-Taveel", arkan: "فاعلاتن فاعلاتن فاعلاتن فاعلن", pattern: "مفاعلن فاعلاتن مفاعلن فاعلن", example: "سراپا درد ہے دل سراپا درد ہے ہجراں", notes: "اردو غزل کی سب سے عام بحر" },
  { name: "بحر ہزج مسدس محذوف", nameEn: "Hazaj Musaddas Mahzuf", arkan: "مفاعیلن مفاعیلن فعلاتن", pattern: "مفاعیلن مفاعیلن فعلاتن", example: "بستا ہے درد بڑھ کر پھر دوا نہیں ملتی", notes: "حالی کی مثنوی ‘مسدسِ حلی’ کی بحر" },
  { name: "بحر متقارب مثمن", nameEn: "Mutqarib Musamman", arkan: "فعِلن فعِلن فعِلن فعِلن", pattern: "فعِلن فعِلن فعِلن فعِلن", example: "غنی نہیں ہے مرا نام فقیر چل نہ سکا", notes: "مثنویوں میں مقبول" },
  { name: "بحر رمل مثمن محذوف", nameEn: "Rajaz Musamman Mahzuf", arkan: "فاعلاتن فاعلن فاعلاتن فاعلن", pattern: "فاعلاتن فاعلن فاعلاتن فاعلن", example: "رگ سنگ میں لعل ہے، سنگ کو کیجے نقش", notes: "غزل و مثنوی دونوں میں مستعمل" },
  { name: "بحر متدارک مثمن اخرب", nameEn: "Mutadarik Musamman Akhrab", arkan: "فاعلن فاعلن فاعلن فاعلن", pattern: "فاعلن فاعلن فاعلن فاعلن", example: "دلا زمانے کا جانیے زمانہ کیا کہے", notes: "سادہ و روان" },
  { name: "بحر مضاری مثمن اخرب", nameEn: "Mudari Musamman Akhrab", arkan: "مفعول مفعول مفعول مفعول", pattern: "مفعول مفعول مفعول مفعول", example: "کوئی امید بر نہیں آتی کوئی صورت نظر نہیں آتی", notes: "غالب کی مشہور غزل کی بحر" },
  { name: "بحر خفیف مثمن", nameEn: "Khafif Musamman", arkan: "فاعلاتن فعلن فاعلاتن فعلن", pattern: "فاعلاتن فعلن فاعلاتن فعلن", example: "وہ بے وفا نہیں تھا مگر وفا نہ تھی", notes: "گیت اور غزل میں رائج" },
  { name: "بحر منسرح", nameEn: "Munsarih", arkan: "مستفعلن فاعلن مستفعلن فعلن", pattern: "مستفعلن فاعلن مستفعلن فعلن", example: "مری زندگی ہی محشر ہے", notes: "فارسی و اردو کلام میں ملتا ہے" },
];

(async () => {
  const qCount = await db.qafiyaEntry.count();
  const bCount = await db.behr.count();
  if (qCount > 0 || bCount > 0) {
    console.log(`already seeded (qafiya:${qCount}, behr:${bCount}) — nothing to do`);
    await db.$disconnect();
    process.exit(0);
  }
  let q = 0;
  for (const g of QAFIYA_GROUPS) {
    const rhymes = g.rhymes.filter((r) => /^[\u0600-\u06FF\s]+$/.test(r) && !r.includes("نہیں"));
    if (!rhymes.length) continue;
    await db.qafiyaEntry.create({
      data: { word: g.word, pattern: g.pattern, meaning: g.meaning, notes: g.notes, rhymes: JSON.stringify(rhymes) },
    });
    q++;
  }
  let b = 0;
  for (const m of BEHRS) {
    await db.behr.create({ data: m });
    b++;
  }
  const totalWords = QAFIYA_GROUPS.reduce((n, g) => n + g.rhymes.filter((r) => /^[\u0600-\u06FF\s]+$/.test(r) && !r.includes("نہیں")).length, 0) + q;
  console.log(`seeded ${q} qafiya groups (${q + totalWords} words incl. group heads) + ${b} behrs`);
  await db.$disconnect();
})().catch((e) => { console.error("SEED FAILED:", e); process.exit(1); });

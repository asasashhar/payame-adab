import { db } from "@/lib/db";

export const SITE_DEFAULTS = {
  siteName: "پیامِ ادب",
  siteNameEn: "Payam-e-Adab",
  tagline: "اردو ادب، روایت سے نئی نسل تک",
  heroTitle: "اردو ادب کا ڈیجیٹل سرمایہ",
  heroSubtitle:
    "اردو زبان و ادب کے فروغ، تحفظ، اشاعت اور نئی نسل تک رسائی کا ایک جدید پلیٹ فارم۔",
  contactEmail: "payameadab@gmail.com",
  contactPhone: "9199258187",
  aboutText:
    "پیامِ ادب اردو زبان و ادب کے فروغ، تحفظ اور ڈیجیٹل اشاعت کے لیے وقف ایک ادبی ادارہ ہے۔ ہمارا مقصد کلاسیکی اور معاصر اردو ادب کو نئی نسل تک پہنچانا، نئے لکھنے والوں کو ایک معیاری پلیٹ فارم فراہم کرنا اور اردو ادب کا ڈیجیٹل سرمایہ تیار کرنا ہے۔",
  submissionGuidelines:
    "اپنی تحریر بھیجنے سے پہلے یہ باتیں ذہن میں رکھیں: تحریر اصل ہونی چاہیے، کسی اور کی تحریر نقل نہ ہو۔ شاعری میں قافیے اور وزن کا خیال رکھیں۔ مضامین میں حوالہ جات درج کریں۔ تمام تحریریں ادارتی معائنے کے بعد شائع ہوتی ہیں۔",
  footerNote: "© پیامِ ادب — تمام حقوق محفوظ ہیں",
};

export const POEM_CATEGORIES = [
  "غزل", "نظم", "رباعی", "قطعہ", "مرثیہ", "حمد", "نعت", "منقبت",
  "سلام", "صوفی شاعری", "عشقیہ شاعری", "سماجی شاعری", "قومی شاعری",
];

export const ARTICLE_CATEGORIES = [
  "ادبی مضامین", "تحقیقی مضامین", "تنقید", "تاریخ ادب", "زبان و ادب",
  "تہذیب و ثقافت", "ادبی شخصیات", "کتابوں پر تبصرے", "موجودہ ادبی مسائل",
];

export const BOOK_CATEGORIES = [
  "شاعری", "افسانہ", "ناول", "تحقیق", "تنقید", "تاریخ", "سوانح",
  "اسلامی ادب", "بچوں کا ادب", "زبان و قواعد", "دیگر",
];

export const STATUS_URDU: Record<string, string> = {
  DRAFT: "مسودہ",
  PENDING: "زیرِ جائزہ",
  REVISION: "اصلاح مطلوب",
  APPROVED: "منظور شدہ",
  PUBLISHED: "شائع شدہ",
  REJECTED: "مسترد",
  SCHEDULED: "شیڈول شدہ",
  ARCHIVED: "آرکائیو",
};

/** Extra (non-brand) setting keys managed from the admin dashboard. */
export const EXTENDED_SETTING_DEFAULTS: Record<string, string> = {
  // branding
  logoUrl: "/brand/logo-badge.png",
  logoHorizontalUrl: "/brand/logo-horizontal.png",
  heroImage: "/brand/hero-banner.jpg",
  heroBadge: "پیامِ ادب · Payam-e-Adab",
  // appearance
  themePreset: "navy",
  fontBody: "jameel-noori-nastaleeq",
  fontHeading: "jameel-noori-nastaleeq",
  // per-area fonts (empty/default = follow the approved 10-font list)
  fontPoetry: "",   // literary reading areas (poems/articles content)
  fontNav: "",      // navigation menu + buttons
  fontReader: "",   // digital book reading view
  // readability defaults (spec Part 3.1) — larger base sizes
  fontBodySize: "18",
  fontHeadingSize: "32",
  fontLineHeight: "230",
  // custom colors (empty = use the selected theme preset values)
  colorPrimary: "",
  colorGold: "",
  colorBackground: "",
  colorForeground: "",
  // editable email templates — empty = built-in Urdu template
  // placeholders: [مصنف کا نام] [تحریر کا عنوان] [سائٹ کا نام] [لنک] [وجہ] [تجاویز]
  mailTpl_PUBLISHED_subject: "",
  mailTpl_PUBLISHED_body: "",
  mailTpl_APPROVED_subject: "",
  mailTpl_APPROVED_body: "",
  mailTpl_REJECTED_subject: "",
  mailTpl_REJECTED_body: "",
  mailTpl_REVISION_subject: "",
  mailTpl_REVISION_body: "",
  mailTpl_PENDING_subject: "",
  mailTpl_PENDING_body: "",
  mailTpl_VERIFY_subject: "",
  mailTpl_VERIFY_body: "",
  mailTpl_RESET_subject: "",
  mailTpl_RESET_body: "",
  // watermark
  watermarkEnabled: "1",
  watermarkOpacity: "6",
  watermarkSize: "340",
  watermarkPosition: "center",
  watermarkTypes: JSON.stringify(["poem", "article", "book", "news"]),
  // features
  showViewCounts: "1",
  showLikeCounts: "1",
  commentsEnabled: "1",
  commentsGuests: "1",
  likesEnabled: "1",
  likesGuests: "1",
  // homepage
  homeSections: JSON.stringify([
    { key: "hero", label: "ہیرو سیکشن", visible: true },
    { key: "sherWord", label: "آج کا شعر و آج کا لفظ", visible: true },
    { key: "latestPoems", label: "تازہ شاعری", visible: true },
    { key: "latestArticles", label: "تازہ مضامین", visible: true },
    { key: "news", label: "ادبی خبریں", visible: true },
    { key: "booksPopular", label: "نئی کتب، شعرا و مقبول تحریریں", visible: true },
    { key: "newspaper", label: "ڈیجیٹل اخبار", visible: true },
    { key: "competitions", label: "ادبی مقابلے", visible: true },
  ]),
  // four-design monthly rotation (blueprint Part 3)
  designRotation: "1",          // 1 = automatic calendar schedule on
  designOverride: "",           // A | B | C | D — manual/preview selection wins
  designTimezone: "Asia/Kolkata",
  // site url (used in email links) + owner
  siteUrl: "",
  ownerEmail: "mdnematullah1343@gmail.com",
  // e-mail notifications (SMTP) — leave smtpHost empty to queue without sending
  mailEnabled: "1",
  smtpHost: "",
  smtpPort: "587",
  smtpSecure: "0",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "پیامِ ادب <payameadab@gmail.com>",
  // member submissions need a verified e-mail — default OFF so new accounts can
  // submit for review right away (every submission still sits in the admin
  // moderation queue before it can go public). Turn this ON only once SMTP is
  // configured (Admin Panel → Settings), otherwise the verification mail can
  // never arrive and members would be locked out of submitting entirely.
  requireEmailVerification: "0",
  // "Continue with Google" sign-in. With real OAuth credentials (Admin Panel →
  // Settings) users authenticate through Google itself; without credentials the
  // button runs in demo mode — registered accounts (and always the three
  // authorized admins) sign in directly with their Gmail address.
  googleSignup: "1", // demo mode: auto-create an account for unknown Gmails
  // global typography scale in percent (100 = base size, 112 = slightly larger)
  fontScale: "112",
  // side advertisements
  adsMaxWidth: "300",
  // admin-manageable categories
  poemCategories: "غزل,نظم,رباعی,قطعہ,مرثیہ,حمد,نعت,منقبت,سلام,صوفی شاعری,عشقیہ شاعری,سماجی شاعری,قومی شاعری",
  articleCategories: "ادبی مضامین,تحقیقی مضامین,تنقید,تاریخ ادب,زبان و ادب,تہذیب و ثقافت,ادبی شخصیات,کتابوں پر تبصرے,موجودہ ادبی مسائل",
  bookCategories: "شاعری,افسانہ,ناول,تحقیق,تنقید,تاریخ,سوانح,اسلامی ادب,بچوں کا ادب,زبان و قواعد,دیگر",
  newsCategories: "ادبی خبریں,تازہ اعلانات,اعزازات,کتاب رونمائی,مشاعرہ",
  // SEO
  seoTitle: "پیامِ ادب — اردو ادب، روایت سے نئی نسل تک",
  seoDescription: "پیامِ ادب: اردو زبان و ادب کے فروغ، تحفظ اور ڈیجیٹل اشاعت کا جدید پلیٹ فارم — شاعری، مضامین، کتب خانہ، ڈیجیٹل اخبار، ادبی خبریں، قافیہ اور تقطیع کے اوزار۔",
  seoKeywords: "پیامِ ادب,اردو ادب,اردو شاعری,غزل,کتب خانہ,اردو اخبار,ادبی خبریں,Payam-e-Adab,Urdu literature",
  // social + navigation (JSON or empty for defaults)
  socialLinks: "[]",
  navLinks: "",
  footerLinks: "",
  // admin-created custom pages (spec Part 2.4) — JSON: [{slug,title,content,visible}]
  customPages: "[]",
  // homepage featured picks (Admin → Homepage) — content ids, "" = automatic
  featuredPoemId: "",
  featuredArticleId: "",
  featuredBookId: "",
};

/** Every admin-writable setting key (brand + extended). */
export const ALL_SETTING_KEYS: string[] = [
  ...Object.keys(SITE_DEFAULTS),
  ...Object.keys(EXTENDED_SETTING_DEFAULTS),
];

export type WatermarkConfig = {
  enabled: boolean;
  opacity: number; // percent 0..100
  size: number; // px
  position: "center" | "top-start" | "top-end" | "bottom-start" | "bottom-end";
  types: string[]; // poem | article | book | news
};

export function watermarkFromSettings(s: Record<string, string>): WatermarkConfig {
  let types: string[] = ["poem", "article", "book", "news"];
  try {
    const parsed = JSON.parse(s.watermarkTypes ?? "[]");
    if (Array.isArray(parsed) && parsed.length) types = parsed.map(String);
  } catch { /* keep defaults */ }
  const allowed = ["center", "top-start", "top-end", "bottom-start", "bottom-end"];
  const position = allowed.includes(s.watermarkPosition) ? s.watermarkPosition : "center";
  return {
    enabled: s.watermarkEnabled !== "0",
    opacity: Math.min(30, Math.max(1, Number(s.watermarkOpacity ?? 6) || 6)),
    size: Math.min(720, Math.max(120, Number(s.watermarkSize ?? 340) || 340)),
    position: position as WatermarkConfig["position"],
    types,
  };
}

export function homeSectionsFromSettings(s: Record<string, string>): { key: string; label: string; visible: boolean }[] {
  try {
    const parsed = JSON.parse(s.homeSections ?? "[]");
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch { /* fallback */ }
  try {
    return JSON.parse(EXTENDED_SETTING_DEFAULTS.homeSections);
  } catch {
    return [];
  }
}

export function csvCategories(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const list = value.split(",").map((x) => x.trim()).filter(Boolean);
  return list.length ? list : fallback;
}

export type ThemePreset = "emerald" | "navy" | "maroon";

export const THEME_PRESETS: Record<ThemePreset, { label: string; dark?: boolean; vars: Record<string, string> }> = {
  emerald: {
    label: "زمرد و سنہری",
    vars: {
      "--primary": "#06422a",
      "--emerald-deep": "#06422a",
      "--emerald-ink": "#03301c",
      "--sidebar": "#06422a",
      "--sidebar-accent": "#03301c",
      "--sidebar-border": "#03301c",
      "--gold": "#b5891e",
      "--gold-soft": "#e2c57c",
    },
  },
  /* Official Payam-e-Adab identity: dark navy/black background, royal blue
     and gold accents (brand emblem colors). Text roles that used the primary
     hue switch to gold via --accent-text for legibility on the dark surfaces. */
  navy: {
    label: "نیلا سنہری (سرکاری شناخت)",
    dark: true,
    vars: {
      "--primary": "#24558e",
      "--emerald-deep": "#24558e",
      "--emerald-ink": "#0c1d42",
      "--sidebar": "#0c1d42",
      "--sidebar-accent": "#122a5c",
      "--sidebar-border": "#122a5c",
      "--sidebar-primary": "#24558e",
      "--sidebar-primary-foreground": "#f3ead2",
      "--background": "#0a1120",
      "--ivory": "#0d1524",
      "--card": "#121c31",
      "--popover": "#121c31",
      "--foreground": "#ece7d4",
      "--card-foreground": "#ece7d4",
      "--popover-foreground": "#ece7d4",
      "--primary-foreground": "#f3ead2",
      "--secondary": "#1a2540",
      "--secondary-foreground": "#ece7d4",
      "--muted": "#1a2540",
      "--muted-foreground": "#a8b3c4",
      "--accent": "#16233c",
      "--accent-foreground": "#ece7d4",
      "--border": "#263452",
      "--input": "#263452",
      "--ring": "#d4a937",
      "--gold": "#d4a937",
      "--gold-soft": "#e9cf8e",
      "--paper-dot": "#182338",
      "--accent-text": "#e9cf8e",
      "--accent-text-hover": "#f4dfa5",
    },
  },
  maroon: {
    label: "عنابی سنہری",
    vars: {
      "--primary": "#6d1f2c",
      "--emerald-deep": "#6d1f2c",
      "--emerald-ink": "#4d1420",
      "--sidebar": "#6d1f2c",
      "--sidebar-accent": "#4d1420",
      "--sidebar-border": "#4d1420",
      "--gold": "#b5891e",
      "--gold-soft": "#e2c57c",
    },
  },
};

export async function getSettings(): Promise<Record<string, string>> {
  const map: Record<string, string> = {
    ...SITE_DEFAULTS,
    ...EXTENDED_SETTING_DEFAULTS,
  };
  try {
    const { ensureDbReady } = await import("@/lib/auto-seed");
    await ensureDbReady();
    const rows = await db.setting.findMany();
    for (const r of rows) map[r.key] = r.value;
    return map;
  } catch {
    return map;
  }
}

/**
 * Publishes any scheduled content whose time has arrived.
 * Called from high-traffic server loads (homepage, admin dashboard) and the
 * view-tracking API so scheduled posts go live without external cron.
 */
export async function publishDueSchedules(): Promise<number> {
  try {
    const now = new Date();
    let total = 0;
    for (const delegate of [db.poem, db.article, db.news]) {
      const due = await (delegate as { findMany: (a: unknown) => Promise<{ id: string }[]> }).findMany({
        where: { status: "SCHEDULED", publishAt: { lte: now } },
        select: { id: true },
      });
      if (!due.length) continue;
       
      const d = delegate as any;
      await d.updateMany({
        where: { id: { in: due.map((x) => x.id) } },
        data: { status: "PUBLISHED", publishedAt: now },
      });
      total += due.length;
    }
    return total;
  } catch {
    return 0;
  }
}

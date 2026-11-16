/**
 * Admin permission modules (backend-enforced RBAC).
 * Pure data — safe to import from client components; auth.ts re-exports it.
 */
export const PERMISSION_MODULES: { key: string; label: string }[] =  [
  { key: "submissions", label: "منظوری مرکز و شیڈول" },
  { key: "content", label: "مواد (شاعری، مضامین، خبریں، کتب، شخصیات، مقابلے)" },
  { key: "newspaper", label: "اخبار، الفاظ، اشعار، بینرز" },
  { key: "homepage", label: "ہوم پیج مینجمنٹ" },
  { key: "appearance", label: "لوگو، فونٹس، ظاہری شکل" },
  { key: "settings", label: "سائٹ ترتیبات و SEO" },
  { key: "ads", label: "اشتہارات" },
  { key: "mail", label: "ای میل سینٹر" },
  { key: "engagement", label: "تبصرے و پسندیدگیاں" },
  { key: "tools", label: "قافیہ و بحریں" },
  { key: "users", label: "صارفین و مصنفین" },
  { key: "admins", label: "ایڈمنسٹریٹرز کا انتظام" },
  { key: "security", label: "سیکیورٹی، لاگز و بازیافت" },
];

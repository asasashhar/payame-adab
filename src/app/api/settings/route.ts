import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireAdminPerm, logActivity } from "@/lib/auth";
import { getSettings, ALL_SETTING_KEYS } from "@/lib/site";

/** Secrets that must never leave the server via the generic settings API. */
const SECRET_KEYS = new Set(["smtpPass", "googleClientSecret"]);

export async function GET() {
  const settings = await getSettings();
  for (const k of SECRET_KEYS) delete settings[k];
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "اجازت نہیں" }, { status: 403 });
  // /admin/settings, /admin/homepage and /admin/appearance all save through
  // this endpoint — grant save rights to ANY of the three matching modules,
  // otherwise role-limited admins (homepage/appearance without full
  // settings) could view their page but every save 403'd.
  const canSave =
    (await requireAdminPerm(admin, "settings")) ||
    (await requireAdminPerm(admin, "homepage")) ||
    (await requireAdminPerm(admin, "appearance"));
  if (!canSave) {
    return NextResponse.json({ error: "اس حصے کی اجازت آپ کو نہیں ہے" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as Record<string, string>;
    const allowed = ALL_SETTING_KEYS;
    for (const [k, v] of Object.entries(body)) {
      if (!allowed.includes(k)) continue;
      // secrets are never returned to the client, so an empty incoming value
      // means "unchanged" — only overwrite them with a non-empty value
      if (SECRET_KEYS.has(k) && String(v).length === 0) continue;
      await db.setting.upsert({
        where: { key: k },
        update: { value: String(v) },
        create: { key: k, value: String(v) },
      });
    }
    await logActivity("settings", Object.keys(body).join(","), admin.email);
    const settings = await getSettings();
    for (const k of SECRET_KEYS) delete settings[k];
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: "محفوظ کرنے میں خرابی", detail: String(e) }, { status: 400 });
  }
}

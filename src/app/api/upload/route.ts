import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Authenticated file upload (was a long-vanished endpoint — spec §dashboard media).
 * - session required (any signed-in member; admins for CMS media)
 * - allowlist: jpg/jpeg/png/webp/gif/svg/pdf
 * - 10 MB cap
 * - stored under public/uploads/<YYYY-MM>/<ts>-<rand>.<ext> → served statically
 * - responds 201 { url }
 */
const ALLOWED = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "pdf"]);
const MAX_BYTES = 10 * 1024 * 1024;

function extFromName(name: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "لاگ اِن ضروری ہے" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "غلط درخواست" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فائل موجود نہیں ہے" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "خالی فائل" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "فائل 10MB سے بڑی ہے" }, { status: 413 });
  }

  const ext = extFromName(file.name);
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: "اجازت شدہ فارمیٹ: jpg, png, webp, gif, svg, pdf" }, { status: 415 });
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = randomBytes(8).toString("hex");
  const fileName = `${now.getTime()}-${rand}.${ext}`;
  const relDir = path.join("public", "uploads", month);

  try {
    await mkdir(relDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(relDir, fileName), buf);
  } catch {
    return NextResponse.json({ error: "فائل محفوظ نہیں ہو سکی" }, { status: 500 });
  }

  const url = `/uploads/${month}/${fileName}`;
  return NextResponse.json({ url }, { status: 201 });
}

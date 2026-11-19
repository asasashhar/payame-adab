import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/upload — multipart form-data, field "file".
 *
 * Storage strategy:
 *  - Vercel (BLOB_READ_WRITE_TOKEN set): files go to Vercel Blob and the
 *    returned URL is an absolute https://…blob.vercel-storage.com/… link that
 *    components store as-is (photoUrl etc.).
 *  - Local/standalone hosting: files are written under
 *    public/uploads/YYYY-MM/<random>.<ext> and served by the GET handler at
 *    src/app/uploads/[...path]/route.ts (the production standalone server
 *    only serves public/ assets that existed at build time).
 */
const ALLOWED: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};
const MAX_BYTES = 5 * 1024 * 1024;

// project root, even when the server runs from .next/standalone
function projectRoot(): string {
  const cwd = process.cwd();
  const norm = cwd.replace(/[\\/]+$/, "");
  if (norm.endsWith(".next/standalone") || norm.endsWith(".next\\standalone")) {
    return path.resolve(norm, "..", "..");
  }
  return cwd;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "لاگ اِن کریں" }, { status: 401 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "فارمیٹ درست نہیں" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فائل منتخب کریں" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "فائل 5 میگابائٹ سے بڑی ہے" }, { status: 400 });
  }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED[ext]) {
    return NextResponse.json({ error: "صرف تصویر (JPG/PNG/WebP/GIF) یا PDF ہو سکتی ہے" }, { status: 400 });
  }

  const now = new Date();
  const dir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Vercel Blob when a token is configured — the serverless filesystem is
  // read-only, so disk storage cannot work there
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${dir}/${name}`, file, {
        access: "public",
        token: blobToken,
        addRandomSuffix: false,
      });
      return NextResponse.json({ url: blob.url }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "فائل اپ لوڈ نہیں ہو سکی — Blob اسٹوریج سے رابطہ ناکام" },
        { status: 500 }
      );
    }
  }

  // local disk fallback (sandbox and self-hosted deployments)
  try {
    const targetDir = path.join(projectRoot(), "public", "uploads", dir);
    fs.mkdirSync(targetDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(targetDir, name), buf);
    return NextResponse.json({ url: `/uploads/${dir}/${name}` }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "فائل اسٹوریج دستیاب نہیں — BLOB_READ_WRITE_TOKEN سیٹ کریں" },
      { status: 500 }
    );
  }
}

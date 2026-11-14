import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { getSessionUser, logActivity } from "@/lib/auth";

/**
 * POST /api/upload — multipart image/document upload used by profile photos,
 * admin logo management, content covers and advertisement banners.
 *
 * Body: FormData { file: File, kind?: "image" | "pdf" }
 * Returns: { url, name, size } — url is served by GET /uploads/<YYYY-MM>/<name>.
 *
 * Auth: any logged-in user may upload (profile pictures); admin-only surfaces
 * enforce their own permissions before calling this endpoint.
 */

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
};

function extFor(file: File, kind: string): string | null {
  const declared = file.type.split(";")[0].trim().toLowerCase();
  if (kind === "pdf" || declared === "application/pdf") return DOC_TYPES[declared] ?? null;
  const map = IMAGE_TYPES[declared];
  if (map) return map;
  // some browsers send generic types — trust a known safe extension as fallback
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  if (kind === "pdf" && ext === "pdf") return "pdf";
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "اپلوڈ کے لیے لاگ اِن ضروری ہے" }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "فائل نہیں ملی" }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "فائل خالی ہے" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "فائل بہت بڑی ہے — زیادہ سے زیادہ 8 MB" }, { status: 413 });
    }
    const ext = extFor(file, kind);
    if (!ext) {
      return NextResponse.json(
        { error: kind === "pdf" ? "صرف PDF فائل قابلِ قبول ہے" : "صرف تصویریں (JPG, PNG, WebP, GIF) قابلِ قبول ہیں" },
        { status: 415 }
      );
    }

    const now = new Date();
    const dir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const name = `${Date.now().toString(36)}${randomBytes(6).toString("hex")}.${ext}`;

    const roots = [process.cwd()];
    const normCwd = process.cwd().replace(/[\\/]+$/, "");
    if (normCwd.endsWith(".next/standalone") || normCwd.endsWith(".next\\standalone")) {
      roots.push(path.resolve(normCwd, "..", ".."));
    }
    let saved = false;
    let lastErr: unknown = null;
    for (const root of roots) {
      const targetDir = path.join(root, "public", "uploads", dir);
      try {
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, name), Buffer.from(await file.arrayBuffer()));
        saved = true;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!saved) {
      return NextResponse.json({ error: "فائل محفوظ نہیں ہو سکی", detail: String(lastErr) }, { status: 500 });
    }

    const url = `/uploads/${dir}/${name}`;
    await logActivity("upload", `${url} (${file.size}B, ${kind})`, user.email);
    return NextResponse.json({ url, name, size: file.size, type: ext }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "اپلوڈ میں خرابی", detail: String(e) }, { status: 400 });
  }
}

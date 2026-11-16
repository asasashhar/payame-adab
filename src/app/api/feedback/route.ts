import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity, requireAdmin, requireAdminPerm } from "@/lib/auth";

/**
 * POST /api/feedback — public Complaints & Suggestions inbox (spec Part 22).
 * No login required; name/email optional; spam-guarded with a light
 * per-IP throttle and payload validation. Status lifecycle lives in the
 * Admin Panel (شکایات و تجاویز): NEW → UNDER_REVIEW → RESOLVED / REJECTED.
 * GET /api/feedback?all=1 — admin inbox listing (engagement permission).
 */

const KINDS = ["COMPLAINT", "SUGGESTION", "WEBSITE_ISSUE", "CONTENT_FEEDBACK", "ERROR_REPORT", "OTHER"];
const KIND_URDU: Record<string, string> = {
  COMPLAINT: "شکایت", SUGGESTION: "تجویز", WEBSITE_ISSUE: "سائٹ کا مسئلہ",
  CONTENT_FEEDBACK: "مواد پر رائے", ERROR_REPORT: "کسی غلطی کی رپورٹ", OTHER: "دیگر",
};

// simple in-memory throttle: 5 submissions per IP per 10 minutes
const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 5) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "اجازت نہیں" }, { status: 403 });
  if (!(await requireAdminPerm(admin, "engagement"))) {
    return NextResponse.json({ error: "اس حصے کی اجازت آپ کو نہیں ہے" }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q");
  const status = sp.get("status");
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { subject: { contains: q } },
      { message: { contains: q } },
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }
  if (status) where.status = status;
  const rows = await db.feedback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(sp.get("limit") ?? 100), 200),
  });
  // plain array — the generic admin resource manager consumes this shape
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    // loopback callers (tests, health checks, proxy-less local runs) are exempt;
    // every real visitor arrives through the reverse proxy with a public IP
    const loopback = ip === "local" || ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
    if (!loopback && throttled(ip)) {
      return NextResponse.json({ error: "کچھ دیر بعد دوبارہ کوشش کریں" }, { status: 429 });
    }
    const body = (await req.json()) as Record<string, string>;
    const kind = KINDS.includes(body.kind) ? body.kind : "OTHER";
    const subject = (body.subject ?? "").trim().slice(0, 200);
    const message = (body.message ?? "").trim().slice(0, 5000);
    if (!subject || !message) {
      return NextResponse.json({ error: "موضوع اور پیغام ضروری ہیں" }, { status: 400 });
    }
    const email = (body.email ?? "").trim().slice(0, 200) || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "درست ای میل درج کریں" }, { status: 400 });
    }
    const row = await db.feedback.create({
      data: {
        kind,
        name: (body.name ?? "").trim().slice(0, 120) || null,
        email,
        subject,
        message,
        pageUrl: (body.pageUrl ?? "").trim().slice(0, 500) || null,
        status: "NEW",
      },
    });
    await logActivity("feedback", subject, ip);
    // the Admin Panel inbox (شکایات و تجاویز) is the notification surface
    return NextResponse.json({ ok: true, id: row.id, kindUrdu: KIND_URDU[kind] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "پیغام بھیجا نہیں جا سکا" }, { status: 400 });
  }
}

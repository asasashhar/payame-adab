import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/ads/click — fire-and-forget click counter for advertisement
 * rails. The Advertisement.clicks column existed but was never incremented,
 * so admins had no way to see which placements actually work. Public (no
 * auth): an ad click is anonymous engagement, same trust level as the view
 * counter; only the id is required and nothing else is accepted.
 */
export async function POST(req: NextRequest) {
  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.slice(0, 64) : "";
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await db.advertisement.update({ where: { id }, data: { clicks: { increment: 1 } } });
    return NextResponse.json({ ok: true });
  } catch {
    // unknown id — never surface errors to the public click path
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

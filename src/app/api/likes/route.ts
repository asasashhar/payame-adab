import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireAdmin, requireAdminPerm, logActivity } from "@/lib/auth";
import { getSettings } from "@/lib/site";
import { getOrCreateVisitorId } from "@/lib/visitor";

const RESOURCE_PUBLISHED: Record<string, Record<string, unknown>> = {
  poem: { status: "PUBLISHED" },
  article: { status: "PUBLISHED" },
  book: {},
  news: { status: "PUBLISHED" },
};

async function validResource(type: string, id: string) {
  const model = type as "poem" | "article" | "book" | "news";
  if (!RESOURCE_PUBLISHED[type]) return false;
  const row = await (db[model] as { findFirst: (a: unknown) => Promise<unknown> }).findFirst({
    where: { id, ...RESOURCE_PUBLISHED[type] },
  });
  return Boolean(row);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // "mine" — the logged-in user's saved/liked items (personal dashboard)
  if (sp.get("mine") === "1") {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "لاگ اِن کریں" }, { status: 401 });
    const likes = await db.like.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const poemIds = likes.filter((l) => l.resourceType === "poem").map((l) => l.resourceId);
    const articleIds = likes.filter((l) => l.resourceType === "article").map((l) => l.resourceId);
    const [poems, articles] = await Promise.all([
      poemIds.length
        ? db.poem.findMany({ where: { id: { in: poemIds }, status: "PUBLISHED" }, select: { id: true, title: true, category: true, views: true } })
        : Promise.resolve([]),
      articleIds.length
        ? db.article.findMany({ where: { id: { in: articleIds }, status: "PUBLISHED" }, select: { id: true, title: true, category: true, views: true } })
        : Promise.resolve([]),
    ]);
    return NextResponse.json({ poems, articles });
  }

  // admin listing — recent likes with item titles and liker names
  if (sp.get("admin") === "1") {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "صرف ایڈمن کے لیے" }, { status: 403 });
    const likes = await db.like.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    const poemIds = likes.filter((l) => l.resourceType === "poem").map((l) => l.resourceId);
    const articleIds = likes.filter((l) => l.resourceType === "article").map((l) => l.resourceId);
    const [poems, articles, users] = await Promise.all([
      poemIds.length ? db.poem.findMany({ where: { id: { in: poemIds } }, select: { id: true, title: true } }) : Promise.resolve([]),
      articleIds.length ? db.article.findMany({ where: { id: { in: articleIds } }, select: { id: true, title: true } }) : Promise.resolve([]),
      db.user.findMany({ where: { id: { in: likes.map((l) => l.userId).filter((v): v is string => Boolean(v)) } }, select: { id: true, name: true, penName: true } }),
    ]);
    const titleOf = (t: string, id2: string) =>
      t === "poem" ? poems.find((x) => x.id === id2)?.title ?? null
      : t === "article" ? articles.find((x) => x.id === id2)?.title ?? null
      : null;
    const nameOf = (uid: string | null) =>
      uid ? users.find((u) => u.id === uid)?.penName ?? users.find((u) => u.id === uid)?.name ?? null : null;
    return NextResponse.json({
      likes: likes.map((l) => ({ ...l, title: titleOf(l.resourceType, l.resourceId), likerName: nameOf(l.userId) })),
      totals: { all: likes.length },
    });
  }

  const type = sp.get("resourceType") ?? "";
  const id = sp.get("resourceId") ?? "";
  if (!RESOURCE_PUBLISHED[type] || !id) {
    return NextResponse.json({ error: "غلط درخواست" }, { status: 400 });
  }
  const count = await db.like.count({ where: { resourceType: type, resourceId: id } });
  const me = await getSessionUser();
  const vid = await getOrCreateVisitorId();
  let liked = false;
  if (me) {
    liked = Boolean(await db.like.findFirst({ where: { resourceType: type, resourceId: id, userId: me.id } }));
  }
  if (!liked) {
    liked = Boolean(await db.like.findFirst({ where: { resourceType: type, resourceId: id, visitorId: vid, userId: null } }));
  }
  return NextResponse.json({ count, liked });
}

export async function POST(req: NextRequest) {
  const settings = await getSettings();
  if (settings.likesEnabled === "0") {
    return NextResponse.json({ error: "پسندیدگی فی الحال بند ہے" }, { status: 403 });
  }
  const me = await getSessionUser();
  if (!me && settings.likesGuests === "0") {
    return NextResponse.json({ error: "پسند کرنے کے لیے لاگ اِن کریں" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, string>;
  const type = String(body.resourceType ?? "");
  const id = String(body.resourceId ?? "");
  if (!RESOURCE_PUBLISHED[type] || !id) {
    return NextResponse.json({ error: "غلط درخواست" }, { status: 400 });
  }
  if (!(await validResource(type, id))) {
    return NextResponse.json({ error: "مواد نہیں ملا" }, { status: 404 });
  }
  const vid = await getOrCreateVisitorId();

  // duplicate-vote prevention: one like per account, else one per visitor
  const existing = me
    ? await db.like.findFirst({ where: { resourceType: type, resourceId: id, userId: me.id } })
    : await db.like.findFirst({ where: { resourceType: type, resourceId: id, visitorId: vid, userId: null } });

  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
    const count = await db.like.count({ where: { resourceType: type, resourceId: id } });
    return NextResponse.json({ liked: false, count });
  }
  await db.like.create({
    data: { resourceType: type, resourceId: id, userId: me?.id ?? null, visitorId: vid },
  });
  const count = await db.like.count({ where: { resourceType: type, resourceId: id } });
  if (me) await logActivity("like", `${type}/${id}`, me.email);
  return NextResponse.json({ liked: true, count });
}

export async function DELETE(req: NextRequest) {
  // admin removal of suspicious likes — engagement-module gated like comments
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "اجازت نہیں" }, { status: 403 });
  if (!(await requireAdminPerm(admin, "engagement"))) {
    return NextResponse.json({ error: "اس حصے کی اجازت آپ کو نہیں ہے" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ضروری ہے" }, { status: 400 });
  await db.like.delete({ where: { id } });
  await logActivity("like-delete", id, admin.email);
  return NextResponse.json({ ok: true });
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";

type LikeRow = {
  id: string;
  resourceType: string;
  resourceId: string;
  likerName: string | null;
  title: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  poem: "شاعری",
  article: "مضمون",
  book: "کتاب",
  news: "خبر",
};

export default function AdminLikesPage() {
  const [likes, setLikes] = useState<LikeRow[] | null>(null);

  useEffect(() => {
    fetch("/api/likes?admin=1")
      .then((r) => r.json())
      .then((d) => setLikes(d.likes ?? []))
      .catch(() => setLikes([]));
  }, []);

  return (
    <>
      <AdminPageHeader
        title="پسندیدگیاں"
        subtitle="قارئین کی پسند کی گئی تحریریں — تازہ ترین 200"
      />
      {likes === null ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : likes.length === 0 ? (
        <div className="rounded-xl border border-gold/30 bg-card p-12 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-gold/60" aria-hidden />
          <p className="font-nastaliq-tight text-xl leading-9 text-primary">ابھی کوئی پسندیدگی درج نہیں ہوئی</p>
          <p className="mt-1 text-sm font-naskh text-muted-foreground">
            جب قارئین شاعری یا مضامین کو پسند کریں گے تو وہاں کی فہرست یہاں نظر آنے لگے گی۔
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gold/25 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/25 bg-accent/60 text-start">
                <th className="px-4 py-3 text-start font-naskh text-muted-foreground">تحریر</th>
                <th className="px-4 py-3 text-start font-naskh text-muted-foreground">قسم</th>
                <th className="px-4 py-3 text-start font-naskh text-muted-foreground">پسند کرنے والا</th>
                <th className="px-4 py-3 text-start font-naskh text-muted-foreground">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {likes.map((l) => (
                <tr key={l.id} className="border-b border-gold/10 last:border-0">
                  <td className="max-w-[320px] truncate px-4 py-3 font-nastaliq-tight text-base leading-8">
                    {l.title
                      ? <Link href={`/${l.resourceType === "poem" ? "poetry" : "articles"}/${l.resourceId}`} className="hover:text-primary">{l.title}</Link>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 font-naskh text-muted-foreground">{TYPE_LABEL[l.resourceType] ?? l.resourceType}</td>
                  <td className="px-4 py-3 font-naskh text-muted-foreground">{l.likerName ?? "مہمان قاریئن"}</td>
                  <td className="px-4 py-3 font-latin text-xs text-muted-foreground" dir="ltr">
                    {new Date(l.createdAt).toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

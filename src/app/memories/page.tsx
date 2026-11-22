import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SectionHeading } from "@/components/site/section-heading";
import { Camera } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ہماری یادیں" };

export default async function MemoriesPage() {
  const memories = await db.memory.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 paper-bg">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <SectionHeading
            title="ہماری یادیں"
            subtitle="پائامِ ادب کے سفر کے اہم لمحات، تقریبات اور تاریخی تصاویر کا مستقل ذخیرہ"
            as="h1"
          />
          {memories.length === 0 ? (
            <div className="manuscript-frame rounded-xl bg-card p-14 text-center">
              <Camera className="mx-auto mb-3 h-10 w-10 text-gold" />
              <p className="font-nastaliq-tight text-xl text-primary">فی الحال کوئی یاد شائع نہیں ہوئی</p>
              <p className="mt-1 font-naskh text-sm text-muted-foreground">
                ادارے کی جانب سے اہم لمحات اور تصاویر یہاں محفوظ کی جائیں گی۔
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {memories.map((m) => (
                <article key={m.id} className="manuscript-frame overflow-hidden rounded-xl bg-card">
                  {m.imageUrl ? (
                    <img
                      src={m.imageUrl}
                      alt={m.title}
                      className="h-56 w-full border-b border-gold/20 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-56 w-full items-center justify-center border-b border-gold/20 bg-secondary/40">
                      <Camera className="h-10 w-10 text-gold/60" />
                    </div>
                  )}
                  <div className="p-5">
                    {m.date && (
                      <p className="mb-1 text-xs font-naskh font-semibold text-gold">{m.date}</p>
                    )}
                    <h2 className="font-nastaliq-tight text-xl leading-8 text-emerald-ink">{m.title}</h2>
                    {m.description && (
                      <p className="mt-2 text-sm font-naskh leading-7 text-foreground/75">{m.description}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

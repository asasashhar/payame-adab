import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { PageBanner } from "@/components/site/page-banner";
import { BookA, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ادبی رسالے" };

/** Magazine homepage (spec Part 15) — separate from the weekly newspaper. */
export default async function MagazinePage() {
  const [issues, settings] = await Promise.all([
    db.magazineIssue.findMany({ where: { published: true }, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] }),
    getSettings(),
  ]);
  const current = issues.filter((i) => !i.archive);
  const archive = issues.filter((i) => i.archive);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 paper-bg">
        <PageBanner
          title="ادبی رسالے"
          subtitle={settings.siteName + " کے ادبی شمارے — تحقیق، تنقید اور selected تحریریں"}
        />
        <div className="mx-auto max-w-7xl px-4 py-10">
          {issues.length === 0 ? (
            <div className="manuscript-frame mx-auto max-w-lg rounded-xl bg-card p-10 text-center">
              <BookA className="mx-auto h-12 w-12 text-gold" />
              <h2 className="mt-4 font-nastaliq-tight text-2xl leading-[1.9] text-emerald-ink">پہلا شمارہ زیرِ تیاری ہے</h2>
              <p className="mt-2 font-naskh text-[14px] leading-8 text-muted-foreground">
                ادارتی ٹیم جلد پہلا ادبی شمارہ شائع کرنے والی ہے۔ نئے شمارے یہیں دستیاب ہوں گے۔
              </p>
            </div>
          ) : (
            <>
              {current.length > 0 && (
                <section className="mb-12">
                  <h2 className="mb-5 font-nastaliq-tight text-2xl text-emerald-ink">تازہ شمارے</h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {current.map((i) => (
                      <IssueCard key={i.id} issue={i} />
                    ))}
                  </div>
                </section>
              )}
              {archive.length > 0 && (
                <section>
                  <h2 className="mb-5 font-nastaliq-tight text-2xl text-emerald-ink">پرانے شمارے (آرکائیو)</h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {archive.map((i) => (
                      <IssueCard key={i.id} issue={i} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function IssueCard({ issue }: { issue: { id: string; title: string; issueNumber: string; theme: string | null; coverUrl: string | null; publishedAt: Date | null } }) {
  return (
    <Link
      href={`/magazine/${issue.id}`}
      className="manuscript-frame group overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-lg"
    >
      <div className="aspect-[3/4] overflow-hidden bg-secondary">
        {issue.coverUrl ? (
          <img src={issue.coverUrl} alt={issue.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookA className="h-14 w-14 text-gold/70" />
          </div>
        )}
      </div>
      <div className="p-4">
        <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-naskh text-primary">شمارہ {issue.issueNumber}</span>
        <h3 className="mt-2 font-nastaliq-tight text-lg leading-8 text-foreground group-hover:text-primary">{issue.title}</h3>
        {issue.theme && <p className="mt-0.5 font-naskh text-[13px] text-muted-foreground">موضوع: {issue.theme}</p>}
        {issue.publishedAt && (
          <p className="mt-1 inline-flex items-center gap-1.5 font-naskh text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-gold" />
            <span className="font-latin" dir="ltr">{issue.publishedAt.toISOString().slice(0, 10)}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

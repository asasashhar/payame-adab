import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { BookReader } from "@/app/books/[id]/read/reader-client";
import { Download, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issue = await db.magazineIssue.findUnique({ where: { id } });
  return { title: issue ? `شمارہ ${issue.issueNumber} — ${issue.title}` : "شمارہ" };
}

type TocEntry = { title: string; author: string | null; href: string | null };

function parseToc(raw: string | null | undefined): TocEntry[] {
  if (!raw?.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, author, href] = line.split("|").map((x) => x.trim());
      return { title: title || "—", author: author || null, href: href || null };
    });
}

/** Individual magazine issue (spec Part 15): editorial intro, table of
 * contents, online reading of the actual PDF, download where published. */
export default async function MagazineIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [issue, settings] = await Promise.all([
    db.magazineIssue.findUnique({ where: { id } }),
    getSettings(),
  ]);
  if (!issue || !issue.published) notFound();

  const toc = parseToc(issue.toc);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 paper-bg">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <nav className="mb-6 text-xs font-naskh text-muted-foreground">
            <Link href="/" className="hover:text-primary">ہوم</Link> / <Link href="/magazine" className="hover:text-primary">ادبی رسالے</Link> / <span className="text-primary">شمارہ {issue.issueNumber}</span>
          </nav>

          <div className="manuscript-frame relative overflow-hidden rounded-xl bg-[#fffdf7] p-6 sm:p-10">
            <div className="grid gap-8 md:grid-cols-[240px_1fr]">
              <div>
                {issue.coverUrl ? (
                  <img src={issue.coverUrl} alt={issue.title} className="w-full rounded-lg border border-gold/30 object-cover shadow-md" />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-gold/30 bg-secondary">
                    <BookOpen className="h-14 w-14 text-gold" />
                  </div>
                )}
              </div>
              <div>
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-naskh text-primary">شمارہ {issue.issueNumber}{issue.archive ? " — آرکائیو" : ""}</span>
                <h1 className="mt-3 font-nastaliq-tight text-3xl leading-[1.9] text-emerald-ink">{issue.title}</h1>
                {issue.theme && <p className="mt-1 font-nastaliq-tight text-xl text-gold">موضوع: {issue.theme}</p>}
                {issue.editorial && (
                  <div className="mt-4 font-reader literary-content text-justify text-[16px] leading-[2.4] text-foreground">
                    {issue.editorial.split(/\n+/).filter(Boolean).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {issue.pdfUrl && (
                    <a
                      href={`/magazine/${issue.id}/read`}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 font-naskh text-[15px] font-semibold text-[#f3ead2] shadow-md transition-colors hover:bg-emerald-deep"
                    >
                      <BookOpen className="h-4.5 w-4.5" /> آن لائن پڑھیں
                    </a>
                  )}
                  {issue.pdfUrl && (
                    <a
                      href={issue.pdfUrl}
                      download
                      className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-gold px-6 font-naskh text-[15px] font-semibold text-[#8a6d1a] transition-colors hover:bg-gold/10"
                    >
                      <Download className="h-4.5 w-4.5" /> PDF ڈاؤن لوڈ کریں
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {toc.length > 0 && (
            <section className="manuscript-frame mt-8 rounded-xl bg-card p-6 sm:p-8">
              <h2 className="font-nastaliq-tight text-2xl leading-[1.9] text-emerald-ink">فہرستِ مطالب</h2>
              <div className="mt-3 h-px bg-gold/30" aria-hidden />
              <ol className="mt-4 space-y-3">
                {toc.map((t, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="font-latin text-sm font-bold text-gold" dir="ltr">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 font-nastaliq-tight text-lg leading-9 text-foreground">
                      {t.href ? (
                        <Link href={t.href} className="hover:text-primary hover:underline">{t.title}</Link>
                      ) : (
                        t.title
                      )}
                    </span>
                    {t.author && <span className="shrink-0 font-naskh text-sm text-muted-foreground">{t.author}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

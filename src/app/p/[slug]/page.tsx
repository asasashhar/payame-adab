import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings } from "@/lib/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export const dynamic = "force-dynamic";

export type CustomPage = { slug: string; title: string; content: string; visible: boolean };

export function customPagesFromSettings(s: Record<string, string>): CustomPage[] {
  try {
    const parsed = JSON.parse(s.customPages ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.slug === "string" && typeof p.title === "string")
      .map((p) => ({
        slug: String(p.slug),
        title: String(p.title),
        content: String(p.content ?? ""),
        visible: p.visible !== false,
      }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSettings();
  const page = customPagesFromSettings(s).find((p) => p.slug === slug);
  return { title: page?.title || "صفحہ نہیں ملا" };
}

/** Public renderer for admin-created custom pages (spec Part 2.4). */
export default async function CustomPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSettings();
  const page = customPagesFromSettings(s).find((p) => p.slug === slug && p.visible !== false);
  if (!page) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 paper-bg">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="font-nastaliq-tight text-3xl leading-[1.8] text-primary">{page.title}</h1>
          <div className="decor-rule my-5" aria-hidden>
            <div className="rule-track"><div className="rule-line" /><div className="rule-line" /></div>
            <div className="rule-dot rule-dot-dot" />
          </div>
          <article className="manuscript-frame rounded-xl bg-card p-6 md:p-10">
            {page.content
              .split(/\n{2,}/)
              .filter((para) => para.trim())
              .map((para, i) => (
                <p key={i} className="literary-content text-justify">{para.trim()}</p>
              ))}
            {!page.content.trim() && (
              <p className="text-center font-naskh text-sm text-muted-foreground">اس صفحے میں ابھی مواد درج نہیں کیا گیا۔</p>
            )}
          </article>
          <p className="mt-6 text-center">
            <Link href="/" className="font-naskh text-sm text-primary underline hover:text-gold">ہوم پیج پر واپس جائیں</Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

import Link from "next/link";
import type { ElementType } from "react";
import { db } from "@/lib/db";
import { BOOK_CATEGORIES } from "@/lib/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { PageBanner } from "@/components/site/page-banner";
import { BookCard } from "@/components/site/cards";
import { cn } from "@/lib/utils";
import {
  Library, LayoutGrid, Feather, BookOpen, BookMarked, FlaskConical,
  MessagesSquare, Landmark, UserRound, MoonStar, Baby, Languages, Shapes,
} from "lucide-react";

/** mockup-style icons for library category chips */
const CHIP_ICONS: Record<string, ElementType> = {
  "تمام": LayoutGrid,
  "شاعری": Feather,
  "افسانہ": BookOpen,
  "ناول": BookMarked,
  "تحقیق": FlaskConical,
  "تنقید": MessagesSquare,
  "تاریخ": Landmark,
  "سوانح": UserRound,
  "اسلامی ادب": MoonStar,
  "بچوں کا ادب": Baby,
  "زبان و قواعد": Languages,
  "دیگر": Shapes,
};

export const dynamic = "force-dynamic";
export const metadata = { title: "کتب خانہ — ڈیجیٹل کتب کا ذخیرہ" };

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const where: Record<string, unknown> = {};
  if (category && category !== "تمام") where.category = category;
  if (q) where.OR = [{ title: { contains: q } }, { author: { contains: q } }, { description: { contains: q } }];
  const books = await db.book.findMany({ where, orderBy: { createdAt: "desc" }, take: 60 });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 paper-bg">
        <PageBanner
          title="کتب خانہ"
          subtitle="علم و ادب کا خزانہ — اب آپ کے قدموں میں"
          quote="کتابیں ذہن کی روشنی ہیں"
          image="/brand/hero-banner.jpg"
        />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6 flex flex-wrap gap-2">
            {["تمام", ...BOOK_CATEGORIES].map((c) => {
              const Icon = CHIP_ICONS[c] ?? Shapes;
              return (
                <Link
                  key={c}
                  href={c === "تمام" ? "/books" : `/books?category=${encodeURIComponent(c)}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-naskh transition-colors",
                    (category ?? "تمام") === c
                      ? "border-emerald-deep bg-emerald-deep text-[#f3ead2] shadow-sm"
                      : "border-gold/40 bg-card text-foreground/80 hover:border-gold hover:text-primary"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", (category ?? "تمام") === c ? "text-[#e9c979]" : "text-gold")} />
                  {c === "تمام" ? "تمام کتابیں" : c}
                </Link>
              );
            })}
          </div>
          {books.length === 0 ? (
            <div className="manuscript-frame rounded-xl bg-card p-14 text-center">
              <Library className="mx-auto mb-3 h-10 w-10 text-gold" />
              <p className="font-nastaliq-tight text-xl text-primary">کتب خانہ میں ابھی کتابیں زیرِ ترتیب ہیں</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {books.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

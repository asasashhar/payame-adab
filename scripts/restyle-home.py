#!/usr/bin/env python3
"""Restyle src/app/page.tsx to the green/gold/ivory homepage mockup:
   - full-bleed hero carousel
   - mockup trio row (books / poets / popular) replacing booksPopular internals
   - featured article avatar + Urdu date chip
   - strict section visibility (missing key = hidden)
"""
import sys

P = "/home/z/my-project/src/app/page.tsx"
src = open(P, encoding="utf-8").read()
orig = src


def splice(start_marker: str, end_marker: str, replacement: str, include_end=False) -> None:
    """Replace [start_marker .. end_marker) with replacement."""
    global src
    i = src.index(start_marker)
    j = src.index(end_marker, i)
    if include_end:
        j += len(end_marker)
    src = src[:i] + replacement + src[j:]


# R1 — imports
src = src.replace(
    'import { LogoMark } from "@/components/site/logo";\n',
    'import { HeroCarousel } from "@/components/site/hero-carousel";\n',
)
src = src.replace(
    'import { Button } from "@/components/ui/button";\n',
    '',
)
src = src.replace(
    'import { Feather, BookOpen, Newspaper, ArrowLeft, Flame, Quote, Megaphone, Eye } from "lucide-react";',
    'import { Feather, BookOpen, Newspaper, ArrowLeft, Flame, Quote, Megaphone, Eye, CalendarDays } from "lucide-react";',
)

# R2 — destructure heroBanners list
src = src.replace(
    "    heroBanner, sideBanners, featuredPoets,\n",
    "    heroBanners, sideBanners, featuredPoets,\n",
)

# R3 — query: all active HERO banners (carousel slides)
src = src.replace(
    '    db.banner.findFirst({ where: { position: "HERO", active: true }, orderBy: { sortOrder: "asc" } }),\n',
    '    db.banner.findMany({ where: { position: "HERO", active: true }, orderBy: { sortOrder: "asc" }, take: 5 }),\n',
)

# R4 — hero block -> carousel component
splice(
    "{heroBanner ? (",
    "\n            )}\n          </section>\n        )}",
    '''<HeroCarousel
              slides={heroBanners.map((b) => ({ id: b.id, imageUrl: b.imageUrl, title: b.title, linkUrl: b.linkUrl }))}
              badge={heroBadge}
              title={heroTitle}
              subtitle={heroSubtitle}
              fallbackImage={heroImage}
            />
          </section>
        )}''',
    include_end=True,
)

# R5 — strict section visibility (absent key = hidden; 'poets' now lives in the trio)
src = src.replace(
    'const isVisible = (key: string) => sections.find((s) => s.key === key)?.visible !== false;',
    'const isVisible = (key: string) => sections.find((s) => s.key === key)?.visible === true;',
)

# R6 — featured article: author avatar + Urdu date chip (mockup style)
splice(
    '                      {featuredArticle.authorName && (',
    '                      </p>\n',
    '''                      <div className="mt-2 flex items-center gap-2.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-emerald-deep/10 font-nastaliq-tight text-lg text-primary">
                          {(featuredArticle.authorName ?? "?").trim().charAt(0)}
                        </span>
                        <span>
                          {featuredArticle.authorName && (
                            <span className="block text-sm font-naskh font-semibold text-gold">از قلم: {featuredArticle.authorName}</span>
                          )}
                          <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-naskh text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5 text-gold" /> {urduDate(featuredArticle.createdAt)}
                          </span>
                        </span>
                      </div>
''',
)

# R7 — booksPopular internals -> mockup trio + side banners strip
TRIO = '''        {/* ============ نئی کتب / نمایاں شعرا و ادبا / مقبول تحریریں (mockup trio) ============ */}
        {isVisible("booksPopular") && (
          <section {...sectionProps("booksPopular")} className="mx-auto max-w-7xl px-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* نئی کتب */}
              <div className="manuscript-frame overflow-hidden rounded-xl bg-card">
                <div className="flex items-center justify-between bg-emerald-ink px-4 py-2.5">
                  <h3 className="flex items-center gap-2 font-nastaliq-tight text-lg text-[#e9c979]">
                    <BookOpen className="h-4.5 w-4.5" /> نئی کتب
                  </h3>
                  <Link href="/books" className="text-xs font-naskh text-[#e5dfc9]/80 hover:text-[#e9c979]">
                    مزید دیکھیں ←
                  </Link>
                </div>
                <div className="p-3">
                  {newBooks.length === 0 ? (
                    <p className="py-8 text-center font-naskh text-sm text-muted-foreground">کتب خانہ میں جلد اضافہ ہوگا۔</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                      {(featuredBook ? [featuredBook, ...newBooks.filter((b) => b.id !== featuredBook.id)] : newBooks).slice(0, 3).map((b) => (
                        <Link key={b.id} href={`/books/${b.id}`} className="group block">
                          <span className="block overflow-hidden rounded-lg border border-gold/25">
                            {b.coverUrl ? (
                              <img src={b.coverUrl} alt={b.title} className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-[1.03]" loading="lazy" />
                            ) : (
                              <span className="flex aspect-[3/4] w-full items-center justify-center bg-secondary">
                                <BookOpen className="h-7 w-7 text-gold" />
                              </span>
                            )}
                          </span>
                          <span className="mt-1.5 line-clamp-1 block font-nastaliq-tight text-[13px] leading-6 text-foreground group-hover:text-primary">{b.title}</span>
                          <span className="line-clamp-1 block text-[11px] font-naskh text-gold">{b.author}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* نمایاں شعرا و ادبا */}
              <div className="manuscript-frame overflow-hidden rounded-xl bg-card">
                <div className="flex items-center justify-between bg-emerald-ink px-4 py-2.5">
                  <h3 className="flex items-center gap-2 font-nastaliq-tight text-lg text-[#e9c979]">
                    <Feather className="h-4.5 w-4.5" /> نمایاں شعرا و ادبا
                  </h3>
                  <Link href="/poets" className="text-xs font-naskh text-[#e5dfc9]/80 hover:text-[#e9c979]">
                    سب دیکھیں ←
                  </Link>
                </div>
                <div className="p-3">
                  {featuredPoets.length === 0 ? (
                    <p className="py-8 text-center font-naskh text-sm text-muted-foreground">شعرا و ادبا کی فہرست جلد شائع ہوگی۔</p>
                  ) : (
                    <ul className="space-y-1">
                      {featuredPoets.slice(0, 3).map((p) => (
                        <li key={p.id}>
                          <Link href={`/poets/${p.id}`} className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/60">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.name} className="h-12 w-12 shrink-0 rounded-full border-2 border-gold/50 object-cover" loading="lazy" />
                            ) : (
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gold/50 bg-secondary font-nastaliq-tight text-lg text-primary">
                                {p.takhallus?.[0] || p.name[0]}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block font-nastaliq-tight text-[15px] leading-7 text-foreground group-hover:text-primary">{p.name}</span>
                              <span className="line-clamp-1 block text-[11px] font-naskh text-muted-foreground">
                                {p.takhallus ? `تخلص: ${p.takhallus}` : (p.era ?? "")}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* مقبول تحریریں */}
              <div className="manuscript-frame overflow-hidden rounded-xl bg-card">
                <div className="flex items-center justify-between bg-emerald-ink px-4 py-2.5">
                  <h3 className="flex items-center gap-2 font-nastaliq-tight text-lg text-[#e9c979]">
                    <Flame className="h-4.5 w-4.5" /> مقبول تحریریں
                  </h3>
                </div>
                <div className="p-3">
                  {popularPoems.length === 0 && popularArticles.length === 0 ? (
                    <p className="py-8 text-center font-naskh text-sm text-muted-foreground">مقبول تحریریں کا ریکارڈ جلد مرتب ہوگا۔</p>
                  ) : (
                    <ul className="space-y-1">
                      {[
                        ...popularPoems.slice(0, 2).map((p) => ({ href: `/poetry/${p.id}`, title: p.title, views: p.views, author: p.poetName ?? p.user?.penName ?? p.user?.name ?? "" })),
                        ...popularArticles.slice(0, 1).map((a) => ({ href: `/articles/${a.id}`, title: a.title, views: a.views, author: a.authorName ?? "" })),
                      ].map((item) => (
                        <li key={item.href}>
                          <Link href={item.href} className="group flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent/60">
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-1 block font-nastaliq-tight text-[14px] leading-7 text-foreground group-hover:text-primary">{item.title}</span>
                              <span className="line-clamp-1 block text-[11px] font-naskh text-muted-foreground">{item.author}</span>
                            </span>
                            {showViews && (
                              <span className="inline-flex shrink-0 items-center gap-1 font-latin text-[11px] text-muted-foreground" dir="ltr">
                                <Eye className="h-3 w-3" /> {item.views}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* admin side banners (بینر میڈیا) — kept, now below the trio */}
            {sideBanners.length > 0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {sideBanners.map((b) => (
                  <Link key={b.id} href={b.linkUrl || "#"} className="group block overflow-hidden rounded-xl border border-gold/30 shadow-sm">
                    <img src={b.imageUrl} alt={b.title} className="w-full object-cover transition-transform group-hover:scale-[1.02]" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <Divider style={{ order: 6.5 } } />'''
splice(
    '        {/* ============ نئی کتب + مقبول تحریریں ============ */}\n',
    '        <Divider style={{ order: 6.5 } } />',
    TRIO,
    include_end=True,
)

if src == orig:
    print("NO CHANGES APPLIED — markers not found")
    sys.exit(1)

open(P, "w", encoding="utf-8").write(src)
print("page.tsx restyled OK")
print("Button import gone:", 'from "@/components/ui/button"' not in src)
print("LogoMark gone:", "LogoMark" not in src)
print("heroBanner gone:", "heroBanner " not in src and "{heroBanner" not in src)
print("trio present:", "mockup trio" in src)
print("carousel present:", "HeroCarousel" in src)

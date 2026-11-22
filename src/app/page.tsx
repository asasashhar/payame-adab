import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings, homeSectionsFromSettings, watermarkFromSettings, publishDueSchedules, ARTICLE_CATEGORIES } from "@/lib/site";
import { activeDesign } from "@/lib/design";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SectionHeading, Divider } from "@/components/site/section-heading";
import { PoemCard, ArticleCard, BookCard, PosterCard, poemPreview, excerptPreview } from "@/components/site/cards";
import { AdRail } from "@/components/site/ad-rail";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { PageViewTracker } from "@/components/site/view-tracker";
import { Feather, BookOpen, Newspaper, ArrowLeft, Flame, Quote, Megaphone, Eye, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await publishDueSchedules(); // light cron: publish due scheduled content
  const settings = await getSettings();
  const sections = homeSectionsFromSettings(settings);
  const showViews = settings.showViewCounts !== "0";
  const wm = watermarkFromSettings(settings);

  const featuredPoemId = settings.featuredPoemId || null;
  const featuredArticleId = settings.featuredArticleId || null;
  const featuredBookId = settings.featuredBookId || null;

  const [
    heroBanners, sideBanners, featuredPoets,
    dailySher, wordOfDay,
    latestPoems, featuredPoemPicked, latestPoemsFallback,
    latestArticles, featuredArticlePicked, latestArticlesFallback,
    latestNews,
    popularPoems, popularArticles, popularBooks,
    newBooks, featuredBookPicked,
    latestEdition, competitions,
  ] = await Promise.all([
    db.banner.findMany({ where: { position: "HERO", active: true }, orderBy: { sortOrder: "asc" }, take: 5 }),
    db.banner.findMany({ where: { position: "SIDE", active: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
    db.poet.findMany({ where: { featured: true }, take: 8, orderBy: { createdAt: "asc" } }),
    db.dailySher.findFirst({ where: { active: true }, orderBy: { date: "desc" } }),
    db.wordOfDay.findFirst({ where: { active: true }, orderBy: { date: "desc" } }),
    db.poem.findMany({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 8 }),
    featuredPoemId ? db.poem.findFirst({ where: { status: "PUBLISHED", id: featuredPoemId } }) : Promise.resolve(null),
    db.poem.findFirst({ where: { status: "PUBLISHED", featured: true }, orderBy: { createdAt: "desc" } }),
    db.article.findMany({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 6 }),
    featuredArticleId ? db.article.findFirst({ where: { status: "PUBLISHED", id: featuredArticleId } }) : Promise.resolve(null),
    db.article.findFirst({ where: { status: "PUBLISHED", featured: true }, orderBy: { createdAt: "desc" } }),
    db.news.findMany({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.poem.findMany({ where: { status: "PUBLISHED" }, orderBy: { views: "desc" }, take: 5, include: { user: { select: { penName: true, name: true } } } }),
    db.article.findMany({ where: { status: "PUBLISHED" }, orderBy: { views: "desc" }, take: 5 }),
    db.book.findMany({ orderBy: { views: "desc" }, take: 5 }),
    db.book.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    featuredBookId ? db.book.findFirst({ where: { id: featuredBookId } }) : db.book.findFirst({ where: { featured: true }, orderBy: { createdAt: "desc" } }),
    db.newspaperEdition.findFirst({ where: { published: true }, orderBy: { createdAt: "desc" } }),
    db.competition.findMany({ where: { active: true }, orderBy: { endDate: "desc" }, take: 4 }),
  ]);

  const featuredPoem = featuredPoemPicked ?? latestPoemsFallback;
  const featuredArticle = featuredArticlePicked ?? latestArticlesFallback;
  const featuredBook = featuredBookPicked;

  const heroTitle = settings.heroTitle ?? "اردو ادب کا ڈیجیٹل سرمایہ";
  const heroSubtitle = settings.heroSubtitle ?? "اردو زبان و ادب کے فروغ، تحفظ، اشاعت اور نئی نسل تک رسائی کا ایک جدید پلیٹ فارم۔";
  const heroImage = settings.heroImage ?? "/brand/hero-banner.jpg";
  const heroBadge = settings.heroBadge ?? "پیامِ ادب · Payam-e-Adab";
  const adsMax = Math.min(Math.max(Number(settings.adsMaxWidth ?? 300) || 300, 160), 360);
  const order = (key: string) => sections.findIndex((s) => s.key === key);
  const isVisible = (key: string) => sections.find((s) => s.key === key)?.visible === true;
  const sectionProps = (key: string) => ({ className: "mx-auto w-full max-w-7xl px-4", style: { order: order(key) < 0 ? 990 : order(key) * 10 } });
  // dividers only render when visible sections exist both above and below the gap
  const showDivider = (gapOrder: number) =>
    sections.some((s) => s.visible && order(s.key) >= 0 && order(s.key) * 10 < gapOrder) &&
    sections.some((s) => s.visible && order(s.key) >= 0 && order(s.key) * 10 > gapOrder);
  const maybeDivider = (gap: number) =>
    showDivider(gap) ? <Divider style={{ order: gap }} /> : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <PageViewTracker />

      <div className="flex flex-1 flex-col paper-bg">
        {/* wide layout: right ad rail — main column — left ad rail (rails only on wide screens).
            In RTL, "start" = right side of screen, "end" = left side of screen. */}
        <div className="mx-auto flex w-full max-w-[1820px] items-start justify-center gap-4 px-2 xl:px-5">
          <AdRail slot="RIGHT" maxWidth={adsMax} side="start" />

          <main className="flex min-w-0 flex-1 flex-col" style={{ display: "flex", flexDirection: "column" }}>
        {/* ============ HERO (full-bleed band per reference mockup) ============ */}
        {isVisible("hero") && (
          <section
            className="w-full"
            style={{
              order: order("hero") < 0 ? 990 : order("hero") * 10,
              marginInline: "calc(50% - 50vw)",
            }}
          >
            <HeroCarousel
              slides={heroBanners.map((b) => ({ id: b.id, imageUrl: b.imageUrl, title: b.title, linkUrl: b.linkUrl }))}
              badge={heroBadge}
              title={heroTitle}
              subtitle={heroSubtitle}
              fallbackImage={heroImage}
              design={activeDesign(settings).version}
            />
          </section>
        )}

        {/* ============ نمایاں شعرا و ادبا ============ */}
        {isVisible("poets") && featuredPoets.length > 0 && (
          <section {...sectionProps("poets")} className="mx-auto w-full max-w-7xl px-4 pt-10">
            <SectionHeading title="نمایاں شعرا و ادبا" href="/poets" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featuredPoets.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href={`/poets/${p.id}`}
                  className="group manuscript-frame flex flex-col items-center overflow-hidden rounded-xl bg-card p-5 text-center transition-shadow hover:shadow-lg"
                >
                  {p.photoUrl ? (
                     
                    <img src={p.photoUrl} alt={p.name} className="h-20 w-20 rounded-full border-2 border-gold/60 object-cover shadow-md" />
                  ) : (
                    <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/60 bg-secondary font-nastaliq-tight text-2xl text-[color:var(--accent-text)] shadow-md">
                      {p.takhallus?.[0] || p.name[0]}
                    </span>
                  )}
                  <h3 className="mt-3 font-nastaliq-tight text-lg leading-8 text-foreground group-hover:text-primary">
                    {p.name}
                  </h3>
                  {p.takhallus && <p className="text-xs font-naskh text-gold">تخلص: {p.takhallus}</p>}
                  {p.era && <p className="mt-0.5 text-[11px] font-latin text-muted-foreground" dir="auto">{p.era}</p>}
                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-foreground/65 font-naskh">{p.bio ?? ""}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ============ آج کا شعر + آج کا لفظ ============ */}
        {isVisible("sherWord") && (
          <section {...sectionProps("sherWord")} className="mx-auto w-full max-w-7xl px-4 pt-10">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="manuscript-frame relative overflow-hidden rounded-2xl bg-card p-7">
                <Quote className="mb-2 h-6 w-6 text-gold" />
                <h2 className="absolute end-6 top-6 font-nastaliq-tight text-2xl text-primary">آج کا شعر</h2>
                {dailySher ? (
                  <>
                    <blockquote className="whitespace-pre-line text-center font-nastaliq text-2xl leading-[2.9] text-foreground">
                      {dailySher.text}
                    </blockquote>
                    <p className="mt-4 text-center font-naskh text-base text-gold">— {dailySher.poetName}</p>
                  </>
                ) : (
                  <p className="py-10 text-center font-naskh text-base text-muted-foreground">
                    آج کا شعر جلد منتشر ہوگا۔
                  </p>
                )}
              </div>

              <div className="manuscript-frame relative overflow-hidden rounded-2xl border border-gold/30 bg-[#faf3df] p-7">
                <Feather className="mb-2 h-6 w-6 text-gold" />
                <div className="absolute end-6 top-6 flex items-center gap-3">
                  <Link href="/dictionary" className="text-sm font-naskh text-gold hover:text-primary">لغت ←</Link>
                  <h2 className="font-nastaliq-tight text-2xl text-primary">آج کا لفظ</h2>
                </div>
                {wordOfDay ? (
                  <div className="mt-10 text-center">
                    <p className="font-nastaliq-tight text-5xl text-[#a8821b] leading-[1.9]">{wordOfDay.word}</p>
                    <p className="mt-2 font-naskh text-lg text-foreground/85">{wordOfDay.meaning}</p>
                    {wordOfDay.englishMeaning && (
                      <p className="mt-1 font-latin text-base text-muted-foreground" dir="ltr">{wordOfDay.englishMeaning}</p>
                    )}
                    {wordOfDay.example && (
                      <p className="mx-auto mt-4 max-w-md rounded-lg bg-[#f3ead2] px-5 py-3 font-nastaliq text-base leading-8 text-foreground/80">
                        مثال: {wordOfDay.example}
                      </p>
                    )}
                    {wordOfDay.date && (
                      <p className="mt-4 inline-block rounded-tl-lg rounded-tr-lg bg-gold/20 px-4 py-1 text-xs font-naskh text-[#7a5d12]">
                        {urduDate(wordOfDay.date)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="py-10 text-center font-naskh text-base text-muted-foreground">
                    آج کا لفظ جلد منتشر ہوگا۔
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {maybeDivider(25)}

        {/* ============ تازہ شاعری ============ */}
        {isVisible("latestPoems") && (
          <section {...sectionProps("latestPoems")}>
            <SectionHeading title="تازہ شاعری" href="/poetry" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {latestPoems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gold/40 bg-card p-10 text-center font-naskh text-sm text-muted-foreground">
                    ابھی کوئی شاعری شائع نہیں ہوئی۔ نئی تحریریں جلد آ رہی ہیں۔
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {latestPoems.slice(0, 5).map((p) => (
                      <PoemCard key={p.id} poem={p} showViews={showViews} />
                    ))}
                  </div>
                )}
                {latestPoems.length > 0 && (
                  <div className="mt-6 text-center">
                    <a href="/poetry" className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary px-6 py-2.5 text-sm font-naskh font-semibold text-primary transition-colors hover:bg-accent">
                      مزید شاعری پڑھیے <span aria-hidden>←</span>
                    </a>
                  </div>
                )}
              </div>
              <aside className="lg:col-span-1 self-start">
                {(featuredPoem || latestPoems[0]) && (
                  <FeaturedPoemPanel poem={featuredPoem ?? latestPoems[0]} />
                )}
              </aside>
            </div>
          </section>
        )}

        {maybeDivider(35)}

        {/* ============ تازہ مضامین ============ */}
        {isVisible("latestArticles") && (
          <section {...sectionProps("latestArticles")}>
            <SectionHeading title="تازہ مضامین" href="/articles" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-2">
                {featuredArticle && (
                  <Link
                    href={`/articles/${featuredArticle.id}`}
                    className="manuscript-frame group relative mb-5 flex flex-col-reverse overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-lg sm:flex-row"
                  >
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-nastaliq-tight text-2xl leading-10 text-emerald-ink group-hover:text-primary">
                        {featuredArticle.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-2.5">
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
                      <p className="mt-3 font-naskh text-[15px] leading-8 text-foreground/75">
                        {excerptPreview(featuredArticle.excerpt || featuredArticle.content, 30)}
                      </p>
                      <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-naskh font-semibold text-primary-foreground transition-colors group-hover:bg-emerald-deep">
                        مزید پڑھیں <ArrowLeft className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="relative shrink-0 sm:w-2/5">
                      <span className="absolute start-0 top-0 z-10 rounded-br-lg bg-emerald-ink px-3 py-1.5 text-xs font-naskh font-semibold text-[#e9c979]">
                        آج کی منتخب تحریر
                      </span>
                      {featuredArticle.coverUrl || featuredArticle.topicImageUrl ? (
                        <img
                          src={(featuredArticle.coverUrl || featuredArticle.topicImageUrl)!}
                          alt={featuredArticle.title}
                          className="h-44 w-full object-cover sm:h-full"
                        />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center bg-secondary sm:h-full">
                          <BookOpen className="h-10 w-10 text-gold" />
                        </div>
                      )}
                    </div>
                  </Link>
                )}

                {/* category pills */}
                <div className="mb-5 flex flex-wrap gap-2">
                  <Link href="/articles" className="rounded-lg bg-emerald-deep px-4 py-1.5 text-sm font-naskh text-[#f3ead2] shadow-sm transition-colors hover:bg-emerald-ink">
                    تمام تحریریں
                  </Link>
                  {ARTICLE_CATEGORIES.slice(0, 7).map((c) => (
                    <Link
                      key={c}
                      href={`/articles?category=${encodeURIComponent(c)}`}
                      className="rounded-lg border border-gold/30 bg-card px-4 py-1.5 text-sm font-naskh text-foreground/80 transition-colors hover:border-gold hover:text-primary"
                    >
                      {c}
                    </Link>
                  ))}
                </div>

                {latestArticles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gold/40 bg-card p-10 text-center font-naskh text-sm text-muted-foreground">
                    ابھی کوئی مضمون شائع نہیں ہوا۔ نئی تحریریں جلد آ رہی ہیں۔
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {latestArticles.slice(0, 5).map((a) => (
                      <ArticleCard key={a.id} article={a} showViews={showViews} />
                    ))}
                  </div>
                )}
                {latestArticles.length > 0 && (
                  <div className="mt-6 text-center">
                    <a href="/articles" className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary px-6 py-2.5 text-sm font-naskh font-semibold text-primary transition-colors hover:bg-accent">
                      مزید مضامین پڑھیے <span aria-hidden>←</span>
                    </a>
                  </div>
                )}
              </div>

              <aside className="lg:col-span-1">
                <div className="manuscript-frame overflow-hidden rounded-xl bg-card">
                  <div className="flex items-center justify-between bg-emerald-ink px-4 py-2.5">
                    <h3 className="flex items-center gap-2 font-nastaliq-tight text-lg text-[#e2c57c]">
                      <Flame className="h-4.5 w-4.5" /> مقبول تحریریں
                    </h3>
                    <Link href="/search" className="text-xs font-naskh text-[#e5dfc9]/80 hover:text-[#e2c57c]">
                      تلاش ←
                    </Link>
                  </div>
                  {popularArticles.length === 0 ? (
                    <p className="p-6 text-center font-naskh text-sm text-muted-foreground">مقبول تحریریں کا ریکارڈ جلد مرتب ہوگا۔</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {popularArticles.slice(0, 3).map((a) => (
                        <li key={a.id}>
                          <Link href={`/articles/${a.id}`} className="group flex items-center gap-3 p-3 transition-colors hover:bg-accent/60">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                              {a.coverUrl || a.topicImageUrl ? (
                                <img src={(a.coverUrl || a.topicImageUrl)!} alt={a.title} className="h-full w-full object-cover" />
                              ) : (
                                <BookOpen className="h-5 w-5 text-gold" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 block font-nastaliq-tight text-[15px] leading-7 text-foreground group-hover:text-primary">
                                {a.title}
                              </span>
                              <span className="mt-0.5 block text-[11px] font-naskh text-muted-foreground">
                                {urduDate(a.createdAt)}
                                {showViews && a.views > 0 ? ` · ${a.views} ${"مشاہدات"}` : ""}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* آج کا لفظ — mockup sidebar anatomy: popular list + gold word-of-day card */}
                <div className="manuscript-frame mt-5 overflow-hidden rounded-xl border border-gold/30 bg-[#faf3df]">
                  <div className="flex items-center justify-between bg-emerald-ink px-4 py-2.5">
                    <h3 className="flex items-center gap-2 font-nastaliq-tight text-lg text-[#e9c979]">
                      <Feather className="h-4.5 w-4.5" /> آج کا لفظ
                    </h3>
                    <Link href="/dictionary" className="text-xs font-naskh text-[#e5dfc9]/80 hover:text-[#e2c57c]">
                      لغت ←
                    </Link>
                  </div>
                  {wordOfDay ? (
                    <div className="px-5 py-6 text-center">
                      <p className="font-nastaliq-tight text-4xl leading-[1.8] text-[#a8821b]">{wordOfDay.word}</p>
                      <p className="mt-1 font-naskh text-[15px] text-foreground/85">{wordOfDay.meaning}</p>
                      {wordOfDay.englishMeaning && (
                        <p className="mt-0.5 font-latin text-sm text-muted-foreground" dir="ltr">{wordOfDay.englishMeaning}</p>
                      )}
                      {wordOfDay.example && (
                        <p className="mx-auto mt-3 rounded-lg bg-[#f3ead2] px-4 py-2.5 font-nastaliq text-[13.5px] leading-8 text-foreground/80">
                          مثال: {wordOfDay.example}
                        </p>
                      )}
                      {wordOfDay.date && (
                        <p className="mt-3 inline-block rounded-tl-lg rounded-tr-lg bg-gold/20 px-4 py-1 text-xs font-naskh text-[#7a5d12]">
                          {urduDate(wordOfDay.date)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="p-6 text-center font-naskh text-sm text-muted-foreground">آج کا لفظ جلد منتشر ہوگا۔</p>
                  )}
                </div>
              </aside>
            </div>
          </section>
        )}

        {maybeDivider(45)}

        {/* ============ ادبی خبریں ============ */}
        {isVisible("news") && (
          <section {...sectionProps("news")}>
            <SectionHeading title="ادبی خبریں" href="/news" linkLabel="تمام خبریں" />
            {latestNews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gold/40 bg-card p-10 text-center font-naskh text-sm text-muted-foreground">
                ابھی کوئی خبر شائع نہیں ہوئی۔
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {latestNews.slice(0, 5).map((n) => (
                  <Link key={n.id} href={`/news/${n.id}`} className="group manuscript-frame flex flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-lg">
                    <div className="flex h-36 items-center justify-center overflow-hidden bg-secondary">
                      {n.coverUrl ? (
                         
                        <img src={n.coverUrl} alt={n.title} className="h-full w-full object-cover" />
                      ) : (
                        <Megaphone className="h-9 w-9 text-gold" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <span className="mb-2 w-fit rounded-full bg-accent px-2 py-0.5 text-[10px] font-naskh text-primary">{n.category}</span>
                      <h3 className="line-clamp-2 font-nastaliq-tight text-base leading-8 group-hover:text-primary">{n.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-foreground/65 font-naskh">{n.excerpt ?? excerptPreview(n.content, 14)}</p>
                      <p className="mt-auto pt-2 font-latin text-[10px] text-muted-foreground" dir="ltr">
                        {new Date(n.createdAt).toLocaleDateString("en-GB")}{showViews && n.views > 0 ? ` · ${n.views} views` : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {latestNews.length > 0 && (
              <div className="mt-6 text-center">
                <a href="/news" className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary px-6 py-2.5 text-sm font-naskh font-semibold text-primary transition-colors hover:bg-accent">
                  مزید خبریں پڑھیے <span aria-hidden>←</span>
                </a>
              </div>
            )}
          </section>
        )}

        {maybeDivider(55)}

        {/* ============ نئی کتب / نمایاں شعرا و ادبا / مقبول تحریریں (mockup trio) ============ */}
        {isVisible("booksPopular") && (
          <section {...sectionProps("booksPopular")} className="mx-auto w-full max-w-7xl px-4">
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
                      {(featuredBook ? [featuredBook, ...newBooks.filter((b) => b.id !== featuredBook.id)] : newBooks).slice(0, 5).map((b) => (
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
                              <img src={p.photoUrl} alt={p.name} className="h-12 w-12 shrink-0 rounded-full border-2 border-gold/60 object-cover" loading="lazy" />
                            ) : (
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gold/60 bg-secondary font-nastaliq-tight text-lg text-[color:var(--accent-text)]">
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

              {/* ڈیجیٹل اخبار — mockup trio: books | poets | newspaper */}
              <div className="manuscript-frame overflow-hidden rounded-xl bg-card">
                <div className="flex items-center justify-between bg-emerald-ink px-4 py-2.5">
                  <h3 className="flex items-center gap-2 font-nastaliq-tight text-lg text-[#e9c979]">
                    <Newspaper className="h-4.5 w-4.5" /> ڈیجیٹل اخبار
                  </h3>
                  <Link href="/newspaper" className="text-xs font-naskh text-[#e5dfc9]/80 hover:text-[#e9c979]">
                    تمام شمارے ←
                  </Link>
                </div>
                <div className="p-3">
                  <Link
                    href={latestEdition ? `/newspaper/${latestEdition.id}` : "/newspaper"}
                    className="group block overflow-hidden rounded-lg border border-gold/25"
                  >
                    <span className="block overflow-hidden bg-secondary">
                      {latestEdition?.coverUrl ? (
                        <img src={latestEdition.coverUrl} alt={latestEdition.title} className="h-56 w-full object-cover object-top transition-transform group-hover:scale-[1.03]" loading="lazy" />
                      ) : (
                        <span className="flex h-56 w-full flex-col items-center justify-center gap-2 bg-secondary">
                          <Newspaper className="h-8 w-8 text-gold" />
                          <span className="font-nastaliq-tight text-sm text-foreground/70">ہفتہ وار شمارہ</span>
                        </span>
                      )}
                    </span>
                    <span className="block bg-emerald-deep/5 px-3 py-2 text-center">
                      <span className="line-clamp-1 block font-nastaliq-tight text-[14px] leading-7 text-foreground group-hover:text-primary">
                        {latestEdition ? latestEdition.title : "تازہ شمارہ"}
                      </span>
                      <span className="mt-0.5 inline-block rounded-full bg-emerald-deep/10 px-3 py-0.5 text-[11px] font-naskh font-semibold text-emerald-deep">
                        شمارہ پڑھیں
                      </span>
                    </span>
                  </Link>
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

        {maybeDivider(65)}

        {/* ============ ڈیجیٹل اخبار ============ */}
        {isVisible("newspaper") && (
          <section {...sectionProps("newspaper")}>
            <SectionHeading title="ڈیجیٹل اخبار" href="/newspaper" linkLabel="تمام شمارے" />
            <Link
              href={latestEdition ? `/newspaper/${latestEdition.id}` : "/newspaper"}
              className="group manuscript-frame flex items-center gap-5 overflow-hidden rounded-xl bg-card p-5 transition-shadow hover:shadow-lg"
            >
              <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary sm:w-44">
                {latestEdition?.coverUrl ? (
                   
                  <img src={latestEdition.coverUrl} alt={latestEdition.title} className="h-full w-full object-cover" />
                ) : (
                  <Newspaper className="h-10 w-10 text-gold" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-nastaliq-tight text-xl leading-9 group-hover:text-primary">
                  {latestEdition ? latestEdition.title : "ہفتہ وار شمارہ"}
                </h3>
                <p className="text-sm font-naskh text-muted-foreground">
                  {latestEdition
                    ? `${latestEdition.weekLabel ?? ""} ${latestEdition.editionNumber ? `· شمارہ ${latestEdition.editionNumber}` : ""}`
                    : "معذرت! اس ہفتے کا شمارہ ابھی دستیاب نہیں ہے۔ جلد آ رہا ہے۔"}
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-deep/10 px-3 py-1 text-xs font-naskh font-semibold text-emerald-deep">
                  <Newspaper className="h-3.5 w-3.5" /> شمارہ پڑھیں
                </span>
              </div>
            </Link>
          </section>
        )}

        {maybeDivider(75)}

        {/* ============ ادبی مقابلے ============ */}
        {isVisible("competitions") && (
          <section {...sectionProps("competitions")} className="mx-auto w-full max-w-7xl px-4 pb-14">
            <SectionHeading title="ادبی مقابلے" href="/competitions" />
            {competitions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gold/40 bg-card p-10 text-center font-naskh text-sm text-muted-foreground">
                اس وقت کوئی مقابلہ جاری نہیں۔ نئے مقابلے جلد اعلان ہوں گے۔
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {competitions.slice(0, 4).map((c) => (
                  <PosterCard
                    key={c.id}
                    title={c.title}
                    description={c.description}
                    posterUrl={c.posterUrl}
                    meta={
                      c.endDate ? (
                        <span className="inline-flex items-center gap-1 font-naskh">
                          آخری تاریخ: <span className="font-latin">{new Date(c.endDate).toLocaleDateString("en-GB")}</span>
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}
        </main>

          <AdRail slot="LEFT" maxWidth={adsMax} side="end" />
        </div>
      </div>

      <SiteFooter settings={settings} />
    </div>
  );
}

/* -------- featured half-preview panels (مزید پڑھیے) -------- */

function FeaturedPoemPanel({ poem }: { poem: { id: string; title: string; content: string; poetName?: string | null; user?: { penName: string | null; name: string } | null; coverUrl?: string | null; topicImageUrl?: string | null } }) {
  const half = poemPreview(poem.content, 1);
  const cover = poem.coverUrl || poem.topicImageUrl;
  return (
    <div className="manuscript-frame relative h-full overflow-hidden rounded-xl bg-card">
      {/* visual half — cover artwork or calligraphy verse panel (reference "poem of the week" split) */}
      <div className="relative">
        {cover ? (
          <>
            <img src={cover} alt={poem.title} className="h-44 w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" aria-hidden />
            <span className="absolute inset-x-4 bottom-3 line-clamp-3 whitespace-pre-line text-center font-nastaliq text-[13.5px] leading-7 text-white/95 drop-shadow-md">
              {half}
            </span>
          </>
        ) : (
          <div className="flex h-44 w-full flex-col items-center justify-center gap-2 pattern-emerald px-5 text-center">
            <Quote className="h-5 w-5 text-[#e9cf8e]/80" />
            <p className="line-clamp-3 whitespace-pre-line font-nastaliq text-[15px] leading-8 text-[#f3ead2]">
              {half}
            </p>
          </div>
        )}
        <span className="absolute start-3 top-3 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-naskh font-semibold text-[#101d38]">
          نمایاں نظم
        </span>
      </div>
      {/* text half — title, poet, verse preview, call to action */}
      <div className="flex flex-1 flex-col p-5 text-center">
        <h3 className="font-nastaliq-tight text-xl leading-9 text-[color:var(--accent-text)]">
          <Link href={`/poetry/${poem.id}`} className="hover:text-[color:var(--accent-text-hover)]">{poem.title}</Link>
        </h3>
        <p className="mt-0.5 text-[13px] font-naskh text-gold">
          {poem.poetName ?? poem.user?.penName ?? poem.user?.name ?? ""}
        </p>
        {cover && (
          <p className="mx-auto mt-4 max-w-sm flex-1 whitespace-pre-line border-t border-gold/25 pt-4 font-nastaliq text-[15px] leading-8 text-foreground/80">
            {half}
          </p>
        )}
        <Link
          href={`/poetry/${poem.id}`}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-naskh text-sm font-semibold text-primary-foreground transition-colors hover:bg-emerald-deep"
        >
          مزید پڑھیے <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/** Urdu date (server-rendered, deterministic) with graceful fallback */
function urduDate(d: Date | string): string {
  try {
    return new Intl.DateTimeFormat("ur", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
  } catch {
    return new Date(d).toLocaleDateString("en-GB");
  }
}

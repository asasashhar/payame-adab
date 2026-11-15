"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  imageUrl: string;
  title?: string | null;
  linkUrl?: string | null;
};

export type HeroDesign = "A" | "B" | "C" | "D";

/**
 * Four genuinely different hero layouts (spec §6) — same carousel engine and
 * content, different structure per active design:
 *   A  Classic Literary     — photographic band, ivory wash, wavy emerald base
 *   B  Modern Editorial     — split layout: flat navy text panel + image side,
 *                             sharp corners, underlined actions
 *   C  Heritage Manuscript  — parchment panel, image inside an ornamental
 *                             double frame, diamond ornaments
 *   D  Contemporary Premium — full-bleed image, dark gradient, glass title
 *                             card aligned to the start, gradient actions
 * Dots render only when there is more than one real slide — never fake.
 */
export function HeroCarousel({
  slides,
  badge,
  title,
  subtitle,
  fallbackImage = "/brand/hero-banner.jpg",
  design = "A",
}: {
  slides: HeroSlide[];
  badge: string;
  title: string;
  subtitle: string;
  fallbackImage?: string;
  design?: HeroDesign;
}) {
  const usable = slides.filter((s) => s.imageUrl);
  const list = usable.length ? usable : [{ id: "default", imageUrl: fallbackImage, title: null, linkUrl: null }];
  const multi = list.length > 1;
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!multi || paused) return;
    timer.current = setInterval(() => setActive((i) => (i + 1) % list.length), 7000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [multi, paused, list.length]);

  const go = (i: number) => {
    setActive(i);
    if (timer.current) clearInterval(timer.current);
  };

  const dots = multi && (
    <div className="pea-hero-dots mt-8 flex items-center justify-center gap-2">
      {list.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => go(i)}
          aria-label={`بینر ${i + 1}`}
          aria-current={i === active}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i === active ? "w-6 bg-gold" : "bg-emerald-ink/35 hover:bg-emerald-ink/60 w-2"
          )}
        />
      ))}
    </div>
  );

  /* ================= Design B — Modern Editorial split ================= */
  if (design === "B") {
    return (
      <div className="grid bg-[color:var(--primary)] lg:grid-cols-[1.05fr_1fr]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="relative order-2 min-h-[240px] overflow-hidden lg:order-1">
          {list.map((s, i) => (
            <img
              key={s.id}
              src={s.imageUrl}
              alt={s.title || "پیامِ ادب"}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out",
                i === active ? "opacity-100" : "opacity-0"
              )}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
            />
          ))}
          <div className="absolute inset-0 bg-[color:var(--primary)]/25" aria-hidden />
        </div>
        <div className="order-1 flex flex-col justify-center gap-5 px-6 py-12 text-[#f3ead2] md:px-12 md:py-16 lg:order-2">
          <p className="w-fit border-s-4 border-gold ps-3 font-naskh text-[13px] uppercase tracking-wide text-[#e2c57c] md:text-[15px]">
            {badge}
          </p>
          <h1 className="font-nastaliq-tight text-[26px] leading-[1.75] sm:text-3xl md:text-[40px]">{title}</h1>
          <p className="max-w-xl font-naskh text-[14px] leading-8 text-[#e5dfc9]/90 sm:text-[15px] md:text-lg">{subtitle}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Link href="/poetry" className="inline-flex h-11 items-center gap-2 bg-gold px-6 font-naskh text-[15px] font-semibold text-[#101d38] transition-colors hover:bg-[#e2c57c]">
              ادب پڑھیں ←
            </Link>
            <Link href="/submit" className="inline-flex h-11 items-center gap-2 border-2 border-[#e5dfc9]/70 px-6 font-naskh text-[15px] text-[#f3ead2] transition-colors hover:border-[#e2c57c] hover:text-[#e2c57c]">
              اپنی تحریر بھیجیں
            </Link>
          </div>
          {dots}
        </div>
      </div>
    );
  }

  /* ================= Design C — Heritage Manuscript ================= */
  if (design === "C") {
    return (
      <div className="paper-bg px-4 py-10 md:py-14" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="relative mx-auto max-w-4xl rounded-[1.6rem] border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-lg md:p-4"
          style={{ outline: "1px solid color-mix(in srgb, var(--gold) 45%, transparent)", outlineOffset: "-8px" }}>
          <div className="relative overflow-hidden rounded-[1.2rem]">
            {list.map((s, i) => (
              <img
                key={s.id}
                src={s.imageUrl}
                alt={s.title || "پیامِ ادب"}
                className={cn(
                  "h-[240px] w-full object-cover transition-opacity duration-[1200ms] ease-out md:h-[330px]",
                  i === active ? "opacity-100" : "opacity-0"
                )}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
              />
            ))}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--card) 96%, transparent) 0%, color-mix(in srgb, var(--card) 55%, transparent) 30%, transparent 62%)" }}
              aria-hidden
            />
          </div>
          <div className="relative -mt-16 px-5 pb-6 text-center md:-mt-20 md:px-10">
            <p className="mx-auto mb-3 inline-block rounded-full border border-[color:var(--gold)]/60 bg-[color:var(--secondary)] px-5 py-1 font-naskh text-[13px] text-[color:var(--emerald-ink)] md:text-[15px]">
              ❖ {badge} ❖
            </p>
            <h1 className="font-nastaliq-tight text-[26px] leading-[1.9] text-[color:var(--emerald-ink)] sm:text-3xl md:text-[40px]">{title}</h1>
            <p className="mx-auto mt-2 max-w-2xl font-naskh text-[14px] leading-8 text-foreground/85 sm:text-[15px] md:text-lg">{subtitle}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
              <Link href="/poetry" className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--primary)] px-7 font-naskh text-[15px] font-semibold text-[#f6eeda] shadow transition-colors hover:bg-[color:var(--emerald-ink)]">
                ادب پڑھیں
              </Link>
              <Link href="/submit" className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-[color:var(--gold)] px-7 font-naskh text-[15px] font-semibold text-[color:var(--emerald-ink)] transition-colors hover:bg-[color:var(--accent)]">
                اپنی تحریر بھیجیں
              </Link>
            </div>
            {dots}
          </div>
        </div>
      </div>
    );
  }

  /* ================= Design D — Contemporary Premium ================= */
  if (design === "D") {
    return (
      <div className="relative overflow-hidden bg-[color:var(--emerald-ink)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="absolute inset-0">
          {list.map((s, i) => (
            <img
              key={s.id}
              src={s.imageUrl}
              alt={s.title || "پیامِ ادب"}
              className={cn(
                "absolute inset-0 h-full w-full object-cover opacity-60 transition-opacity duration-[1200ms] ease-out",
                i === active ? "opacity-60" : "opacity-0"
              )}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
            />
          ))}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--emerald-ink) 96%, transparent) 0%, color-mix(in srgb, var(--emerald-ink) 78%, transparent) 45%, transparent 100%)" }}
            aria-hidden
          />
        </div>
        <div className="relative mx-auto flex min-h-[420px] max-w-7xl items-center px-4 py-14 md:min-h-[520px] md:py-20">
          <div className="max-w-2xl rounded-[1.3rem] border border-[color:var(--gold)]/30 bg-[color:var(--emerald-ink)]/60 p-7 backdrop-blur-md md:p-10">
            <p className="mb-4 inline-block rounded-full bg-[color:var(--gold)]/15 px-4 py-1.5 font-naskh text-[13px] font-semibold text-[color:var(--gold-soft)] ring-1 ring-[color:var(--gold)]/40 md:text-[15px]">
              {badge}
            </p>
            <h1 className="font-nastaliq-tight text-[26px] leading-[1.8] text-[#f3ead2] sm:text-3xl md:text-[42px]">{title}</h1>
            <p className="mt-3 max-w-xl font-naskh text-[14px] leading-8 text-[#e5dfc9]/90 sm:text-[15px] md:text-lg">{subtitle}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link href="/poetry" className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-l from-[color:var(--gold)] to-[#e2c57c] px-8 font-naskh text-[15px] font-bold text-[#101d38] shadow-lg shadow-[color:var(--gold)]/25 transition-transform hover:scale-[1.03]">
                ادب پڑھیں
              </Link>
              <Link href="/submit" className="inline-flex h-12 items-center gap-2 rounded-full border border-[color:var(--gold)]/60 px-8 font-naskh text-[15px] text-[color:var(--gold-soft)] transition-colors hover:bg-[color:var(--gold)]/10">
                اپنی تحریر بھیجیں
              </Link>
            </div>
            {dots}
          </div>
        </div>
      </div>
    );
  }

  /* ================= Design A — Classic Literary (mockup baseline) ================= */
  return (
    <div
      className="relative overflow-hidden bg-emerald-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* slides */}
      <div className="absolute inset-0">
        {list.map((s, i) => (
          <img
            key={s.id}
            src={s.imageUrl}
            alt={s.title || "پیامِ ادب"}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out",
              i === active ? "opacity-100" : "opacity-0"
            )}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : undefined}
          />
        ))}
        {/* readability overlay (green-reference): soft ivory center wash so the
            photographic banner stays visible at the edges while the headline
            sits on a bright middle band, emerald tint top/bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 62% 78% at 50% 46%, rgba(248,241,231,0.94) 0%, rgba(248,241,231,0.82) 38%, rgba(248,241,231,0.30) 68%, rgba(6,66,42,0.30) 100%)",
          }}
          aria-hidden
        />
        {/* wavy emerald base with gold line — mockup hero signature */}
        <svg
          className="absolute inset-x-0 bottom-0 h-12 w-full"
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0,26 C180,44 360,8 540,22 C720,36 900,6 1080,20 C1260,34 1380,14 1440,24 L1440,48 L0,48 Z" fill="#03301c" opacity="0.92" />
          <path d="M0,26 C180,44 360,8 540,22 C720,36 900,6 1080,20 C1260,34 1380,14 1440,24" fill="none" stroke="#c99a2e" strokeWidth="2" />
        </svg>
      </div>

      {/* content */}
      <div className="relative mx-auto flex min-h-[380px] max-w-3xl flex-col items-center justify-center px-4 py-14 text-center md:min-h-[470px] md:py-20">
        <p className="mb-3 inline-block rounded-full border border-gold/60 bg-[#f8f1e7]/85 px-5 py-1 font-naskh text-[13px] text-emerald-ink shadow-sm backdrop-blur-sm md:text-[15px]">
          {badge}
        </p>
        <h1 className="font-nastaliq-tight text-[26px] leading-[1.85] text-emerald-ink drop-shadow-sm sm:text-3xl md:text-[42px] md:leading-[1.8]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl font-naskh text-[14px] leading-8 text-[#26221b]/85 sm:text-[15px] md:text-lg md:leading-9">
          {subtitle}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/poetry"
            className="inline-flex h-[46px] items-center gap-2 rounded-full bg-emerald-deep px-7 font-naskh text-[15px] font-semibold text-[#f3ead2] shadow-md shadow-black/25 transition-colors hover:bg-emerald-ink md:h-[50px] md:px-9 md:text-[17px]"
          >
            ادب پڑھیں
          </Link>
          <Link
            href="/submit"
            className="inline-flex h-[46px] items-center gap-2 rounded-full bg-gold px-7 font-naskh text-[15px] font-semibold text-[#101d38] shadow-md shadow-black/25 transition-colors hover:bg-[#e2c57c] md:h-[50px] md:px-9 md:text-[17px]"
          >
            اپنی تحریر بھیجیں
          </Link>
        </div>

        {/* real carousel dots — only when multiple admin banners exist */}
        {multi && (
          <div className="pea-hero-dots mt-8 flex items-center justify-center gap-2">
            {list.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`بینر ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === active ? "w-6 bg-gold" : "w-2 bg-emerald-ink/35 hover:bg-emerald-ink/60"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

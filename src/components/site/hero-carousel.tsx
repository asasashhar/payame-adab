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

/**
 * Mockup-style full-bleed literary hero: photographic banner, dark emerald
 * overlay, centered gold headline, primary + submit buttons.
 * Dots are rendered only when there is more than one real slide — never fake.
 */
export function HeroCarousel({
  slides,
  badge,
  title,
  subtitle,
  fallbackImage = "/brand/hero-banner.jpg",
}: {
  slides: HeroSlide[];
  badge: string;
  title: string;
  subtitle: string;
  fallbackImage?: string;
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

  return (
    <div
      className="relative overflow-hidden rounded-2xl manuscript-frame pattern-emerald"
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
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-ink/45 to-transparent" aria-hidden />
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
          <div className="mt-8 flex items-center justify-center gap-2">
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

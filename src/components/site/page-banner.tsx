import { cn } from "@/lib/utils";

/**
 * Mockup-style page banner: deep emerald band with gold ornament rule,
 * used on library/listing pages (کتب خانہ، شاعری، مضامین…).
 */
export function PageBanner({
  title,
  subtitle,
  quote,
  image,
  className,
}: {
  title: string;
  subtitle?: string;
  quote?: string;
  image?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden pattern-emerald", className)}>
      {image && (
        <>
          {/* aria-hidden: purely decorative background artwork */}
          <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-ink/90 via-emerald-ink/75 to-emerald-ink/90" />
        </>
      )}
      <div className="relative mx-auto max-w-7xl px-4 py-10 text-center md:py-12">
        {quote && (
          <p className="mb-2 font-nastaliq text-sm leading-8 text-[#e9c979]/90 md:text-base">
            {quote}
          </p>
        )}
        <h1 className="font-nastaliq-tight text-4xl leading-[1.7] text-[#f3ead2] md:text-5xl md:leading-[1.7]">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-2 max-w-2xl font-naskh text-base leading-8 text-[#e5dfc9]/85 md:text-lg">
            {subtitle}
          </p>
        )}
        <div className="decor-rule mx-auto mt-4 max-w-[320px] opacity-80" aria-hidden>
          <span className="rule-dot" />
          <span className="rule-track"><span className="rule-line" /></span>
          <span className="rule-dot" />
        </div>
      </div>
      {/* gold base line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-l from-transparent via-gold/70 to-transparent" />
    </div>
  );
}

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
    <div className={cn("pea-banner relative overflow-hidden", !image && "pattern-emerald", className)}>
      {image && (
        <>
          {/* aria-hidden: purely decorative background artwork */}
          <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          {/* light-center readability wash (green-reference mockup heroes):
              bright ivory middle band with soft emerald edges — same treatment
              as the homepage hero */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 62% 90% at 50% 50%, rgba(248,241,231,0.95) 0%, rgba(248,241,231,0.85) 40%, rgba(248,241,231,0.35) 70%, rgba(6,66,42,0.38) 100%)",
            }}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-emerald-ink/40 to-transparent" aria-hidden />
        </>
      )}
      <div className={cn("relative mx-auto max-w-7xl px-4 py-10 text-center md:py-12", image ? "text-emerald-ink" : "text-[#f3ead2]")}>
        {quote && (
          <p className={cn("mb-2 font-nastaliq text-sm leading-8 md:text-base", image ? "text-[#26221b]/80" : "text-[#e9c979]/90")}>
            {quote}
          </p>
        )}
        <h1 className={cn("font-nastaliq-tight text-4xl leading-[1.7] md:text-5xl md:leading-[1.7]", image ? "text-emerald-ink drop-shadow-sm" : "text-[#f3ead2]")}>
          {title}
        </h1>
        {subtitle && (
          <p className={cn("mx-auto mt-2 max-w-2xl font-naskh text-base leading-8 md:text-lg", image ? "text-[#26221b]/85" : "text-[#e5dfc9]/85")}>
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

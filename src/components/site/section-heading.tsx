import { cn } from "@/lib/utils";

/**
 * Section heading in the reference presentation (mawraa-inspired, brand
 * adapted): bold Urdu title at the start, a thin twin gold rule filling the
 * middle, and the "view all" link anchored at the far end — all on one line.
 * Kept API-compatible: title, subtitle, href, linkLabel, light, center.
 */
export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = "سب دیکھیں",
  light = false,
  center = false,
  as = "h2",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  light?: boolean;
  center?: boolean;
  as?: "h1" | "h2";
}) {
  const H2 = as;
  if (center) {
    /* centered variant: title flanked by the twin decorative rules */
    return (
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-4">
          <div className="decor-rule flex-1" aria-hidden>
            <span className="rule-dot rule-dot-dot" />
            <span className="rule-track">
              <span className="rule-line" />
              <span className="rule-line opacity-50" />
            </span>
          </div>
          <H2
            className={cn(
              "whitespace-nowrap font-nastaliq-tight text-3xl md:text-[2rem]",
              light ? "text-[#f3ead2]" : "text-[color:var(--accent-text)]"
            )}
          >
            {title}
          </H2>
          <div className="decor-rule flex-1" aria-hidden>
            <span className="rule-track">
              <span className="rule-line" />
              <span className="rule-line opacity-50" />
            </span>
            <span className="rule-dot" />
          </div>
        </div>
        {subtitle && (
          <p className={cn("mt-1 text-sm", light ? "text-[#e2c57c]" : "text-muted-foreground")}>{subtitle}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        <H2
          className={cn(
            "shrink-0 whitespace-nowrap font-nastaliq-tight text-[1.7rem] md:text-[2rem]",
            light ? "text-[#f3ead2]" : "text-[color:var(--accent-text)]"
          )}
        >
          {title}
        </H2>
        <div className="decor-rule min-w-8 flex-1 opacity-70" aria-hidden>
          <span className="rule-track">
            <span className="rule-line" />
          </span>
        </div>
        {href && (
          <a
            href={href}
            className="shrink-0 text-sm font-naskh text-gold transition-colors hover:text-[color:var(--accent-text-hover)]"
          >
            {linkLabel} <span aria-hidden>←</span>
          </a>
        )}
      </div>
      {subtitle && (
        <p className={cn("mt-1 text-sm", light ? "text-[#e2c57c]" : "text-muted-foreground")}>{subtitle}</p>
      )}
    </div>
  );
}

/** Slim decorative divider used between page sections. */
export function Divider({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-6", className)} style={style} aria-hidden>
      <span className="h-px w-24 bg-gold/50" />
      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      <span className="h-2 w-2 rotate-45 border border-gold" />
      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      <span className="h-px w-24 bg-gold/50" />
    </div>
  );
}

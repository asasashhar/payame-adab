import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Payam-e-Adab official logo — the uploaded circular badge artwork.
 * Used in header, footer, hero, admin login, dashboard, watermarks and favicon.
 */
export function LogoMark({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/logo-badge.png"
      alt="پیامِ ادب — Payam-e-Adab"
      width={size}
      height={size}
      className={cn("shrink-0 select-none object-contain", className)}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

/**
 * Header brand lockup (mockup style): the full horizontal logo artwork —
 * پیامِ ادب calligraphy + quill + PAYAM-E-ADAB + tagline — on transparent
 * background, with the round badge beside it like a seal.
 */
export function BrandLock({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="پیامِ ادب — صفحۂ اول">
      <LogoMark size={compact ? 44 : 54} className="transition-transform group-hover:scale-105" />
      {!compact ? (
        <img
          src="/brand/logo-horizontal.png"
          alt="پیامِ ادب — PAYAM-E-ADAB"
          className="hidden h-[52px] w-auto select-none object-contain sm:block"
        />
      ) : (
        <span className="flex flex-col items-start">
          <span className="font-nastaliq-tight text-xl leading-snug text-primary group-hover:text-emerald-deep transition-colors">
            پیامِ ادب
          </span>
          <span className="text-[11px] tracking-wide text-muted-foreground font-latin">
            PAYAM-E-ADAB
          </span>
        </span>
      )}
      <span
        className={cn(
          "flex flex-col items-start sm:hidden",
          !compact && "min-w-0"
        )}
      >
        <span className="font-nastaliq-tight text-xl leading-snug text-primary">پیامِ ادب</span>
        {!compact && (
          <span className="text-[10px] tracking-wide text-muted-foreground font-latin">PAYAM-E-ADAB</span>
        )}
      </span>
    </Link>
  );
}

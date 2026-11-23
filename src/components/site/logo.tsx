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
 * Header brand lockup (green-reference mockups): the full horizontal logo
 * artwork alone — پیامِ ادب calligraphy + emblem + PAYAM-E-ADAB — exactly one
 * logo like the reference header. Compact/mobile falls back to the badge.
 */
export function BrandLock({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="پیامِ ادب — صفحۂ اول">
      {!compact ? (
        <img
          src="/brand/logo-horizontal.png"
          alt="پیامِ ادب — PAYAM-E-ADAB"
          className="hidden h-[56px] w-auto select-none object-contain transition-transform group-hover:scale-[1.02] min-[480px]:block"
        />
      ) : (
        <>
          <LogoMark size={44} className="transition-transform group-hover:scale-105" />
          <span className="flex flex-col items-start">
            <span className="font-nastaliq-tight text-xl leading-snug text-primary group-hover:text-emerald-deep transition-colors">
              پیامِ ادب
            </span>
            <span className="text-[11px] tracking-wide text-muted-foreground font-latin">
              PAYAM-E-ADAB
            </span>
          </span>
        </>
      )}
      {!compact && (
        <span className="flex flex-col items-start min-[480px]:hidden">
          <span className="font-nastaliq-tight text-xl leading-snug text-primary">پیامِ ادب</span>
          <span className="text-[10px] tracking-wide text-muted-foreground font-latin">PAYAM-E-ADAB</span>
        </span>
      )}
    </Link>
  );
}

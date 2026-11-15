/**
 * Four-design monthly rotation (blueprint Part 3).
 * Content and functionality stay identical — each design is a presentation
 * layer expressed as CSS-variable overrides, applied once sitewide.
 *
 * Schedule (Asia/Kolkata by default, admin-configurable):
 *   day 1–6    → A  Classic Literary      (کلاسیکی ادبی — emerald & gold)
 *   day 7–13   → B  Modern Editorial      (جدید ایڈیٹوریل — royal blue)
 *   day 14–20  → C  Heritage Manuscript   (ورثاتی دستاویز — warm ivory)
 *   day 21–end → D  Contemporary Premium  (عصری معیاری — dark midnight)
 * The next month's 1st restarts A automatically (day-of-month only — month
 * lengths and leap years need no special handling).
 */

export type DesignVersion = "A" | "B" | "C" | "D";

export const DESIGN_ORDER: DesignVersion[] = ["A", "B", "C", "D"];

export const DESIGN_META: Record<
  DesignVersion,
  { labelUrdu: string; labelEn: string; scheduleUrdu: string; dark?: boolean; vars: Record<string, string> }
> = {
  A: {
    labelUrdu: "کلاسیکی ادبی",
    labelEn: "Classic Literary",
    scheduleUrdu: "1 تا 6 تاریخ",
    vars: {},
  },
  B: {
    labelUrdu: "جدید ایڈیٹوریل",
    labelEn: "Modern Editorial",
    scheduleUrdu: "7 تا 13 تاریخ",
    vars: {
      "--primary": "#24558e",
      "--emerald-deep": "#24558e",
      "--emerald-ink": "#173b70",
      "--sidebar": "#24558e",
      "--sidebar-accent": "#173b70",
      "--sidebar-border": "#173b70",
      "--background": "#f6f8fb",
      "--ivory": "#f6f8fb",
      "--card": "#ffffff",
      "--secondary": "#eef2f8",
      "--accent": "#e8eef8",
      "--border": "#dbe4f0",
      "--input": "#dbe4f0",
      "--paper-dot": "#dfe6f0",
    },
  },
  C: {
    labelUrdu: "ورثاتی دستاویز",
    labelEn: "Heritage Manuscript",
    scheduleUrdu: "14 تا 20 تاریخ",
    vars: {
      "--primary": "#5b4326",
      "--emerald-deep": "#5b4326",
      "--emerald-ink": "#3d2c17",
      "--sidebar": "#5b4326",
      "--sidebar-accent": "#3d2c17",
      "--sidebar-border": "#3d2c17",
      "--background": "#f6eeda",
      "--ivory": "#f6eeda",
      "--card": "#fcf6e7",
      "--secondary": "#f0e4c8",
      "--accent": "#f2e7cb",
      "--accent-foreground": "#3d2c17",
      "--border": "#dcc9a0",
      "--input": "#dcc9a0",
      "--muted": "#f0e4c8",
      "--muted-foreground": "#7a6a4f",
      "--gold": "#a8871f",
      "--gold-soft": "#d3b865",
      "--paper-dot": "#e6d8b4",
    },
  },
  D: {
    labelUrdu: "عصری معیاری",
    labelEn: "Contemporary Premium",
    scheduleUrdu: "21 تا مہینے کے آخر تک",
    dark: true,
    vars: {
      "--primary": "#24558e",
      "--emerald-deep": "#24558e",
      "--emerald-ink": "#0c1d42",
      "--sidebar": "#0c1d42",
      "--sidebar-accent": "#122a5c",
      "--sidebar-border": "#122a5c",
      "--sidebar-primary": "#24558e",
      "--sidebar-primary-foreground": "#f3ead2",
      "--background": "#0b1322",
      "--ivory": "#0d1626",
      "--card": "#111c2f",
      "--popover": "#111c2f",
      "--foreground": "#ece7d4",
      "--card-foreground": "#ece7d4",
      "--popover-foreground": "#ece7d4",
      "--secondary": "#18263c",
      "--muted": "#18263c",
      "--muted-foreground": "#a8b3c4",
      "--accent": "#1a2941",
      "--accent-foreground": "#ece7d4",
      "--border": "#24334d",
      "--input": "#24334d",
      "--primary-foreground": "#f3ead2",
      "--paper-dot": "#16233a",
      "--accent-text": "#e9cf8e",
      "--accent-text-hover": "#f4dfa5",
    },
  },
};

function dayOfMonthInTz(date: Date, tz: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric" }).formatToParts(date);
    const d = parts.find((p) => p.type === "day");
    return d ? Number(d.value) : null;
  } catch {
    return null;
  }
}

export function scheduledDesign(date: Date = new Date(), tz = "Asia/Kolkata"): DesignVersion {
  const day = dayOfMonthInTz(date, tz) ?? date.getDate();
  if (day <= 6) return "A";
  if (day <= 13) return "B";
  if (day <= 20) return "C";
  return "D";
}

export type ActiveDesign = {
  version: DesignVersion;
  scheduled: DesignVersion;
  source: "schedule" | "override";
  paused: boolean;
};

/**
 * Active design from settings. A manual override (recorded in designOverride)
 * always wins; pausing rotation is implemented by writing the held version
 * into designOverride, so "paused" state survives restarts.
 */
export function activeDesign(settings: Record<string, string>, now: Date = new Date()): ActiveDesign {
  const tz = (settings.designTimezone ?? "Asia/Kolkata").trim() || "Asia/Kolkata";
  const scheduled = scheduledDesign(now, tz);
  const paused = settings.designRotation === "0";
  const ov = (settings.designOverride ?? "").trim().toUpperCase() as DesignVersion;
  if (DESIGN_ORDER.includes(ov)) {
    return { version: ov, scheduled, source: "override", paused };
  }
  return { version: scheduled, scheduled, source: "schedule", paused };
}

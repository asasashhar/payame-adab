"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLock } from "@/components/site/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search, Menu, UserCircle2, LayoutDashboard, LogOut, PenLine,
  ShieldCheck, ChevronDown, CalendarCheck2,
  Instagram, Facebook, Youtube, Twitter, Globe, Sparkles,
} from "lucide-react";

type Me = { id: string; name: string; penName: string | null; role: string; photoUrl: string | null } | null;
type Social = { platform: string; url: string };
type NavItem = { label: string; href: string; visible?: boolean };

/** admin-managed menu (navLinks setting); empty → built-in defaults */
function parseNav(raw: string | undefined): NavItem[] | null {
  if (!raw) return null;
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || !list.length) return null;
    const items = list
      .filter((x) => x && typeof x.label === "string" && typeof x.href === "string" && x.visible !== false)
      .map((x) => ({ label: x.label as string, href: x.href as string }));
    return items.length ? items : null;
  } catch { return null; }
}

const NAV = [
  { label: "ہوم", href: "/" },
  { label: "شاعری", href: "/poetry" },
  { label: "مضامین", href: "/articles" },
  { label: "کتب خانہ", href: "/books" },
  { label: "شعرا و ادبا", href: "/poets" },
  { label: "اخبار", href: "/newspaper" },
];

const MORE = [
  { label: "ادبی خبریں", href: "/news" },
  { label: "ادبی مقابلے", href: "/competitions" },
  { label: "ادبی تقریبات", href: "/events" },
  { label: "لغت اور آج کا لفظ", href: "/dictionary" },
  { label: "ہمارا تعارف", href: "/about" },
];

const TOOLS = [
  { label: "قافیہ تلاش کریں", href: "/qafiya", desc: "اردو شاعری کے لیے قافیوں کا ذخیرہ" },
  { label: "تقطیع و بحر جانچیں", href: "/taqti", desc: "اردو عروض کا پیمانہ" },
];

const OFFICIAL_INSTAGRAM = "https://www.instagram.com/payameadab/";

const socialIcon = (p: string, cls = "h-3.5 w-3.5") => {
  if (/facebook/i.test(p)) return <Facebook className={cls} />;
  if (/twitter|x\.com/i.test(p)) return <Twitter className={cls} />;
  if (/instagram/i.test(p)) return <Instagram className={cls} />;
  if (/youtube/i.test(p)) return <Youtube className={cls} />;
  return <Globe className={cls} />;
};

function NavLinks({ inSheet = false, items }: { inSheet?: boolean; items?: NavItem[] | null }) {
  const pathname = usePathname();
  const source = items ?? [...NAV, ...MORE];
  const primary = source.slice(0, 6);
  const rest = source.slice(6);
  return (
    <>
      {primary.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "whitespace-nowrap rounded-md px-3.5 py-1.5 text-[15.5px] font-nav transition-colors",
            pathname === item.href
              ? "bg-white/12 text-[#e9c979] font-semibold"
              : "text-[#eee9d8]/85 hover:bg-white/8 hover:text-[#e9c979]",
            inSheet && "block px-4 py-2.5 text-base"
          )}
        >
          {item.label}
        </Link>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger className="whitespace-nowrap rounded-md px-3.5 py-1.5 text-[15.5px] font-nav text-[#eee9d8]/85 hover:bg-white/8 hover:text-[#e9c979] outline-none data-[state=open]:bg-white/10 data-[state=open]:text-[#e9c979]">
          <span className="inline-flex items-center gap-1">مزید <ChevronDown className="h-3.5 w-3.5" /></span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {rest.map((m) => (
            <DropdownMenuItem key={m.href} asChild>
              <Link href={m.href} className="font-nav text-[15.5px]">{m.label}</Link>
            </DropdownMenuItem>
          ))}
          {rest.length > 0 && <DropdownMenuSeparator />}
          {TOOLS.map((t) => (
            <DropdownMenuItem key={t.href} asChild>
              <Link href={t.href} className="font-naskh text-[15px]">{t.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/** live Urdu date — client only, avoids SSR hydration mismatch */
function UrduDate() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setToday(new Intl.DateTimeFormat("ur-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()));
      } catch {
        try { setToday(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })); } catch { setToday(null); }
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  if (!today) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-naskh text-[#e5dfc9]/85">
      <CalendarCheck2 className="h-3.5 w-3.5 text-[#e2c57c]" /> {today}
    </span>
  );
}

export function SiteHeader() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [social, setSocial] = useState<Social[]>([]);
  const [navItems, setNavItems] = useState<NavItem[] | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d?.id ? d : null))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        try {
          const list: Social[] = JSON.parse(d?.socialLinks ?? "[]");
          setSocial(Array.isArray(list) ? list.slice(0, 5) : []);
        } catch { setSocial([]); }
        setNavItems(parseNav(d?.navLinks));
      })
      .catch(() => setSocial([]));
  }, [pathname]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/");
    router.refresh();
  };

  const shownSocial: Social[] = social.length > 0
    ? social
    : [{ platform: "Instagram", url: OFFICIAL_INSTAGRAM }];

  return (
    <header className="sticky top-0 z-40">
      {/* ── strip 1 · dark emerald utility bar: date + socials + submit + contact ── */}
      <div className="pea-topbar hidden pattern-emerald text-[#eee9d8] sm:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4">
          <UrduDate />
          <div className="flex items-center gap-2">
            {shownSocial.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.platform}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[#e5dfc9]/80 transition-colors hover:bg-white/10 hover:text-[#e2c57c]"
              >
                {socialIcon(s.platform)}
              </a>
            ))}
            <span className="mx-1 h-4 w-px bg-[#e5dfc9]/30" aria-hidden />
            <Link
              href="/submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 font-naskh transition-colors hover:bg-emerald-ink/60 hover:text-[#e2c57c]"
            >
              <PenLine className="h-3.5 w-3.5 text-[#e2c57c]" /> اپنی تحریر بھیجیں
            </Link>
            <span className="h-4 w-px bg-[#e5dfc9]/30" aria-hidden />
            <Link href="/about" className="rounded-sm px-2 py-1 font-naskh transition-colors hover:bg-emerald-ink/60 hover:text-[#e2c57c]">
              رابطہ کریں
            </Link>
          </div>
        </div>
      </div>

      {/* ── strip 2 · ivory brand bar: logo + centered tagline + actions ── */}
      <div className="pea-brandbar border-b border-gold/25 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <BrandLock />

          {/* decorative center tagline */}
          <div className="pea-tagline hidden min-w-0 flex-1 flex-col items-center lg:flex" aria-hidden>
            <p className="font-nastaliq-tight text-xl leading-loose text-emerald-deep">
              اردو ادب، روایت سے نئی نسل تک
            </p>
            <span className="decor-rule -mt-1 max-w-[280px] opacity-70">
              <span className="rule-dot" />
              <span className="rule-track"><span className="rule-line" /></span>
              <span className="rule-dot" />
            </span>
          </div>

          <form onSubmit={submitSearch} className="relative ms-auto hidden w-44 md:block lg:w-56">
            <Search className="absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="تلاش کریں…"
              className="h-9 bg-card pe-8 text-sm"
              aria-label="تلاش"
            />
          </form>

          {/* auth actions */}
          {!loading && me ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-gold/40 font-naskh">
                  <UserCircle2 className="h-4.5 w-4.5 text-primary" />
                  <span className="hidden max-w-24 truncate sm:inline">{me.penName || me.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-naskh">{me.penName || me.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="font-naskh">
                    <LayoutDashboard className="ms-0 h-4 w-4" /> میرا ڈیش بورڈ
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${me.id}`} className="font-naskh">
                    <UserCircle2 className="ms-0 h-4 w-4" /> میری پروفائل
                  </Link>
                </DropdownMenuItem>
                {me.role === "ADMIN" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="font-naskh text-primary">
                      <ShieldCheck className="ms-0 h-4 w-4" /> ایڈمن پینل
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="font-naskh text-destructive">
                  <LogOut className="ms-0 h-4 w-4" /> لاگ آؤٹ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            !loading && (
              <div className="hidden items-center gap-2 sm:flex">
                <Button asChild size="sm" className="hidden bg-gold font-naskh text-[13px] font-semibold text-[#101d38] hover:bg-[#e2c57c] md:inline-flex">
                  <Link href="/register" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> رکن بنیں
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-primary font-naskh text-[13px] hover:bg-emerald-deep">
                  <Link href="/login">لاگ اِن</Link>
                </Button>
              </div>
            )
          )}

          {/* mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="ms-1 border-gold/40 sm:hidden" aria-label="مینو">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto p-0">
              <SheetHeader className="border-b border-gold/25 p-4 text-start">
                <SheetTitle asChild>
                  <div className="flex items-center justify-between">
                    <BrandLock compact />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div
                className="p-3"
                onClick={(e) => {
                  // close the sheet when any navigation link inside is clicked
                  if ((e.target as HTMLElement).closest("a")) setOpen(false);
                }}
              >
                <form onSubmit={submitSearch} className="relative mb-3">
                  <Search className="absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="تلاش کریں…" className="bg-card pe-8" />
                </form>
                <nav className="flex flex-col gap-0.5">
                  <NavLinks inSheet items={navItems} />
                </nav>
                <div className="my-3 border-t border-gold/25" />
                <div className="flex flex-col gap-0.5">
                  {MORE.map((m) => (
                    <Link key={m.href} href={m.href} className="rounded-md px-4 py-2.5 text-base font-naskh hover:bg-accent">
                      {m.label}
                    </Link>
                  ))}
                </div>
                <div className="my-3 border-t border-gold/25" />
                <div className="flex flex-col gap-2">
                  {TOOLS.map((t) => (
                    <Link key={t.href} href={t.href} className="rounded-lg border border-gold/30 bg-card p-3">
                      <span className="font-naskh text-[15px] font-semibold text-primary">{t.label}</span>
                      <span className="block text-xs text-muted-foreground">{t.desc}</span>
                    </Link>
                  ))}
                </div>
                {!me && (
                  <div className="mt-4 grid gap-2">
                    <Button asChild className="w-full bg-gold font-naskh font-semibold text-[#101d38] hover:bg-[#e2c57c]">
                      <Link href="/register">رکن بنیں</Link>
                    </Button>
                    <Button asChild className="w-full bg-primary font-naskh">
                      <Link href="/login">لاگ اِن</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── strip 3 · dark emerald nav bar (mockup style) ── */}
      <div className="pea-navstrip border-t border-emerald-ink/60 bg-emerald-ink shadow-sm">
        <div className="mx-auto hidden max-w-7xl items-center gap-1 px-4 py-1.5 lg:flex">
          <NavLinks items={navItems} />
        </div>
        {/* mobile: compact quick nav row */}
        <div className="flex items-center gap-1 overflow-x-auto px-3 py-1.5 nice-scroll lg:hidden">
          {(navItems ?? NAV).slice(0, 8).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1 text-[13px] font-nav transition-colors",
                pathname === item.href ? "bg-white/12 text-[#e9c979] font-semibold" : "text-[#eee9d8]/85"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── strip 4 · literary categories rail (removed — reference mockup header has no categories rail) ── */}
    </header>
  );
}

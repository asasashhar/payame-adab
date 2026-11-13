"use client";

/**
 * User-area shell (reference mockup "میری پروفائل"): dark emerald sidebar with
 * the member menu + ivory top bar with brand lockup, Website-View button,
 * notifications and the signed-in user chip. Mirrors the admin shell anatomy.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, BookOpenText, Heart, UserRound, Settings2, KeyRound,
  LogOut, ExternalLink, Menu, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Me = { id: string; name: string; penName: string | null; role: string; photoUrl: string | null } | null;

const MENU = [
  { href: "/dashboard", label: "ڈیش بورڈ", icon: LayoutDashboard, tab: undefined },
  { href: "/dashboard?tab=works", label: "میری تحریریں", icon: BookOpenText, tab: "works" },
  { href: "/dashboard?tab=liked", label: "پسندیدہ مواد", icon: Heart, tab: "liked" },
  { href: "/dashboard?tab=profile", label: "اکاؤنٹ سیٹنگز", icon: Settings2, tab: "profile" },
  { href: "/dashboard?tab=security", label: "پاس ورڈ و سیکیورٹی", icon: KeyRound, tab: "security" },
];

export function UserShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d?.id ? d : null))
      .catch(() => setMe(null));
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    if (!pathname.startsWith(base)) return false;
    const q = href.split("?")[1];
    if (!q) return !searchParams.get("tab");
    return searchParams.get("tab") === new URLSearchParams(q).get("tab");
  };

  return (
    <div className="flex min-h-screen bg-secondary/50">
      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-emerald-ink/40 bg-sidebar px-4 py-2.5 text-sidebar-foreground lg:hidden">
        <div className="flex items-center gap-2">
          <LogoMark size={34} />
          <span className="font-nastaliq-tight text-lg text-[#f3ead2]">میری پروفائل</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="مینو" className="text-sidebar-foreground hover:bg-sidebar-accent">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-30 w-64 overflow-y-auto bg-sidebar text-sidebar-foreground nice-scroll transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 border-b border-emerald-ink/40 p-4">
          <LogoMark size={46} />
          <div>
            <p className="font-nastaliq-tight text-xl leading-8 text-[#f3ead2]">پیامِ ادب</p>
            <p className="flex items-center gap-1 text-xs font-naskh text-[#e2c57c]">
              <UserRound className="h-3.5 w-3.5" /> رکنِ ادب
            </p>
          </div>
        </div>

        <nav className="p-3 pb-8">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-naskh transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                  : "text-[#eee9d8]/85 hover:bg-sidebar-accent hover:text-[#f3ead2]"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
          <Link
            href={me ? `/profile/${me.id}` : "/"}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-naskh text-[#eee9d8]/85 hover:bg-sidebar-accent hover:text-[#f3ead2]"
          >
            <UserRound className="h-4 w-4" /> میری عوامی پروفائل
          </Link>

          <div className="mt-2 space-y-0.5 border-t border-emerald-ink/40 pt-4">
            <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-naskh text-[#eee9d8]/85 hover:bg-sidebar-accent">
              <ExternalLink className="h-4 w-4" /> سائٹ دیکھیں
            </Link>
            <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-naskh text-[#f0cfcf] hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4" /> لاگ آؤٹ
            </button>
          </div>

          <div className="mt-8 px-3 text-center">
            <p className="font-nastaliq-tight text-[15px] leading-7 text-[#e2c57c]">ادبی خدمت</p>
            <p className="font-nastaliq-tight text-[15px] leading-7 text-[#e2c57c]">ہم سب کا فرض ہے</p>
            <div className="decor-rule mx-auto mt-3 max-w-[120px] opacity-70">
              <span className="rule-dot" />
              <span className="rule-track"><span className="rule-line" /></span>
              <span className="rule-dot" />
            </div>
          </div>
        </nav>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        {/* top bar — brand + tagline + view site + user (mockup anatomy) */}
        <div className="sticky top-0 z-20 hidden items-center gap-3 border-b border-gold/25 bg-background/95 px-6 py-2.5 backdrop-blur lg:flex">
          <span className="flex items-center gap-2.5">
            <LogoMark size={36} />
            <span className="font-nastaliq-tight text-xl leading-8 text-primary">پیامِ ادب</span>
          </span>
          <p className="hidden min-w-0 flex-1 text-center font-nastaliq-tight text-[15px] text-emerald-deep xl:block">
            اردو ادب، روایت سے نئی نسل تک
          </p>
          <div className="ms-auto flex items-center gap-2.5">
            <Button asChild size="sm" className="gap-2 bg-emerald-ink font-naskh text-[13px] text-[#f3ead2] hover:bg-emerald-deep">
              <Link href="/"><ExternalLink className="h-3.5 w-3.5" /> سائٹ دیکھیں</Link>
            </Button>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 text-primary">
              <Bell className="h-4 w-4" />
            </span>
            <span className="flex items-center gap-2 rounded-full border border-gold/40 px-2.5 py-1">
              {me?.photoUrl ? (
                <img src={me.photoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-deep/10 font-naskh text-xs text-primary">
                  {(me?.penName || me?.name || "؟").trim().charAt(0)}
                </span>
              )}
              <span className="max-w-28 truncate font-naskh text-[13px] text-primary">{me?.penName || (me?.name ?? "…")}</span>
            </span>
          </div>
        </div>

        <main className="flex-1 paper-bg">{children}</main>
      </div>
    </div>
  );
}

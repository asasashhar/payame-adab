"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserShell } from "@/components/site/user-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/site/cards";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  PenLine, Loader2, Eye, EyeOff, MessageSquareWarning, MailWarning, Send,
  UserRound, ShieldCheck, Heart, BookOpenText, RefreshCw, ServerOff,
} from "lucide-react";

type Work = {
  id: string; title: string; status: string; feedback: string | null;
  category: string; views: number; createdAt: string;
};
type Me = {
  id: string; name: string; username?: string | null; penName: string | null; emailVerified?: boolean;
  bio?: string | null; photoUrl?: string | null; socials?: string | null;
} | null;

type Tab = "works" | "profile" | "security" | "liked";

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-secondary/60">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "works";
  const setupMode = searchParams.get("setup") === "1";
  const [me, setMe] = useState<Me>(null);
  const [poems, setPoems] = useState<Work[] | null>(null);
  const [articles, setArticles] = useState<Work[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [resending, setResending] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const router = useRouter();

  // load dashboard data; a failed request (server briefly unreachable,
  // cold start, dropped connection) must show a visible retry state,
  // never an endless spinner
  const load = () => {
    setLoadError(false);
    setMe(null);
    setPoems(null);
    setArticles(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.id) { router.push("/login"); return; }
        setMe(d);
      })
      .catch(() => setLoadError(true));
    Promise.all([
      fetch("/api/poems?mine=1").then((r) => r.json()),
      fetch("/api/articles?mine=1").then((r) => r.json()),
    ])
      .then(([p, a]) => { setPoems(p); setArticles(a); })
      .catch(() => setLoadError(true));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const resendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const d = await res.json();
      if (res.ok) toast({ title: d.message ?? "تصدیقی ای میل بھیج دی گئی" });
      else toast({ title: d.error ?? "ای میل نہیں بھیجی جا سکی", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  if (!me || !poems || !articles) {
    if (loadError) {
      return (
        <UserShell>
          <div className="mx-auto flex h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
            <ServerOff className="mb-4 h-10 w-10 text-gold" />
            <h1 className="font-nastaliq-tight text-2xl leading-10 text-foreground">ڈیٹا لوڈ نہیں ہو سکا</h1>
            <p className="mt-2 text-sm font-naskh leading-7 text-muted-foreground">
              سرور سے رابطہ عارضی طور پر منقطع ہے — براہ کرم دوبارہ کوشش کریں۔
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button onClick={load} size="sm" className="gap-2 bg-[#8a6d1a] font-naskh hover:bg-[#6d5311]">
                <RefreshCw className="h-4 w-4" /> دوبارہ کوشش کریں
              </Button>
              <Button asChild size="sm" variant="outline" className="font-naskh">
                <Link href="/">ہوم صفحہ</Link>
              </Button>
            </div>
          </div>
        </UserShell>
      );
    }
    return (
      <UserShell>
        <div className="flex h-[70vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </UserShell>
    );
  }

  const pending = [...poems, ...articles].filter((w) => w.status === "PENDING").length;

  const WorkRow = ({ w, type }: { w: Work; type: "poem" | "article" }) => (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/25 bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/${type === "poem" ? "poetry" : "articles"}/${w.id}`} className="font-nastaliq-tight text-lg leading-8 hover:text-primary">
            {w.title}
          </Link>
          <StatusBadge status={w.status} />
        </div>
        <p className="mt-0.5 text-[13px] font-naskh text-muted-foreground">
          {w.category} · <span className="font-latin">{new Date(w.createdAt).toLocaleDateString("en-GB")}</span>
          {w.status === "PUBLISHED" && ` · ${w.views} مطالعے`}
        </p>
        {w.feedback && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#fbf5e2] px-3 py-2 text-[13px] leading-6 font-naskh text-[#7a5c14]">
            <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0" /> ادارتی پیغام: {w.feedback}
          </p>
        )}
      </div>
      {(w.status === "DRAFT" || w.status === "REVISION") && (
        <Button asChild size="sm" className="gap-1.5 bg-[#b8860b] font-naskh hover:bg-[#a0760a]">
          <Link href={`/submit?edit=${w.id}&type=${type}`}><PenLine className="h-4 w-4" /> {w.status === "REVISION" ? "اصلاح کریں" : "ترمیم کریں"}</Link>
        </Button>
      )}
      {w.status === "PUBLISHED" && (
        <Button asChild variant="outline" size="sm" className="border-gold/40 font-naskh">
          <Link href={`/${type === "poem" ? "poetry" : "articles"}/${w.id}`}><Eye className="h-4 w-4" /> دیکھیں</Link>
        </Button>
      )}
    </div>
  );

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "works", label: "میری تحریریں", icon: <BookOpenText className="h-4 w-4" /> },
    { key: "profile", label: "پروفائل", icon: <UserRound className="h-4 w-4" /> },
    { key: "security", label: "سیکیورٹی", icon: <ShieldCheck className="h-4 w-4" /> },
    { key: "liked", label: "پسندیدہ", icon: <Heart className="h-4 w-4" /> },
  ];

  return (
    <UserShell>
      {/* banner — mockup "میرا پروفائل" dark literary band */}
      <div className="relative overflow-hidden bg-emerald-ink">
        <img src="/brand/hero-banner.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-ink/85 via-emerald-ink/55 to-emerald-ink/85" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-10 text-center">
          <p className="mb-1 font-naskh text-[13px] text-[#e5dfc9]/85">صفحہ اول &lsaquo; میری پروفائل</p>
          <h1 className="font-nastaliq-tight text-4xl leading-[1.7] text-[#e9c979] drop-shadow-sm md:text-5xl">میرا پروفائل</h1>
          <p className="mt-1 font-nastaliq-tight text-lg text-[#f3ead2]/90">آپ کا ادبی سفر، ہماری نظر میں</p>
          <div className="decor-rule mx-auto mt-3 max-w-[260px] opacity-80">
            <span className="rule-dot" />
            <span className="rule-track"><span className="rule-line" /></span>
            <span className="rule-dot" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-l from-transparent via-gold/70 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
          {setupMode && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#8a6d1a]/40 bg-[#fdf3d7] p-4">
              <div>
                <p className="font-nastaliq-tight text-xl leading-9 text-[#6d5311]">خوش آمدید — یہ آپ کا ڈیش بورڈ ہے</p>
                <p className="mt-1 text-sm font-naskh leading-7 text-[#6d5311]/90">
                  یہاں آپ کی تحریریں اور ان کی حالت نظر آتی ہے، اور «نئی تحریر بھیجیں» سے نئی شاعری یا مضمون بھیج سکتے ہیں — پروفائل مکمل کرنے کے لیے «پروفائل مکمل کریں» پر کلک کریں: تصویر، یوزر نیم اور تعارف۔
                </p>
              </div>
              <Button onClick={() => setTab("profile")} size="sm" className="gap-2 bg-[#8a6d1a] font-naskh hover:bg-[#6d5311]">
                <UserRound className="h-4 w-4" /> پروفائل مکمل کریں
              </Button>
            </div>
          )}
          {/* profile summary card — mockup avatar card */}
          <div className="manuscript-frame mb-6 flex flex-wrap items-center gap-5 rounded-xl bg-card p-5">
            {me.photoUrl ? (
              <img src={me.photoUrl} alt={me.name} className="h-20 w-20 rounded-full border-2 border-gold/60 object-cover shadow-md" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/60 bg-secondary font-nastaliq-tight text-3xl text-primary shadow-md">
                {(me.penName || me.name).trim().charAt(0)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-nastaliq-tight text-2xl leading-9 text-foreground">{me.penName || me.name}</h2>
              <p className="text-sm font-naskh text-muted-foreground">
                {me.name}{me.penName ? ` — قلمی نام: ${me.penName}` : ""}{me.username ? <span className="font-latin" dir="ltr"> · @{me.username}</span> : null}
              </p>
              {me.bio && <p className="mt-1 line-clamp-2 text-[13px] font-naskh leading-6 text-foreground/70">{me.bio}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full bg-emerald-deep/10 px-3 py-1 text-xs font-naskh font-semibold text-emerald-deep">ادبی رکن</span>
              <Link href={`/profile/${me.id}`} className="text-xs font-naskh text-gold hover:text-primary">عوامی پروفائل دیکھیں ←</Link>
            </div>
          </div>

          <SectionHeading
            title="میرا ڈیش بورڈ"
            subtitle={`${me.penName || me.name} کی تحریریں اور ان کی حالت`}
            href={`/profile/${me.id}`}
            linkLabel="میری عوامی پروفائل"
          />

          {me.emailVerified === false && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#8a6d1a]/40 bg-[#fdf3d7] p-4">
              <p className="flex items-start gap-2 text-sm font-naskh leading-7 text-[#6d5311]">
                <MailWarning className="mt-1 h-5 w-5 shrink-0" />
                آپ کی ای میل ابھی تصدیق شدہ نہیں۔ تصدیق کے بعد آپ نئی تحریریں بھیج سکیں گے۔ تصدیقی ای میل اپنے ان باکس (یا اسپام فولڈر) میں دیکھیں۔
              </p>
              <Button onClick={resendVerification} disabled={resending} size="sm" className="gap-2 bg-[#8a6d1a] font-naskh hover:bg-[#6d5311]">
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} تصدیقی ای میل دوبارہ بھیجیں
              </Button>
            </div>
          )}

          <div className="mb-8 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            <div className="manuscript-frame rounded-xl bg-gradient-to-bl from-[#0e5c38] to-[#06422a] p-5 text-[#f3ead2] shadow-sm">
              <p className="font-latin text-3xl font-bold">{poems.length + articles.length}</p>
              <p className="mt-1 font-naskh text-sm text-[#e5dfc9]/85">مجموعی تحریریں</p>
            </div>
            <div className="manuscript-frame rounded-xl bg-gradient-to-bl from-[#2a4d8f] to-[#173b70] p-5 text-[#e8eef8] shadow-sm">
              <p className="font-latin text-3xl font-bold">{poems.length}</p>
              <p className="mt-1 font-naskh text-sm text-[#dce6f5]/85">شاعری</p>
            </div>
            <div className="manuscript-frame rounded-xl bg-gradient-to-bl from-[#6d3fa0] to-[#4c2b74] p-5 text-[#efe8fa] shadow-sm">
              <p className="font-latin text-3xl font-bold">{articles.length}</p>
              <p className="mt-1 font-naskh text-sm text-[#e5dcf5]/85">مضامین</p>
            </div>
            <div className="manuscript-frame rounded-xl bg-gradient-to-bl from-[#8a6d1a] to-[#6d5311] p-5 text-[#f8f1e7] shadow-sm">
              <p className="font-latin text-3xl font-bold">{pending}</p>
              <p className="mt-1 font-naskh text-sm text-[#f3ead2]/85">زیرِ جائزہ</p>
            </div>
          </div>

          {/* ---- tabs ---- */}
          <div className="mb-6 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 font-naskh text-[14px] transition-colors ${
                  tab === t.key
                    ? "border-emerald-deep bg-emerald-deep text-[#f3ead2]"
                    : "border-gold/40 bg-card text-primary hover:bg-accent"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {tab === "works" && (
            <>
              <div className="mb-6 text-center">
                <Button asChild className="gap-2 bg-primary font-naskh text-[15px] hover:bg-emerald-deep">
                  <Link href="/submit"><PenLine className="h-4.5 w-4.5" /> نئی تحریر بھیجیں</Link>
                </Button>
              </div>
              <section className="mb-8">
                <h2 className="mb-4 font-nastaliq-tight text-2xl text-primary">شاعری</h2>
                {poems.length === 0 ? (
                  <SkeletonRow label="ابھی کوئی شاعری بھیجی نہیں گئی" />
                ) : (
                  <div className="space-y-3">{poems.map((p) => <WorkRow key={p.id} w={p} type="poem" />)}</div>
                )}
              </section>
              <section className="mb-8">
                <h2 className="mb-4 font-nastaliq-tight text-2xl text-primary">مضامین</h2>
                {articles.length === 0 ? (
                  <SkeletonRow label="ابھی کوئی مضمون بھیجا نہیں گیا" />
                ) : (
                  <div className="space-y-3">{articles.map((a) => <WorkRow key={a.id} w={a} type="article" />)}</div>
                )}
              </section>
            </>
          )}

          {tab === "profile" && <ProfileTab me={me} onSaved={(m) => setMe(m)} />}
          {tab === "security" && <SecurityTab />}
          {tab === "liked" && <LikedTab />}
      </div>
    </UserShell>
  );
}

/* ---------------- profile tab ---------------- */
function ProfileTab({ me, onSaved }: { me: NonNullable<Me>; onSaved: (m: Me) => void }) {
  const [form, setForm] = useState({ name: me.name, username: me.username ?? "", penName: me.penName ?? "", bio: me.bio ?? "", socials: me.socials ?? "" });
  const [photoUrl, setPhotoUrl] = useState(me.photoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) setPhotoUrl(data.url);
      else toast({ title: "تصویر اپلوڈ نہیں ہو سکی", description: data.error, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "محفوظ نہیں ہو سکا", description: data.error, variant: "destructive" });
        return;
      }
      onSaved(data);
      toast({ title: "پروفائل محفوظ ہو گئی" });
      router.refresh();
    } catch {
      toast({ title: "محفوظ نہیں ہو سکا", description: "سرور سے رابطہ ناکام — دوبارہ کوشش کریں", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="manuscript-frame space-y-5 rounded-xl bg-card p-6 md:p-8">
      <h2 className="font-nastaliq-tight text-xl text-primary">پروفائل کی ترتیبات</h2>
      <div className="flex flex-wrap items-center gap-4">
        {photoUrl ? (
          <img src={photoUrl} alt="پروفائل" className="h-20 w-20 rounded-full border-2 border-gold/50 object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-gold/40 bg-accent/50 font-nastaliq-tight text-2xl text-primary">
            {form.name?.[0] ?? "؟"}
          </div>
        )}
        <div>
          <Label className="mb-1.5 block font-naskh text-[14px]">پروفائل تصویر</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }}
            className="block cursor-pointer rounded-md border border-input bg-card px-3 py-2 text-sm font-naskh text-muted-foreground file:me-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:font-naskh file:text-foreground"
          />
          {uploading && <p className="mt-1 flex items-center gap-1.5 text-xs font-naskh text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> اپلوڈ ہو رہی ہے…</p>}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="font-naskh text-[15px]">اصل نام</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 font-naskh" />
        </div>
        <div className="space-y-2">
          <Label className="font-naskh text-[15px]">قلمی نام (تخلص)</Label>
          <Input value={form.penName} onChange={(e) => setForm({ ...form, penName: e.target.value })} className="h-11 font-nastaliq-tight text-lg" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="font-naskh text-[15px]">یوزر نیم (عوامی پہچان)</Label>
        <Input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          dir="ltr"
          className="h-11 text-left font-latin"
          placeholder="e.g. ahmad.writer"
        />
        <p className="text-xs font-naskh text-muted-foreground">انگریزی حروف، عدد، نقطہ یا _ — 3 سے 20 حروف۔ یہی آپ کے عوامی پروفائل کی پہچان بنے گا۔</p>
      </div>
      <div className="space-y-2">
        <Label className="font-naskh text-[15px]">تعارف (سوانح)</Label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-input bg-card px-3 py-2 font-naskh leading-7 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          placeholder="اپنے ادبی تعارف کے چند جملے…"
        />
      </div>
      <div className="space-y-2">
        <Label className="font-naskh text-[15px]">سوشل میڈیا روابط</Label>
        <textarea
          value={form.socials}
          onChange={(e) => setForm({ ...form, socials: e.target.value })}
          rows={3}
          dir="ltr"
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-left font-latin text-sm leading-7 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          placeholder={"https://facebook.com/…\nhttps://instagram.com/…\nhttps://youtube.com/…"}
        />
        <p className="text-xs font-naskh text-muted-foreground">ہر لنک ایک سطر میں لکھیں — یہ روابط آپ کی عوامی پروفائل پر دکھائے جائیں گے۔</p>
      </div>
      <Button type="submit" disabled={busy} className="h-11 w-full bg-primary font-naskh text-[15px] hover:bg-emerald-deep md:w-auto">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} پروفائل محفوظ کریں
      </Button>
    </form>
  );
}

/* ---------------- security tab ---------------- */
function SecurityTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
      toast({ title: "پاس ورڈ کمزور ہے", description: "کم از کم 8 حروف، ایک حرف اور ایک عدد ضروری ہے", variant: "destructive" });
      return;
    }
    if (next !== confirm) {
      toast({ title: "پاس ورڈ مطابقت نہیں رکھتے", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "پاس ورڈ تبدیل نہیں ہو سکا", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "پاس ورڈ تبدیل ہو گیا", description: "تصدیقی ای میل بھی بھیج دی گئی ہے" });
      setCurrent(""); setNext(""); setConfirm("");
    } catch {
      toast({ title: "پاس ورڈ تبدیل نہیں ہو سکا", description: "سرور سے رابطہ ناکام — دوبارہ کوشش کریں", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="manuscript-frame space-y-5 rounded-xl bg-card p-6 md:p-8">
      <h2 className="font-nastaliq-tight text-xl text-primary">پاس ورڈ تبدیل کریں</h2>
      <div className="space-y-2">
        <Label className="font-naskh text-[15px]">موجودہ پاس ورڈ</Label>
        <Input required type={show ? "text" : "password"} dir="ltr" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-11 text-left font-latin" />
      </div>
      <div className="space-y-2">
        <Label className="font-naskh text-[15px]">نیا پاس ورڈ</Label>
        <div className="relative">
          <Input required type={show ? "text" : "password"} dir="ltr" value={next} onChange={(e) => setNext(e.target.value)} className="h-11 pe-11 text-left font-latin" />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label="پاس ورڈ دکھائیں/چھپائیں" className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
        <p className="text-xs font-naskh text-muted-foreground">کم از کم 8 حروف، ایک حرف اور ایک عدد۔</p>
      </div>
      <div className="space-y-2">
        <Label className="font-naskh text-[15px]">نئے پاس ورڈ کی تصدیق</Label>
        <Input required type={show ? "text" : "password"} dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`h-11 text-left font-latin ${confirm && confirm !== next ? "border-destructive" : ""}`} />
      </div>
      <Button type="submit" disabled={busy} className="h-11 w-full bg-primary font-naskh text-[15px] hover:bg-emerald-deep md:w-auto">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} پاس ورڈ تبدیل کریں
      </Button>
    </form>
  );
}

/* ---------------- liked tab ---------------- */
function LikedTab() {
  const [data, setData] = useState<{ poems: Work[]; articles: Work[] } | null>(null);

  useEffect(() => {
    fetch("/api/likes?mine=1")
      .then((r) => r.json())
      .then((d) => (d?.error ? setData({ poems: [], articles: [] }) : setData(d)))
      .catch(() => setData({ poems: [], articles: [] }));
  }, []);

  if (!data) return <Skeleton className="h-40 w-full" />;
  const total = data.poems.length + data.articles.length;

  return (
    <div className="manuscript-frame rounded-xl bg-card p-6 md:p-8">
      <h2 className="mb-4 font-nastaliq-tight text-xl text-primary">میری پسندیدہ تحریریں</h2>
      {total === 0 ? (
        <SkeletonRow label="ابھی کسی تحریر کو پسند نہیں کیا گیا — شاعری یا مضمون پڑھ کر ❤️ پر کلک کریں" />
      ) : (
        <div className="space-y-6">
          {data.poems.length > 0 && (
            <section>
              <h3 className="mb-3 font-nastaliq-tight text-lg text-[#8a6d1a]">شاعری</h3>
              <div className="space-y-2">
                {data.poems.map((p) => (
                  <Link key={p.id} href={`/poetry/${p.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-gold/25 bg-accent/30 px-4 py-2.5 font-nastaliq-tight text-lg leading-8 hover:border-gold/50">
                    <span>{p.title}</span>
                    <span className="shrink-0 font-naskh text-xs text-muted-foreground">{p.category} · <Heart className="inline h-3.5 w-3.5" /> {p.views}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {data.articles.length > 0 && (
            <section>
              <h3 className="mb-3 font-nastaliq-tight text-lg text-[#8a6d1a]">مضامین</h3>
              <div className="space-y-2">
                {data.articles.map((a) => (
                  <Link key={a.id} href={`/articles/${a.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-gold/25 bg-accent/30 px-4 py-2.5 font-nastaliq-tight text-lg leading-8 hover:border-gold/50">
                    <span>{a.title}</span>
                    <span className="shrink-0 font-naskh text-xs text-muted-foreground">{a.category} · <Eye className="inline h-3.5 w-3.5" /> {a.views}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonRow({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gold/40 bg-card p-8 text-center font-naskh text-sm text-muted-foreground">
      {label}
    </div>
  );
}

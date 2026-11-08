"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, Share2, Link2, ToggleLeft, Tags, Search, DatabaseBackup, Download, Trash2, FilePlus2 } from "lucide-react";

const FIELDS: { key: string; label: string; type?: "text" | "textarea"; full?: boolean }[] = [
  { key: "siteName", label: "سائٹ کا نام (اردو)" },
  { key: "siteNameEn", label: "سائٹ کا نام (انگریزی)" },
  { key: "tagline", label: "ٹیگ لائن", full: true },
  { key: "heroTitle", label: "ہیرو کی سرخی", full: true },
  { key: "heroSubtitle", label: "ہیرو کی تعریف", type: "textarea", full: true },
  { key: "contactEmail", label: "رابطہ ای میل" },
  { key: "contactPhone", label: "رابطہ فون" },
  { key: "aboutText", label: "ہمارا تعارف", type: "textarea", full: true },
  { key: "submissionGuidelines", label: "تحریر بھیجنے کی ہدایات", type: "textarea", full: true },
  { key: "footerNote", label: "فوٹر نوٹ", full: true },
];

const SEO_FIELDS: { key: string; label: string; type?: "text" | "textarea" }[] = [
  { key: "seoTitle", label: "SEO عنوان (براؤزر ٹیب و گوگل)" },
  { key: "seoKeywords", label: "SEO مطلوبہ الفاظ (کاما سے الگ)" },
  { key: "seoDescription", label: "SEO تعریف (155 حروف بہترین)", type: "textarea" },
];

const CATEGORY_GROUPS: { key: string; label: string }[] = [
  { key: "poemCategories", label: "شاعری کی اصناف" },
  { key: "articleCategories", label: "مضامین کی اصناف" },
  { key: "bookCategories", label: "کتب کے شعبے" },
  { key: "newsCategories", label: "خبروں کی اقسام" },
];

const FEATURE_TOGGLES: { key: string; label: string; hint?: string }[] = [
  { key: "showViewCounts", label: "مشاہدات کی گنتی عوامی سائٹ پر دکھائیں" },
  { key: "showLikeCounts", label: "پسندیدگی کی گنتی دکھائیں" },
  { key: "commentsEnabled", label: "تبصرے فعال رکھیں" },
  { key: "commentsGuests", label: "مہمان قارئین تبصرہ کر سکیں" },
  { key: "likesEnabled", label: "پسندیدگی کا بٹن فعال رکھیں" },
  { key: "likesGuests", label: "مہمان قارئین پسند کر سکیں" },
];

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [social, setSocial] = useState<{ platform: string; url: string }[]>([]);
  const [pages, setPages] = useState<{ slug: string; title: string; content: string; visible: boolean }[]>([]);
  const [backups, setBackups] = useState<{ name: string; size: number; createdAt: string }[]>([]);
  const [bkBusy, setBkBusy] = useState(false);

  const loadBackups = async () => {
    const res = await fetch("/api/backup");
    if (res.ok) {
      const d = await res.json();
      setBackups(d.backups ?? []);
    }
  };

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      setValues(d);
      try { setSocial(JSON.parse(d.socialLinks ?? "[]")); } catch { setSocial([]); }
      try {
        const p = JSON.parse(d.customPages ?? "[]");
        if (Array.isArray(p)) setPages(p);
      } catch { setPages([]); }
    });
    loadBackups();
  }, []);

  const createBackup = async () => {
    setBkBusy(true);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const d = await res.json();
      if (res.ok) toast({ title: "بیک اپ بن گیا", description: d.name });
      else toast({ title: "بیک اپ نہیں بنا", description: d.error, variant: "destructive" });
      loadBackups();
    } finally {
      setBkBusy(false);
    }
  };

  const deleteBackup = async (name: string) => {
    const res = await fetch(`/api/backup?file=${encodeURIComponent(name)}`, { method: "DELETE" });
    if (res.ok) toast({ title: "بیک اپ حذف ہو گیا" });
    else toast({ title: "حذف نہیں ہوا", variant: "destructive" });
    loadBackups();
  };

  const save = async () => {
    if (!values) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, socialLinks: JSON.stringify(social), customPages: JSON.stringify(pages) }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast({ title: "محفوظ نہیں ہوا", description: d.error, variant: "destructive" });
        return;
      }
      toast({ title: "ترتیبات محفوظ ہو گئیں", description: "تبدیلیاں عوامی سائٹ پر لاگو ہو گئیں۔" });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: string) => setValues((v) => (v ? { ...v, [key]: value } : v));

  const toggle = (key: string) => {
    if (!values) return;
    set(key, values[key] === "0" ? "1" : "0");
  };

  return (
    <div>
      <AdminPageHeader
        title="سائٹ کی ترتیبات"
        subtitle="برانڈنگ، SEO، سوشل لنکس، فیچرز، اقسام اور ادارتی متن — تبدیلیاں فوراً عوامی سائٹ پر"
        action={
          <Button onClick={save} disabled={saving || !values} className="gap-2 bg-primary font-naskh hover:bg-emerald-deep">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} سب محفوظ کریں
          </Button>
        }
      />

      {!values ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-6">
          {/* general */}
          <section className="rounded-xl border border-gold/25 bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-nastaliq-tight text-xl text-primary"><Globe className="h-5 w-5 text-gold" /> عمومی</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className={`space-y-2 ${f.full ? "sm:col-span-2" : ""}`}>
                  <Label className="font-naskh">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      value={values[f.key] ?? ""}
                      onChange={(e) => set(f.key, e.target.value)}
                      rows={4}
                      className="font-nastaliq text-base leading-[2.2]"
                    />
                  ) : (
                    <Input value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className="font-naskh" />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* SEO */}
          <section className="rounded-xl border border-gold/25 bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-nastaliq-tight text-xl text-primary"><Search className="h-5 w-5 text-gold" /> SEO اور میٹا ڈیٹا</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {SEO_FIELDS.map((f) => (
                <div key={f.key} className={`space-y-2 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                  <Label className="font-naskh">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} rows={3} className="font-naskh leading-7" />
                  ) : (
                    <Input value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className="font-naskh" />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-naskh text-muted-foreground">
              سوشل شیئرنگ کے لیے OG امیج برانڈ فولڈر میں پہلے سے نصب ہے (/brand/og-image.jpg)۔
            </p>
          </section>

          {/* features */}
          <section className="rounded-xl border border-gold/25 bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-nastaliq-tight text-xl text-primary"><ToggleLeft className="h-5 w-5 text-gold" /> فیچرز اور قارئین کی اجازتیں</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURE_TOGGLES.map((t) => (
                <label key={t.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gold/30 bg-accent/40 px-4 py-3">
                  <span className="font-naskh text-sm">{t.label}</span>
                  <input type="checkbox" checked={values[t.key] !== "0"} onChange={() => toggle(t.key)} className="h-4 w-4" />
                </label>
              ))}
            </div>
          </section>

          {/* categories */}
          <section className="rounded-xl border border-gold/25 bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-nastaliq-tight text-xl text-primary"><Tags className="h-5 w-5 text-gold" /> اقسام کا انتظام</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {CATEGORY_GROUPS.map((g) => (
                <div key={g.key} className="space-y-2">
                  <Label className="font-naskh">{g.label} (کاما سے الگ کریں)</Label>
                  <Textarea value={values[g.key] ?? ""} onChange={(e) => set(g.key, e.target.value)} rows={3} className="font-naskh leading-7" />
                </div>
              ))}
            </div>
          </section>

          {/* social + nav */}
          <section className="rounded-xl border border-gold/25 bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-nastaliq-tight text-xl text-primary"><Share2 className="h-5 w-5 text-gold" /> سوشل میڈیا لنکس</h2>
            <div className="space-y-2">
              {social.map((s2, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    value={s2.platform}
                    onChange={(e) => setSocial(social.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)))}
                    placeholder="پلیٹ فارم (Facebook/YouTube…)"
                    className="w-48 font-naskh"
                  />
                  <Input
                    value={s2.url}
                    onChange={(e) => setSocial(social.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                    placeholder="https://…"
                    dir="ltr"
                    className="flex-1 font-latin text-sm"
                  />
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-[#fbe4e4]" onClick={() => setSocial(social.filter((_, j) => j !== i))}>
                    حذف
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1.5 border-gold/40 font-naskh" onClick={() => setSocial([...social, { platform: "", url: "" }])}>
                <Link2 className="h-4 w-4" /> نیا لنک شامل کریں
              </Button>
            </div>
          </section>

          {/* custom pages (spec Part 2.4) */}
          <section className="rounded-xl border border-gold/25 bg-card p-6">
            <h2 className="mb-1 flex items-center gap-2 font-nastaliq-tight text-xl text-primary"><FilePlus2 className="h-5 w-5 text-gold" /> صفحات کا انتظام — نئے صفحے بنائیں</h2>
            <p className="mb-4 font-naskh text-xs leading-6 text-muted-foreground">
              یہاں بنائے گئے صفحے /p/<span dir="ltr">slug</span> پر عام قارئین کے لیے کھل جاتے ہیں۔ لنک نیویگیشن مینو میں «نیا لنک شامل کریں» سے لگائیں۔
            </p>
            <div className="space-y-3">
              {pages.length === 0 && (
                <p className="font-naskh text-sm text-muted-foreground">ابھی کوئی اضافی صفحہ نہیں بنا۔</p>
              )}
              {pages.map((p, i) => (
                <div key={i} className="rounded-lg border border-gold/30 bg-accent/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={p.title}
                      onChange={(e) => setPages(pages.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                      placeholder="صفحے کا عنوان"
                      className="w-56 font-naskh"
                    />
                    <div className="flex items-center gap-1 rounded-md border border-gold/40 bg-card px-2" dir="ltr">
                      <span className="font-latin text-xs text-muted-foreground">/p/</span>
                      <Input
                        value={p.slug}
                        onChange={(e) => setPages(pages.map((x, j) => (j === i ? { ...x, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") } : x)))}
                        placeholder="my-page"
                        className="h-9 w-36 border-0 font-latin text-sm shadow-none focus-visible:ring-0"
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5 font-naskh text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={p.visible}
                        onChange={(e) => setPages(pages.map((x, j) => (j === i ? { ...x, visible: e.target.checked } : x)))}
                        className="h-4 w-4 accent-brand"
                      />
                      نظر آئے
                    </label>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-[#fbe4e4]" onClick={() => setPages(pages.filter((_, j) => j !== i))}>
                      حذف
                    </Button>
                  </div>
                  <textarea
                    value={p.content}
                    onChange={(e) => setPages(pages.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))}
                    rows={4}
                    className="mt-2 w-full rounded-md border border-input bg-card px-3 py-2 font-naskh leading-7 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="صفحے کا مواد یہاں لکھیں (خالی سطر = نیا پیراگراف)…"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-gold/40 font-naskh"
                onClick={() => setPages([...pages, { slug: `page-${pages.length + 1}`, title: "نیا صفحہ", content: "", visible: true }])}
              >
                <FilePlus2 className="h-4 w-4" /> نیا صفحہ شامل کریں
              </Button>
            </div>
          </section>

          {/* backups */}
          <section className="rounded-xl border border-gold/25 bg-card p-6">
            <h2 className="mb-1 flex items-center gap-2 font-nastaliq-tight text-xl text-primary"><DatabaseBackup className="h-5 w-5 text-gold" /> ڈیٹا بیس بیک اپ</h2>
            <p className="mb-4 font-naskh text-xs leading-6 text-muted-foreground">
              سروِر ہر روز خودکار بیک اپ بھی بناتا ہے (تازہ 14 محفوظ رہتے ہیں)۔ کسی بھی وقت دستی بیک اپ بنائیں اور ڈاؤن لوڈ کر کے محفوظ رکھیں —
              بیک اپ میں صارفین، تحریریں، کتب، ترتیبات — سب کچھ شامل ہوتا ہے۔
            </p>
            <Button onClick={createBackup} disabled={bkBusy} className="gap-2 bg-primary font-naskh hover:bg-emerald-deep">
              {bkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />} ابھی بیک اپ بنائیں
            </Button>
            <div className="mt-4 space-y-2">
              {backups.length === 0 ? (
                <p className="font-naskh text-sm text-muted-foreground">ابھی کوئی بیک اپ موجود نہیں۔</p>
              ) : (
                backups.map((b) => (
                  <div key={b.name} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/25 bg-accent/30 px-4 py-2.5">
                    <div>
                      <p className="font-latin text-xs" dir="ltr">{b.name}</p>
                      <p className="font-latin text-[10px] text-muted-foreground" dir="ltr">
                        {(b.size / 1024).toFixed(0)} KB · {new Date(b.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`/api/backup?file=${encodeURIComponent(b.name)}`}
                        download={b.name}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gold/40 px-3 font-naskh text-xs hover:bg-accent"
                      >
                        <Download className="h-3 w-3" /> ڈاؤن لوڈ
                      </a>
                      <Button size="sm" variant="outline" className="h-8 border-destructive/30 px-2 text-destructive hover:bg-[#fbe4e4]" onClick={() => deleteBackup(b.name)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

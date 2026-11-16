"use client";

import { useState } from "react";
import { LogoMark } from "@/components/site/logo";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquareHeart, Send } from "lucide-react";

/**
 * Complaints & Suggestions (spec Part 22): a public inbox into the editors.
 * Types: complaint / suggestion / website issue / content feedback /
 * error report / other. Name and email are optional; the Admin reviews
 * every submission in the dashboard inbox with a status lifecycle.
 */

const KINDS = [
  { value: "SUGGESTION", ur: "تجویز", en: "Suggestion" },
  { value: "COMPLAINT", ur: "شکایت", en: "Complaint" },
  { value: "WEBSITE_ISSUE", ur: "سائٹ کا مسئلہ", en: "Website Issue" },
  { value: "CONTENT_FEEDBACK", ur: "مواد پر رائے", en: "Content Feedback" },
  { value: "ERROR_REPORT", ur: "کسی غلطی کی رپورٹ", en: "Report an Error" },
  { value: "OTHER", ur: "دیگر", en: "Other" },
];

export default function FeedbackPage() {
  const [form, setForm] = useState({ kind: "SUGGESTION", name: "", email: "", subject: "", message: "", pageUrl: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "پیغام بھیجا نہیں جا سکا");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="paper-bg min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <div className="mb-6 text-center">
          <LogoMark size={64} className="mx-auto mb-3 shadow-md" />
          <h1 className="font-nastaliq-tight text-3xl leading-[1.9] text-emerald-ink">شکایات اور تجاویز</h1>
          <p className="mt-1 font-naskh text-[15px] text-muted-foreground">
            آپ کی رائے ہمارے لیے اہم ہے — شکایت، تجویز، سائٹ کا مسئلہ یا کسی غلطی کی رپورٹ براہِ راست ایڈیٹرز تک پہنچتی ہے۔
          </p>
        </div>

        <div className="manuscript-frame rounded-2xl bg-card p-6 sm:p-8">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e3f0e6]">
                <MessageSquareHeart className="h-7 w-7 text-[#2f6d46]" />
              </span>
              <h2 className="font-nastaliq-tight text-2xl leading-[1.9] text-emerald-ink">آپ کا پیغام موصول ہو گیا</h2>
              <p className="max-w-md font-naskh text-[14px] leading-8 text-muted-foreground">
                ادارتی ٹیم جلد ممکنہ طور پر اس کا جائزہ لے گی۔ اگر آپ نے ای میل دیا ہے تو ہم وہاں رابطہ کر سکتے ہیں۔
              </p>
              <Button onClick={() => { setDone(false); setForm({ kind: "SUGGESTION", name: "", email: "", subject: "", message: "", pageUrl: "" }); }} variant="outline" className="font-naskh">
                نیا پیغام
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-latin text-[14px]" dir="ltr">Type / قسم</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {KINDS.map((k) => (
                    <label
                      key={k.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${
                        form.kind === k.value ? "border-primary bg-accent" : "border-gold/25 bg-accent/30"
                      }`}
                    >
                      <input type="radio" name="kind" className="h-3.5 w-3.5" checked={form.kind === k.value} onChange={() => setForm((f) => ({ ...f, kind: k.value }))} />
                      <span className="min-w-0">
                        <span className="block truncate font-naskh text-[13px] font-semibold leading-5">{k.ur}</span>
                        <span className="block truncate font-latin text-[10px] text-muted-foreground" dir="ltr">{k.en}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="font-latin text-[14px]" dir="ltr">Name (optional) / نام</Label>
                  <Input value={form.name} onChange={set("name")} className="h-11 font-naskh" maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-latin text-[14px]" dir="ltr">Email (optional) / ای میل</Label>
                  <Input type="email" dir="ltr" value={form.email} onChange={set("email")} className="h-11 text-left font-latin" placeholder="you@gmail.com" maxLength={200} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-latin text-[14px]" dir="ltr">Subject * / موضوع</Label>
                <Input required value={form.subject} onChange={set("subject")} className="h-11 font-naskh" maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label className="font-latin text-[14px]" dir="ltr">Related page (optional) / متعلقہ صفحہ</Label>
                <Input dir="ltr" value={form.pageUrl} onChange={set("pageUrl")} className="h-11 text-left font-latin" placeholder="/poetry/…" maxLength={500} />
              </div>
              <div className="space-y-1.5">
                <Label className="font-latin text-[14px]" dir="ltr">Message * / پیغام</Label>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={set("message")}
                  maxLength={5000}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 font-naskh leading-7 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder="اپنی بات تفصیل سے لکھیں…"
                />
              </div>
              {error && <p className="rounded-lg bg-destructive/10 px-4 py-2.5 font-naskh text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="h-12 w-full gap-2 bg-primary font-naskh text-[15px] hover:bg-emerald-deep">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {busy ? "بھیجا جا رہا ہے…" : "پیغام بھیجیں"}
              </Button>
              <p className="text-center font-naskh text-xs leading-6 text-muted-foreground">
                نجی معلومات صرف ادارتی جائزے کے لیے محفوظ کی جاتی ہیں۔
              </p>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

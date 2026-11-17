"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Phone, Send } from "lucide-react";

/**
 * Contact page (spec Part 21): working contact form wired to the same admin
 * inbox as Complaints & Suggestions, plus the site's verified contact details.
 */
export function ContactForm({ contactEmail, contactPhone }: { contactEmail: string; contactPhone: string }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", kind: "OTHER" });
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

  const CATEGORY = [
    { value: "OTHER", ur: "عام رابطہ" },
    { value: "SUGGESTION", ur: "تجویز" },
    { value: "COMPLAINT", ur: "شکایت" },
    { value: "WEBSITE_ISSUE", ur: "سائٹ کا مسئلہ" },
    { value: "CONTENT_FEEDBACK", ur: "مواد پر رائے" },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="manuscript-frame rounded-2xl bg-card p-6 sm:p-8">
            {done ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e3f0e6]">
                  <Mail className="h-7 w-7 text-[#2f6d46]" />
                </span>
                <h2 className="font-nastaliq-tight text-2xl leading-[1.9] text-emerald-ink">پیغام موصول ہو گیا</h2>
                <p className="max-w-sm font-naskh text-[14px] leading-8 text-muted-foreground">
                  ادارتی ٹیم کو آپ کا پیغام مل گیا ہے۔ اگر آپ نے ای میل دیا ہے تو ہم وہاں جواب دینے کی کوشش کریں گے۔
                </p>
                <Button onClick={() => { setDone(false); setForm({ name: "", email: "", subject: "", message: "", kind: "OTHER" }); }} variant="outline" className="font-naskh">
                  نیا پیغام
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="font-latin text-[14px]" dir="ltr">Name * / نام</Label>
                    <Input required value={form.name} onChange={set("name")} className="h-11 font-naskh" maxLength={120} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-latin text-[14px]" dir="ltr">Email * / ای میل</Label>
                    <Input required type="email" dir="ltr" value={form.email} onChange={set("email")} className="h-11 text-left font-latin" placeholder="you@gmail.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-latin text-[14px]" dir="ltr">Category / قسم</Label>
                  <select value={form.kind} onChange={set("kind")} className="h-11 w-full rounded-md border border-input bg-card px-3 font-naskh text-foreground">
                    {CATEGORY.map((c) => <option key={c.value} value={c.value}>{c.ur}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-latin text-[14px]" dir="ltr">Subject * / موضوع</Label>
                  <Input required value={form.subject} onChange={set("subject")} className="h-11 font-naskh" maxLength={200} />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-latin text-[14px]" dir="ltr">Message * / پیغام</Label>
                  <textarea
                    required rows={6} value={form.message} onChange={set("message")} maxLength={5000}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 font-naskh leading-7 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="اپنا پیغام لکھیں…"
                  />
                </div>
                {error && <p className="rounded-lg bg-destructive/10 px-4 py-2.5 font-naskh text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={busy} className="h-12 w-full gap-2 bg-primary font-naskh text-[15px] hover:bg-emerald-deep">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {busy ? "بھیجا جا رہا ہے…" : "پیغام بھیجیں"}
                </Button>
              </form>
            )}
          </div>

          <aside className="space-y-4">
            <div className="manuscript-frame rounded-2xl bg-card p-6">
              <h2 className="font-nastaliq-tight text-xl leading-[1.9] text-emerald-ink">رابطہ معلومات</h2>
              <div className="mt-3 space-y-3 font-naskh text-[14px] leading-7 text-foreground">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-gold" />
                  <a href={`mailto:${contactEmail}`} className="font-latin text-[13px] hover:underline" dir="ltr">{contactEmail}</a>
                </p>
                {contactPhone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-gold" />
                    <a href={`tel:${contactPhone}`} className="font-latin text-[13px] hover:underline" dir="ltr">{contactPhone}</a>
                  </p>
                )}
                <p className="text-[13px] leading-7 text-muted-foreground">
                  ادارتی مراسلات کے لیے ای میل سب سے تیز ذریعہ ہے۔ تحریریں بھیجنے کے لیے{" "}
                  <Link href="/submit" className="font-semibold text-primary underline">اپنی تحریر بھیجیں</Link> صفحہ استعمال کریں۔
                </p>
              </div>
            </div>
            <div className="manuscript-frame rounded-2xl bg-card p-6">
              <h2 className="font-nastaliq-tight text-xl leading-[1.9] text-emerald-ink">ایڈمن لاگ اِن</h2>
              <p className="mt-2 font-naskh text-[13px] leading-7 text-muted-foreground">
                ادارتی ٹیم کے افراد کے لیے علیحدہ{" "}
                <Link href="/login" className="font-semibold text-primary underline">ایڈمن لاگ اِن</Link>{" "}
                صفحہ موجود ہے۔
              </p>
            </div>
          </aside>
        </div>
  );
}

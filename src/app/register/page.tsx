"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/** Mirrors the backend rule: 8+ chars, at least one letter and one digit. */
function strengthProblem(pw: string): string | null {
  if (pw.length < 8) return "کم از کم 8 حروف";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "کم از کم ایک حرف اور ایک عدد";
  return null;
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", penName: "", email: "", password: "", confirm: "", bio: "" });
  const [showPass, setShowPass] = useState(false);
  const [agree, setAgree] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const strength = form.password ? strengthProblem(form.password) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength) {
      toast({ title: "پاس ورڈ کمزور ہے", description: `پاس ورڈ میں ${strength} ضروری ہے`, variant: "destructive" });
      return;
    }
    if (form.password !== form.confirm) {
      toast({ title: "پاس ورڈ مطابقت نہیں رکھتے", description: "پاس ورڈ اور اس کی تصدیق ایک جیسے ہونی چاہئیں", variant: "destructive" });
      return;
    }
    if (!agree) {
      toast({ title: "شرائط کی تصدیق ضروری ہے", description: "براہ کرم اصطلاحات و ضوابط اور تحریری رہنمائی سے اتفاق کریں", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "رجسٹریشن ناکام", description: data.error, variant: "destructive" });
        return;
      }
      // optional profile photo: upload now that the session cookie is set
      if (photo) {
        try {
          const fd = new FormData();
          fd.append("file", photo);
          const up = await fetch("/api/upload", { method: "POST", body: fd });
          const upd = await up.json();
          if (up.ok && upd.url) {
            await fetch("/api/auth/profile", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoUrl: upd.url }),
            });
          }
        } catch { /* photo is optional — registration itself already succeeded */ }
      }
      if (data.needsVerification) {
        toast({
          title: "اکاؤنٹ بنا دیا گیا — اب تصدیق درکار ہے",
          description: "تصدیقی لنک آپ کے ای میل پر بھیج دیا گیا ہے (اسپام فولڈر بھی دیکھیں)۔ تصدیق کے بعد آپ تحریریں بھیج سکیں گے۔",
        });
      } else {
        toast({ title: "خوش آمدید!", description: "اکاؤنٹ بنا دیا گیا — اب اپنی پروفائل مکمل کریں (تصویر، یوزر نیم اور تعارف)۔" });
      }
      // take the new user straight to profile setup
      router.push("/dashboard?tab=profile&setup=1");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col paper-bg">
      <main className="flex flex-1 items-center justify-center px-4 py-14">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center">
            <LogoMark size={72} className="mb-3 shadow-md" />
            <h1 className="font-latin text-3xl font-bold text-emerald-ink" dir="ltr">Create Account</h1>
            <p className="mt-1 font-naskh text-base text-muted-foreground">
              اپنی تحریریں بھیجنے اور اپنی ادبی پروفائل بنانے کے لیے رجسٹر کریں
            </p>
          </div>

          <form onSubmit={submit} className="manuscript-frame space-y-5 rounded-xl bg-card p-7">
            <div className="space-y-2">
              <Label className="font-latin text-[15px]" dir="ltr">Full Name *</Label>
              <Input required value={form.name} onChange={set("name")} className="h-11 font-naskh" />
            </div>
            <div className="space-y-2">
              <Label className="font-latin text-[15px]" dir="ltr">Pen Name (Takhallus)</Label>
              <Input value={form.penName} onChange={set("penName")} className="h-11 font-nastaliq-tight text-lg" />
            </div>
            <div className="space-y-2">
              <Label className="font-latin text-[15px]" dir="ltr">Gmail / Email *</Label>
              <Input required type="email" dir="ltr" value={form.email} onChange={set("email")} className="h-11 text-left font-latin" placeholder="you@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label className="font-latin text-[15px]" dir="ltr">Password *</Label>
              <div className="relative">
                <Input required type={showPass ? "text" : "password"} dir="ltr" value={form.password} onChange={set("password")} className="h-11 pe-11 text-left font-latin" />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              <p className={`text-xs leading-5 font-naskh ${strength ? "text-destructive" : "text-[#2f6d46]"}`}>
                {strength ? `Weak password: ${strength}` : "Strong password ✓"}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="font-latin text-[15px]" dir="ltr">Confirm Password *</Label>
              <Input required type={showPass ? "text" : "password"} dir="ltr" value={form.confirm} onChange={set("confirm")} className={`h-11 text-left font-latin ${form.confirm && form.confirm !== form.password ? "border-destructive" : ""}`} />
              {form.confirm && form.confirm !== form.password && (
                <p className="text-xs font-naskh text-destructive">تصدیق پاس ورڈ اصل پاس ورڈ سے مختلف ہے</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-latin text-[15px]" dir="ltr">Short Bio (optional)</Label>
              <textarea
                value={form.bio}
                onChange={set("bio")}
                rows={3}
                className="w-full rounded-md border border-input bg-card px-3 py-2 font-naskh leading-7 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="اپنے بارے میں دو جملے لکھیں…"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-latin text-[15px]" dir="ltr">Profile Photo (optional)</Label>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="block w-full cursor-pointer rounded-md border border-input bg-card px-3 py-2 text-sm font-naskh text-muted-foreground file:me-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:font-naskh file:text-foreground"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-accent/60 px-3 py-3">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-brand" />
              <span className="font-naskh text-[13px] leading-6 text-foreground">
                میں سائٹ کی <Link href="/about" className="font-semibold text-primary underline">اصطلاحات و ضوابط</Link> اور <Link href="/submit" className="font-semibold text-primary underline">تحریری رہنمائی</Link> سے اتفاق کرتا/کرتی ہوں، اور یہ تصدیق کرتا/کرتی ہوں کہ میری تحریریں اصل ہوں گی۔
              </span>
            </label>
            <Button type="submit" disabled={loading} className="h-11 w-full bg-primary font-naskh text-[16px] hover:bg-emerald-deep">
              {loading ? "Creating account…" : "Create Account"}
            </Button>


            <p className="text-center text-[15px] font-naskh text-muted-foreground">
              اکاؤنٹ موجود ہے؟{" "}
              <Link href="/login" className="font-semibold text-primary hover:text-gold">لاگ اِن کریں</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

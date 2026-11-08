"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, MailQuestion } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Password recovery, steps 1–4 (spec Part 5):
 *   1. enter the registered Gmail address
 *   2. backend emails a 6-digit verification code (OTP)
 *   3. user enters the code here
 *   4. backend verifies (expiry / single-use / attempt limits) and returns
 *      a one-time ticket → /reset-password (step 5–7: set the new password)
 */
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "درخواست نہیں بھیجی جا سکی", description: data.error, variant: "destructive" });
        return;
      }
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "تصدیق ناکام", description: data.error, variant: "destructive" });
        return;
      }
      // one-time ticket → reset page (kept in sessionStorage, never exposed in URLs)
      sessionStorage.setItem("pea_reset", JSON.stringify({ email, ticket: data.ticket }));
      router.push("/reset-password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center paper-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="manuscript-frame rounded-2xl bg-card p-8 text-center">
          <div className="mx-auto mb-4 w-fit">
            <LogoMark size={72} />
          </div>
          <h1 className="font-nastaliq-tight text-2xl leading-[1.9] text-primary">پاس ورڈ بازیابی</h1>

          {step === 1 && (
            <form onSubmit={requestCode} className="mt-4 space-y-4 text-start">
              <div className="space-y-1.5">
                <Label className="font-naskh text-[15px]">رجسٹرڈ جی میل / ای میل</Label>
                <div className="relative">
                  <MailQuestion className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email" dir="ltr" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="h-11 ps-9 font-latin"
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="h-11 w-full gap-2 bg-primary font-naskh text-[15px] hover:bg-emerald-deep">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} تصدیقی کوڈ بھیجیں
              </Button>
              <p className="text-center text-[13px] leading-6 font-naskh text-muted-foreground">
                اگر یہ ای میل رجسٹرڈ ہے تو 6 ہندسوں کا تصدیقی کوڈ آپ کے ای میل پر بھیج دیا جائے گا۔ کوڈ 15 منٹ کے لیے معتبر ہوتا ہے۔
              </p>
              <p className="text-center text-xs font-naskh text-muted-foreground">
                <Link href="/login" className="text-primary underline">لاگ اِن پر واپس جائیں</Link>
              </p>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyCode} className="mt-4 space-y-4 text-start">
              <p className="rounded-lg bg-[#e3f0e6] px-4 py-3 font-naskh text-[13px] leading-6 text-[#2f6d46]">
                اگر یہ ای میل رجسٹرڈ ہے تو تصدیقی کوڈ بھیج دیا گیا ہے۔ اپنے ان باکس (اور اسپام فولڈر) میں 6 ہندسوں کا کوڈ دیکھیں اور نیچے درج کریں۔
              </p>
              <div className="space-y-1.5">
                <Label className="font-naskh text-[15px]">تصدیقی کوڈ (OTP)</Label>
                <div className="relative">
                  <KeyRound className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    inputMode="numeric" pattern="[0-9]*" maxLength={6} dir="ltr" required value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="------"
                    className="h-12 ps-9 text-center font-latin text-2xl tracking-[0.5em]"
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy || code.length !== 6} className="h-11 w-full gap-2 bg-primary font-naskh text-[15px] hover:bg-emerald-deep">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} کوڈ تصدیق کریں
              </Button>
              <div className="flex items-center justify-between text-xs font-naskh">
                <button type="button" onClick={() => { setStep(1); setCode(""); }} className="text-primary underline">
                  ای میل تبدیل کریں / نیا کوڈ طلب کریں
                </button>
                <Link href="/login" className="text-muted-foreground underline">لاگ اِن پر واپس</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

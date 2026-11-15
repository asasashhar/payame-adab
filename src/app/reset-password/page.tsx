"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Password recovery, steps 5–7 (spec Part 5): after the OTP code has been
 * verified the user sets a new password (8+ chars, letter + digit).
 * The one-time ticket arrives from /forgot-password via sessionStorage
 * (or ?t= for admin-issued reset links).
 */
export default function ResetPasswordPage() {
  const [ticket, setTicket] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("pea_reset");
      if (saved) {
        const { ticket: t } = JSON.parse(saved);
        if (t) setTicket(t);
      }
    } catch { /* ignore */ }
    const qp = new URLSearchParams(window.location.search).get("t");
    if (qp) setTicket(qp);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) {
      toast({ title: "تصدیقی کوڈ پہلے درست کریں", description: "پاس ورڈ بھول گئے صفحے سے کوڈ کی تصدیق کریں", variant: "destructive" });
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      toast({ title: "پاس ورڈ کمزور ہے", description: "کم از کم 8 حروف، ایک حرف اور ایک عدد ضروری ہے", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "پاس ورڈ مطابقت نہیں رکھتے", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "پاس ورڈ محفوظ نہیں ہو سکا", description: data.error, variant: "destructive" });
        return;
      }
      sessionStorage.removeItem("pea_reset");
      setDone(true);
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
          <h1 className="font-latin text-2xl font-bold text-primary" dir="ltr">Set New Password</h1>

          {done ? (
            <div className="mt-5 space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <p className="rounded-lg bg-[#e3f0e6] px-4 py-3 font-naskh text-sm leading-7 text-[#2f6d46]">
                آپ کا پاس ورڈ کامیابی سے تبدیل کر دیا گیا ہے۔ اب آپ اپنے نئے پاس ورڈ سے لاگ اِن کر سکتے ہیں۔
                تصدیقی ای میل بھی آپ کے ای میل پر بھیج دی گئی ہے۔
              </p>
              <Button asChild className="h-11 w-full bg-primary font-naskh text-[15px] hover:bg-emerald-deep">
                <Link href="/login">لاگ اِن پر جائیں</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4 text-start">
              <div className="space-y-2">
                <Label className="font-latin text-[15px]" dir="ltr">New Password</Label>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pe-11 text-left font-latin" />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "پاس ورڈ چھپائیں" : "پاس ورڈ دکھائیں"}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                <p className="text-xs font-naskh text-muted-foreground">کم از کم 8 حروف، جس میں ایک حرف اور ایک عدد شامل ہو۔</p>
              </div>
              <div className="space-y-2">
                <Label className="font-latin text-[15px]" dir="ltr">Confirm New Password</Label>
                <Input type={showPass ? "text" : "password"} dir="ltr" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`h-11 text-left font-latin ${confirm && confirm !== password ? "border-destructive" : ""}`} />
                {confirm && confirm !== password && (
                  <p className="text-xs font-naskh text-destructive">تصدیق پاس ورڈ اصل پاس ورڈ سے مختلف ہے</p>
                )}
              </div>
              <Button type="submit" disabled={busy} className="h-11 w-full gap-2 bg-primary font-naskh text-[15px] hover:bg-emerald-deep">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Change Password
              </Button>
              <p className="text-center text-xs font-naskh text-muted-foreground">
                <Link href="/forgot-password" className="text-primary underline">کوڈ کی تصدیق ابھی باقی ہے؟</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

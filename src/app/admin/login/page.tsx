"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/site/logo";
import { GoogleSignInButton } from "@/components/site/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "لاگ اِن ناکام");
        return;
      }
      // successful admin authentication → straight to the dashboard
      router.push("/admin");
      router.refresh();
    } catch {
      setError("سرور سے رابطہ نہیں ہو سکا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden pattern-emerald px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="manuscript-frame rounded-2xl bg-card p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 w-fit rounded-2xl bg-secondary p-2">
              <LogoMark size={84} />
            </div>
            <h1 className="font-nastaliq-tight text-3xl leading-[1.8] text-primary">پیامِ ادب</h1>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-naskh text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> ایڈمنسٹریٹر لاگ اِن
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-id" className="font-naskh">Gmail / ایڈمن آئی ڈی</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-id"
                  type="text"
                  dir="ltr"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="@admin"
                  className="start-9 bg-background ps-9 font-latin"
                />
              </div>
              <p className="text-xs font-latin text-muted-foreground" dir="ltr">
                Super Admin ID: <span className="font-semibold text-foreground">@admin</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-naskh">پاس ورڈ</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  dir="ltr"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="start-9 bg-background pe-11 ps-9 font-latin"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "پاس ورڈ چھپائیں" : "پاس ورڈ دکھائیں"}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm font-naskh text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={busy} className="h-11 w-full gap-2 bg-primary font-naskh text-[15px] hover:bg-emerald-deep">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              داخلہ حاصل کریں
            </Button>

            {/* Continue with Google — authorized administrators sign in directly */}
            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-gold/30" />
              <span className="font-naskh text-[13px] text-muted-foreground">یا</span>
              <span className="h-px flex-1 bg-gold/30" />
            </div>
            <Suspense fallback={null}>
              <GoogleSignInButton admin full label="Continue with Google — Admin" />
            </Suspense>
          </form>

          <p className="mt-5 text-center text-xs font-naskh text-muted-foreground">
            صرف مجاز ایڈمنسٹریٹرز کے لیے — تمام کارروائیاں محفوظ ریکارڈ پر رہتی ہیں۔
          </p>
        </div>

        <div className="mt-5 text-center">
          <Link href="/" className="text-sm font-naskh text-[#e5dfc9]/85 hover:text-[#e2c57c]">
            ← مین سائٹ پر واپس جائیں
          </Link>
        </div>
      </div>
    </div>
  );
}

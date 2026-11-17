"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("pea_remember_email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember: remember ? "1" : "0" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "لاگ اِن ناکام", description: data.error, variant: "destructive" });
        return;
      }
      // remember the email itself (never the password) for convenience
      if (remember) localStorage.setItem("pea_remember_email", email);
      else localStorage.removeItem("pea_remember_email");
      toast({ title: "خوش آمدید!", description: "آپ کامیابی سے لاگ اِن ہو گئے۔" });
      router.push(data.role === "ADMIN" ? "/admin" : "/dashboard");
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
            <h1 className="font-latin text-3xl font-bold text-emerald-ink" dir="ltr">Log In</h1>
            <p className="mt-1 font-naskh text-sm text-muted-foreground">اپنے ادبی اکاؤنٹ میں داخل ہوں</p>
            <p className="mt-1 font-naskh text-base text-muted-foreground">اپنے ادبی اکاؤنٹ میں داخل ہوں</p>
          </div>

          <form onSubmit={submit} className="manuscript-frame space-y-5 rounded-xl bg-card p-7">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-latin text-[15px]" dir="ltr">Email</Label>
              <Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-left font-latin" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-latin text-[15px]" dir="ltr">Password</Label>
              <div className="relative">
                <Input id="password" type={showPass ? "text" : "password"} dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pe-11 text-left font-latin" />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer select-none items-center gap-2 font-latin text-sm text-muted-foreground" dir="ltr">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-brand" />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-latin text-sm font-semibold text-gold underline hover:text-primary" dir="ltr">
                Forgot Password?
              </Link>
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full bg-primary font-naskh text-[16px] hover:bg-emerald-deep">
              {loading ? "Logging in…" : "Log In"}
            </Button>


            <p className="text-center text-[15px] font-naskh text-muted-foreground">
              No account yet?{" "}
              <Link href="/register" className="font-semibold text-primary hover:text-gold">Create Account</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

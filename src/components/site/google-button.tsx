"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * "Continue with Google" — official multi-colour G mark + Urdu label.
 *
 * Two modes (chosen server-side by /api/auth/google-start):
 *   • oauth — real Google OAuth when the admin has saved credentials;
 *     the browser is redirected to Google itself.
 *   • demo  — registered accounts (and the authorized administrators when
 *     `admin` is set) sign in directly with their Gmail address.
 */

export function GoogleG({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function GoogleSignInButton({
  admin = false,
  label,
  className,
  full = false,
}: {
  admin?: boolean;
  label?: string;
  className?: string;
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  // OAuth round-trips end with ?google_msg=… — surface it once
  useEffect(() => {
    const msg = params.get("google_msg");
    if (msg) {
      toast({ title: "گوگل سائن اِن", description: msg, variant: "destructive" });
      // clean the query without an extra render loop
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/google-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, admin: admin ? "1" : "0" }),
      });
      const d = await res.json();
      if (d.mode === "oauth" && d.redirectUrl) {
        window.location.href = d.redirectUrl;
        return;
      }
      if (!res.ok) {
        toast({ title: "گوگل سائن اِن ناکام", description: d.error, variant: "destructive" });
        return;
      }
      toast({ title: "خوش آمدید!", description: "گوگل کے ذریعے لاگ اِن ہو گئے۔" });
      router.push(d.redirect ?? "/dashboard");
      router.refresh();
    } catch {
      toast({ title: "سرور سے رابطہ نہیں ہو سکا", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={
          (full ? "w-full " : "") +
          "h-11 gap-3 border-gold/40 bg-white font-latin text-[14px] font-semibold text-[#3c4043] hover:bg-white hover:shadow-sm " +
          (className ?? "")
        }
        dir="ltr"
      >
        <GoogleG />
        {label ?? "Continue with Google"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-nastaliq-tight text-xl text-primary">
              {admin ? "ایڈمن — گوگل سے داخلہ" : "گوگل کے ذریعے جاری رکھیں"}
            </DialogTitle>
            <DialogDescription className="font-naskh leading-7">
              {admin
                ? "Enter your authorized admin Gmail — after Google verifies you, the Admin Panel opens."
                : "Enter your Gmail — Google verifies your account, then you are signed in."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="google-email" className="font-latin" dir="ltr">Gmail address</Label>
              <Input
                id="google-email"
                type="email"
                dir="ltr"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="text-left font-latin"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full gap-2 bg-primary font-naskh hover:bg-emerald-deep"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue
            </Button>
            <p className="text-center text-[11px] leading-5 font-naskh text-muted-foreground">
              Real Google verification requires Google OAuth credentials — the site admin saves the Client ID/Secret in Admin Panel → Settings.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

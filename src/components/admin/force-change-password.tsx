"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Blocking first-login gate (spec Part 6): an administrator whose password is
 * still the initial credential (darulhuda) or was reset by the Super Admin
 * must set a personal password before the panel becomes usable.
 */
export function ForceChangePassword({ name, email }: { name: string; email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
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
      toast({ title: "پاس ورڈ محفوظ ہو گیا", description: "خوش آمدید — اب آپ ایڈمن پینل استعمال کر سکتے ہیں" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center paper-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="manuscript-frame rounded-2xl bg-card p-8">
          <div className="mb-5 flex flex-col items-center text-center">
            <LogoMark size={64} className="mb-3" />
            <h1 className="flex items-center gap-2 font-nastaliq-tight text-2xl text-primary">
              <ShieldAlert className="h-6 w-6 text-gold" /> پاس ورڈ تبدیل کریں
            </h1>
            <p className="mt-2 font-naskh text-sm leading-7 text-muted-foreground">
              سلام <b className="text-foreground">{name}</b> صاحب! آپ کے اکاؤنٹ
              (<span dir="ltr" className="font-latin">{email}</span>) میں ابھی ابتدائی پاس ورڈ موجود ہے۔
              سکیورٹی کے لیے پینل استعمال کرنے سے پہلے اپنا ذاتی پاس ورڈ مقرر کرنا لازمی ہے۔
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-naskh text-[15px]">موجودہ (ابتدائی) پاس ورڈ</Label>
              <Input required type={show ? "text" : "password"} dir="ltr" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-11 text-left font-latin" />
            </div>
            <div className="space-y-2">
              <Label className="font-naskh text-[15px]">نیا ذاتی پاس ورڈ</Label>
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
            <Button type="submit" disabled={busy} className="h-11 w-full bg-primary font-naskh text-[15px] hover:bg-emerald-deep">
              {busy ? "محفوظ ہو رہا ہے…" : "پاس ورڈ محفوظ کریں اور جاری رکھیں"}
            </Button>
            <p className="text-center text-xs font-naskh text-muted-foreground">
              پاس ورڈ محفوظ ہوتے ہی آپ خودکار طور پر پینل میں داخل ہو جائیں گے۔
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

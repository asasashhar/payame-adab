import { db } from "@/lib/db";
import { getSettings } from "@/lib/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { LogoMark } from "@/components/site/logo";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "رابطہ" };

/** Contact page (spec Part 21) — verified contact details from site settings. */
export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 paper-bg">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="mb-8 text-center">
            <LogoMark size={64} className="mx-auto mb-3 shadow-md" />
            <h1 className="font-nastaliq-tight text-3xl leading-[1.9] text-emerald-ink">ہم سے رابطہ</h1>
            <p className="mt-1 font-naskh text-[15px] text-muted-foreground">
              پیامِ ادب سے رابطہ کا رسمی ذریعہ — ہم آپ کے پیغام کی قدر کرتے ہیں۔
            </p>
          </div>
          <ContactForm
            contactEmail={settings.contactEmail ?? "payameadab@gmail.com"}
            contactPhone={settings.contactPhone ?? ""}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

import Link from "next/link";
import { Mail, Phone, Globe, Facebook, Twitter, Instagram, Youtube } from "lucide-react";

type SocialLink = { platform: string; url: string };

export function SiteFooter({
  settings,
}: {
  settings?: {
    contactEmail?: string; contactPhone?: string; footerNote?: string;
    tagline?: string; socialLinks?: string; footerLinks?: string;
  };
}) {
  let social: SocialLink[] = [];
  try { social = JSON.parse(settings?.socialLinks ?? "[]"); } catch { /* ignore */ }

  // Admin-managed footer links (Setting: footerLinks, JSON [{label,href}]).
  // When non-empty they replace the tools/services column; empty keeps the
  // built-in defaults — both shapes stay valid for older data.
  type FooterLink = { label: string; href: string };
  const TOOLS_DEFAULT: FooterLink[] = [
    { label: "قافیہ تلاش", href: "/qafiya" },
    { label: "تقطیع و بحر", href: "/taqti" },
    { label: "لغت", href: "/dictionary" },
    { label: "اپنی تحریر بھیجیں", href: "/submit" },
    { label: "شکایات و تجاویز", href: "/feedback" },
    { label: "ہمارا تعارف", href: "/about" },
  ];
  let footerLinks: FooterLink[] = TOOLS_DEFAULT;
  try {
    const parsed = JSON.parse(settings?.footerLinks ?? "[]");
    if (Array.isArray(parsed) && parsed.length) {
      footerLinks = parsed
        .filter((l) => l && typeof l.label === "string" && typeof l.href === "string")
        .slice(0, 10);
    }
  } catch { /* keep defaults */ }

  const socialIcon = (p: string) => {
    const cls = "h-4 w-4";
    if (/facebook/i.test(p)) return <Facebook className={cls} />;
    if (/twitter|x\.com/i.test(p)) return <Twitter className={cls} />;
    if (/instagram/i.test(p)) return <Instagram className={cls} />;
    if (/youtube/i.test(p)) return <Youtube className={cls} />;
    if (/whatsapp/i.test(p)) return <WhatsAppIcon className={cls} />;
    return <Globe className={cls} />;
  };

  return (
    <footer className="pea-footer mt-auto pattern-emerald text-[#eee9d8]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <Link href="/" className="inline-block rounded-lg bg-[#f3ead2] p-1.5">
            {/* official horizontal logo on light plate */}
            { }
            <img
              src="/brand/logo-horizontal.png"
              alt="پیامِ ادب — Payam-e-Adab"
              className="h-24 w-auto object-contain"
            />
          </Link>
          <p className="mt-4 text-sm leading-7 text-[#e5dfc9]/85 font-naskh">
            اردو زبان و ادب کے فروغ، تحفظ اور ڈیجیٹل اشاعت کا ادبی ادارہ۔
          </p>
          <p className="mt-1 font-nastaliq-tight text-[15px] text-[#e2c57c]">اردو ادب، روایت سے نئی نسل تک</p>
        </div>

        <nav aria-label="اعداد و شمار">
          <h3 className="mb-4 font-nastaliq-tight text-lg text-[#e2c57c]">ادبی سرحدیں</h3>
          <ul className="space-y-2 text-sm font-naskh">
            {[
              ["شاعری", "/poetry"],
              ["مضامین", "/articles"],
              ["کتب خانہ", "/books"],
              ["شعرا و ادبا", "/poets"],
              ["ادبی خبریں", "/news"],
              ["ڈیجیٹل اخبار", "/newspaper"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-[#e5dfc9]/85 hover:text-[#e2c57c] transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="اوزار و خدمات">
          <h3 className="mb-4 font-nastaliq-tight text-lg text-[#e2c57c]">اوزار و خدمات</h3>
          <ul className="space-y-2 text-sm font-naskh">
            {footerLinks.map(({ label, href }) => (
              <li key={href}>
                <Link href={href} className="text-[#e5dfc9]/85 hover:text-[#e2c57c] transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-4 font-nastaliq-tight text-lg text-[#e2c57c]">رابطہ</h3>
          <ul className="space-y-3 text-sm font-latin" dir="ltr">
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-[#e2c57c]" />
              <a href={`mailto:${settings?.contactEmail ?? "payameadab@gmail.com"}`} className="text-[#e5dfc9]/85 hover:text-[#e2c57c] break-all">
                {settings?.contactEmail ?? "payameadab@gmail.com"}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-[#e2c57c]" />
              <a href={`tel:+91${settings?.contactPhone ?? "9199258187"}`} className="text-[#e5dfc9]/85 hover:text-[#e2c57c]">
                +91 {settings?.contactPhone ?? "9199258187"}
              </a>
            </li>
          </ul>
          {social.length > 0 && (
            <div className="mt-5 flex items-center gap-2">
              {social.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.platform}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2c57c]/40 text-[#e5dfc9]/85 transition-colors hover:bg-[#e2c57c]/20 hover:text-[#f3ead2]"
                >
                  {socialIcon(s.platform)}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#e2c57c]/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-[#e5dfc9]/70 sm:flex-row">
          <p className="font-naskh">{settings?.footerNote ?? "© پیامِ ادب — تمام حقوق محفوظ ہیں"}</p>
          <p className="font-naskh text-[#e2c57c]">اردو ادب، روایت سے نئی نسل تک</p>
          <p className="font-latin">© Payam-e-Adab. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
/** WhatsApp brand glyph (lucide has no brand icons). */
export function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a11.61 11.61 0 01-5.894-1.598l-.425-.252-.43.254-2.46 1.51 2.46-1.51-.712 2.542 2.544-1.487-.428-.255a11.604 11.604 0 01-5.694-9.962c0-6.41 5.217-11.625 11.63-11.625 6.412 0 11.63 5.215 11.63 11.625 0 6.412-5.218 11.63-11.626 11.63M12.01 2C6.514 2 2.074 6.44 2.074 11.936c0 1.872.55 3.618 1.497 5.083L2 22l5.105-1.55a11.59 11.59 0 004.905 1.088h.004c5.496 0 9.936-4.44 9.936-9.936S17.506 2 12.01 2" />
    </svg>
  );
}

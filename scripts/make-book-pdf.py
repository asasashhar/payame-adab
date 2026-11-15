"""Build the digital sample edition of دیوانِ غالبؔ as a real PDF
(title page + فہرست + the seeded Ghalib ghazals), rendered via Playwright
Chromium so Nastaliq shapes correctly. Attaches the file to the seeded book.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path("/home/z/my-project")
POEMS_JSON = Path("/tmp/ghalib.json")
OUT = ROOT / "public/books-pdf/divan-e-ghalib-sample.pdf"

CSS = """
@font-face { font-family:'Nastaliq'; src:url('file:///home/z/my-project/public/fonts/NotoNastaliqUrdu.ttf') format('truetype'); font-weight:400 700; }
@font-face { font-family:'Jameel'; src:url('file:///home/z/my-project/public/fonts/JameelNooriNastaleeq.ttf') format('truetype'); }
* { margin:0; padding:0; box-sizing:border-box; }
:root { --deep:#06422a; --ink:#26221b; --gold:#b5891e; --ivory:#f8f1e7; }
@page { size:A4; margin:0; }
body { direction:rtl; background:var(--ivory); color:var(--ink); }
.page { width:210mm; height:297mm; page-break-after:always; position:relative; overflow:hidden; padding:20mm 18mm; }
.page:last-child { page-break-after:auto; }
.cover { background:linear-gradient(160deg,#f8f1e7 0%,#efe3c8 60%,#e8d8b2 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
.cover .frame { border:2px solid var(--gold); outline:1px solid color-mix(in srgb,#b5891e 45%,transparent); outline-offset:-9px; border-radius:14px; padding:14mm 12mm; background:#fdf9ef; max-width:150mm; }
.cover h1 { font-family:'Jameel','Nastaliq'; font-size:44px; line-height:1.9; color:var(--deep); }
.cover .author { font-family:'Jameel','Nastaliq'; font-size:26px; line-height:2; color:#8a6d1a; margin-top:6mm; }
.cover .edition { font-family:'Nastaliq'; font-size:15px; line-height:2.2; color:#5f5744; margin-top:10mm; }
.cover .rule { width:70mm; height:1.5px; background:linear-gradient(to left,transparent,var(--gold),transparent); margin:6mm auto; }
.cover .orn { color:var(--gold); font-size:18px; letter-spacing:8px; }
.toc h2, .ghazal h2 { font-family:'Jameel','Nastaliq'; font-size:30px; line-height:2; color:var(--deep); text-align:center; }
.toc .head-rule, .ghazal .head-rule { width:60mm; height:1px; background:linear-gradient(to left,transparent,var(--gold),transparent); margin:4mm auto 8mm; }
.toc ol { list-style:none; counter-reset:it; }
.toc li { font-family:'Nastaliq'; font-size:19px; line-height:2.6; counter-increment:it; display:flex; align-items:baseline; gap:4mm; }
.toc li::before { content:counter(it,cjk-ideographic)'.'; color:var(--gold); font-size:14px; }
.toc li .dots { flex:1; border-bottom:1px dotted #c9b98a; transform:translateY(-4px); }
.ghazal .couplet { font-family:'Jameel','Nastaliq'; font-size:21px; line-height:2.7; text-align:center; margin-bottom:3mm; color:var(--ink); }
.ghazal .note { font-family:'Nastaliq'; font-size:14px; line-height:2.4; color:#5f5744; margin-top:10mm; border-top:1px solid #e0d0a4; padding-top:5mm; }
.foot { position:absolute; bottom:10mm; inset-inline:18mm; display:flex; justify-content:space-between; font-family:'Nastaliq'; font-size:11px; color:#8a7a4a; }
"""


def page_shell(body: str, foot: str) -> str:
    return f'<section class="page">{body}<div class="foot"><span>پیامِ ادب — ڈیجیٹل کتب خانہ</span><span>{foot}</span></div></section>'


def main() -> None:
    poems = json.loads(POEMS_JSON.read_text())
    pages: list[str] = []

    # cover
    pages.append(page_shell(
        '<div class="cover"><div class="frame"><div class="orn">✦ ✦ ✦</div>'
        "<h1>دیوانِ غالبؔ</h1>"
        '<div class="rule"></div>'
        '<p class="author">مرزا اسد اللہ خان غالبؔ</p>'
        '<p class="edition">ڈیجیٹل نمونہ ایڈیشن — پیامِ ادب کتب خانہ<br/>اردو غزل کا نقطۂ کمال: فکر کی گہرائی، استعاروں کی جدت اور انسانی زندگی کی بے باک تشریح</p>'
        '<div class="orn">✦ ✦ ✦</div></div></div>',
        "نمونہ ایڈیشن",
    ))

    # table of contents
    toc_items = "".join(f"<li><span>{p['title']}</span><span class='dots'></span></li>" for p in poems)
    pages.append(page_shell(
        f'<div class="toc"><h2>فہرستِ مطالب</h2><div class="head-rule"></div><ol>{toc_items}</ol>'
        '<p class="note" style="font-family:Nastaliq;font-size:13px;line-height:2.4;margin-top:12mm;border-top:1px solid #e0d0a4;padding-top:5mm;">'
        "یہ ڈیجیٹل نمونہ ایڈیشن پیامِ ادب کے کتب خانے کے لیے تیار کیا گیا ہے۔ مکمل دیوان کے لیے معتبر مطبوعات دیکھیں۔"
        "</p></div>",
        "فہرست",
    ))

    # ghazals — one per page
    for i, p in enumerate(poems, 1):
        couplets = [c.strip() for c in (p["content"] or "").split("\n\n") if c.strip()]
        body = "".join(f'<p class="couplet">{c.replace(chr(10), "<br/>")}</p>' for c in couplets)
        pages.append(page_shell(
            f'<div class="ghazal"><h2>{p["title"]}</h2><div class="head-rule"></div>{body}'
            '<p class="note">مرزا اسد اللہ خان غالبؔ (۱۷۹۷ء — ۱۸۶۹ء) اردو غزل کے سب سے بڑے لکھنے والوں میں شمار ہوتے ہیں۔</p></div>',
            f"صفحہ {i + 2}",
        ))

    html = f"<!doctype html><html dir='rtl' lang='ur'><head><meta charset='utf-8'><style>{CSS}</style></head><body>{''.join(pages)}</body></html>"
    tpl = Path("/tmp/book-ghalib.html")
    tpl.write_text(html, encoding="utf-8")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        pg = browser.new_page()
        pg.goto(tpl.as_uri(), wait_until="networkidle")
        pg.wait_for_timeout(2000)  # let the Nastaliq font settle
        pg.pdf(path=str(OUT), width="210mm", height="297mm", print_background=True,
               margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        browser.close()
    print(f"PDF written: {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

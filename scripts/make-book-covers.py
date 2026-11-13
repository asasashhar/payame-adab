#!/usr/bin/env python3
"""Generate typographic green/gold cover art for the 8 classic books
(matches the reference mockup's covered book cards; titles/authors unchanged).
Covers land in public/books-covers/ and Book.coverUrl is set in the DB.
Admin can replace any cover later via the book editor — reversible design asset.
"""
import os
import sqlite3
from PIL import Image, ImageDraw, ImageFilter

FONT = "public/fonts/JameelNooriNastaleeq.ttf"
OUT = "public/books-covers"
W, H = 640, 854  # ~3:4

BOOKS = [
    ("diwan-ghalib",  "دیوانِ غالبؔ",        "مرزا اسد اللہ خان غالب"),
    ("bang-e-dara",   "بانگِ درا",           "علامہ محمد اقبال"),
    ("kulliyat-mir",  "کلیاتِ میرؔ",          "میر تقی میر"),
    ("naqad-halat",   "نقدِ حالت",            "nishan rally"),
    ("urdu-ghzal-irtiqa", "اردو غزل کا ارتقا", "دانش پہلوان"),
    ("urdu-qawaid",   "اردو قواعد و انشا",    "جلدی خواں"),
    ("bachon-khazana","بچوں کا ادبی خزانہ",   "ناصر بندر"),
    ("urdu-tanqeed",  "اردو تنقید کے اصول",   "دبستان اصلاح"),
]

def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

EMERALD_DEEP = hex_rgb("#06422a")
EMERALD_INK  = hex_rgb("#03301c")
GOLD         = hex_rgb("#c99a2e")
GOLD_SOFT    = hex_rgb("#e2c57c")
IVORY        = hex_rgb("#f3ead2")

from PIL import ImageFont

def star_pattern(draw, alpha=26):
    """8-point star lattice like the site's pattern-emerald."""
    step = 84
    for y in range(-step, H + step, step):
        for x in range(-step, W + step, step):
            cx, cy = x + (step // 2 if (y // step) % 2 else 0), y
            r1, r2 = 30, 12
            pts = []
            for i in range(16):
                ang = i * 22.5 * 3.14159 / 180
                r = r1 if i % 2 == 0 else r2
                pts.append((cx + r * __import__("math").cos(ang), cy + r * __import__("math").sin(ang)))
            draw.polygon(pts, outline=(217, 188, 106, alpha), width=2)

def make_cover(slug, title, author):
    img = Image.new("RGB", (W, H), EMERALD_DEEP)
    # vertical depth gradient (ink at bottom)
    grad = Image.new("L", (1, H))
    for y in range(H):
        grad.putpixel((0, y), int(120 * (y / H)))
    dark = Image.new("RGB", (W, H), EMERALD_INK)
    img = Image.composite(dark, img, grad.resize((W, H)))

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    star_pattern(d)

    # radial gold glows
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-160, -180, 320, 300), fill=(181, 137, 30, 34))
    gd.ellipse((W - 330, H - 320, W + 160, H + 170), fill=(226, 197, 124, 26))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    overlay = Image.alpha_composite(overlay, glow)

    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    # double ornamental frame
    d.rectangle((24, 24, W - 24, H - 24), outline=GOLD, width=3)
    d.rectangle((36, 36, W - 36, H - 36), outline=(226, 197, 124, 255), width=1)
    # corner diamonds
    for cx, cy in ((24, 24), (W - 24, 24), (24, H - 24), (W - 24, H - 24)):
        d.polygon([(cx, cy - 9), (cx + 9, cy), (cx, cy + 9), (cx - 9, cy)], fill=GOLD)

    f_title = ImageFont.truetype(FONT, 96)
    f_author = ImageFont.truetype(FONT, 30)
    f_medal = ImageFont.truetype(FONT, 34)

    # title (nastaliq — generous leading box)
    def center(urdu_text, font, y):
        bbox = d.textbbox((0, 0), urdu_text, font=font)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) / 2 - bbox[0], y - bbox[1]), urdu_text, font=font, fill=IVORY)

    center(title, f_title, H // 2 - 150)

    # ornament rule under title
    y0 = H // 2 + 40
    d.line((W // 2 - 150, y0, W // 2 + 150, y0), fill=GOLD, width=2)
    d.polygon([(W // 2, y0 - 8), (W // 2 + 8, y0), (W // 2, y0 + 8), (W // 2 - 8, y0)], fill=GOLD_SOFT)

    center(author, f_author, y0 + 34)

    # top medallion
    d.ellipse((W // 2 - 46, 92, W // 2 + 46, 184), outline=GOLD, width=3)
    d.ellipse((W // 2 - 38, 100, W // 2 + 38, 176), outline=(226, 197, 124, 255), width=1)
    bbox = d.textbbox((0, 0), "ادب", font=f_medal)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2 - bbox[0], 138 - (bbox[1] + bbox[3]) / 2), "ادب", font=f_medal, fill=GOLD_SOFT)

    # bottom spine hint
    d.rectangle((W // 2 - 120, H - 108, W // 2 + 120, H - 100), fill=(181, 137, 30, 255))

    out = os.path.join(OUT, f"{slug}.jpg")
    img.save(out, "JPEG", quality=90)
    print("cover:", out)
    return f"/books-covers/{slug}.jpg"

os.makedirs(OUT, exist_ok=True)
# fix the placeholder author strings slipped in above — pull real authors from DB
con = sqlite3.connect("db/custom.db")
rows = {r[0]: (r[1], r[2]) for r in con.execute("SELECT title, author, coverUrl FROM Book").fetchall()}
con.close()

mapping = [
    ("diwan-ghalib",  "دیوانِ غالبؔ"),
    ("bang-e-dara",   "بانگِ درا"),
    ("kulliyat-mir",  "کلیاتِ میرؔ"),
    ("naqad-halat",   "نقد حالت"),
    ("urdu-ghzal-irtiqa", "اردو غزل کا ارتقا"),
    ("urdu-qawaid",   "اردو قواعد و انشا"),
    ("bachon-khazana","بچوں کا ادبی خزانہ"),
    ("urdu-tanqeed",  "اردو تنقید کے اصول"),
]

updates = []
for slug, title in mapping:
    real_author = rows.get(title, ("",))[1] or ""
    url = make_cover(slug, title, real_author)
    updates.append((url, title))

con = sqlite3.connect("db/custom.db")
for url, title in updates:
    con.execute("UPDATE Book SET coverUrl=? WHERE title=? AND (coverUrl IS NULL OR coverUrl='')", (url, title))
con.commit()
print("updated:", con.execute("SELECT COUNT(*) FROM Book WHERE coverUrl IS NOT NULL").fetchone()[0], "of", len(rows))
con.close()

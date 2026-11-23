#!/usr/bin/env python3
"""Cover art for the 7 published articles (no coverUrl) — same emerald/gold
typographic identity as the book covers, quill motif instead of medallion.
Design asset only: titles/authors/content untouched; admin can replace covers
via the article editor.
"""
import math
import os
import sqlite3
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT = "public/fonts/JameelNooriNastaleeq.ttf"
OUT = "public/articles-covers"
W, H = 800, 500  # landscape card cover

def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

EMERALD_DEEP = hex_rgb("#06422a")
EMERALD_INK  = hex_rgb("#03301c")
GOLD         = hex_rgb("#c99a2e")
GOLD_SOFT    = hex_rgb("#e2c57c")
IVORY        = hex_rgb("#f3ead2")

def star_pattern(draw, alpha=24):
    step = 76
    for y in range(-step, H + step, step):
        for x in range(-step, W + step, step):
            cx = x + (step // 2 if (y // step) % 2 else 0)
            pts = []
            for i in range(16):
                ang = i * 22.5 * math.pi / 180
                r = 26 if i % 2 == 0 else 10.5
                pts.append((cx + r * math.cos(ang), y + r * math.sin(ang)))
            draw.polygon(pts, outline=(217, 188, 106, alpha), width=2)

def make_cover(slug, title):
    img = Image.new("RGB", (W, H), EMERALD_DEEP)
    grad = Image.new("L", (1, H))
    for y in range(H):
        grad.putpixel((0, y), int(110 * (y / H)))
    img = Image.composite(Image.new("RGB", (W, H), EMERALD_INK), img, grad.resize((W, H)))

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    star_pattern(d)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((W - 300, -140, W + 140, 260), fill=(181, 137, 30, 36))
    gd.ellipse((-160, H - 260, 260, H + 140), fill=(226, 197, 124, 28))
    overlay = Image.alpha_composite(overlay, glow.filter(ImageFilter.GaussianBlur(56)))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    # feather quill motif (top end)
    qx, qy = W - 96, 84
    d.polygon([(qx, qy), (qx + 34, qy + 66), (qx + 6, qy + 128), (qx - 16, qy + 62)], fill=GOLD_SOFT)
    d.line((qx + 2, qy + 4, qx - 10, qy + 148), fill=EMERALD_INK, width=3)
    d.ellipse((qx - 26, qy + 132, qx + 6, qy + 158), fill=EMERALD_INK)

    # gold corner accents
    d.line((28, 28, 128, 28), fill=GOLD, width=3)
    d.line((28, 28, 28, 108), fill=GOLD, width=3)
    d.line((W - 28, H - 28, W - 128, H - 28), fill=GOLD, width=3)
    d.line((W - 28, H - 28, W - 28, H - 108), fill=GOLD, width=3)

    f_title = ImageFont.truetype(FONT, 52)
    # wrap title to 2 lines
    tmp = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    words = title.split()
    lines, cur = [], ""
    for w_ in words:
        cand = (cur + " " + w_).strip()
        bbox = tmp.textbbox((0, 0), cand, font=f_title)
        if bbox[2] - bbox[0] > W - 220 and cur:
            lines.append(cur); cur = w_
        else:
            cur = cand
    lines.append(cur)
    lines = lines[:2]

    y = H // 2 - (len(lines) * 78) // 2
    for ln in lines:
        bbox = d.textbbox((0, 0), ln, font=f_title)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) / 2 - bbox[0], y - bbox[1]), ln, font=f_title, fill=IVORY)
        y += 78

    y0 = y + 8
    d.line((W // 2 - 130, y0, W // 2 + 130, y0), fill=GOLD, width=2)
    d.polygon([(W // 2, y0 - 7), (W // 2 + 7, y0), (W // 2, y0 + 7), (W // 2 - 7, y0)], fill=GOLD_SOFT)

    out = os.path.join(OUT, f"{slug}.jpg")
    img.save(out, "JPEG", quality=88)
    print("cover:", out)
    return f"/articles-covers/{slug}.jpg"

os.makedirs(OUT, exist_ok=True)
con = sqlite3.connect("db/custom.db")
rows = con.execute("SELECT id, title FROM Article WHERE status='PUBLISHED' AND (coverUrl IS NULL OR coverUrl='') AND (topicImageUrl IS NULL OR topicImageUrl='')").fetchall()
for i, (aid, title) in enumerate(rows, 1):
    url = make_cover(f"article-{i}", title)
    con.execute("UPDATE Article SET coverUrl=? WHERE id=?", (url, aid))
con.commit()
print("articles updated:", len(rows))
con.close()

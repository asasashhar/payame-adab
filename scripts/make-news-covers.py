#!/usr/bin/env python3
"""Cover art: newspaper edition front-page thumbnail + literary news cards.
Design assets matching the reference mockup (trio shows a newspaper page image).
"""
import os
import sqlite3
from PIL import Image, ImageDraw, ImageFilter, ImageFont

URDU = "public/fonts/JameelNooriNastaleeq.ttf"
NASKH = "public/fonts/NafeesWebNaskh.ttf"
OUT_NP = "public/newspaper-covers"
OUT_NW = "public/news-covers"

def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

IVORY   = hex_rgb("#f7f2e5")
PAPER   = hex_rgb("#efe6cf")
INK     = hex_rgb("#26221b")
GREEN   = hex_rgb("#06422a")
GOLD    = hex_rgb("#c99a2e")
EM_DEEP = hex_rgb("#06422a")
EM_INK  = hex_rgb("#03301c")
GOLD_SOFT = hex_rgb("#e2c57c")

def fake_text(d, x0, y0, x1, y1, line_h, color, seed=0):
    """simulate urdu newspaper column text with ragged lines (RTL ragged-left)"""
    import random
    rnd = random.Random(seed)
    y = y0
    while y < y1:
        w = (x1 - x0) * rnd.uniform(0.72, 1.0)
        d.rectangle((x1 - w, y, x1, y + max(3, line_h - 6)), fill=color)
        y += line_h

def newspaper_cover(path):
    W, H = 720, 900
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    # page edge shading
    for i in range(10):
        d.line((W - 1 - i, 0, W - 1 - i, H), fill=hex_rgb("#e3d9bd"))
    # double rule masthead
    d.rectangle((14, 14, W - 14, H - 14), outline=INK, width=2)
    d.rectangle((20, 20, W - 20, H - 20), outline=INK, width=1)
    # masthead
    f_mast = ImageFont.truetype(URDU, 110)
    mast = "پیامِ ادب"
    bbox = d.textbbox((0, 0), mast, font=f_mast)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2 - bbox[0], 44 - bbox[1]), mast, font=f_mast, fill=GREEN)
    # masthead rules
    d.line((28, 210, W - 28, 210), fill=INK, width=3)
    d.line((28, 216, W - 28, 216), fill=INK, width=1)
    f_tag = ImageFont.truetype(NASKH, 26)
    tag = "اردو ادب، روایت سے نئی نسل تک"
    bbox = d.textbbox((0, 0), tag, font=f_tag)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2 - bbox[0], 228 - bbox[1]), tag, font=f_tag, fill=GOLD)
    d.line((28, 278, W - 28, 278), fill=INK, width=2)

    # headline band
    f_head = ImageFont.truetype(URDU, 44)
    head = "ادبِ عالی کی نئی.publisher نسل تک رسائی"
    head = "ادبی روایت اور نئی نسل کی ذمہ داری"
    bbox = d.textbbox((0, 0), head, font=f_head)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2 - bbox[0], 300 - bbox[1]), head, font=f_head, fill=INK)
    d.line((28, 386, W - 28, 386), fill=INK, width=1)

    # 3 text columns with a middle photo box
    fake_text(d, 40, 410, 230, 840, 22, hex_rgb("#4a4438"), seed=1)
    fake_text(d, W - 230, 410, W - 40, 840, 22, hex_rgb("#4a4438"), seed=2)
    d.line((240, 410, 240, 840), fill=INK, width=1)
    d.line((W - 240, 410, W - 240, 840), fill=INK, width=1)
    # center photo box (books motif)
    d.rectangle((260, 410, W - 260, 620), outline=INK, width=2)
    ph = Image.new("RGB", (W - 524, 206), EM_DEEP)
    pd = ImageDraw.Draw(ph)
    for i, cx in enumerate(range(28, ph.width - 60, 44)):
        hgt = [150, 120, 165, 100, 140, 120, 155][i % 7]
        pd.rectangle((cx, ph.height - 24 - hgt, cx + 30, ph.height - 24), fill=hex_rgb(["#8a5a2b","#6d4123","#a06a34","#5d3a20","#92603a","#7a4c28","#8a5a2b"][i % 7]))
    pd.rectangle((0, ph.height - 24, ph.width, ph.height), fill=hex_rgb("#3d2c14"))
    img.paste(ph, (262, 412))
    fake_text(d, 260, 640, W - 260, 840, 22, hex_rgb("#4a4438"), seed=3)

    # footer rule
    d.line((28, H - 44, W - 28, H - 44), fill=INK, width=2)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "JPEG", quality=88)
    print("cover:", path)

def news_cover(path, title):
    W, H = 640, 420
    img = Image.new("RGB", (W, H), EM_DEEP)
    grad = Image.new("L", (1, H))
    for y in range(H):
        grad.putpixel((0, y), int(100 * (y / H)))
    img = Image.composite(Image.new("RGB", (W, H), EM_INK), img, grad.resize((W, H)))
    d = ImageDraw.Draw(img)
    # star lattice corners
    for cx, cy, r in ((56, 62, 30), (W - 56, 62, 30), (56, H - 62, 22), (W - 56, H - 62, 22)):
        pts = []
        for i in range(16):
            ang = i * 22.5 * 3.14159 / 180
            rr = r if i % 2 == 0 else r * 0.4
            pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
        d.polygon(pts, outline=GOLD_SOFT, width=2)
    f = ImageFont.truetype(URDU, 46)
    words = title.split()
    lines, cur = [], ""
    tmp = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    for w_ in words:
        cand = (cur + " " + w_).strip()
        bbox = tmp.textbbox((0, 0), cand, font=f)
        if bbox[2] - bbox[0] > W - 180 and cur:
            lines.append(cur); cur = w_
        else:
            cur = cand
    lines.append(cur)
    lines = lines[:3]
    y = H // 2 - len(lines) * 62 // 2
    for ln in lines:
        bbox = d.textbbox((0, 0), ln, font=f)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) / 2 - bbox[0], y - bbox[1]), ln, font=f, fill=hex_rgb("#f3ead2"))
        y += 62
    y0 = y + 6
    d.line((W // 2 - 110, y0, W // 2 + 110, y0), fill=GOLD, width=2)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "JPEG", quality=88)
    print("cover:", path)

import math
np_url = os.path.join(OUT_NP, "shumara-1.jpg")
newspaper_cover(np_url)

con = sqlite3.connect("db/custom.db")
con.execute("UPDATE NewspaperEdition SET coverUrl=? WHERE coverUrl IS NULL OR coverUrl=''", ("/newspaper-covers/shumara-1.jpg",))
rows = con.execute("SELECT id, title FROM News WHERE coverUrl IS NULL OR coverUrl=''").fetchall()
for i, (nid, title) in enumerate(rows, 1):
    news_cover(os.path.join(OUT_NW, f"news-{i}.jpg"), title)
    con.execute("UPDATE News SET coverUrl=? WHERE id=?", (f"/news-covers/news-{i}.jpg", nid))
con.commit()
print("editions+news updated")
con.close()

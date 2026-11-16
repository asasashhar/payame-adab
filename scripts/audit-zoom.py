#!/usr/bin/env python3
"""Crop problem areas from audit screenshots into one labeled composite sheet."""
from PIL import Image, ImageDraw, ImageFont

OUT = "/tmp/audit"
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
except Exception:
    font = ImageFont.load_default()

CROPS = [
    # (file, box(left,top,right,bottom) or None=full, label, target_width)
    ("pubpoetry-d.png", (0, 60, 1366, 420), "1. /poetry hero banner - title almost invisible (washed out)", 800),
    ("pubarticles-d.png", (0, 60, 1366, 420), "2. /articles hero banner - same washed banner", 800),
    ("pubmagazine-d.png", (0, 60, 1366, 500), "3. /magazine hero washed + lone card far edge", 800),
    ("pubfeedback-d.png", None, "4. /feedback - no site header, no footer (standalone)", 700),
    ("pubnewspaper-m.png", (0, 0, 390, 200), "5. mobile header - logo appears twice", 700),
    ("pubdictionary-m.png", (0, 780, 390, 1200), "6. /dictionary - wrong English gloss for naakaam", 700),
    ("pubnewspaper-m.png", (0, 180, 390, 700), "7. /newspaper - invalid date 2026-47-20", 700),
    ("pubnews=cmwir2pre0003oqxl61s0tip1-d.png", (150, 480, 1200, 900), "8. /news/[id] - huge megaphone placeholder", 800),
    ("pubbooks=cmwir2pj3000zoqx7nnbv3qfz-m.png", (0, 200, 390, 1100), "9. /books/[id] mobile - oversized cover placeholder", 700),
    ("pubpoetry=cmwir2pid000aoqx7drp2n183-m.png", (0, 300, 390, 850), "10. /poetry/[id] mobile - watermark over text", 700),
    ("pubsubmit-d.png", (300, 60, 1050, 500), "11. /submit - odd heading (login gate)", 700),
    ("pubsearch-d.png", (0, 60, 900, 420), "12. /search heading + empty state", 700),
]

cells = []
for f, box, label, tw in CROPS:
    im = Image.open(f"{OUT}/{f}").convert("RGB")
    if box:
        im = im.crop(box)
    w, h = im.size
    th = int(tw * h / w)
    im = im.resize((tw, th), Image.LANCZOS)
    cells.append((label, im))

PAD, LABEL_H = 10, 24
cols = 2
rows = (len(cells) + 1) // 2
col_w = max(c[1].width for c in cells) + PAD
row_h = []
for r in range(rows):
    pair = cells[r*2:(r+1)*2]
    row_h.append(max(c[1].height for c in pair) + LABEL_H + PAD)
W = col_w * 2 + PAD
H = sum(row_h) + PAD
sheet = Image.new("RGB", (W, min(H, 3600)), (24, 24, 24))
d = ImageDraw.Draw(sheet)
y = PAD
for r in range(rows):
    x = PAD
    for label, im in cells[r*2:(r+1)*2]:
        d.text((x, y), label, fill=(255, 220, 120), font=font)
        sheet.paste(im, (x, y + LABEL_H))
        x += col_w
    y += row_h[r]
sheet = sheet.crop((0, 0, W, min(H, y)))
sheet.save(f"{OUT}/zoom-composite.jpg", quality=80)
print("saved", f"{OUT}/zoom-composite.jpg", sheet.size)

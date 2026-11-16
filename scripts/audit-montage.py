#!/usr/bin/env python3
"""Build labeled montage grids from audit screenshots. Usage: montage.py <out_prefix> <img1> <img2> ..."""
import sys, os
from PIL import Image, ImageDraw, ImageFont

COLS, THUMB_W, PAD, LABEL_H = 3, 560, 8, 22
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
except Exception:
    font = ImageFont.load_default()

def grid(out, paths):
    cells = []
    for p in paths:
        if not os.path.exists(p) or os.path.getsize(p) == 0:
            continue
        im = Image.open(p).convert("RGB")
        w, h = im.size
        th = max(120, int(THUMB_W * h / w))
        cells.append((p, im.resize((THUMB_W, th), Image.LANCZOS)))
    if not cells:
        return
    rows = (len(cells) + COLS - 1) // COLS
    row_h = []
    for r in range(rows):
        row_h.append(max(c[1].height for c in cells[r*COLS:(r+1)*COLS]) + LABEL_H + PAD)
    W = COLS * (THUMB_W + PAD) + PAD
    H = sum(row_h) + PAD
    sheet = Image.new("RGB", (W, H), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    y = PAD
    for r in range(rows):
        x = PAD
        for c in cells[r*COLS:(r+1)*COLS]:
            name = os.path.basename(c[0]).replace(".png", "")
            d.text((x, y), name[:60], fill=(255, 220, 120), font=font)
            sheet.paste(c[1], (x, y + LABEL_H))
            x += THUMB_W + PAD
        y += row_h[r]
    sheet.save(out, quality=82)
    print(f"{out}: {len(cells)} thumbs {W}x{H}")

if __name__ == "__main__":
    grid(sys.argv[1], sys.argv[2:])

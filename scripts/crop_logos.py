#!/usr/bin/env python3
"""Crop the two new Payam-e-Adab logos from the uploaded logo sheet.

The sheet (upload/43712777-*.png) contains:
  - left:  circular badge (gold ring, dark disc, blue/gold calligraphy)
  - right: horizontal lockup (پیامِ ادب + quill + open book + PAYAM-E-ADAB + tagline)

Outputs:
  - public/brand/logo-badge.png       (square, transparent-friendly black disc)
  - public/brand/logo-horizontal.png  (wide lockup on black)
  - public/icon.png + src/app/favicon handled separately
"""
from PIL import Image
import os

SRC = "/home/z/my-project/upload/43712777-55c0-47cf-b267-93e7b158c568.png"
OUT_DIR = "/home/z/my-project/public/brand"

img = Image.open(SRC).convert("RGBA")
W, H = img.size
print("sheet size:", img.size)

# --- inspect content bounds by scanning dark pixels (logos sit on pure black bg) ---
import numpy as np
a = np.array(img)
rgb = a[..., :3].astype(int)
# "logo" pixels: not near-black
bright = (rgb.sum(axis=2) > 90)
cols = bright.any(axis=0)
rows = bright.any(axis=1)
xs = np.where(cols)[0]
ys = np.where(rows)[0]
print("content bbox: x", xs.min(), xs.max(), "y", ys.min(), ys.max())

# visual split: circle ends ~x=272/866, lockup starts ~x=292/866 (from rendered sheet)
col_counts = bright.sum(axis=0)
# verify the quiet zone between 270 and 295
quiet = [(x, int(col_counts[x])) for x in range(260, 300)]
print("quiet zone:", quiet)
split = 300

def crop_nonblack(region: Image.Image) -> Image.Image:
    arr = np.array(region)
    r = arr[..., :3].astype(int)
    b = (r.sum(axis=2) > 90)
    ys_ = np.where(b.any(axis=1))[0]
    xs_ = np.where(b.any(axis=0))[0]
    pad = 6
    y0 = max(0, ys_.min() - pad); y1 = min(arr.shape[0], ys_.max() + pad)
    x0 = max(0, xs_.min() - pad); x1 = min(arr.shape[1], xs_.max() + pad)
    return region.crop((x0, y0, x1, y1))

left = img.crop((0, 0, split, H))
right = img.crop((split, 0, W, H))
badge = crop_nonblack(left)
lockup = crop_nonblack(right)
print("badge:", badge.size, "lockup:", lockup.size)

os.makedirs(OUT_DIR, exist_ok=True)
badge.save(f"{OUT_DIR}/logo-badge.png")
lockup.save(f"{OUT_DIR}/logo-horizontal.png")

# square favicon 512 (badge on dark disc already square-ish; pad to square)
bw, bh = badge.size
side = max(bw, bh)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(badge, ((side - bw) // 2, (side - bh) // 2), badge)
sq512 = sq.resize((512, 512), Image.LANCZOS)
sq512.save("/home/z/my-project/public/icon.png")
print("saved badge, lockup, icon512")

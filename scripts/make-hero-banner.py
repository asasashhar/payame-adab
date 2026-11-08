#!/usr/bin/env python3
"""Recompose the official brand banner (hero-emblem.jpg) into a hero strip:
   books (left) + clean dark-wall stage (center) + quill/inkwell (right).
   The central emblem is removed; the middle is a soft palette-matched
   gradient blended seamlessly with feathered edges.
"""
from PIL import Image, ImageFilter
import statistics

SRC = "/home/z/my-project/public/brand/hero-emblem.jpg"
OUT = "/home/z/my-project/public/brand/hero-banner.jpg"

im = Image.open(SRC).convert("RGB")
w, h = im.size  # 1536 x 864

CUT_L, CUT_R = 380, 1170          # safely outside the emblem ring
left = im.crop((0, 0, CUT_L, h))
right = im.crop((CUT_R, 0, w, h))
mid_w = CUT_R - CUT_L


def patch_avg(cx, cy, r=18):
    px = []
    for x in range(cx - r, cx + r):
        for y in range(cy - r, cy + r):
            px.append(im.getpixel((x, y)))
    return tuple(int(statistics.mean(c[i] for c in px)) for i in range(3))


# palette samples from clean regions
wall_top = patch_avg(320, 60)
wall_mid = patch_avg(1180, 140)
desk = patch_avg(250, 845)

# vertical gradient: wall (top 72%) then desk wood (bottom 28%)
mid = Image.new("RGB", (mid_w, h))
top_h = int(h * 0.72)
for y in range(h):
    if y < top_h:
        t = y / top_h
        a = wall_top
        b = wall_mid
    else:
        t = (y - top_h) / (h - top_h)
        a = wall_mid
        b = desk
    row = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
    for x in range(mid_w):
        mid.putpixel((x, y), row)
mid = mid.filter(ImageFilter.GaussianBlur(1.2))

# feathered alpha masks so strips blend into the gradient stage
FEATHER = 70
lmask = Image.new("L", left.size, 255)
for x in range(FEATHER):
    for y in range(h):
        lmask.putpixel((left.width - 1 - x, y), int(255 * x / FEATHER))
rmask = Image.new("L", right.size, 255)
for x in range(FEATHER):
    for y in range(h):
        rmask.putpixel((x, y), int(255 * x / FEATHER))

canvas = Image.new("RGB", (w, h))
canvas.paste(mid, (CUT_L, 0))
canvas.paste(left, (0, 0), lmask)
canvas.paste(right, (CUT_L + mid_w, 0), rmask)
canvas.save(OUT, quality=88)
print("saved", OUT, canvas.size, "wall_top", wall_top, "wall_mid", wall_mid, "desk", desk)

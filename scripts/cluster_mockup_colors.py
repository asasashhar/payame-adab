#!/usr/bin/env python3
"""Cluster the saturated brand colors out of the homepage mockup."""
from PIL import Image
import numpy as np

img = Image.open("/home/z/my-project/upload/9bf972bc-ed35-42c0-bfc1-d785d3827019.png").convert("RGB")
a = np.array(img).astype(float) / 255.0

import colorsys
h, w, _ = a.shape
px = a.reshape(-1, 3)
# subsample for speed
px = px[::17]

mx = px.max(axis=1); mn = px.min(axis=1)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
val = mx

def hsv_of(rgb):
    return colorsys.rgb_to_hsv(*rgb)

greens, golds, ivories = {}, {}, {}
for r, g, b in px:
    hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
    if ss < 0.25 or vv < 0.12:
        continue
    hh *= 360
    if 120 <= hh <= 170:   # green
        key = (int(r*255)//12*12, int(g*255)//12*12, int(b*255)//12*12)
        greens[key] = greens.get(key, 0) + 1
    elif 38 <= hh <= 58:   # gold/yellow
        key = (int(r*255)//12*12, int(g*255)//12*12, int(b*255)//12*12)
        golds[key] = golds.get(key, 0) + 1

print("TOP GREENS:")
for c, n in sorted(greens.items(), key=lambda kv: -kv[1])[:8]:
    print(f"  #{c[0]:02x}{c[1]:02x}{c[2]:02x}  ×{n}")
print("TOP GOLDS:")
for c, n in sorted(golds.items(), key=lambda kv: -kv[1])[:8]:
    print(f"  #{c[0]:02x}{c[1]:02x}{c[2]:02x}  ×{n}")

# ivory background = most common near-white warm pixel
warm_white = {}
for r, g, b in px:
    if r > 0.93 and g > 0.9 and b > 0.82 and (r - b) > 0.03:
        key = (int(r*255)//8*8, int(g*255)//8*8, int(b*255)//8*8)
        warm_white[key] = warm_white.get(key, 0) + 1
print("TOP WARM IVORIES:")
for c, n in sorted(warm_white.items(), key=lambda kv: -kv[1])[:6]:
    print(f"  #{c[0]:02x}{c[1]:02x}{c[2]:02x}  ×{n}")

# deep green bars: most common very dark green
dark_green = {}
for r, g, b in px:
    hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
    if 120 <= hh*360 <= 170 and ss > 0.4 and vv < 0.32:
        key = (int(r*255)//8*8, int(g*255)//8*8, int(b*255)//8*8)
        dark_green[key] = dark_green.get(key, 0) + 1
print("TOP DEEP BAR GREENS (v<0.32):")
for c, n in sorted(dark_green.items(), key=lambda kv: -kv[1])[:8]:
    print(f"  #{c[0]:02x}{c[1]:02x}{c[2]:02x}  ×{n}")

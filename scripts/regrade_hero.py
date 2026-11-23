#!/usr/bin/env python3
"""Re-grade the literary hero banner from navy tones to the mockup's
deep forest green, keeping gold/ivory elements untouched (hue remap)."""
from PIL import Image
import numpy as np
import colorsys

src = Image.open("/home/z/my-project/public/brand/hero-emblem.jpg").convert("RGB")
arr = np.array(src).astype(float) / 255.0
h, w, _ = arr.shape
out = arr.copy()

# vectorized HSV hue remap for blue/navy pixels -> forest green
px = arr.reshape(-1, 3)
r, g, b = px[:, 0], px[:, 1], px[:, 2]
mx = px.max(axis=1); mn = px.min(axis=1)
diff = mx - mn
hue = np.zeros(len(px))
m = diff > 1e-6
# standard hue formula (vectorized)
rr = np.where(m, (mx - r) / np.maximum(diff, 1e-6), 0)
gg = np.where(m, (mx - g) / np.maximum(diff, 1e-6), 0)
bb = np.where(m, (mx - b) / np.maximum(diff, 1e-6), 0)
hue = np.where(mx == r, 60 * ((gg - bb) % 6), np.where(mx == g, 60 * (bb + 2), 60 * (rr + 4))) % 360
sat = np.where(mx > 0, diff / np.maximum(mx, 1e-6), 0)
val = mx

# blue/navy mask: hue 190-270 with some saturation
mask = (hue >= 185) & (hue <= 275) & (sat > 0.12)
# shift to green (~150-160)
new_hue = hue.copy()
new_hue[mask] = 150 + (hue[mask] - 185) / 90 * 12  # 150-162
new_sat = sat.copy()
new_sat[mask] = np.clip(sat[mask] * 0.92, 0, 0.72)
new_val = val.copy()
new_val[mask] = val[mask] * 0.98

# rebuild rgb from hsv (vectorized)
hh = new_hue / 60.0
i = np.floor(hh).astype(int) % 6
f = hh - np.floor(hh)
p = new_val * (1 - new_sat)
q = new_val * (1 - new_sat * f)
t = new_val * (1 - new_sat * (1 - f))
r2 = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [new_val, q, p, p, t, new_val])
g2 = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [t, new_val, new_val, q, p, p])
b2 = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [p, p, t, new_val, new_val, q])

res = np.stack([r2, g2, b2], axis=1).reshape(h, w, 3)
img = Image.fromarray((np.clip(res, 0, 1) * 255).astype(np.uint8))

# slight warm-gold wash on the center for the mockup glow
wash = Image.new("RGBA", (w, h), (0, 0, 0, 0))
from PIL import ImageDraw, ImageFilter
d = ImageDraw.Draw(wash)
cx, cy = w // 2, int(h * 0.44)
for rad in range(480, 0, -12):
    a = int((480 - rad) / 480 * 46)
    d.ellipse([cx - rad, cy - int(rad * 0.6), cx + rad, cy + int(rad * 0.6)], fill=(236, 214, 160, a))
wash = wash.filter(ImageFilter.GaussianBlur(70))
img = Image.alpha_composite(img.convert("RGBA"), wash).convert("RGB")

img.save("/home/z/my-project/public/brand/hero-emblem.jpg", quality=92)
print("hero-emblem regraded ->", img.size)

#!/usr/bin/env python3
"""Compose a mockup-style literary hero banner from the approved assets:
deep forest green wash + warm gold vignette + ivory glow center, using the
transparent circular emblem at left and soft book-shelf tones (no fake photos).
Draws a decorative watercolor-like gradient scene entirely procedurally.
"""
from PIL import Image, ImageDraw, ImageFilter
import math

W, H = 1536, 864
badge = Image.open("/home/z/my-project/public/brand/logo-badge.png").convert("RGBA")

# base: horizontal green gradient (deep forest edges -> warm ivory-gold center glow)
base = Image.new("RGB", (W, H), (6, 66, 42))
d = ImageDraw.Draw(base, "RGBA")
for x in range(W):
    t = x / W
    # center warm glow band
    glow = max(0.0, 1 - abs(t - 0.5) * 2.2) ** 1.6
    r = int(6 + glow * (248 - 6) * 0.42)
    g = int(66 + glow * (241 - 66) * 0.5)
    b = int(42 + glow * (231 - 42) * 0.55)
    d.line([(x, 0), (x, H)], fill=(r, g, b))

# radial warm light in the center
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
cx, cy = W // 2, int(H * 0.42)
for radius in range(520, 0, -14):
    a = int(10 + (520 - radius) / 520 * 42)
    gd.ellipse([cx - radius, cy - int(radius * 0.62), cx + radius, cy + int(radius * 0.62)], fill=a)
glow = glow.filter(ImageFilter.GaussianBlur(60))
warm = Image.new("RGB", (W, H), (244, 226, 178))
base = Image.composite(warm, base, glow)

d = ImageDraw.Draw(base, "RGBA")

# soft ornamental arches (subtle mosque-dome silhouette, mockup vibe)
for i, (dx, scale, alpha) in enumerate([(-420, 1.0, 26), (430, 0.92, 24), (0, 1.25, 30)]):
    ax = cx + dx
    dome_w = int(240 * scale)
    dome_h = int(150 * scale)
    top = int(H * 0.16)
    # dome
    d.ellipse([ax - dome_w, top - dome_h, ax + dome_w, top + dome_h], fill=(4, 48, 30, alpha))
    # drum + spire
    d.rectangle([ax - int(dome_w * 0.55), top, ax + int(dome_w * 0.55), H], fill=(4, 44, 28, alpha))
    d.line([(ax, top - dome_h - int(70 * scale)), (ax, top - dome_h)], fill=(226, 197, 124, alpha + 30), width=3)

# gold ornament arc across bottom (mockup's golden wave)
pts = []
for x in range(0, W + 1, 8):
    y = int(H * 0.865 + math.sin(x / 130) * 9 + math.sin(x / 57) * 4)
    pts.append((x, y))
d.line(pts, fill=(226, 197, 124, 200), width=5)
pts2 = [(x, y + 14) for x, y in pts]
d.line(pts2, fill=(181, 137, 30, 120), width=2)

# vignette
vig = Image.new("L", (W, H), 0)
vd = ImageDraw.Draw(vig)
vd.ellipse([-int(W * 0.12), -int(H * 0.22), int(W * 1.12), int(H * 1.22)], fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(140))
dark = Image.new("RGB", (W, H), (2, 28, 17))
base = Image.composite(base, dark, vig)

# emblem: left side like the mockup (large, softly glowing)
em = badge.resize((330, int(330 * badge.size[1] / badge.size[0])), Image.LANCZOS)
halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
hd = ImageDraw.Draw(halo)
ex, ey = 150, int(H * 0.5) - em.size[1] // 2
hd.ellipse([ex - 40, ey - 40, ex + em.size[0] + 40, ey + em.size[1] + 40], fill=(248, 241, 231, 60))
halo = halo.filter(ImageFilter.GaussianBlur(46))
base.paste(halo, (0, 0), halo)
base.paste(em, (ex, ey), em)

base.save("/home/z/my-project/public/brand/hero-banner.jpg", quality=90)
print("hero-banner composed", base.size)

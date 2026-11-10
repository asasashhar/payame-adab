#!/usr/bin/env python3
"""Compose the green-reference photographic hero banner:
- crop the generated photo to the wide hero band (books + quill visible)
- add mockup-style emerald wave + gold rule at top and bottom edges
Output: public/brand/hero-banner.jpg (site default hero, admin-replaceable)
"""
from PIL import Image, ImageDraw, ImageFilter
import math

SRC = "/tmp/render/hero-gen.png"
OUT = "/home/z/my-project/public/brand/hero-banner.jpg"

W, H = 1440, 500

im = Image.open(SRC).convert("RGB")  # 1344x768
# crop a 1344x467 band (3:1-ish) slightly above vertical center to keep books+quill
band_h = int(1344 * H / W)  # 467
top = int((768 - band_h) * 0.42)
im = im.crop((0, top, 1344, top + band_h)).resize((W, H), Image.LANCZOS)

EMERALD = (6, 66, 42)
EMERALD_DARK = (3, 48, 28)
GOLD = (181, 137, 30)
GOLD_SOFT = (226, 197, 124)

overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)

def wave(draw, y_base, amp, phase, color, height_scale=1.0, fill_bottom=None):
    """Draw a filled sine wave band."""
    pts = [(x, y_base + amp * math.sin(2 * math.pi * (x / W) * 1.5 + phase)) for x in range(0, W + 1, 8)]
    if fill_bottom == "down":
        poly = pts + [(W, H), (0, H)]
    else:
        poly = pts + [(W, 0), (0, 0)]
    draw.polygon(poly, fill=color)

# top emerald wave band (thin, like mockup header shadow)
wave(d, 14, 7, 0.4, EMERALD + (255,))
# gold rule under the top wave
for x in range(0, W + 1, 4):
    y = 18 + 7 * math.sin(2 * math.pi * (x / W) * 1.5 + 0.4)
    d.ellipse([x - 1.6, y - 1.6, x + 1.6, y + 1.6], fill=GOLD_SOFT + (235,))

# bottom emerald wave band (taller, mockup footer shadow)
wave(d, H - 26, 9, 2.2, EMERALD + (255,), fill_bottom="down")
wave(d, H - 34, 9, 2.2, EMERALD_DARK + (160,), fill_bottom="down")
# gold rule above the bottom wave
for x in range(0, W + 1, 4):
    y = H - 34 + 9 * math.sin(2 * math.pi * (x / W) * 1.5 + 2.2)
    d.ellipse([x - 1.6, y - 1.6, x + 1.6, y + 1.6], fill=GOLD_SOFT + (235,))

overlay = overlay.filter(ImageFilter.GaussianBlur(0.6))
out = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")
out.save(OUT, quality=90)
print("saved", OUT, out.size)

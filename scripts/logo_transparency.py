#!/usr/bin/env python3
"""Convert the cropped logos to transparent-background PNGs.

Luminance-keyed alpha: near-black artwork background becomes transparent,
dark navy/gold strokes keep their color with proportional alpha so edges stay smooth.
The circular badge keeps its inner disc look via a subtle dark translucent fill
so it still reads as a seal on light backgrounds.
"""
from PIL import Image
import numpy as np

BRAND = "/home/z/my-project/public/brand"

def alpha_keyed(path_in, path_out, threshold=58, floor_alpha=0):
    img = Image.open(path_in).convert("RGBA")
    a = np.array(img).astype(float)
    lum = a[..., :3].max(axis=2)  # channel max: blue/navy strokes stay strong
    # alpha ramps 0 -> 255 between threshold and threshold+60
    t = np.clip((lum - threshold) / 60.0, 0, 1)
    alpha = (t * 255).astype(np.uint8)
    if floor_alpha:
        alpha = np.maximum(alpha, floor_alpha)
    a[..., 3] = alpha
    Image.fromarray(a.astype(np.uint8)).save(path_out)
    print("wrote", path_out)

# 1) badge: background fully transparent (floor 0)
alpha_keyed(f"{BRAND}/logo-badge.png", f"{BRAND}/logo-badge.png", threshold=52)

# 2) lockup: background fully transparent
alpha_keyed(f"{BRAND}/logo-horizontal.png", f"{BRAND}/logo-horizontal.png", threshold=52)

# 3) favicon/app icon: badge on true transparent, 512
badge = Image.open(f"{BRAND}/logo-badge.png").convert("RGBA")
side = max(badge.size)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(badge, ((side - badge.size[0]) // 2, (side - badge.size[1]) // 2), badge)
sq.resize((512, 512), Image.LANCZOS).save("/home/z/my-project/public/icon.png")
sq.resize((512, 512), Image.LANCZOS).save("/home/z/my-project/src/app/icon.png")
print("icons updated")

# 4) watermark: use badge, pure transparency, white-tinted for dark reading pages
wm = sq.resize((600, 600), Image.LANCZOS)
arr = np.array(wm)
arr[..., 0] = np.minimum(arr[..., 0] + 90, 255)  # lighten toward ivory
arr[..., 1] = np.minimum(arr[..., 1] + 90, 255)
arr[..., 2] = np.minimum(arr[..., 2] + 70, 255)
Image.fromarray(arr).save(f"{BRAND}/watermark.png")
print("watermark updated")

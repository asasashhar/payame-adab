#!/usr/bin/env python3
"""Sample key colors from the homepage mockup to tune the site palette."""
from PIL import Image
import numpy as np

img = Image.open("/home/z/my-project/upload/9bf972bc-ed35-42c0-bfc1-d785d3827019.png").convert("RGB")
W, H = img.size
print("mockup size:", W, H)
a = np.array(img)

def hexat(x_pct, y_pct, label, box=6):
    x = int(W * x_pct); y = int(H * y_pct)
    region = a[y-box:y+box, x-box:x+box].reshape(-1, 3).mean(axis=0).astype(int)
    r, g, b = region
    print(f"{label:34s} ({x},{y})  #{r:02x}{g:02x}{b:02x}")

# sample points from the 1212x1326 mockup (rendered earlier)
hexat(0.50, 0.012, "top utility strip green")
hexat(0.50, 0.088, "ivory header bar")
hexat(0.50, 0.125, "nav bar green")
hexat(0.886, 0.268, "hero gold button")
hexat(0.656, 0.268, "hero green button")
hexat(0.50, 0.365, "page background ivory")
hexat(0.42, 0.47,  "featured card bg")
hexat(0.90, 0.36,  "sidebar header green")
hexat(0.742, 0.575, "category pill active")
hexat(0.103, 0.902, "footer green")
hexat(0.55, 0.44,   "article heading color")
hexat(0.876, 0.55,  "word-of-day card bg")
hexat(0.876, 0.485, "word gold border")
hexat(0.066, 0.483, "ribbon green (آج کی منتخب)")

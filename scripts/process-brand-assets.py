#!/usr/bin/env python3
"""Process the new official Payam-e-Adab brand assets:
- Crop circular badge + horizontal logo from the logo sheet (black bg -> transparent)
- Replace hero-emblem.jpg and og-image.jpg with the premium brand banner
- Refresh favicon (app/icon.png), watermark.png
Old assets are backed up to db/backups/brand-v1-2026-11-08/
"""
import os, shutil
from PIL import Image, ImageDraw, ImageFilter

UP = "/home/z/my-project/upload"
BRAND = "/home/z/my-project/public/brand"
BK = "/home/z/my-project/db/backups/brand-v1-2026-11-08"
os.makedirs(BK, exist_ok=True)

# ---------- backup current assets ----------
for f in ["logo-badge.png", "logo-horizontal.png", "watermark.png", "hero-emblem.jpg", "og-image.jpg"]:
    src = os.path.join(BRAND, f)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(BK, f))
icon_svg = "/home/z/my-project/src/app/icon.svg"
if os.path.exists(icon_svg):
    shutil.copy2(icon_svg, os.path.join(BK, "icon.svg"))
print("backup done:", os.listdir(BK))

# ---------- helpers ----------
def content_bbox(img, thr=40):
    """bounding box of non-dark pixels"""
    g = img.convert("L")
    w, h = g.size
    px = g.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    step = 2
    for y in range(0, h, step):
        for x in range(0, w, step):
            if px[x, y] > thr:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    return (minx, miny, maxx, maxy)

def flood_transparent(img, thr=42):
    """make near-black background transparent via border flood fill"""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    from collections import deque
    seen = bytearray(w * h)
    q = deque()
    def push(x, y):
        if 0 <= x < w and 0 <= y < h and not seen[y * w + x]:
            seen[y * w + x] = 1
            q.append((x, y))
    for x in range(w):
        push(x, 0); push(x, h - 1)
    for y in range(h):
        push(0, y); push(w - 1, y)
    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        if lum < thr:
            px[x, y] = (r, g, b, 0)
            push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
    return img

# ---------- 1. logo sheet ----------
sheet = Image.open(os.path.join(UP, "43712777-55c0-47cf-b267-93e7b158c568.png")).convert("RGB")
W, H = sheet.size
print("sheet size:", sheet.size)

# badge = left portion, horizontal = right portion (split at ~36%)
split = int(W * 0.36)
left = sheet.crop((0, 0, split, H))
right = sheet.crop((split, 0, W, H))

bx = content_bbox(left)
print("badge bbox:", bx)
bw, bh = bx[2] - bx[0], bx[3] - bx[1]
side = max(bw, bh) + 8
cx, cy = (bx[0] + bx[2]) // 2, (bx[1] + bx[3]) // 2
half = side // 2
badge = left.crop((max(0, cx - half), max(0, cy - half), min(split, cx + half), min(H, cy + half)))
# circular alpha mask (mask must exactly match badge size)
badge = badge.convert("RGBA")
if badge.size[0] != badge.size[1]:
    side = min(badge.size)
    x0 = (badge.size[0] - side) // 2
    y0 = (badge.size[1] - side) // 2
    badge = badge.crop((x0, y0, x0 + side, y0 + side))
mask = Image.new("L", badge.size, 0)
d = ImageDraw.Draw(mask)
d.ellipse((1, 1, badge.size[0] - 1, badge.size[1] - 1), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(0.6))
badge.putalpha(mask)
badge512 = badge.resize((512, 512), Image.LANCZOS)
badge512.save(os.path.join(BRAND, "logo-badge.png"))
badge512.save(os.path.join(BRAND, "watermark.png"))
badge512.save("/home/z/my-project/src/app/icon.png")
print("badge saved", badge512.size)

# horizontal logo with transparent bg
hx = content_bbox(right)
print("hlogo bbox:", hx)
pad = 10
hlogo = right.crop((max(0, hx[0] - pad), max(0, hx[1] - pad), min(right.size[0], hx[2] + pad), min(right.size[1], hx[3] + pad)))
hlogo = flood_transparent(hlogo)
scale = 1400 / hlogo.size[0]
hlogo = hlogo.resize((1400, int(hlogo.size[1] * scale)), Image.LANCZOS)
hlogo.save(os.path.join(BRAND, "logo-horizontal.png"))
print("horizontal saved", hlogo.size)

# quick alpha sanity: share of transparent pixels
for name, im in [("badge", badge512), ("hlogo", hlogo)]:
    a = im.getchannel("A")
    hist = a.histogram()
    transparent = sum(hist[:10]) / (im.size[0] * im.size[1])
    print(f"{name} transparent%: {transparent:.1%}")

# ---------- 2. premium banner -> hero + og ----------
banner = Image.open(os.path.join(UP, "eb913ef0-0bb3-4f07-a468-23a00f9d0afe (1).png")).convert("RGB")
print("banner size:", banner.size)
if banner.size[0] > 1600:
    r = 1600 / banner.size[0]
    banner_r = banner.resize((1600, int(banner.size[1] * r)), Image.LANCZOS)
else:
    banner_r = banner
banner_r.save(os.path.join(BRAND, "hero-emblem.jpg"), quality=90)

# og 1200x630 center crop
w, h = banner.size
target = 1200 / 630
if w / h > target:
    nw = int(h * target); x0 = (w - nw) // 2
    og = banner.crop((x0, 0, x0 + nw, h))
else:
    nh = int(w / target); y0 = (h - nh) // 2
    og = banner.crop((0, y0, w, y0 + nh))
og = og.resize((1200, 630), Image.LANCZOS)
og.save(os.path.join(BRAND, "og-image.jpg"), quality=88)
print("hero + og saved")

# remove old svg favicon so the official badge becomes the favicon
if os.path.exists(icon_svg):
    os.remove(icon_svg)
    print("icon.svg removed (icon.png = badge now)")
print("ALL DONE")

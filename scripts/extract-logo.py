#!/usr/bin/env python3
"""
Extract the two official Payam-e-Adab logo variants from the provided
brand sheet (upload/28797088-...jpg) and regenerate site brand assets:

  public/brand/logo-badge.png        circular badge (square, transparent bg)
  public/brand/logo-horizontal.png   horizontal lockup (transparent bg)
  public/brand/watermark.png         square watermark canvas from horizontal art
  public/icon.png                    favicon 512x512 from badge
  public/icon.svg                    simple svg wrapper pointing at badge art

Background removal: flood-fill from image borders over near-white pixels only,
so white areas INSIDE the artwork (book pages, highlights) stay opaque.
"""
from PIL import Image, ImageFilter
from collections import deque
import os

SRC = "/home/z/my-project/upload/28797088-203a-453b-918b-5ea9990ac210.jpg"
OUT = "/home/z/my-project/public/brand"

WHITE_TOL = 238   # a pixel is "background candidate" when min(r,g,b) >= this
EDGE_PAD = 4


def find_boxes(im: Image.Image):
    """Split the brand sheet into the badge (left) and horizontal (right) halves
    by locating the large white gap in the middle."""
    w, h = im.size
    g = im.convert("L")
    px = g.load()
    # column whiteness profile
    col_min = []
    for x in range(w):
        m = 255
        for y in range(0, h, 6):
            v = px[x, y]
            if v < m:
                m = v
        col_min.append(m)
    # find the widest run of all-white columns near the middle third
    mid_start, mid_end = int(w * 0.28), int(w * 0.62)
    best = (0, mid_start, mid_start)
    run_start = None
    for x in range(mid_start, mid_end):
        if col_min[x] >= WHITE_TOL:
            if run_start is None:
                run_start = x
        else:
            if run_start is not None and (x - run_start) > best[0]:
                best = (x - run_start, run_start, x)
            run_start = None
    if run_start is not None and (mid_end - run_start) > best[0]:
        best = (mid_end - run_start, run_start, mid_end)
    _, gap_a, gap_b = best
    split = (gap_a + gap_b) // 2
    print(f"gap cols {gap_a}..{gap_b} → split at {split}")
    return (0, 0, split, h), (split, 0, w, h)


def bbox_nonwhite(im: Image.Image, pad=2):
    g = im.convert("L")
    px = g.load()
    w, h = im.size
    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if px[x, y] < WHITE_TOL:
                if x < x0: x0 = x
                if y < y0: y0 = y
                if x > x1: x1 = x
                if y > y1: y1 = y
    if x1 < x0:
        return (0, 0, w, h)
    return (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + 1 + pad), min(h, y1 + 1 + pad))


def strip_bg(im: Image.Image, tol=WHITE_TOL, feather=0.8):
    """Make the outer near-white background transparent via border flood fill."""
    rgba = im.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    def is_bg(x, y):
        r, g, b, _ = px[x, y]
        return min(r, g, b) >= tol
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y) and not seen[y * w + x]:
                seen[y * w + x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(x, y) and not seen[y * w + x]:
                seen[y * w + x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        px[x, y] = (255, 255, 255, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_bg(nx, ny):
                seen[ny * w + nx] = 1; q.append((nx, ny))
    if feather:
        # soften the cutout edge a touch
        a = rgba.split()[3].filter(ImageFilter.GaussianBlur(feather))
        a = a.point(lambda v: 255 if v > 210 else (0 if v < 40 else int((v - 40) * 255 / 170)))
        rgba.putalpha(a)
    return rgba


def main():
    im = Image.open(SRC)
    print("source:", im.size)
    badge_box, horiz_box = find_boxes(im)

    # ---- badge (circular) ----
    badge = im.crop(badge_box)
    bb = bbox_nonwhite(badge)
    badge = badge.crop(bb)
    # square-ify around the circle
    w, h = badge.size
    side = max(w, h)
    sq = Image.new("RGB", (side, side), (255, 255, 255))
    sq.paste(badge, ((side - w) // 2, (side - h) // 2))
    badge_t = strip_bg(sq)
    badge_t.save(os.path.join(OUT, "logo-badge.png"))
    print("logo-badge.png", badge_t.size)

    # ---- horizontal ----
    horiz = im.crop(horiz_box)
    hb = bbox_nonwhite(horiz)
    horiz = horiz.crop(hb)
    horiz_t = strip_bg(horiz)
    horiz_t.save(os.path.join(OUT, "logo-horizontal.png"))
    print("logo-horizontal.png", horiz_t.size)

    # ---- watermark: horizontal art centered on square transparent canvas ----
    lw, lh = horiz_t.size
    side = max(lw, lh)
    pad = int(side * 0.04)
    wm = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
    wm.paste(horiz_t, (pad + (side - lw) // 2, pad + (side - lh) // 2), horiz_t)
    wm.save(os.path.join(OUT, "watermark.png"))
    print("watermark.png", wm.size)

    # ---- favicon 512 ----
    fav = badge_t.resize((512, 512), Image.LANCZOS)
    fav.save("/home/z/my-project/public/icon.png")
    print("icon.png", fav.size)

    # ---- svg wrapper (badge raster) ----
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
           '<image width="512" height="512" href="/icon.png"/></svg>')
    with open("/home/z/my-project/public/icon.svg", "w") as f:
        f.write(svg)
    print("icon.svg written")


if __name__ == "__main__":
    main()

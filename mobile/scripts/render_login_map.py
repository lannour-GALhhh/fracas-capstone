"""Pre-render the dotted Zamboanga barangay map used as the login background.

Output: assets/images/login-map.png (transparent PNG, dots only; the screen supplies the navy backdrop).
Run from mobile/:  python3 scripts/render_login_map.py
"""
import json
import math
from PIL import Image, ImageDraw

W, H = 360, 780          # logical canvas (portrait phone)
OUT_SCALE = 3            # output px per logical unit
SS = 2                   # supersample factor for anti-aliasing
S = OUT_SCALE * SS
DOT = (127, 156, 200, 255)

fc = json.load(open('scripts/data/zamboanga.json'))
lng_k = math.cos(math.radians(7.2))


def rings_of(g):
    return g['coordinates'] if g['type'] == 'Polygon' else [r for poly in g['coordinates'] for r in poly]


shapes = [[[(x * lng_k, y) for x, y in ring] for ring in rings_of(f['geometry'])] for f in fc['features']]
pts = [p for sh in shapes for ring in sh for p in ring]
min_x, max_x = min(p[0] for p in pts), max(p[0] for p in pts)
min_y, max_y = min(p[1] for p in pts), max(p[1] for p in pts)
k = 0.96 * W / (max_x - min_x)  # fit the whole city to the width, centered vertically


def to_screen(p):
    return (W * 0.02 + (p[0] - min_x) * k, H / 2 + ((max_y - min_y) * k) / 2 - (p[1] - min_y) * k)


mask = Image.new('L', (W * S, H * S), 0)
md = ImageDraw.Draw(mask)
edge = Image.new('L', (W * S, H * S), 0)
ed = ImageDraw.Draw(edge)

for sh in shapes:
    for ring in sh:
        sp = [to_screen(p) for p in ring]
        md.polygon([(x * S, y * S) for x, y in sp], fill=255)
        # edge dots every 8 logical units along the outline
        carry = 0.0
        for (x0, y0), (x1, y1) in zip(sp, sp[1:] + sp[:1]):
            seg = math.hypot(x1 - x0, y1 - y0)
            d = -carry
            while d + 8 <= seg + 1e-9:
                d += 8
                t = d / seg if seg else 0
                cx, cy = (x0 + (x1 - x0) * t) * S, (y0 + (y1 - y0) * t) * S
                r = 1.5 * S
                ed.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
            carry = seg - d if seg else carry

# interior fill dots: 10-unit grid, radius 2
grid = Image.new('L', (W * S, H * S), 0)
gd = ImageDraw.Draw(grid)
for gx in range(5, W + 10, 10):
    for gy in range(5, H + 10, 10):
        r = 2 * S
        gd.ellipse(((gx * S) - r, (gy * S) - r, (gx * S) + r, (gy * S) + r), fill=255)

fill = Image.composite(grid, Image.new('L', grid.size, 0), mask)
alpha = Image.eval(Image.new('L', grid.size, 0), lambda _: 0)
alpha.paste(255, mask=fill)
alpha.paste(255, mask=edge)

img = Image.new('RGBA', alpha.size, DOT)
img.putalpha(alpha)
img = img.resize((W * OUT_SCALE, H * OUT_SCALE), Image.LANCZOS)
img.save('assets/images/login-map.png', optimize=True)
print(img.size)

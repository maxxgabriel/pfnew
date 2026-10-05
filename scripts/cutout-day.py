"""
Turn the "One Day" paintings into web layers.

  python3 scripts/cutout-day.py <dir of generated PNGs>

Every image keeps its full 1024x1536 frame (layers of a scene stack exactly).
Skies (`*_sky_*`) and the train view are kept whole; every other image is a
layer on flat magenta: alpha comes from how magenta a pixel is, edge pixels are
un-mixed from the magenta (no pink fringe). Output: src/assets/day/<name>.webp
and src/assets/day/points.json with points found in some layers (the crossing's
red lamps, the street lamps that switch on).
"""
import json, os, sys
import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = 'src/assets/day'
os.makedirs(OUT, exist_ok=True)
M = np.array([250.0, 4.0, 249.0])

def key(im):
    m = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
    a = 1 - np.clip((m - 40) / (215 - 40), 0, 1)
    fg = np.clip((im - (1 - a[..., None]) * M) / np.maximum(a, 1e-3)[..., None], 0, 255)
    fg[..., 1] = np.maximum(fg[..., 1], np.minimum(fg[..., 0], fg[..., 2]) - 60)
    a[a < 0.04] = 0
    a[:4, :] = a[-4:, :] = 0
    a[:, :4] = a[:, -4:] = 0
    return fg, a

def blobs(mask, min_px=12):
    """centres of connected blobs in a boolean mask (simple flood fill on a coarse grid)"""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    out = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        pts = []
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(pts) >= min_px:
            p = np.array(pts)
            out.append([float(p[:, 1].mean() / w), float(p[:, 0].mean() / h), len(pts),
                        [float(p[:, 1].min() / w), float(p[:, 0].min() / h), float(p[:, 1].max() / w), float(p[:, 0].max() / h)]])
    return out

points = {}
names = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png'))
for name in names:
    im = np.asarray(Image.open(f'{SRC}/{name}.png').convert('RGB')).astype(np.float64)
    whole = '_sky_' in name or name.endswith('train_view')
    if whole:
        out = Image.fromarray(im.astype(np.uint8), 'RGB')
    else:
        fg, a = key(im)
        out = Image.fromarray(np.dstack([fg, a * 255]).astype(np.uint8), 'RGBA')
        small = im[::4, ::4]
        if name.endswith('train_interior'):
            # the window: the see-through hole in the carriage
            sa = a[::4, ::4]
            hh, ww = sa.shape
            hole = sa < 0.5
            hole[:4, :] = hole[-4:, :] = False
            hole[:, :4] = hole[:, -4:] = False
            biggest = max(blobs(hole, 50), key=lambda b: b[2])
            points['window'] = biggest[3]
        if name.endswith('crossing'):
            # saturated red lamps
            r, g, b = small[..., 0], small[..., 1], small[..., 2]
            points['crossing_lamps'] = [b[:3] for b in blobs((r > 190) & (g < 80) & (b < 90), 3)]
        if name.endswith('stairs_on'):
            r, g, b = small[..., 0], small[..., 1], small[..., 2]
            points['stair_lamps'] = [b[:3] for b in blobs((r > 235) & (g > 200) & (b < 170) & (r - b > 90), 4)]
    out.save(f'{OUT}/{name}.webp', 'WEBP', quality=80, method=6)
    print(name, out.size, os.path.getsize(f'{OUT}/{name}.webp') // 1024, 'KB')
old = json.load(open(f'{OUT}/points.json')) if os.path.exists(f'{OUT}/points.json') else {}
old.update(points)
json.dump(old, open(f'{OUT}/points.json', 'w'), indent=1)

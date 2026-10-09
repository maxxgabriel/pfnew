# usage: python3 -I scripts/cutout-ref.py <reference sheet png> src/assets/sketch
# Cut figures out of the owner's reference sheet (cream paper, ink) into RGBA WebP.
import sys, json
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
BOX = {
  'hero': (230, 125, 705, 722),
  'stand': (28, 768, 218, 1048), 'walk': (243, 772, 472, 1048), 'reach': (498, 788, 712, 1048), 'rest': (752, 808, 990, 1048),
  'calm': (18, 1148, 210, 1428), 'wink': (205, 1158, 400, 1428), 'curious': (395, 1152, 588, 1428),
  'confident': (585, 1158, 765, 1428), 'serious': (788, 1148, 992, 1428),
}

def dilate(m, r):
    o = m.copy()
    for _ in range(r):
        n = o.copy()
        n[1:] |= o[:-1]; n[:-1] |= o[1:]; n[:, 1:] |= o[:, :-1]; n[:, :-1] |= o[:, 1:]
        o = n
    return o

def erode(m, r):
    return ~dilate(~m, r)

def flood_outside(wall):
    # pixels reachable from the border without crossing the wall
    out = np.zeros_like(wall)
    out[0, :] = ~wall[0, :]; out[-1, :] = ~wall[-1, :]; out[:, 0] = ~wall[:, 0]; out[:, -1] = ~wall[:, -1]
    while True:
        n = dilate(out, 4) & ~wall
        if (n == out).all(): return out
        out = n

man = {}
for name, (x0, y0, x1, y1) in BOX.items():
    c = im[y0:y1, x0:x1]
    bg = np.median(np.concatenate([c[:3].reshape(-1, 3), c[-3:].reshape(-1, 3), c[:, :3].reshape(-1, 3), c[:, -3:].reshape(-1, 3)]), axis=0)
    lum = c @ [0.299, 0.587, 0.114]
    blum = bg @ [0.299, 0.587, 0.114]
    d = np.clip((blum - lum) / blum, 0, 1)
    red = dilate((c[..., 0] - c[..., 1] > 18) & (c[..., 0] - c[..., 2] > 18), 3)
    a = np.clip((d - 0.05) / 0.3, 0, 1)
    ink = (a > 0.35) & ~red
    # close the outline, then everything the outside can't reach is the figure (the white face stays opaque)
    R = 5
    closed = dilate(ink, R)
    outside = flood_outside(closed)
    inside = erode(~outside, R)
    # the ground line under the boots: no paper fill between it and the feet
    rows = np.nonzero(ink.any(axis=1))[0]
    inside[rows.max() - (22 if name == 'hero' else 14):] = False
    alpha = np.maximum(a, inside.astype(float))
    # the spark (outside the figure) goes; the blush on the cheeks stays
    alpha[red & ~inside] = 0
    # colour: un-mix the paper at soft edges, keep the face's paper as it is
    a3 = np.maximum(alpha, 1e-3)[..., None]
    fg = np.where(inside[..., None], c, np.clip((c - (1 - a3) * bg) / a3, 0, 255))
    ys, xs = np.nonzero(alpha > 0.05)
    pad = 4
    yy0, yy1, xx0, xx1 = max(0, ys.min() - pad), ys.max() + pad + 1, max(0, xs.min() - pad), xs.max() + pad + 1
    rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)[yy0:yy1, xx0:xx1]
    Image.fromarray(rgba, 'RGBA').save(f'{out}/{name}.webp', 'WEBP', quality=90, method=6)
    man[name] = {'w': int(xx1 - xx0), 'h': int(yy1 - yy0), 'x0': int(x0 + xx0), 'y0': int(y0 + yy0)}
    print(name, man[name])
json.dump(man, open(f'{out}/manifest.json', 'w'), indent=1)

"""
Cut a row of black silhouettes on white into separate frames (alpha from darkness).

  python3 -I scripts/cutout-sil.py <sheet.png> <name> <frames>

Writes src/assets/sketch/<name>_<i>.webp (solid black, soft edge) and adds to
manifest.json: w, h, foot (bottom centre), top, hand (the topmost ink, where a
web line attaches) and head (a guess, refined by hand in src/sketch/spidey.ts).
"""
import json, os, sys
import numpy as np
from PIL import Image

src, name, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
out = 'src/assets/sketch'
lum = np.asarray(Image.open(src).convert('L')).astype(np.float64)
a = np.clip((235 - lum) / 150, 0, 1)
a[:6, :] = a[-6:, :] = 0
a[:, :6] = a[:, -6:] = 0
cols = (a > 0.5).sum(axis=0).astype(float)
cols = np.convolve(cols, np.ones(9) / 9, mode='same')
xs = np.nonzero(cols > 0.5)[0]
lo, hi = xs.min(), xs.max()
step = (hi - lo) / n
cuts = [lo]
for k in range(1, n):
    c = lo + k * step
    w0, w1 = int(c - step * 0.35), int(c + step * 0.35)
    cuts.append(w0 + int(np.argmin(cols[w0:w1])))
cuts.append(hi + 1)
man_path = os.path.join(out, 'manifest.json')
man = json.load(open(man_path))
for i in range(n):
    part = a[:, cuts[i]:cuts[i + 1]]
    ys, xs2 = np.nonzero(part > 0.5)
    y0, y1 = max(0, ys.min() - 4), ys.max() + 5
    x0, x1 = max(0, xs2.min() - 4), xs2.max() + 5
    al = part[y0:y1, x0:x1]
    rgba = np.zeros(al.shape + (4,), np.uint8)
    rgba[..., 3] = (al * 255).astype(np.uint8)
    key = f'{name}_{i}'
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out, key + '.webp'), 'WEBP', quality=90, method=6)
    o = al > 0.5
    yy, xx = np.nonzero(o)
    top = int(yy.min()); bot = int(yy.max())
    hand = [int(xx[yy == top].mean()), top]
    lowx = xx[yy >= bot - 6].mean()
    hb = top + int((bot - top) * 0.2)
    sel = yy <= hb
    head = [int(xx[sel].mean()), int(yy[sel].mean())]
    man[key] = {'w': int(al.shape[1]), 'h': int(al.shape[0]), 'foot': [int(lowx), bot], 'top': top, 'face': 0, 'hand': hand, 'head': head}
    print(key, man[key])
json.dump(man, open(man_path, 'w'), indent=1)

"""
Cut a row of poses on flat magenta into separate frames.

  python3 -I scripts/cutout-sheet.py <sheet.png> <name> [out dir]

Alpha comes from how magenta a pixel is (min(R,B) - G); edges are un-mixed
from the magenta so no pink fringe is left. Frames are split at the empty
columns between figures and share one vertical crop, so their feet stay on
the same line. Writes <out>/<name>_<i>.webp and adds them to manifest.json:
w, h, and foot = (x, y) of the ground point under the figure in frame pixels.
"""
import json, os, sys
import numpy as np
from PIL import Image

src, name = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else 'src/assets/sketch'
SCALE = 1.0
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
M = np.array([255.0, 0.0, 255.0])
m = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
a = 1 - np.clip((m - 40) / (215 - 40), 0, 1)
a3 = np.maximum(a, 1e-3)[..., None]
fg = np.clip((im - (1 - a[..., None]) * M) / a3, 0, 255)
fg[..., 1] = np.maximum(fg[..., 1], np.minimum(fg[..., 0], fg[..., 2]) - 60)
a[a < 0.05] = 0
a[:6, :] = a[-6:, :] = 0
a[:, :6] = a[:, -6:] = 0

cols = (a > 0.2).sum(axis=0) > 1
runs, start = [], None
for x, on in enumerate(list(cols) + [False]):
    if on and start is None: start = x
    if not on and start is not None:
        runs.append([start, x]); start = None
# merge slivers (a frayed scarf end) into their neighbour
merged = []
for r in runs:
    if merged and r[1] - r[0] < 40: merged[-1][1] = r[1]
    else: merged.append(r)
runs = [r for r in merged if r[1] - r[0] >= 40]
rows = np.nonzero((a > 0.2).any(axis=1))[0]
y0, y1 = max(0, rows.min() - 6), min(a.shape[0], rows.max() + 7)

man_path = os.path.join(out, 'manifest.json')
man = json.load(open(man_path)) if os.path.exists(man_path) else {}
for i, (x0, x1) in enumerate(runs):
    x0, x1 = max(0, x0 - 6), min(a.shape[1], x1 + 6)
    rgba = np.dstack([fg, a * 255]).astype(np.uint8)[y0:y1, x0:x1]
    img = Image.fromarray(rgba, 'RGBA')
    if SCALE != 1: img = img.resize((round(img.width * SCALE), round(img.height * SCALE)), Image.LANCZOS)
    # the foot point: the middle of the lowest band of ink
    al = rgba[..., 3] > 50
    ys = np.nonzero(al.any(axis=1))[0]
    low = al[max(0, ys.max() - 12):ys.max() + 1].any(axis=0)
    xs = np.nonzero(low)[0]
    key = f'{name}_{i}'
    img.save(os.path.join(out, key + '.webp'), 'WEBP', quality=88, method=6)
    man[key] = {'w': img.width, 'h': img.height, 'foot': [round(float(xs.mean()) * SCALE), round(float(ys.max()) * SCALE)]}
    print(key, man[key])
json.dump(man, open(man_path, 'w'), indent=1)

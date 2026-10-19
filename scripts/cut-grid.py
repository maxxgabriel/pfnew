"""
Cut a sheet of ROWS x COLS separate objects into cut-outs.

  python3 -I scripts/cut-grid.py <sheet.png> <name> <rows> <cols> [out dir] [--white] [--split] [--max=520]

Magenta sheets: only magenta connected to the outside is keyed out (so purple
letters inside a comic burst survive); its edge is un-mixed from the magenta
and despilled. --white: pencil on white paper, alpha from how dark the line is.
Each connected bit goes to the grid cell its centre is in; read row by row. Writes <out>/<name>_<i>.webp and manifest
entries (w, h, foot = bottom centre, face, top) so drawArt can draw them.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

args = [a for a in sys.argv[1:] if not a.startswith('--')]
flags = {a.split('=')[0]: (a.split('=') + [''])[1] for a in sys.argv[1:] if a.startswith('--')}
src, name, rows, cols = args[0], args[1], int(args[2]), int(args[3])
out = args[4] if len(args) > 4 else 'src/assets/sketch'
CAP = int(flags.get('--max') or 520)
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
H, W = im.shape[:2]

if '--white' in flags:
    dark = 255 - im.min(axis=2)
    a = np.clip((dark - 18) / 150, 0, 1)
    fg = np.clip((im - (1 - a[..., None]) * 255) / np.maximum(a, 1e-3)[..., None], 0, 255)
    solid = a > 0.12
else:
    M = np.array([255.0, 0.0, 255.0])
    m = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
    near = m > 120
    lab, _ = nd.label(near)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    a = 1 - np.clip((m - 40) / (215 - 40), 0, 1)
    rim = nd.binary_dilation(bg, iterations=3)
    a = np.where(bg, 0, np.where(rim, a, 1.0))
    fg = np.clip((im - (1 - a[..., None]) * M) / np.maximum(a, 1e-3)[..., None], 0, 255)
    spill = np.clip(np.minimum(fg[..., 0], fg[..., 2]) - fg[..., 1], 0, 255) * rim
    fg[..., 0] -= spill
    fg[..., 2] -= spill
    solid = a > 0.2
a[a < 0.04] = 0

# shapes: each connected bit belongs to the grid cell its centre is in (so a burst's speed line
# reaching over a cell border still goes with its burst)
lab, n = nd.label(nd.binary_dilation(solid, iterations=2))
ids = np.arange(1, n + 1)
size = nd.sum(solid, lab, ids)
cen = nd.center_of_mass(solid, lab, ids)
# --split (one row of figures that touch): cut at the emptiest column near each expected boundary
xcut = None
if '--split' in flags:
    ink = np.convolve(solid.sum(axis=0).astype(float), np.ones(9) / 9, mode='same')
    xs = np.nonzero(ink > 0.5)[0]
    lo, hi = xs.min(), xs.max()
    step = (hi - lo) / cols
    xcut = [lo]
    for k in range(1, cols):
        c = lo + k * step
        w0, w1 = int(c - step * 0.3), int(c + step * 0.3)
        xcut.append(w0 + int(np.argmin(ink[w0:w1])))
    xcut.append(hi + 1)
    col_of = lambda x: min(cols - 1, max(0, int(np.searchsorted(xcut, x, side='right')) - 1))
else:
    col_of = lambda x: min(cols - 1, int(x / W * cols))
cell = {}
for i, (cy, cx), sz in zip(ids, cen, size):
    if sz < 12: continue
    cell.setdefault((min(rows - 1, int(cy / H * rows)), col_of(cx)), []).append(i)
if xcut is not None:
    cell = {(0, c): ids.tolist() for c in range(cols)}  # (a column is its piece, whatever touches what)
groups = {k: cell[k] for k in sorted(cell)}
if len(groups) < rows * cols:
    print(f'warning: found {len(groups)} cells with ink, wanted {rows * cols}')
man_p = os.path.join(out, 'manifest.json')
man = json.load(open(man_p)) if os.path.exists(man_p) else {}
for i, g in enumerate(groups):
    mask = np.isin(lab, groups[g])
    if xcut is not None:
        mask[:, :xcut[g[1]]] = False
        mask[:, xcut[g[1] + 1]:] = False
    ys, xs = np.nonzero(mask & solid)
    y0, y1 = max(0, ys.min() - 3), min(H, ys.max() + 4)
    x0, x1 = max(0, xs.min() - 3), min(W, xs.max() + 4)
    al = (a * mask)[y0:y1, x0:x1]
    rgba = np.dstack([fg[y0:y1, x0:x1], al * 255]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    s = min(1.0, CAP / max(img.width, img.height))
    if s < 1:
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    k = f'{name}_{i}'
    img.save(os.path.join(out, k + '.webp'), 'WEBP', quality=82, method=6, alpha_quality=85)
    man[k] = {'w': img.width, 'h': img.height, 'foot': [img.width // 2, img.height], 'face': max(1, img.height // 3), 'top': 0}
    print(k, img.size)
json.dump(man, open(man_p, 'w'), indent=1)

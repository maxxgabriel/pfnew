"""
Cut a row of poses on flat magenta into separate frames.

  python3 -I scripts/cutout-sheet.py <sheet.png> <name> [out dir] [frames]

Alpha comes from how magenta a pixel is (min(R,B) - G); edges are un-mixed
from the magenta so no pink fringe is left. Frames are split at the empty
columns between figures and share one vertical crop, so their feet stay on
the same line. Writes <out>/<name>_<i>.webp and adds them to manifest.json:
w, h, and foot = (x, y): the ground point under the middle of the head, in frame pixels.
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
# figures touching (a scarf reaching the next one): cut at the thinnest column near each expected boundary
want = int(sys.argv[4]) if len(sys.argv) > 4 else len(runs)
if len(runs) != want:
    ink = (a > 0.2).sum(axis=0).astype(float)
    ink = np.convolve(ink, np.ones(9) / 9, mode='same')
    xs = np.nonzero(ink > 0.5)[0]
    lo, hi = xs.min(), xs.max()
    step = (hi - lo) / want
    cuts = [lo]
    for k in range(1, want):
        c = lo + k * step
        w0, w1 = int(c - step * 0.3), int(c + step * 0.3)
        cuts.append(w0 + int(np.argmin(ink[w0:w1])))
    cuts.append(hi + 1)
    runs = [[cuts[i], cuts[i + 1]] for i in range(want)]
rows = np.nonzero((a > 0.2).any(axis=1))[0]
y0, y1 = max(0, rows.min() - 6), min(a.shape[0], rows.max() + 7)

man_path = os.path.join(out, 'manifest.json')
man = json.load(open(man_path)) if os.path.exists(man_path) else {}
for i, (x0, x1) in enumerate(runs):
    pad = 6 if len(sys.argv) <= 4 else 0
    x0, x1 = max(0, x0 - pad), min(a.shape[1], x1 + pad)
    rgba = np.dstack([fg, a * 255]).astype(np.uint8)[y0:y1, x0:x1]
    # a light-blade drawn as flat cyan: find its line (hilt end first) and erase it, so code can draw it glowing
    blade = None
    cr, cg, cb = rgba[..., 0].astype(int), rgba[..., 1].astype(int), rgba[..., 2].astype(int)
    cyan = (rgba[..., 3] > 100) & (cg > 190) & (cb > 190) & (cr < 70)
    if cyan.sum() > 150:
        # keep only the biggest connected streak (the blade), not stray cyan in the hair
        lab = np.zeros(cyan.shape, np.int32); best, bestn, nl = 0, 0, 0
        H_, W_ = cyan.shape
        for sy_, sx_ in zip(*np.nonzero(cyan)):
            if lab[sy_, sx_]: continue
            nl += 1; st = [(sy_, sx_)]; lab[sy_, sx_] = nl; n = 0
            while st:
                yy, xx = st.pop(); n += 1
                for dy_, dx_ in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    a_, b_ = yy + dy_, xx + dx_
                    if 0 <= a_ < H_ and 0 <= b_ < W_ and cyan[a_, b_] and not lab[a_, b_]:
                        lab[a_, b_] = nl; st.append((a_, b_))
            if n > bestn: best, bestn = nl, n
        cyan = lab == best
    if cyan.sum() > 150:
        ys_, xs_ = np.nonzero(cyan)
        pts = np.stack([xs_, ys_], 1).astype(float)
        c = pts.mean(0)
        u, sv, vt = np.linalg.svd(pts - c, full_matrices=False)
        d = vt[0]
        proj = (pts - c) @ d
        e0, e1 = c + d * proj.min(), c + d * proj.max()
        # the hilt end is the one nearer the figure's ink
        body = (rgba[..., 3] > 100) & ~cyan
        by_, bx_ = np.nonzero(body)
        bc = np.array([bx_.mean(), by_.mean()])
        if np.linalg.norm(e1 - bc) < np.linalg.norm(e0 - bc): e0, e1 = e1, e0
        blade = [round(float(e0[0])), round(float(e0[1])), round(float(e1[0])), round(float(e1[1]))]
        grow = cyan.copy()
        for _ in range(3):
            g2 = grow.copy(); g2[1:] |= grow[:-1]; g2[:-1] |= grow[1:]; g2[:, 1:] |= grow[:, :-1]; g2[:, :-1] |= grow[:, 1:]; grow = g2
        soft = grow & (rgba[..., 3] > 0) & (cg > 150) & (cb > 150) & (cr < 140)
        rgba[soft | cyan, 3] = 0
    img = Image.fromarray(rgba, 'RGBA')
    if SCALE != 1: img = img.resize((round(img.width * SCALE), round(img.height * SCALE)), Image.LANCZOS)
    # the anchor: under the middle of the head (steadier than the feet in a stride), on the lowest ink
    al = rgba[..., 3] > 50
    ys = np.nonzero(al.any(axis=1))[0]
    head = al[ys.min():ys.min() + int((ys.max() - ys.min()) * 0.45)]
    xs = np.nonzero(head)[1]
    key = f'{name}_{i}'
    img.save(os.path.join(out, key + '.webp'), 'WEBP', quality=88, method=6)
    man[key] = {'w': img.width, 'h': img.height, 'foot': [round(float(xs.mean()) * SCALE), round(float(ys.max()) * SCALE)]}
    if blade: man[key]['blade'] = blade
    print(key, man[key])
json.dump(man, open(man_path, 'w'), indent=1)

# ---- every frame's face width (the cream of the face is warm; the hair highlights are cool), so poses can share one scale
for key in [k for k in man if k.startswith(name + '_')]:
    px = np.asarray(Image.open(os.path.join(out, key + '.webp')).convert('RGBA')).astype(int)
    r, g, b, al = px[..., 0], px[..., 1], px[..., 2], px[..., 3]
    cream = (al > 200) & (r > 200) & (g > 185) & (r - b > 10)
    widths = []
    for row in cream:
        xs = np.nonzero(row)[0]
        if len(xs) > 4: widths.append(xs.max() - xs.min())
    widths.sort()
    man[key]['face'] = int(widths[int(len(widths) * 0.9)]) if widths else 0
    ys = np.nonzero((al > 50).any(axis=1))[0]
    man[key]['top'] = int(ys.min())
json.dump(man, open(man_path, 'w'), indent=1)

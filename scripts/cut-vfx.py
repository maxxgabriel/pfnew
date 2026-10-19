"""
Split a fire-effects sheet painted on pure black into separate frames.

  python3 -I scripts/cut-vfx.py <sheet.png> <name> <frames>

Frames are split at the darkest columns between them, cropped to their
light and saved as src/assets/sketchbg/<name>_<i>.webp — still on black:
the page draws them with additive blending, so black adds nothing.
"""
import sys
import numpy as np
from PIL import Image

src, name, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
lum = im.max(axis=2)
cols = (lum > 40).sum(axis=0).astype(float)
cols = np.convolve(cols, np.ones(15) / 15, mode='same')
xs = np.nonzero(cols > 1)[0]
lo, hi = xs.min(), xs.max()
step = (hi - lo) / n
cuts = [lo]
for k in range(1, n):
    c = lo + k * step
    a, b = int(c - step * 0.35), int(c + step * 0.35)
    cuts.append(a + int(np.argmin(cols[a:b])))
cuts.append(hi + 1)
for i in range(n):
    x0, x1 = cuts[i], cuts[i + 1]
    part = lum[:, x0:x1]
    ys = np.nonzero((part > 30).any(axis=1))[0]
    y0, y1 = max(0, ys.min() - 4), min(im.shape[0], ys.max() + 5)
    out = Image.fromarray(im[y0:y1, x0:x1].astype(np.uint8), 'RGB')
    out.save(f'src/assets/sketchbg/{name}_{i}.webp', 'WEBP', quality=85, method=6)
    print(f'{name}_{i}', out.size)

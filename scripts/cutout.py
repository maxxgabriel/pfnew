"""
Cut the hero drawings out of their magenta backgrounds.

  python3 scripts/cutout.py <dir of source PNGs>

Each source is a 1024x1536 drawing on flat magenta. Alpha comes from how
magenta a pixel is (min(R,B) - G); edge pixels are un-mixed from the magenta
so no pink fringe is left; the result is cropped to the figure, scaled and
saved as WebP in src/assets/hero/, with manifest.json recording each crop
(x0, y0 in source pixels) and scale, so anchors can be given in source pixels.
"""
import json, sys
import numpy as np
from PIL import Image

SRC = {
    'sheet': '8f1bab27', 'windup': '4e571139', 'flick': '95540dcc', 'control': '3cfa324a',
    'bicycle': '8bef1882', 'rise': 'fef2cb52', 'crouch': '4640b4e1', 'kneel': '8c51f451',
    'follow': '1cf8d97d', 'tuck': '85b1f1fb', 'boot': 'fb69dd89', 'face': '4598ffe4',
}
SCALE = {'face': 0.8, 'boot': 0.7}
M = np.array([250.0, 4.0, 249.0])

def cut(path, scale):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float64)
    m = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
    a = 1 - np.clip((m - 40) / (215 - 40), 0, 1)
    a3 = np.maximum(a, 1e-3)[..., None]
    fg = np.clip((im - (1 - a[..., None]) * M) / a3, 0, 255)
    # anything still pinkish at the very edge: pull it toward neutral
    fg[..., 1] = np.maximum(fg[..., 1], np.minimum(fg[..., 0], fg[..., 2]) - 60)
    a[a < 0.04] = 0
    # the generator leaves a faint frame at the very edge of the image
    a[:6, :] = a[-6:, :] = 0
    a[:, :6] = a[:, -6:] = 0
    ys, xs = np.nonzero(a > 0.04)
    pad = 6
    y0, y1 = max(0, ys.min() - pad), min(im.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(im.shape[1], xs.max() + pad + 1)
    rgba = np.dstack([fg, a * 255]).astype(np.uint8)[y0:y1, x0:x1]
    out = Image.fromarray(rgba, 'RGBA')
    out = out.resize((round(out.width * scale), round(out.height * scale)), Image.LANCZOS)
    return out, int(x0), int(y0)

src = sys.argv[1]
man = {}
for name, f in SRC.items():
    s = SCALE.get(name, 0.62)
    out, x0, y0 = cut(f'{src}/{f}-image.png', s)
    out.save(f'src/assets/hero/{name}.webp', 'WEBP', quality=84, method=6)
    man[name] = {'x0': x0, 'y0': y0, 'scale': s, 'w': out.width, 'h': out.height}
    print(name, out.size)
json.dump(man, open('src/assets/hero/manifest.json', 'w'), indent=1)

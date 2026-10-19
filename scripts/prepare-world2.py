"""Round 38 world art: key the magenta layers, crop the props, export WebP to src/assets/sketchbg/.
  python3 scripts/prepare-world2.py
Plates (cl_map, ch_sky) stay opaque; ch_cloud keeps its full frame (it tiles); props are cropped to their content."""
from pathlib import Path
import numpy as np
from PIL import Image
root = Path(__file__).resolve().parent.parent
raw, out = root / 'art/raw/world', root / 'src/assets/sketchbg'
PLATES = {'cl_map', 'ch_sky'}
TILES = {'ch_cloud'}
PROPS = {'cl_theatre', 'ch_door', 'px_sign', 'wc_bottle', 'hs_mailbox'}
for n in sorted(PLATES | TILES | PROPS):
    rgb = np.asarray(Image.open(raw / f'{n}.png').convert('RGB')).astype(float)
    if n in PLATES:
        im = Image.fromarray(rgb.astype(np.uint8))
    else:
        m = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
        a = 1 - np.clip((m - 40) / 175, 0, 1)
        fg = np.clip((rgb - (1 - a[..., None]) * np.array([255, 0, 255])) / np.maximum(a, 1e-3)[..., None], 0, 255)
        spill = np.maximum(np.minimum(fg[..., 0], fg[..., 2]) - fg[..., 1] - 20, 0)
        fg[..., 0] -= spill; fg[..., 2] -= spill
        a[a < 0.04] = 0
        im = Image.fromarray(np.dstack((fg, a * 255)).astype(np.uint8), 'RGBA')
        if n in PROPS:
            ys, xs = np.nonzero(a > 0.04)
            pad = 8
            im = im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))
    if max(im.size) > 1536: im.thumbnail((1536, 1536))
    im.save(out / f'{n}.webp', quality=80, method=6)
    print(n, im.size, (out / f'{n}.webp').stat().st_size // 1024, 'KB')

"""
Take the last magenta out of a cut-out's soft edge (it shows as a purple rim on dark scenes).

  python3 -I scripts/defringe.py src/assets/sketch/<name>_*.webp

Any pixel that is still magenta-ish (red and blue both well above green) is
pulled to the grey of its green channel; fully opaque ink is left alone.
"""
import sys
import numpy as np
from PIL import Image

for path in sys.argv[1:]:
    im = np.asarray(Image.open(path).convert('RGBA')).astype(np.int32)
    r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    pink = (r - g > 30) & (b - g > 30) & (np.abs(r - b) < 90)
    n = int(pink.sum())
    if n:
        grey = np.minimum(np.minimum(r, b), g + 20)
        for c in range(3):
            im[..., c] = np.where(pink, grey, im[..., c])
        Image.fromarray(im.clip(0, 255).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=88, method=6)
    print(path, n)

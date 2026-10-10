"""
Take the magenta spill out of cut-outs (it shows as a purple rim on dark scenes).

  python3 -I scripts/defringe.py src/assets/sketch/*.webp

Classic despill: wherever both red and blue stand above green, the amount by
which the weaker of the two exceeds green is magenta, so it comes off both.
Real colours are left alone (his blue highlights, skin, the pink eraser,
the red blade all have red or blue at or below green).
"""
import sys
import numpy as np
from PIL import Image

total = 0
for path in sys.argv[1:]:
    im = np.asarray(Image.open(path).convert('RGBA')).astype(np.int32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    spill = np.clip(np.minimum(r, b) - g, 0, 255)
    n = int((spill > 6).sum())
    if n:
        im[..., 0] = r - spill
        im[..., 2] = b - spill
        Image.fromarray(im.clip(0, 255).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=88, method=6)
    total += n
    print(path, n)
print('pixels despilled:', total)

"""
Trim a thin line (a swing line, a thread) off the top of cut-out frames, so
they size by the figure, not the line. Updates manifest.json (h, foot, top).

  python3 -I scripts/trim-line.py name_0 name_1 ...
"""
import json, sys
import numpy as np
from PIL import Image

man_path = 'src/assets/sketch/manifest.json'
man = json.load(open(man_path))
for key in sys.argv[1:]:
    p = f'src/assets/sketch/{key}.webp'
    im = Image.open(p).convert('RGBA')
    a = np.asarray(im)[..., 3] > 60
    widths = a.sum(axis=1)
    y0 = int(np.argmax(widths > 22))  # first row wider than a line
    y0 = max(0, y0 - 6)
    out = im.crop((0, y0, im.width, im.height))
    out.save(p, 'WEBP', quality=88, method=6)
    m = man[key]
    m['h'] = out.height
    m['foot'] = [m['foot'][0], m['foot'][1] - y0]
    if 'top' in m: m['top'] = max(0, m['top'] - y0)
    print(key, 'trimmed', y0)
json.dump(man, open(man_path, 'w'), indent=1)

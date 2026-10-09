"""
Cut the act-style sheets (scripts/gen-act-styles.sh) into twins of the ink drawings.

  python3 -I scripts/cut-act-styles.py [sheet ...]

For each sheet in scripts/style-sheets.json (and its "reuse" and "final" entries), frame i is
cut out (scripts/cutout-sheet.py), despilled, renamed to <style>-<ink key> and given a manifest
entry. The film draws a twin at its ink drawing's height (src/sketch/art.ts styledTwin), so a
twin's own face width doesn't matter: it is set from its height, and big twins are scaled down
to about their ink drawing's size so they don't cost extra download.
"""
import json, os, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'src/assets/sketch')
RAW = os.path.join(ROOT, 'art/raw')
spec = json.load(open(os.path.join(ROOT, 'scripts/style-sheets.json')))
only = set(sys.argv[1:])

jobs = [(s['name'], s['style'], s['keys']) for s in spec['sheets']]
jobs += [(r['sheet'], r['style'], r['keys']) for r in spec['reuse']]
f = spec['final']
jobs += [(f['name'], st, None) for st in []]  # (the final sheet is one key in many styles: below)

def cut(sheet, n):
    png = os.path.join(RAW, sheet + '.png')
    if not os.path.exists(png):
        print('missing', sheet); return False
    subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'scripts/cutout-sheet.py'), png, '_tmp_' + sheet, A, str(n)], check=True, capture_output=True)
    return True

def adopt(tmp, key):
    man_p = os.path.join(A, 'manifest.json')
    man = json.load(open(man_p))
    if tmp not in man: print('  no frame', tmp); return
    m = man.pop(tmp)
    src = os.path.join(A, tmp + '.webp')
    im = Image.open(src).convert('RGBA')
    # despill the last of the magenta
    px = im.load()
    for yy in range(im.height):
        for xx in range(im.width):
            r, g, b, a = px[xx, yy]
            sp = min(r, b) - g
            if sp > 6: px[xx, yy] = (r - sp, g, b - sp, a)
    # about the ink drawing's size (never bigger than 1.15x its height)
    ink = man.get(key.split('-', 1)[1])
    hgt = m['foot'][1] - m['top']
    if ink:
        want = (ink['foot'][1] - ink['top']) * 1.15
        s = min(1.0, want / max(1, hgt))
        if s < 0.97:
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
            m = {**m, 'w': im.width, 'h': im.height, 'foot': [round(m['foot'][0] * s), round(m['foot'][1] * s)], 'top': round(m['top'] * s)}
            if 'blade' in m: m['blade'] = [round(v * s) for v in m['blade']]
            hgt = m['foot'][1] - m['top']
    m['face'] = max(1, round(hgt * 0.36))
    im.save(os.path.join(A, key + '.webp'), 'WEBP', quality=80, method=6, alpha_quality=85)
    os.remove(src)
    man[key] = m
    json.dump(man, open(man_p, 'w'), indent=1)
    print('  ', key, m['w'], m['h'], 'blade' if 'blade' in m else '')

for sheet, style, keys in jobs:
    if only and sheet not in only: continue
    print('==', sheet)
    if not cut(sheet, len(keys)): continue
    for i, k in enumerate(keys): adopt(f'_tmp_{sheet}_{i}', f'{style}-{k}')

if not only or f['name'] in only:
    print('==', f['name'])
    if cut(f['name'], len(f['styles'])):
        for i, st in enumerate(f['styles']): adopt(f"_tmp_{f['name']}_{i}", f"{st}-{f['key']}")

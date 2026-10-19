"""Build exact ink reference rows for gen-act-styles.sh (optional sheet names).

Reinsert extracted cyan blade guides so the cutter can recover blade coordinates.
Only reads the ink assets; writes ignored art/raw/strips/<sheet>.png.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'src/assets/sketch'
spec = json.loads((ROOT / 'scripts/style-sheets.json').read_text())
manifest = json.loads((ASSETS / 'manifest.json').read_text())
only = set(sys.argv[1:])
out = ROOT / 'art/raw/strips'
out.mkdir(parents=True, exist_ok=True)
for sheet in spec['sheets']:
    if only and sheet['name'] not in only:
        continue
    keys = sheet['keys']
    if not 1 <= len(keys) <= 8:
        raise ValueError(f"{sheet['name']}: expected 1–8 keys")
    strip = Image.new('RGB', (1536, 1024), '#FF00FF')
    cell = 1536 / len(keys)
    for index, key in enumerate(keys):
        meta = manifest[key]
        image = Image.open(ASSETS / f'{key}.webp').convert('RGBA')
        if sheet.get('blade') and 'blade' in meta:
            ImageDraw.Draw(image).line(meta['blade'], fill='#00FFFF', width=10)
        scale = min((cell - 28) / image.width, 520 / max(1, meta['foot'][1] - meta['top']))
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
        strip.paste(image, (round((index + .5) * cell - image.width / 2), round(820 - meta['foot'][1] * scale)), image)
    target = out / (sheet['name'] + '.png')
    strip.save(target)
    print(target.relative_to(ROOT))

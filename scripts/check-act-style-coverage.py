"""Audit the explicit hero-pose inventory against manifest metadata and WebP files."""
import json
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'src/assets/sketch'
manifest = json.loads((ASSETS / 'manifest.json').read_text())
inventory = json.loads((ROOT / 'docs/ACT_STYLE_INVENTORY.json').read_text())
errors = []
added_bytes = 0
for act, entry in inventory.items():
    style = entry['style']
    for key in entry['keys']:
        twin = f'{style}-{key}'
        path = ASSETS / f'{twin}.webp'
        if twin not in manifest or not path.exists():
            errors.append(f'{act}: missing {twin}')
            continue
        meta = manifest[twin]
        with Image.open(path) as image:
            if image.size != (meta['w'], meta['h']):
                errors.append(f'{twin}: manifest/image size mismatch')
            if 'A' not in image.getbands() or image.getchannel('A').getextrema()[0] != 0:
                errors.append(f'{twin}: missing transparent background')
        if meta['face'] <= 0 or meta['foot'][1] <= meta['top']:
            errors.append(f'{twin}: invalid figure measurements')
        if 'blade' in manifest[key] and 'blade' not in meta:
            errors.append(f'{twin}: missing blade metadata')
        if key in entry['missing']:
            if 'blade' in meta and 'blade' not in manifest[key]:
                errors.append(f'{twin}: unexpected blade metadata')
            pixels = np.asarray(Image.open(path).convert('RGBA')).astype(int)
            spill = (pixels[..., 3] > 50) & (np.minimum(pixels[..., 0], pixels[..., 2]) - pixels[..., 1] > 65)
            if spill.any():
                errors.append(f'{twin}: visible magenta residue')
            added_bytes += path.stat().st_size
    print(f"{act}: {len(entry['keys'])} hero keys; {len(entry['missing'])} originally missing twins")
for error in errors:
    print(error)
print(f'Added WebP bytes: {added_bytes:,} ({added_bytes / 1_000_000:.3f} MB)')
raise SystemExit(bool(errors))

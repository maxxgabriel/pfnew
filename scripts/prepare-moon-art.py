"""Build only v12b's paintings; retain full-frame fg alignment.

python3 scripts/prepare-moon-art.py
Uses the existing fg pipeline's magenta alpha/unmix/despill, without
cropping or touching pose sheets or their manifest.
"""
from pathlib import Path
import numpy as np
from PIL import Image

out = Path('src/assets/sketchbg')
for name in ('bg_space', 'fg_moon'):
    im = Image.open(f'art/raw/{name}.png').convert('RGB')
    if name.startswith('fg_'):
        rgb = np.asarray(im).astype(np.float64)
        magenta = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
        alpha = 1 - np.clip((magenta - 40) / (215 - 40), 0, 1)
        key = np.array([255., 0., 255.])
        fg = np.clip((rgb - (1 - alpha[..., None]) * key)
                     / np.maximum(alpha, 1e-3)[..., None], 0, 255)
        fg[..., 1] = np.maximum(fg[..., 1], np.minimum(fg[..., 0], fg[..., 2]) - 60)
        alpha[alpha < 0.04] = 0
        im = Image.fromarray(np.dstack([fg, alpha * 255]).astype(np.uint8))
    im = im.resize((1024, 1536), Image.Resampling.LANCZOS)
    path = out / f'{name}.webp'
    im.save(path, 'WEBP', quality=85, method=6)
    print(f'{path}: {im.size}, {path.stat().st_size // 1024} KB')

#!/usr/bin/env python3
"""Turn registered magenta-backed paintings into small, flat polygon worlds."""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from scipy.cluster.vq import kmeans2
from skimage.measure import find_contours, approximate_polygon


def trace(spec, k, tol, minimum):
    name, depth, filename = spec.split(':', 2)
    im = Image.open(filename).convert('RGBA')
    a = np.asarray(im)
    rgb = a[:, :, :3]
    # Include magenta-contaminated edge pixels; warm orange/red paint survives.
    channels = rgb.astype(float)
    empty = ((channels[:, :, 0] > channels[:, :, 1] * 1.35 + 12)
             & (channels[:, :, 2] > channels[:, :, 1] * 1.15 + 8))
    valid = ~empty & (a[:, :, 3] > 127)
    # Suppress painted texture before quantization, so it cannot become islands.
    smooth = np.asarray(im.convert("RGB").filter(ImageFilter.MedianFilter(7)))
    samples = smooth[valid]
    if not len(samples):
        raise ValueError(f'{filename}: empty layer')
    interior = ndimage.binary_erosion(valid, iterations=2)
    samples = smooth[interior] if interior.any() else samples
    sample = samples[::max(1, len(samples) // 30000)].astype(float)
    # Farthest-colour seeds retain small distinctive accents such as blue hair.
    seeds = [np.median(sample, axis=0)]
    distances = np.full(len(sample), np.inf)
    for _ in range(1, k):
        distances = np.minimum(distances, ((sample - seeds[-1]) ** 2).sum(1))
        seeds.append(sample[np.argmax(distances)])
    palette = np.rint(kmeans2(sample, np.array(seeds), iter=15, minit='matrix')[0]).astype(int)
    # Quantization may spend several slots on one noisy near-identical paint.
    # Collapse those slots before labelling; otherwise blue sky becomes confetti.
    representatives = list(range(k))
    for i in range(k):
        for j in range(i):
            if np.linalg.norm(palette[i].astype(float) - palette[j]) < 12:
                representatives[i] = representatives[j]
                break
    palette = palette[representatives]
    lum = palette @ np.array([.2126, .7152, .0722])
    bands = np.argsort(np.argsort(lum))
    labels = np.full(valid.shape, -1, dtype=np.int16)
    # Chunk distances to keep peak memory modest on full-size paintings.
    for y in range(0, im.height, 64):
        block = smooth[y:y + 64].astype(float)
        labels[y:y + 64] = np.argmin(((block[:, :, None] - palette) ** 2).sum(3), axis=2)
    labels = ndimage.median_filter(labels, size=5)
    labels[~valid] = -1
    shapes = []
    for i, colour in enumerate(palette):
        mask = labels == i
        components, _ = ndimage.label(mask)
        sizes = np.bincount(components.ravel())
        keep = np.flatnonzero(sizes >= minimum * im.width * im.height)
        keep = keep[keep != 0]
        for component in keep:
            region = components == component
            # Fill enclosed holes: smaller colour regions draw on top afterward.
            region = ndimage.binary_fill_holes(region)
            for contour in find_contours(np.pad(region, 1), .5):
                points = approximate_polygon(contour, tolerance=tol) - 1
                xy = np.rint(points[:, ::-1]).astype(int)
                area = abs(np.dot(xy[:, 0], np.roll(xy[:, 1], 1)) - np.dot(xy[:, 1], np.roll(xy[:, 0], 1))) / 2
                if area < minimum * im.width * im.height or len(xy) < 3:
                    continue
                shapes.append((area, {'c': '#%02x%02x%02x' % tuple(colour), 'band': int(bands[i]), 'pts': xy.ravel().tolist()}))
    shapes.sort(key=lambda item: -item[0])
    return im.size, {'name': name, 'depth': float(depth), 'outline': '#111b2b', 'shapes': [s for _, s in shapes]}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('out')
    p.add_argument('layers', nargs='+', help='name:depth:png')
    p.add_argument('--k', type=int, default=6)
    p.add_argument('--tol', type=float, default=2.0)
    p.add_argument('--min-area', type=float, default=.0005, help='fraction of image area')
    args = p.parse_args()
    if not 2 <= args.k <= 256 or args.tol < 0 or args.min_area <= 0:
        p.error('2 <= k <= 256, tol >= 0 and min-area > 0 required')
    layers = []
    size = None
    for spec in args.layers:
        current, layer = trace(spec, args.k, args.tol, args.min_area)
        if size is not None and current != size:
            p.error('all layers must share the same registered dimensions')
        size = current
        layers.append(layer)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({'w': size[0], 'h': size[1], 'layers': layers}, separators=(',', ':')))
    print(f'{out}: {out.stat().st_size:,} bytes; {sum(len(l["shapes"]) for l in layers)} shapes')


if __name__ == '__main__':
    main()

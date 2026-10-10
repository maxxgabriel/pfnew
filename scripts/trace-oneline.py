"""
Trace the character's ink into one ordered brush path, with explicit pen hops.

  python3 -I scripts/trace-oneline.py

Reads art/raw/oneline.png and writes src/assets/sketch/oneline.json. Coordinates
are relative to the ink bounding box plus 8px padding. pen includes index zero
and each subsequent stroke start; the segment before a start is a pen hop.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.morphology import binary_closing, skeletonize


def length(points):
    return float(np.linalg.norm(np.diff(points, axis=0), axis=1).sum())


def split_chains(skeleton):
    # Each undirected edge is visited once, including isolated closed loops.
    pixels = set(zip(*np.nonzero(skeleton)))
    graph = {
        p: sorted((p[0] + dy, p[1] + dx)
                  for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                  if (dy or dx) and (p[0] + dy, p[1] + dx) in pixels)
        for p in pixels
    }
    visited, chains = set(), []

    def walk(start, neighbor):
        chain = [start, neighbor]
        visited.add(tuple(sorted((start, neighbor))))
        while len(graph[chain[-1]]) == 2 and chain[-1] != start:
            previous, current = chain[-2:]
            following = next(p for p in graph[current] if p != previous)
            edge = tuple(sorted((current, following)))
            if edge in visited:
                break
            visited.add(edge)
            chain.append(following)
        points = np.array([(x, y) for y, x in chain], dtype=float)
        degrees = (len(graph[chain[0]]), len(graph[chain[-1]]))
        spur = min(degrees) == 1 and max(degrees) > 2
        if not (spur and length(points) < 6):
            chains.append(points)

    for p in sorted(pixels):
        if len(graph[p]) != 2:
            if not graph[p]:
                chains.append(np.array([[p[1], p[0]]], dtype=float))
            for q in graph[p]:
                if tuple(sorted((p, q))) not in visited:
                    walk(p, q)
    for p in sorted(pixels):
        for q in graph[p]:
            if tuple(sorted((p, q))) not in visited:
                walk(p, q)
    return chains


def order_chains(chains, top):
    first = next(i for i, c in enumerate(chains) if np.any(np.all(c == top, axis=1)))
    chain = chains.pop(first)
    if np.linalg.norm(chain[-1] - top) < np.linalg.norm(chain[0] - top):
        chain = chain[::-1]
    # A topmost pixel on a closed loop can be made its starting point exactly.
    if len(chain) > 1 and np.array_equal(chain[0], chain[-1]):
        k = int(np.flatnonzero(np.all(chain == top, axis=1))[0])
        chain = np.concatenate((chain[k:-1], chain[:k + 1]))
    ordered = [chain]
    while chains:
        current = ordered[-1][-1]
        candidates = []
        for i, c in enumerate(chains):
            distances = [np.linalg.norm(c[0] - current), np.linalg.norm(c[-1] - current)]
            reverse = distances[1] < distances[0]
            oriented = c[::-1] if reverse else c
            candidates.append((min(distances), i, oriented))
        nearest = min(candidates, key=lambda item: (item[0], item[1]))
        nearby = [item for item in candidates if item[0] <= 4]
        previous = ordered[-1]
        if nearby and len(previous) > 1:
            incoming = previous[-1] - previous[max(0, len(previous) - 4)]

            def turn(item):
                c = item[2]
                outgoing = c[min(3, len(c) - 1)] - c[0]
                norm = np.linalg.norm(incoming) * np.linalg.norm(outgoing)
                cosine = float(incoming @ outgoing / norm) if norm else -1
                return (-cosine, item[0], item[1])

            nearest = min(nearby, key=turn)
        _, index, chain = nearest
        ordered.append(chain)
        chains.pop(index)
    return ordered


def resample(points, spacing):
    if len(points) < 3:
        smooth = points.copy()
    else:
        smooth = points.copy()
        smooth[1:-1] = (points[:-2] + points[1:-1] + points[2:]) / 3
    distances = np.r_[0, np.cumsum(np.linalg.norm(np.diff(smooth, axis=0), axis=1))]
    keep = np.r_[True, np.diff(distances) > 0]
    smooth, distances = smooth[keep], distances[keep]
    if len(smooth) == 1:
        return smooth
    samples = np.r_[np.arange(0, distances[-1], spacing), distances[-1]]
    return np.column_stack([np.interp(samples, distances, smooth[:, axis]) for axis in (0, 1)])


def simplify(points, epsilon=0.6):
    # Iterative RDP avoids recursion limits on long outlines.
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        delta = points[hi] - points[lo]
        offsets = points[lo + 1:hi] - points[lo]
        squared = float(delta @ delta)
        t = np.clip(offsets @ delta / squared, 0, 1) if squared else np.zeros(len(offsets))
        distances = np.linalg.norm(offsets - t[:, None] * delta, axis=1)
        index = int(np.argmax(distances))
        if distances[index] > epsilon:
            middle = lo + 1 + index
            keep.add(middle)
            stack.extend(((lo, middle), (middle, hi)))
    return points[sorted(keep)]


def main():
    root = Path(__file__).resolve().parents[1]
    ink = np.asarray(Image.open(root / 'art/raw/oneline.png').convert('L')) < 128
    ys, xs = np.nonzero(ink)
    if not len(xs):
        raise ValueError('Input contains no ink')
    x0, x1 = max(0, int(xs.min()) - 8), min(ink.shape[1], int(xs.max()) + 9)
    y0, y1 = max(0, int(ys.min()) - 8), min(ink.shape[0], int(ys.max()) + 9)
    head = xs[ys < ys.min() + (ys.max() - ys.min() + 1) * 0.45]
    foot = [round(float(head.mean() - x0), 2), int(ys.max()) - y0]
    ink = ink[y0:y1, x0:x1]
    skeleton = skeletonize(binary_closing(ink, footprint=np.ones((3, 3), dtype=bool)))
    sy, sx = np.nonzero(skeleton)
    top_index = np.lexsort((sx, sy))[0]
    chains = split_chains(skeleton)
    count = len(chains)
    ordered = order_chains(chains, np.array([sx[top_index], sy[top_index]]))
    # Join chains meeting at exactly the same pixel; these need no pen hop.
    strokes = []
    for chain in ordered:
        smooth = resample(chain, 2.5)
        if strokes and np.array_equal(strokes[-1][-1], smooth[0]):
            strokes[-1] = np.concatenate((strokes[-1], smooth[1:]))
        else:
            strokes.append(smooth)
    strokes = [simplify(s) for s in strokes]
    point_count = sum(map(len, strokes))
    if point_count > 2500:
        raise ValueError(f'Trace has {point_count} points; exceeds the 2500-point limit')
    pen, points = [], []
    for stroke in strokes:
        pen.append(len(points))
        points.extend(stroke.tolist())
    total_length = length(np.asarray(points))
    result = {'w': x1 - x0, 'h': y1 - y0, 'foot': foot,
              'pts': [round(value, 3) for point in points for value in point], 'pen': pen}
    output = root / 'src/assets/sketch/oneline.json'
    with output.open('w') as stream:
        json.dump(result, stream, separators=(',', ':'))
        stream.write('\n')
    print(f'chains={count}, pen hops={len(pen) - 1}, total length={total_length:.1f}px, '
          f'points={point_count}, W={result["w"]}, H={result["h"]}, foot={foot}')


if __name__ == '__main__':
    main()

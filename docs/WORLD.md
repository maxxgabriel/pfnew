# Painted worlds prototype

Open `/?world=fire` and scroll through four viewport heights; `/?world=dawn`
previews the destination. No parameter runs the existing film. The prototype
owns its resize/rAF/scroll track and hides the film HUD. Assets load only after
entering the prototype, including in the single-bundle production build.

## Pipeline

1. Paint registered 1536×1024 PNGs into `art/raw/world/` with built-in imagegen.
   Empty cutout space is magenta; sky layers are full bleed. Selected prompts
   and references are recorded in `art/raw/world/PROMPTS.md`.
2. `scripts/vectorize.py` keys magenta and contaminated edge pixels, suppresses
   texture, runs deterministic seeded k-means, merges almost identical colours,
   drops small connected regions, traces/simplifies contours and sorts by area.
3. `src/world/prototype.ts` paints night/dawn layer caches only on resize.
   Night colours are multiplied toward blue. A reusable lighting pass clips
   three flat warm pools to each layer; depth controls their influence.
   Smooth sine noise moves pool boundaries and the four outlined flame tongues.
   The tree cache skews around its base; one spark carries the upward move.
4. Scroll relights toward dawn bands and drops the fire set beneath a hard,
   irregular brush edge that bends toward the spark. Dawn moves into view above.

Regenerate the selected traces (defaults remain K=6, area=0.05%, tol=2):

```sh
python3 -I scripts/vectorize.py src/assets/world/fire.json \
  a:.1:art/raw/world/fire_a.png b:.3:art/raw/world/fire_b.png \
  c:.5:art/raw/world/fire_c.png d:.6:art/raw/world/fire_d.png \
  e:1:art/raw/world/fire_e.png --k 12 --tol 1.5 --min-area .00008
python3 -I scripts/vectorize.py src/assets/world/dawn.json \
  a:.1:art/raw/world/dawn_a.png --k 8 --tol 2
```

The smaller production cutoff retains the eyes and blue streak. Near-identical
palette merging prevents fine painted texture becoming clusters of polygons.
Both JSON files are below 400 KB. Traces intentionally fill colour-region holes;
smaller colour masses draw over them in descending area order.

## JSON

`{w,h,layers:[{name,depth,outline,shapes:[{c,band,pts}]}]}`.
`c` is hex RGB; `band` ranks palette luminance (0..K−1); `pts` is interleaved
integer x/y coordinates. All layers must have identical dimensions.
Depth increases toward the viewer. Layer `b` sways; flames sit behind `d`.

## Knobs and checks

`--k`, `--tol`, `--min-area` control palette, contour detail and minimum region
area. In the renderer, tune `light` (source coordinates, radius, colour,
strength), depth influence, camera travel, flame dimensions and wipe timing.
Phone cover-fit favours the storyteller; dawn favours the low sun on the right.
Reduced motion removes flicker, flame wobble, sway and ambient camera drift.
Caches use CSS-pixel resolution; the output DPR is capped at 1.25 for fill cost.
`window.__world.cost()` reports smoothed JS frame cost; light/camera are exposed.

Run `npx tsc -p tsconfig.app.json --noEmit`, `npx oxlint`, then:

```sh
npx vite --port 5199 --strictPort
node scripts/shoot-world.mjs
```

Capture targets: `scripts/shots/world-{phone,desktop}-{0,0.35,0.6,1}.png`.
This session's sandbox denied Vite's listen socket and Chromium's socket setup,
so browser captures and the <4 ms phone budget remain **unverified**. Static
vector proofs were inspected at `scripts/shots/world-vector-proof-*.png`;
they omit runtime lighting/flames and are not browser screenshots. A mock-canvas
smoke check exercised actual renderer frames at all four scroll values, both
sizes and both motion preferences. Typecheck, lint and production build passed.

Next: run the capture script in an unrestricted dev environment, inspect motion
and light strength on an iPhone, then tune the seam and add authored hand poses.

# v12b painting prompts

Generated with the built-in image generation tool. Style references inspected:
`art/raw/bg_inksea.png`, `src/assets/sketchbg/bg_sunset.webp`.
No character sheets, manifest, or style-sheet files were modified.

## bg_space

Use case: illustration-story. Create ONE original production background painting
bg_space for a scroll driven ink film. Match the reference paintings shown in
this conversation: bold rough sumi ink dry brush, soaked paper grain, very
restrained washes, confident large shapes. Portrait 2:3, 1024x1536 or larger.
Deep black-indigo ink-wash outer space filling the entire image, subtle broad
flowing wash variation, faint huge blue-grey Earth crescent/glow low on the
right side at about 65% height, atmospheric but unmistakably hand painted.
Mostly dark negative space for animated figures. NO stars, no star clusters,
no particles, no moon surface, no people, no text, no logos, no photorealistic
digital space art. Background must cover tall phone and wide desktop crops.

## fg_moon

Use case: illustration-story. Asset fg_moon: original hand painted sumi
ink-wash lunar foreground layer for the same film as the ink sea and sunset
references. Portrait 2:3 1024x1536. Exactly top 65 percent flat solid pure
magenta #FF00FF for chroma key, no texture in magenta. Bottom 35 percent is
solid grey lunar dust and low rolling grey ink dunes filling the entire
bottom and touching left right bottom borders; horizon is one clean broad
shallow convex curve, peak near 68 percent height at the centre and edges
around 76 percent height, no jagged mountains. Foreground grey with broad
black dry brush shadows, pale grey upper rim lit from low overhead centre,
paper grain only within the ground. Broad minimal shapes, room for animated
figures at 74 percent height. No stars, no particles, no rocks cluster,
no people, no Earth, no sky, no text, no logos. The magenta behind the ground
is perfectly flat for keying. Ground is opaque all the way to bottom edge.

## Outputs

- Raw PNGs: `art/raw/bg_space.png`, `art/raw/fg_moon.png` (1024×1536).
- WebP: `src/assets/sketchbg/bg_space.webp`, `src/assets/sketchbg/fg_moon.webp`.
- Rebuild: `python3 scripts/prepare-moon-art.py` (full-size magenta key,
  edge unmix/despill, quality 85). No pose output or metadata writes.
- The generated lunar horizon sits around 61–64% of image height; the hero
  lands at 74%, in front of the curved horizon on the dust.
- No extra moon close-up was needed: `moonLaunch` enlarges a circular crop
  of the existing sea painting's moon. `seaCamera` keeps its projection in
  frame on phone and desktop, and provides the exact starting position and
  radius to the seam.

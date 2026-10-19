# WORLDS — living backgrounds (round 34 spec)

The owner: *"enhance the backgrounds… add a lot of qol and actual features or
artstyle… instead of static"*. Picked: **moving paint**, **light that lives**,
**paper paints itself**, **the world reacts to big moments**, and **worlds
match the act's art style** (like he does). Still and Home stay ink.

Hard rules (CLAUDE.md): phone first (390×844) and every screen size; nothing
depends on hover; **no clusters of small things** (no particle swarms, rain
streak fields, star fields, foam confetti: one strong shape each); original,
not copied; never re-time beats; `prefers-reduced-motion` calms everything;
budget ≤ 4 ms/frame of JS on a phone for the world layer.

## Worlds and their art (ChatGPT paints; files in `src/assets/sketchbg/*.webp`)

Every layer with transparency is painted on flat pure magenta `#FF00FF` and
keyed (see `scripts/prepare-moon-art.py` / `scripts/cut-grid.py`). Strips marked
*tile* must repeat seamlessly left↔right. Plates are 1536×1024 unless noted.

| Act (style) | name | what |
|---|---|---|
| Still, Home (ink) | `ink_far` (tile, magenta) | ink-wash far mountain range, pale grey, low on the strip |
|  | `ink_mid` (tile, magenta) | ink pines, a rock, a far little village roof line; darker |
| Run (pixel) | `px_sky` | pixel-art morning sky, big soft pixel clouds, no small dots |
|  | `px_far` (tile, magenta) | pixel-art far mountains |
|  | `px_mid` (tile, magenta) | pixel-art hills and a few big pine trees |
| Wave (watercolour) | `wc_sky` | watercolour night sky with the big full moon upper-centre (the launch seam flies to it) |
|  | `wc_cloud` (tile, magenta) | one long watercolour cloud bank |
|  | `wc_sea_far` (tile, magenta) | watercolour far swell up to the horizon |
|  | `wc_sea_near` (tile, magenta) | watercolour near swell, big dark wave bodies, one broad foam crest per wave |
| Light (pop-art comic) | `cm_space` | pop-art comic space: deep blue-black with big Ben-Day halftone gradients, one or two big comic star bursts at most |
|  | `cm_earth` (magenta) | the Earth as a big comic-style disc with halftone shading and a bold outline, separate so it can turn/glow |
|  | `cm_moon` (magenta) | the moon's surface foreground, comic style: bold outlines, halftone craters, a curved horizon |
| Chase (1930s cartoon) | `hs_sky` | sunset sky as a 1930s cartoon background painting (Fleischer-era, warm limited palette, soft film grain) |
|  | `hs_sun` (magenta) | the big setting sun disc in the same style |
|  | `hs_cloud_far` (tile, magenta) | far cloud bank |
|  | `hs_cloud_near` (tile, magenta) | near cloud bank, bigger, darker underside |

The old paintings (`bg_inksea`, `fg_inksea`, `bg_space`, `fg_moon`,
`bg_sunset`, `fg_sunset`) stay as fallbacks until the new ones load.

## Behaviours (the engine: `src/sketch/worlds.ts`)

**Moving paint**
- Tiling strips drift and parallax by depth (far slow, near fast) with the camera and on their own (wind).
- Sea: the near and far swell strips roll — draw them in horizontal bands with a sine offset (a cheap displacement), the near swell rising and falling; the waves are not frozen.
- Clouds drift; the Earth turns slowly (rotate/scroll its surface inside its disc mask) and breathes a faint atmosphere glow; the sun shimmers (a slow heat wobble of its bottom edge) and pulses.
- On paper worlds a soft wind moves the ink pines (skew by height).

**Light that lives**
- The Spark is a light: a warm glow pool on the background where it is (additive/screen, one soft shape) in every world.
- Wave: rare lightning flashes over the sea — one bolt shape, the clouds lit from behind for a beat.
- Light: blade clashes flash the moon surface (a brief coloured wash under the clash point, red/blue); the comic halftone "pops" brighter on the flash.
- Chase: god-rays from the sun that shift as he flies; the sea/clouds' rim light follows the sun.

**Paper paints itself** (Still, Run, Home)
- Ink worlds: `ink_far` and `ink_mid` are brushed in behind him as he moves — revealed under a ragged brush-edged mask that advances with him; Home's come in as he rides in; they stay quiet behind the action.
- Run (pixel): `px_sky/px_far/px_mid` build in tile by tile (a pixel-block reveal) behind him as he runs.
- The Eraser erases the world behind it as it chases: a pale wiped streak through the layers (ink) / blocks blinking out (pixel), which heals slowly once it's gone.

**The world reacts** (to existing impact beats: f.crossedFwd at the chapters' impact constants)
- Eraser slam (Run, Home): the paper/world ripples once (a radial displacement ring, one shape).
- Sea landing (Wave): the near swell surges up under him.
- Duel clashes (Light): one moon-dust cloud bursts from the contact point (one soft shape), plus the flash above.
- The catch (Chase): the clouds part around him, the sun flares.
- Fire kick hit (Home): the paper scorches in one ring that fades.

All of it is a pure function of the film beat B plus the wall clock t (wind,
shimmer), so scrolling back rewinds it.

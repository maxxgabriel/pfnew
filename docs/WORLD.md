# WORLD — one explorable ink world (round 38, draft for the owner's OK)

The owner on v3: *"nope its still really bad how about instead if guessing you
ask me what is it that i actually want"*. Asked; their answers:

| question | answer |
|---|---|
| What is the portfolio at its core? | **One explorable world** |
| What's worst now? | Barely moves, looks cheap, generic layout, wrong ink feel (all four) |
| Which motion? | Character acts, ink and paint FX, hover and tap life, big transitions (all four) |
| What should a visitor leave with? | **Be wowed** |
| How do they move? | **Scroll as a journey** (a path through an open world, not page sections) |
| What does it look like? | **Districts per style** |
| What's in it? | Animation scenes, style portals, about and contact, hidden secrets (all four) |
| The scroll film? | **A place in the world** |
| Camera? | *"use all of them"*: side-scroller, winding map, into the depth, mixed |
| Seams? | *"use them all"*: portals, paint-over, seamless blend, hard cuts |
| The boy's role? | **The star**: you travel past him while he performs |
| First build size? | **All seven styles** |

The motion site (SITE2/SITE3) is replaced by this.

## The map (draft)

Scrolling moves you along one path. Each district has its own camera, its own
scene the boy performs, and one thing to find. Every seam type is used.

| # | District | Camera | The boy performs | To find | Seam out |
|---|---|---|---|---|---|
| 1 | **Ink** (home) | Side-scroller over sumi mountains | Brushed into being from one line; MAX GABRIEL paints itself; the Spark drops | Tap the moon: it winks (secret) | **Hard cut** on his jump |
| 2 | **Pixel** | Side-scroller, platformer | The run → sprint, scroll speed drives his legs; a moonwalk if you scroll back | A pixel signpost: *who I am* (about) | **Paint-over**: watercolour washes over the pixels |
| 3 | **Watercolour** | Into the depth, the sea coming at you | The surf on the great wave | A bottle in the water: a secret note | **Portal**: a comic panel border he leaps through |
| 4 | **Comic** | Mixed: panel to panel | The duel under the comic moon | Halftone stars hide a secret frame | **Seamless blend** into clay |
| 5 | **Clay** | Winding map, a top-down diorama | The leap and the fall across the islands | **The theatre: the scroll film plays here** | **Hard cut** on a fall |
| 6 | **Chalk** | Into the depth, down a blackboard road | Chalk surf through drawn-on clouds | Tap the eraser: it rubs him out and he redraws himself (secret) | **Portal**: a door drawn in chalk |
| 7 | **Rubber hose** | Side-scroller, 1930s cartoon stage | The broom gag, the knock, the hat tip | **Contact**: a mailbox and a red hanko seal; tap to say hi | Loops home: the iris closes and opens on Ink |

Always on: anything you tap reacts (hover on desktop too); ink drops under
every press; the HUD is just the wordmark, a district name and a menu that
jumps to any district.

## Art

Already drawn: the boy in all seven styles (pixel-, water-, clay-, chalk-,
comic-, hose- cycles), backgrounds for ink, pixel, watercolour, comic and
rubber hose (`src/assets/sketchbg`). To generate: clay and chalk worlds, the
theatre, the mailbox, the signpost and the portals.

## Engine

The film's canvas engine (beats, holds, worlds, seams, `src/sketch/*`) already
does scroll-driven scenes, parallax worlds and style twins. The world is built
on it as a new entry (`world.html`), one module per district, so the film itself
stays playable inside the theatre.

## Engine spec (for the build)

**Entry.** `world.html` (add `world: 'world.html'` to `vite.config.ts` inputs) with a
fixed `<canvas id="world">`, a tall empty `#track` to scroll, and the HUD. Code in
`src/world/`. Reuse the film's helpers; don't copy them: `drawPose` / `hasPose` /
`setPoseClock` / `preloadPoses` / `queueArt` (`src/sketch/art.ts`; a style's
drawing is the key with its prefix, e.g. `pixel-run8_3`, `water-surf_1`,
`comic-saber_2`, `clay-leap_0`, `chalk-surf_1`, `hose-broom_4`), `drawBg` /
`bgImage` (`src/sketch/bg.ts`; add new names to its `PRIO`), `drawSpark`,
`drawPaper`, `drawGround`, `INK` / `PAPER` / `RED`, `cycle` (`src/sketch/common.ts`),
`brush` / `ensoPath` (`src/core/brush.ts`), `drawWaterWave` (art.ts).

**Playhead.** Scroll → `target = scrollY / stepPx` (`stepPx = max(420, 0.72·h)`),
eased like the film (damped follow), giving `P` (path position) and `vP`.
Each district has `len` (in steps, about 6–9 each, total ≈ 55) and its
neighbours overlap by its seam length (about 1–1.5 steps). Inside a district
`L` runs 0→1. Every scene is a pure function of `L` plus the wall clock `t`, so
scrolling back plays it backwards; ambient life (blinks, wind, bobbing) runs on
`t` so it never freezes. When the reader stops for 3 s the boy does an idle
bit in that style.

**District module** (`src/world/districts/<key>.ts`):
```ts
export interface District {
  key: 'ink'|'pixel'|'water'|'comic'|'clay'|'chalk'|'hose';
  name: string;           // HUD label, e.g. 'Ink', 'Pixel', 'Watercolour'
  len: number;            // in steps
  preload(): void;        // queue its paintings and drawings
  draw(f: WorldFrame, L: number): void;   // the whole screen, opaque
  tap?(id: string, f: WorldFrame): void;  // a hot spot was tapped
}
```
`WorldFrame`: `ctx, w, h, u, portrait, P, vP, t, dt, idle, calm, face` (the
boy's face size: `min(w·0.19, h·0.088)` like the film) plus `crossedFwd(L)`,
`shake(px)`, `flash(a, col)`, and the hot-spot API below.

**Cameras** (`src/world/camera.ts`), one helper per kind, so districts stay short:
- `side(f, x, layers)`: parallax side-scroller; tile strips by depth.
- `depth(f, z, layers)`: one-point perspective; things scale by 1/z and rush at you.
- `map(f, s, plate, path)`: look down on a tall plate, pan/zoom along a polyline path; the boy is small on it.
- `panels(f, s, panels)`: comic panels on a page; the camera flies panel to panel; bold borders.

**Seams** (`src/world/seams.ts`). While two districts overlap, each draws into
its own offscreen canvas (only then; reuse the canvases) and the seam
composites them by `q` 0→1:
- `cut`: A until the action beat, then B on the exact frame, with one shake and a flash.
- `paint`: B is revealed through 3–5 **big** brush strokes that sweep across (never many small ones).
- `portal`: a shape in A (a comic panel border, a chalk door) grows from the
  centre until it fills the screen; B is seen through it; the camera pushes through.
- `blend`: A dissolves into B through a large soft noise mask (big blobs, like clay melting).
- `iris`: a 1930s iris closes on A to black, then opens on B.

Order and seams: Ink →cut→ Pixel →paint→ Watercolour →portal(panel)→ Comic →blend→
Clay →cut→ Chalk →portal(door)→ Rubber hose →iris→ back to Ink (at the end of the
track the iris closes, the page jumps to the top, and it opens on Ink).

**Hot spots and touch** (`src/world/hot.ts`). Each frame a district registers
`f.hot(id, x, y, r)`. A tap or click inside one calls `district.tap(id, f)` and
`f.since(id)` gives seconds since that spot was last tapped (scenes animate on
it). On a fine pointer, hovering a hot spot shows a pointer cursor and
`f.over(id)` is true (things lean or glow), but nothing *needs* hover. Tapping
the boy pokes him (art.ts `pokeHero`). Every press anywhere drops **one** ink
blot under the finger that blooms and fades (~0.6 s).

**HUD (DOM).** Top left the `logo_ink` wordmark (tap → back to Ink). Top right
the district name in Caveat Brush that brushes in when it changes, and MENU
opening a full-screen paper list of the seven districts (tap → scroll to its
start). Bottom: one thin ink line with the red Spark sliding along it as
progress. On first load a handwritten *scroll* hint that leaves once you move.

**Finds** (copy is placeholder; the owner will edit):
- About (pixel signpost): *Max Gabriel. Motion designer and animator. I draw one
  little ink boy and make him move in every style I can.*
- Contact (mailbox): tap → the flag drops, a letter flies out, `mailto:hello@example.com`; the red hanko seal stamps once.
- Theatre (clay): the stage shows the boy bowing; tap → the film (`film.html`,
  or `VITE_FILM_URL` when set) opens full screen over the world with a close button.

**Rules.** Phone first (390×844, landscape 844×390), up to 2560×1080. JS ≤ 6 ms a frame
on a phone; device pixel ratio capped at 2. No clusters of small things.
`prefers-reduced-motion` only calms shake, flash and camera whips; nothing turns off.
Original art only. Typecheck and lint clean.

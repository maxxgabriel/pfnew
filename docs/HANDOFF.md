# Handoff

Everything a new agent needs to pick this up. Read `docs/BRIEF.md` first for
the owner's taste and decisions; this file is the technical side.

- **Live preview:** https://claude.ai/artifact/9d3GKN33rB1VSTR2jGoDnV (the Reel, round 16;
  an older preview lives at https://claude.ai/artifact/PcwGzT9y7tqBXqoo9EXsgD)
  (a private claude.ai artifact owned by the user; only Claude sessions with
  the Artifact tool can republish it. See "Shipping" below.)
- **Branch:** `claude/confident-dijkstra-4t2ifl`
- **Stack:** Vite 8 + TypeScript, Canvas 2D, no runtime dependencies. Fonts
  come from Google Fonts: Dela Gothic One (display) and Shippori Mincho
  (serif).

---


## Current film: the Reel (rounds 16–17) — read this first

The site is a showreel in the first film's format: five chapters, each a
different craft at full strength, each flowing into the next with no hard
cut. `main.ts` draws `drawReel` (`src/reel/reel.ts`). Everything is a pure
function of the film beat `B` plus the clock `t`, so scrolling back plays it
backwards. Round 17 cut Flock (the murmuration), Neon (the letter city) and
Shadow's shard cloud; see `docs/OWNER_INSTRUCTIONS.md`.

| Chapter | Beats | Craft | File |
|---|---|---|---|
| I Ink | 0 – 9.6 | brush animation: the duel paints a hanging scroll | `reel/ink.ts`, `painting.ts`, `duel.ts` |
| II Fold | 9.6 – 17.6 | 3D geometry: the scroll becomes a sheet that folds into a crane that flies off | `reel/fold.ts`, `v3.ts` |
| III Shadow | 17.6 – 23.8 | light: one swinging bulb, a shadow that melts from picture to picture | `reel/shadow.ts` |
| IV Impact | 23.8 – 29.8 | anime set piece in silhouette, beam clash, white-out | `reel/impact.ts` |
| V Page | 29.8 – 35.8 | the finale: every chapter live in a brushed circle, seal, contact | `reel/page.ts` |

- `reel/reel.ts` — the conductor. `CHAPTERS` (mirrored in `core/frame.ts`
  `CHAPTERS` for the HUD) gives each chapter `[from, to)` and a `draw(f, L)`
  with its local beat `L = B - from`. A chapter's opening owns its seam: it
  starts on the previous chapter's last frame (often by literally drawing it).
  `reelHud` says whether the HUD sits on paper and when the contact card shows.
- **The seams.** Ink → Fold: the scroll's paper closes in to a square on a
  dusk sky while the ink washes off it (`drawLetGo`, the first `PRE` beats of
  Fold). Fold → Shadow: the camera lets the crane go (`camBeat`), it flies
  on into the dark and ends as one warm point dead centre, which is where
  Shadow's bulb hangs. Shadow → Impact: the bulb sinks into a sunset and the
  rivals' shadow hardens (`rivalsOnScreen` hands the layout over). Impact →
  Page: the beams' meeting point swells to white, and the white is the
  inside of the page's centre circle.
- **I Ink** (`ink.ts`): the brushed title, two drops, the duel (`duel.ts`:
  fighters from `acts/warrior.ts`, keyed per beat, snaps, crescent smears,
  a frame of negative per clash), each cut flowing into the landscape
  (`painting.ts` `ELEMENTS`: the cross → ridge, the leap → cliff, the
  thunder → gold river, the spinning guard → moon, the spray → pine), the
  seal, the pull back to the whole scroll. Landscape cached after `SETTLED`.
- **II Fold** (`fold.ts`, kit in `v3.ts`): `drawLetGo` (the scroll closes in
  to the square, `PRE` beats), then an 8-triangle fan sheet folded rigidly
  (Rodrigues `rotAbout`), crease lines drawing on, the snap into a bird base,
  the crane mesh (`V`, `FACES`) rising, flight over paper hills that fold up,
  night, the camera slowing (`camBeat`) while the crane flies on, the dark.
  Beats in `FD` (local to after `PRE`). Also owns the dusk sky (`drawSky`).
- **III Shadow** (`shadow.ts`): each shape (crane, peaks and moon, the two
  rivals drawn by `drawRivalsFlat`) is rasterised to a mask; the shadow is
  that mask on the paper, thrown against the bulb's swing, and each change
  melts it soft (drawn small and scaled up: `soft`, no canvas filter on iOS)
  while it crossfades to the next. The swing (`swing`) dies to exact rest on
  each shape's beat. Half-res layer for the soft edge, a crisp pass at sunset.
- **IV Impact** (`impact.ts`): fighters keyed per beat (`BK`, `GK`: beat,
  hilt, blade angle, facing, snap), shots as views (`viewAt`), the glint
  cut-in panel, speed lines, two-frame impact frames ('difference' then
  white spikes), sparks on the lock, the beam clash, the white-out.
- **V Page** (`page.ts`): the circles replay a loop of each chapter into
  small canvases with a fake `Frame` (one per frame, round robin, so each
  runs at about 10 fps); the rings, seal and signature wreath are painted
  live, then cached to a layer once done.
- No on-screen words in the set pieces (owner's rule); the only words are
  the title, the seal and the contact card.
- Website only: the owner doesn't want a video format, ever.
- Perf (headless, software raster, JS ms/frame, round 16): Ink 1–7, Fold
  0.3–5, Impact 2.5–7, Page ~10 (peaks ~24 while the rings are being
  brushed). Shadow is lighter than it was now the 900 shards are gone.
- The old acts (machine, titan, alter…) are still in `src/acts` but not
  wired; Machine and TITAN were cut by the owner in round 16.

## Previous: Two Drops (round 15)

`main.ts` draws `drawStory` (`src/water/story.ts`): beats in `T`, the two
fighters' choreography as keyframes (`BLUE`, `GREEN`: beat, hilt x/y, blade
angle, length), scenes `backdrop` (ridge from acts/ink.ts night, then a
moonlit water night), `wave`, `bamboo`, `rain`, `mirror`, and `enso`. The
fighters are `drawWarrior` + `drawLightLine` from the first film; the water is
`water/fluid.ts` (rendered as moonlit mist at night via `render(…, light)`).
`scripts/water-run.mjs` scrolls through in real time.

## Previous: Ink in Water (round 14)

`main.ts` draws one thing: `drawWater` (`src/water/water.ts`), beats in `W`,
chapters in `core/frame.ts`, no holds. `water/fluid.ts` is a CPU stable-fluids
solver (110 cells wide on phones) with vorticity, drag, `attract()` toward a
target, and a sumi renderer with a wet edge. Each picture is ink art rendered
once with paper made transparent (`art()`); its darkness at grid size is the
target the wash gathers into, and the art fades in over the wash. Mountains
reuse `drawInk(..., 'day')` from acts/ink.ts; bamboo and the ensō are drawn
in water.ts. Finger stirs (`waterMove`), tap drops ink (`waterTap`).
`scripts/water-run.mjs` scrolls through in real time (the sim needs time).

## Previous: One Day (round 13, superseded)

The film is now: the ink night you paint (`core/paint.ts`, `acts/ink.ts`),
then **One Day** (`src/day/`): painted scenes from morning to night, the
seasons turning, ending back on paper with the contact card. No holds
(`HOLDS = []`); chapters in `core/frame.ts`; beats in `DAY` (`day/day.ts`).

- `day/day.ts` — the timeline: scenes (spring, train, summer + rain, golden,
  dusk, night) and the edit between them (colour bleed, window match cut,
  tunnel, split-screen seam, dissolves, the drain to ink and paper).
- `day/layers.ts` — paintings (`assets/day/*.webp`, inlined) as cover-fit
  layers sharing one 1024x1536 frame; parallax by depth, tilt, push-in.
- `day/fx.ts` — flares, light rays, motes, glitter, leaks, rain on glass,
  rainbow, petals/leaves/snow (`Drift`), shooting stars.
- `day/input.ts` — finger (move, hold, tap), phone tilt (iOS asks on first tap).
- Interactions: swipe blows petals/leaves/snow; **hold stops the rain**; **tap
  lights the town's windows** at dusk; a fast swipe throws a shooting star.
- Art: `.claude/skills/codex-images` + `scripts/gen-art.sh` (Codex CLI on
  the owner's ChatGPT plan) → `scripts/cutout-day.py` → `assets/day` +
  `points.json` (train window, crossing lamps, stair lamps). The paintings for
  the town/stairs/river came out daylit; dusk/gold are pushed by cached tints.
- The older acts (machine, match, alter, titan, powers, sign, strip, credits,
  meteor, hero art, hero3d) are still in `src/` but unwired; git history has
  them working.

## 1. How the film works

`index.html` has one fixed `<canvas id="film">` and a tall empty `#track`
div that exists only to be scrolled. `src/main.ts` turns scroll position into
a playhead and redraws the whole frame every animation frame.

- **Raw beats (R):** `scrollY / beatPx`, where `beatPx = max(400, 0.66 ×
  viewport height)`. R is smoothed toward the scroll target with a damped
  follow, so scrubbing feels like film.
- **Film beats (B):** R with the **holds** removed (`src/core/holds.ts`).
  Every act is authored in film beats.
- **Holds:** a hold freezes film time at `at` while the reader scrolls `len`
  raw beats. During it, `frame.hold = { kind, p }` with `p` running 0→1, and
  the act that owns the hold animates on `p`. Use this to give a moment more
  time without re-timing anything. Current holds:

  | kind | film `at` | raw range | what plays | file |
  |---|---|---|---|---|
  | `thunder` | 4.86 | 4.86 → 6.11 | Blue's thunder finisher (its zig-zag is the signature's M) | ink.ts `drawThunder` |
  | `titan` | 11.98 | 13.23 → 18.03 | the letters become TITAN; the punch; the bolt splits the page | titan.ts |
  | `alter` | 12.63 | 18.68 → 24.28 | ALTER, a third of its shots (`KEEP` in alter.ts); ends on a whip-pan up | alter.ts |
  | `dive` | 12.636 | 24.29 → 25.49 | MATCH slams in; the camera dives through the A | dive.ts |
  | `dash` | 15.0 | 27.85 → 28.80 | The Zone, then #10's thunder dash | match.ts `drawZone`, `drawDash` |
  | `meteor` | 15.55 | 29.35 → 33.75 | #10's shooting star (Ryusei-Blade-style special move), then the 3D camera catches it falling into the goal | meteor.ts, match.ts `shot()` / `inkWake` |
  | `powers` | 18.7 | 36.90 → 43.30 | Powers of Ten: the pull-back to the page | powers.ts |
  | `sign` | 18.72 | 43.32 → 46.92 | the signature: the moves rise, the Hand inks "Max", the living name, the invitation | sign.ts |

  `RAW_END = ACT.END (30) + 28.2 = 58.2`. Convert with `toFilm(raw)` /
  `toRaw(film)`: raw = film + sum of `len` for holds whose `at` < film. Holds
  must stay sorted by `at` in `HOLDS`. A set piece that plays in a hold is
  drawn on top of everything from `main.ts` (`if (frame.hold?.kind === …)`).

  **Round 10 additions** (see docs/STORY.md v4): `core/signature.ts` (the
  strokes and the lingering pen-lines), `core/cuts.ts` (poster repaint before
  the white-out; the whip-pan out of ALTER), `core/texture.ts` (a texture per
  world), `core/drift.ts` (the travelling particles), `core/taps.ts` (tap to
  play), `acts/dive.ts`, `acts/sign.ts`. Round 10b (from a Mat Voyce
  teardown): `acts/open.ts` (the opening window takeover, B 0→2.3, the film
  drawn live inside a tilted card), the credit rollers (credits.ts
  `drawRoll`), `rubber()` in core/math.ts (type stretches with scroll speed;
  dev hook `__film.vel(v)`), `core/trail.ts` (finger trail),
  `core/markloop.ts` (chapter marks play a loop before jumping),
  `acts/strip.ts` (the film strip after the signature, B 18.76→20.55; swipe
  sideways). The dragon, Night Ride and X-Ray
  files are deleted (rejected round 10).
- **Clock (t):** wall time in seconds. Ambient motion (mist, embers, blinking,
  bobbing) runs on `t`, so the frame keeps moving when the reader stops.
  Story motion runs on B (or the hold's `p`), so scrolling back plays it in
  reverse.
- **Frame object** (`src/core/frame.ts`): `ctx, w, h, u, portrait, B, vB, t,
  dt, intro, hold, reduced` plus `crossed(b)`, `crossedFwd(b)` (true on the
  frame the playhead passes a beat; use these for one-shot events like
  shakes, flashes and particle bursts), `shake(px)` and `flash(alpha, colour)`.
- **Post** (main.ts `post`): letterbox bars (duel, the shot, post-credits, all
  of ALTER), flash, act title cards (Machine and Match, each with one
  storybook line from `BOOK`), the vignette, and film grain.
- **HUD (DOM):** the MG seal (back to start), the chapter label, the chapter
  reel with tappable marks (ALTER's mark is red), and the contact card at the
  end. `html.on-paper` switches the HUD to dark text over paper scenes.
  Chapters that live inside a hold (Alter, Ride, Hello) are forced while the
  hold plays, and their marks jump to the hold's start.

## 2. The timeline (film beats)

The story these acts tell is in `docs/STORY.md`. Chapters: I Ink, II Machine,
III Alter, IV Ride, V Match, VI Hello, VII Credits.

| beats | act | file | notes |
|---|---|---|---|
| intro (clock) | title | ink.ts `drawTitle` | the first drop falls (the knight's red eye opens in it for a blink, intro 0.36–0.45 s) → ensō → Blot climbs out of the splash → MAX/GABRIEL → seal → gold bolt signs MAX |
| 0 → 1.4 | Ink: pull-back | ink.ts | ensō becomes the moon; sumi-e karst layers rise |
| 1.25 → 2.35 | Ink: flood | ink.ts | ink blooms up behind the range; night |
| 2.35 → 6.8 | Ink: duel | ink.ts + warrior.ts | the pearl hovers over the fight (`pearlHome`); clashes at 3.55/4.12/4.45/4.75, vertigo lock, **thunder hold at 4.86**, Green's snapped blade, beams 5.3, the frame reprinted as a poster (6.0–6.45, cuts.ts), white-out; MACHINE slams onto the page and the tear rips it |
| 6.75 → 7.85 | paper + tear | ink.ts `drawPaperOver` | the pearl pops out as a ball; the paper tears; Blue tumbles through after it (7.3–7.75) |
| 7.0 → 11.98 | Machine | machine.ts | MAKE / THINGS / THAT / MOVE chain reaction; card "II · MACHINE — the pearl fell through the page"; **titan hold at 11.98** |
| 11.98 → 12.4 | the night behind the page | main.ts | after TITAN the machine is gone (`torn`) and the match's night sky shows |
| 12.63 / 12.636 (holds) | **ALTER** (a third), then **the dive** through MATCH | alter.ts, dive.ts | see §3 and §4 |
| 12.4 → 20.0 | Match | match.ts | the star falls onto the centre spot; card "V · MATCH — the same two, one more time"; lights, lower third, chalk tactics, panels, **dash hold at 15.0** (The Zone, then the dash), **meteor hold at 15.55** (the shooting star), the star falls out of the sky into the goal, goal; **powers hold at 18.7** |
| 18.7 → 22.6 | Hello | finale.ts | the page: the ensō, Blot, and the Hand signing MAX (18.85) and GABRIEL (19.62), seal 20.32; the rivals' lights circle; contact card 20.7–22.6 |
| 22.55 → 30 | Credits + post-credits | credits.ts | roll; "wait —"; Blot finds the hilts; "MAX GABRIEL WILL RETURN" |

The match is skipped after the pull-back (`B > POWERS_AT`), and the machine
after TITAN (`B > TITAN_AT`); the old machine cut (`drawMachineCut`) no
longer plays.

Match has an internal remap: `matchLocal()` (the bullet-time freeze). It is a
no-op now (`FZ = 0`): the shooting star replaced bullet time. Read it before
editing the match's internal constants.

**The shooting star** (`src/acts/meteor.ts`, `meteor` hold). #10's special
move, staged after the anime meteor-shot sequence (Ryusei Blade): control →
ignite → launch → sphere in space → leap and spin → contact (white frame, held)
→ the constellation collapses into the ball → bang → the blade falls out of
space. Timing is deliberately uneven (slow, FAST, stop, slow, FAST, FREEZE,
violent acceleration). #10 is drawn art (`src/acts/heroArt.ts`): eleven
key-pose drawings (control, windup, flick, crouch, rise, tuck, bicycle,
follow, kneel, boot close-up, face close-up) cut out of magenta by
`scripts/cutout.py` into `src/assets/hero/*.webp` (inlined, ~650 KB) with a
`manifest.json` of crops. `drawArt(ctx, pose, x, y, height, anchor, opts)`
places a drawing by a named anchor measured in the original 1024x1536 pixels
(planted foot, sole, toe, eye...), and adds rim light, a flat silhouette or a
wash of light from tinted copies of the cut-out. To add a pose: run cutout.py
on the new PNG, add its anchors to `A` in heroArt.ts. `src/hero3d/` (a 3D
model built in code with three.js) and `src/acts/striker.ts` (a 2D rig) are
earlier attempts, not used by the film and not in the bundle. The blade (`drawBlade`: white core, yellow head,
blue wake, lightning, orbs) is exported and reused by match.ts, where after the
hold the ball falls from `METEOR_FROM` high in the sky to `IMPACT` (a low
camera tilted up catches it), and on impact its path becomes an ink brush
stroke over a blue burn (`inkWake`) that dries before the pull-back. Palette
is the original's blue/yellow; the owner first asked for green and gold, so
that swap is an open offer. Dev hook: `__film.meteor(name, q)`.

## 3. ALTER (`src/acts/alter.ts`), the centrepiece

Shots are a list `SHOTS: {name, dur, draw(g, q)}`. `p` (0..1) maps onto the
summed durations (21.68 units across 15.45 raw beats) and each shot gets its own
`q` (0..1). Cuts are hard; each new shot gets a small jolt and a red
overexposed frame. `hitQ(x)` fires once as the shot's q crosses x (use it
for shakes and flashes).

Order: corrupt → title → wide → feet → sword → eyes → ring → impact → reveal
→ standoff → dash → clash → slashes → volley → **dead calm** (still → calm
→ drop → **beneath** → release) → **the void** (sign → expand → void →
shatter) → charge (orbit) → **beam clash** (fire → driven → strain → push →
snap → column) → after → exit. The exit is the knight driving the blade into
the black water. In round 10 ALTER plays only the shots in `KEEP` and ends on the column shot (the Spark rising), then whip-pans up into the dive.

**The enemy is the rival** (round 8): Green from the ink duel, reborn on the
back of the page — the same brush body as the knight (`drawWarrior`), a
violet blade of light (`drawLightLine` from ink.ts), green eyes. `rival()`
takes `lit`, `dissolve` (breaks into ink blown along +x), `snap` (breaks the
blade). The owner rejected the ink-blob monster and its tentacles as
"weird"; don't bring them back. Its attacks are flying slashes
(`crescent()`), which Dead Calm cuts in half.

- Match cuts: the title's slash settles flat onto the wide's horizon; the red
  eye rises into the sky ring's core (`matchEye`); in Dead Calm the cooled
  blue eye rises into the moon. Those shots use `flash: null`.
- Slashes: each cut has the knight mid-swing in the foreground with an anime
  smear (`smear()`, one solid ribbon over the arc) and three ghost
  multiples; the rival parries in the background.
- Charge: the camera orbits the knight (`orbitWorld()`: far layers slide the
  most, near rocks slide the other way; `runeCircle()` turns with the orbit).
- Beam clash: both fire from their blades; `contactAt(q)` keys where the
  beams meet; `contact()` is the ball of light, `tearGround()` the ground
  lifting under it. In the last push the knight's eyes and strands go blue
  (`BEAM_BLUE`); the rival's blade snaps (an echo of Green's in the duel) and
  they go to ink. The Spark (`spark()`) rises out of the smoke as a star.
- Blot: frozen mid-jump at the edge of Dead Calm (eyes on the latest cut),
  drops into the water on release; tumbles through the void and falls out of
  the shatter past one big shard; peeks out in the aftermath.
- Dead calm: time stops in a sphere around the knight (`CALM_T` freezes the
  clock, embers freeze, palette `BLUE`); slashes are cut as they reach it
  while the knight only snaps between poses (`CALM_POSES`); a droplet lands
  and a red ring brings time back (`calmScene` is shared by calm/release).
- The void: a hand seal, a sphere of void swallowing the world from the
  knight's chest, the rival caged and overloaded (`voidSpace`, `voidRival`,
  palette `VOID`), then the void is rendered to a buffer and breaks into
  glass shards (`shards`, `shotShatter`).
- Shots can set `embers: 'live' | 'frozen' | 'none'` and `flash` (the cut's
  overexposure colour, `null` for no flash or jolt). No on-screen text in the
  new set pieces, by the owner's choice.

- Beneath the surface: the camera follows the drop under the mirror: caustics,
  ink blooming (`blot()` sprites), two `koi()` circling the knight's
  upside-down blue reflection, the first world faint below, a red thread
  sinking past, and the shock coming down.
- Blue and Green read through colour: the knight keeps Blue's sash and
  headband (`sash` in `WarriorIn`), the rival has Green's.

Shared renderers in the same file:
- `world(g, cam)`: parallax sky, blood ensō moon, clouds, the spire
  silhouette (cached), mist, black water floor.
- `knight()`: the warrior body (warrior.ts) with a red rim, a violet
  backlight, red veins, and `blade()` (a black sword whose fuller fills red
  and whose rings ignite).
- `rival()`: see above.
- Effects: `debris` (q-deterministic), `speedLines`, `hLines`, `shockRing`,
  `cracks`, `impactFrame`, `beam`, `targetRing`, `drawEmbers`.

To jump to a shot, use the dev hook `__film.alter(name, q)`, or in screenshots
`node scripts/shoot.mjs alter:slashes:0.3,alter:calm:0.5`. `node scripts/perf.mjs 1 alter`
measures every shot.

## 4. The other set pieces

All of them follow ALTER's pattern: a list of shots `{name, dur, draw(g, q)}`
over the hold's `p`, hard cuts, `hitQ(x)` for one-shot shakes and flashes, and
a dev hook to jump to a shot.

- **TITAN** (`src/acts/titan.ts`). Shots: wake → assemble → ignite → hero →
  punch → split. The robot is a rig of letter blocks (`PARTS`, `rig`,
  `block`), arms driven by two angles each; `chest()` puts the O of MOVE in as
  the reactor, `visor()` puts Green behind the glass. The split renders the
  last frame to a buffer and slides the two halves apart along the bolt.
  Jump: `__film.titan(name, q)` / `titan:punch:0.4`.
- **The Zone** (match.ts `drawZone`): the first part of the dash hold; chalk
  board, hatched stands, chalk markings, chalk marks for everyone but #10,
  the two defenders and the ball.
- **Powers of Ten** (`src/acts/powers.ts`). `LEVELS` lists the worlds inside
  out: the net (match), ALTER (the column shot; the stadium is the star),
  the machine, the ink duel, the page. Each world is drawn live by its own
  act under a camera transform (sharp at any zoom), with the next world
  inside its `portal` circle. While a step's iris closes the outer world
  fades in by alpha, drawn straight to the frame (never through a
  full-screen buffer: that cost up to 128 ms a frame). The page
  level has the ensō (`PAGE_ENSO`, `pageEnso`), Blot (`blotSpot`) and the
  Hand (`drawHand`, `handRest`). Jump: `hold:powers:0.5`.
- **The Signature** (`src/acts/sign.ts`, `sign` hold): the page darkens, the
  film's moves rise out of the circle in their worlds' colours and fly into
  place as "Max" (`STROKES` in core/signature.ts), the Hand inks them in
  three strokes (`INK`, `INK_AT`), the full stop lands and Blot leaps onto
  it, MAX GABRIEL drops in as living letters (each has its own entrance in
  `ENTRY`, then breathes), the seal, then the invitation line.
  `drawSignedPage(f, 1)` is the finished page; finale.ts draws it after the
  hold. Jump: `hold:sign:0.5`.
- **The dive** (`src/acts/dive.ts`, `dive` hold): MATCH slams in letter by
  letter and the camera dives through the A's counter (measured from the
  real glyph). Jump: `hold:dive:0.5`.
- **Finale** (`src/acts/finale.ts`): the signed page stays; the rivals'
  lights circle the ensō; ink drips.

## 5. Other building blocks

- `core/brush.ts`: the sumi brush (press blob, wet body, dry bristles,
  "flying white"). `brush(ctx, points, {width, progress, dry, …})`. Points
  are cached by array identity, so reuse static arrays.
- `core/bolt.ts`: lightning (`drawBolt`, `drawCrackle`, palettes `GOLD`;
  ALTER passes `RED` and `VIOLET` via `pal`; `paper: true` for light
  backgrounds and `ink: true` for impact frames).
- `core/blot.ts`: the mascot Blot (`drawBlot(ctx, x, feetY, size, {pose,
  look, …})`) and its 8-bit sprite.
- `acts/warrior.ts`: procedural brush fighters solved from a hilt position
  and blade angle (IK arms and legs, leaps when the ground is out of reach).
  The hakama is two trouser legs that follow hip → knee → ankle, so a leg
  never floats loose; `sash` overrides the sash and headband colour.
- `core/glyphs.ts`: hand-built brush capitals for the name.
- `core/sprites.ts`: cached glow sprites (never use shadowBlur), paper tile,
  grain, blots.
- `core/style.ts`: palette `C`, fonts `F`, `font()` (whole-pixel sizes only:
  every distinct size is a fresh glyph cache), `extruded()` block type.

## 6. Working on it

```sh
npm install
npx vite --port 5199 --strictPort     # keep this running; scripts expect :5199
```

**Screenshots are the main QA tool.** `scripts/shoot.mjs <beats> [phone|desktop]
[intro seconds] [wait ms]` loads the page in Chromium, seeks, and writes
`scripts/shots/p-<beat>.png`. A beat can be a raw beat (`18.5`), a film beat
(`f:12.2`), a point in a hold (`hold:powers:0.4`), or a shot
(`alter:slashes:0.3`, `ride:skid:0.5`, `titan:punch:0.4`). Pass `intro 8` to
skip the title animation. `scripts/qa.sh out.png <beats> [phone|desktop]`
shoots and tiles them in the order given (use this one);
`scripts/sheet.sh out.png files…` tiles files. Always check phone size (390×844 @2x); check
desktop (1440×900) for big changes. The dev hooks also include
`__film.seekFilm(film)`, `__film.hold(kind, p)`, `__film.alter/ride/titan(name, q)`,
`__film.intro(s)` and `__film.cost()`.

Gotchas:
- After editing files, Vite hot-reloads. A shot taken during the reload can
  fail with `__film` undefined; the script waits, but rerun it if it fails.
- The sandbox's Chromium sometimes can't reach Google Fonts, so text falls
  back to Arial Black or Georgia in screenshots. That's a sandbox problem,
  not a bug.
- Headless rendering is software, so `drawImage` and `fillText` look
  expensive there. `scripts/perf.mjs` reports JS ms/frame. Everything is
  currently about 0.5–5 ms; keep it there.
- Playwright: use `executablePath: '/opt/pw-browsers/chromium'`; don't run
  `playwright install`.

**Checks before committing:** `npx tsc -p tsconfig.app.json --noEmit`, `npx
oxlint`, and screenshots of what you touched.

## 7. Shipping

- `npm run artifact` builds `dist/` and inlines it into
  `artifact/maxgabriel.html` (about 140 KB; gitignored). The artifact host
  supplies the doctype/head/body; fonts load from Google Fonts.
- The owner views it at the artifact URL above. A Claude session with the
  Artifact tool republishes it by passing that `url`; it must read the
  artifact first.
- Plain static hosting also works: `npm run build` and serve `dist/`.

## 8. Known issues and open items

- **Not tested on a real iPhone.** Frame rate, scroll feel and hold pacing
  are unverified on a device. Ask the owner how it feels.
- Contact email is a placeholder (`hello@example.com`, in index.html). Ask
  the owner for the real one.
- Kanji drawn on canvas (雷 in the thunder stance) may use a system fallback
  font, because the Shippori Mincho kanji subset isn't preloaded.
- `ctx.roundRect` needs Safari 16+.
- The scroll is long now (72.55 raw beats, roughly 60 phone screens). The
  holds are where the content is; if the owner finds it long, shorten hold
  lengths rather than cutting beats.
- Sound (STORY item 34) is still optional and not built: ask the owner.
- `scripts/perf.mjs` (no argument) samples raw beats across the whole film
  (0.2–5.8 ms at 1× in round 9); `node scripts/perf.mjs 1 alter` measures
  every ALTER shot.
- Between the split and ALTER (film 11.98 → 12.63) the night behind the page
  is the match's pre-light stadium; `drawAfterSplit` (titan.ts) carries the
  gold ember up to where ALTER's target ring locks on. The match's own
  falling star is hidden until film 12.63 (after ALTER).
- The ink duel's hilt cords are a small physics sim with state; a teleport
  guard in `Cord.step` keeps them sane when the ink world is drawn again at
  another size (Powers of Ten). Any new stateful effect needs the same care.
- `prefers-reduced-motion` only softens shakes and flashes; there's no
  reduced cut.

## 9. Ideas the owner hasn't seen yet (ask before building)

- Sound, behind a tap, for ALTER only (declined once).
- A real Blot turnaround for the bike shots (a back view in the tunnel).
- More worlds inside Powers of Ten (TITAN's reactor): add
  a `LEVELS` entry with a portal and lengthen the `powers` hold.

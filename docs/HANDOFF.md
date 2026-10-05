# Handoff

Everything a new agent needs to pick this up. Read `docs/BRIEF.md` first for
the owner's taste and decisions; this file is the technical side.

- **Live preview:** https://claude.ai/artifact/PcwGzT9y7tqBXqoo9EXsgD (updated in round 8;
  an earlier session also published https://claude.ai/artifact/2e3qybKHWFwd824v6ZoD2u)
  (a private claude.ai artifact owned by the user; only Claude sessions with
  the Artifact tool can republish it. See "Shipping" below.)
- **Branch:** `claude/confident-dijkstra-4t2ifl`
- **Stack:** Vite 8 + TypeScript, Canvas 2D, no runtime dependencies. Fonts
  come from Google Fonts: Dela Gothic One (display) and Shippori Mincho
  (serif).

---

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
  | `powers` | 18.7 | 32.50 → 38.90 | Powers of Ten: the pull-back to the page | powers.ts |
  | `sign` | 18.72 | 38.92 → 42.52 | the signature: the moves rise, the Hand inks "Max", the living name, the invitation | sign.ts |

  `RAW_END = ACT.END (30) + 23.8 = 53.8`. Convert with `toFilm(raw)` /
  `toRaw(film)`: raw = film + sum of `len` for holds whose `at` < film. Holds
  must stay sorted by `at` in `HOLDS`. A set piece that plays in a hold is
  drawn on top of everything from `main.ts` (`if (frame.hold?.kind === …)`).

  **Round 10 additions** (see docs/STORY.md v4): `core/signature.ts` (the
  strokes and the lingering pen-lines), `core/cuts.ts` (poster repaint before
  the white-out; the whip-pan out of ALTER), `core/texture.ts` (a texture per
  world), `core/drift.ts` (the travelling particles), `core/taps.ts` (tap to
  play), `acts/dive.ts`, `acts/sign.ts`. The dragon, Night Ride and X-Ray
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
| 12.4 → 20.0 | Match | match.ts | the star falls onto the centre spot; card "V · MATCH — the same two, one more time"; lights, lower third, chalk tactics, panels, **dash hold at 15.0** (The Zone, then the dash), bullet time, goal; **powers hold at 18.7** |
| 18.7 → 22.6 | Hello | finale.ts | the page: the ensō, Blot, and the Hand signing MAX (18.85) and GABRIEL (19.62), seal 20.32; the rivals' lights circle; contact card 20.7–22.6 |
| 22.55 → 30 | Credits + post-credits | credits.ts | roll; "wait —"; Blot finds the hilts; "MAX GABRIEL WILL RETURN" |

The match is skipped after the pull-back (`B > POWERS_AT`), and the machine
after TITAN (`B > TITAN_AT`); the old machine cut (`drawMachineCut`) no
longer plays.

Match has an internal remap: `matchLocal()` (the bullet-time freeze). Read it
before editing the match's internal constants.

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

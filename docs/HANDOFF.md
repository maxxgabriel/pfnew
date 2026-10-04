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

  | kind | film `at` | raw range | what plays |
  |---|---|---|---|
  | `thunder` | 4.86 | 4.86 → 6.11 | duel finisher (ink.ts `drawThunder`) |
  | `alter` | 12.63 | 13.88 → 28.58 | the whole ALTER act (alter.ts) |
  | `dash` | 15.0 | 30.95 → 31.90 | #10's thunder dash (match.ts `drawDash`) |

  `RAW_END = ACT.END (30) + 16.9 = 46.9`. Convert with `toFilm(raw)` /
  `toRaw(film)`: raw = film + sum of `len` for holds whose `at` < film.
- **Clock (t):** wall time in seconds. Ambient motion (mist, embers, blinking,
  bobbing) runs on `t`, so the frame keeps moving when the reader stops.
  Story motion runs on B (or the hold's `p`), so scrolling back plays it in
  reverse.
- **Frame object** (`src/core/frame.ts`): `ctx, w, h, u, portrait, B, vB, t,
  dt, intro, hold, reduced` plus `crossed(b)`, `crossedFwd(b)` (true on the
  frame the playhead passes a beat; use these for one-shot events like
  shakes, flashes and particle bursts), `shake(px)` and `flash(alpha, colour)`.
- **Post** (main.ts `post`): letterbox bars (duel, the shot, post-credits, all
  of ALTER), flash, act title cards (II Machine, IV Match), the
  vignette, and film grain.
- **HUD (DOM):** the MG seal (back to start), the chapter label, the chapter
  reel with tappable marks (ALTER's mark is red), and the contact card at the
  end. `html.on-paper` switches the HUD to dark text over paper scenes.

## 2. The timeline (film beats)

| beats | act | file | notes |
|---|---|---|---|
| intro (clock) | title | ink.ts `drawTitle` | ink drop → ensō → brush-written MAX/GABRIEL → seal → gold bolt signs MAX (intro 3.7–4.5 s) |
| 0 → 1.4 | Ink: pull-back | ink.ts | ensō becomes the moon; sumi-e karst layers rise |
| 1.25 → 2.35 | Ink: flood | ink.ts | ink blooms up behind the range; night |
| 2.35 → 6.8 | Ink: duel | ink.ts + warrior.ts | warriors (IK from blade keys `KEYS`), clashes at 3.55/4.12/4.45/4.75, petals, vertigo on the lock, **thunder hold at 4.86**, then green's snapped blade, beams 5.3, orb zoom 6.0–6.75 |
| 6.75 → 7.85 | paper + tear | ink.ts `drawPaperOver` | white cools to paper, ball pops, paper tears open |
| 7.0 → 12.4 | Machine | machine.ts | MAKE / THINGS / THAT / MOVE chain reaction; cannon fires at 12.0; the ball charges gold 12.12–12.3 |
| 12.3 → 12.5 | the cut | machine.ts `drawMachineCut` | the ball becomes a gold bolt that tears up the screen (`ACT.cut`), hard cut to the match's night sky, afterimage fades by 12.5 |
| 12.63 (hold) | **ALTER** | alter.ts | 31 shots, see §3; opens by ink bleeding in over the night sky, exits by drawing back and landing its ring on the falling star |
| 12.4 → 20.0 | Match | match.ts | stadium, lights clunk on, lower third, chalk tactics, comic panels, **dash hold at 15.0**, bullet time, goal, net push |
| 19.0 → 22.6 | Hello | finale.ts | ensō iris through the net, name repainted, contact card at 21.25–22.6 |
| 22.55 → 30 | Credits + post-credits | credits.ts | roll, then Blot finds the hilts, "MAX GABRIEL WILL RETURN", contact card again |

Match and finale have internal remaps: `matchLocal()` (the bullet-time
freeze) and `FINALE_SHIFT = 1.1`. Read the remap before editing their
internal constants.

The Arcade act (MG·TV, Pong, Breakout) sat between the machine and ALTER
until the owner had it removed; it's in git history before the commit that
removed it if it's ever wanted back.

## 3. ALTER (`src/acts/alter.ts`), the centrepiece

Shots are a list `SHOTS: {name, dur, draw(g, q)}`. `p` (0..1) maps onto the
summed durations (20.58 units across 14.7 raw beats) and each shot gets its own
`q` (0..1). Cuts are hard; each new shot gets a small jolt and a red
overexposed frame. `hitQ(x)` fires once as the shot's q crosses x (use it
for shakes and flashes).

Order: corrupt → title → wide → feet → sword → eyes → ring → impact → reveal
→ standoff → dash → clash → slashes → volley → **dead calm** (still → calm
→ drop → release) → **the void** (sign → expand → void → shatter) → charge
(orbit) → **beam clash** (fire → driven → strain → push → snap → column) →
after → exit.

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

## 4. Other building blocks

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
- `core/glyphs.ts`: hand-built brush capitals for the name.
- `core/sprites.ts`: cached glow sprites (never use shadowBlur), paper tile,
  grain, blots.
- `core/style.ts`: palette `C`, fonts `F`, `font()` (whole-pixel sizes only:
  every distinct size is a fresh glyph cache), `extruded()` block type.

## 5. Working on it

```sh
npm install
npx vite --port 5199 --strictPort     # keep this running; scripts expect :5199
```

**Screenshots are the main QA tool.** `scripts/shoot.mjs <raw beats> [phone|desktop]
[intro seconds] [wait ms]` loads the page in Chromium, seeks via the dev hook
`window.__film.seek(raw)`, and writes `scripts/shots/p-<beat>.png`. Pass
`intro 8` to skip the title animation. `scripts/sheet.sh out.png files…`
tiles them into one image. Always check phone size (390×844 @2x); check
desktop (1440×900) for big changes. The dev hooks also include
`__film.seekFilm(film)`, `__film.intro(s)` and `__film.cost()`.

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

## 6. Shipping

- `npm run artifact` builds `dist/` and inlines it into
  `artifact/maxgabriel.html` (about 140 KB; gitignored). The artifact host
  supplies the doctype/head/body; fonts load from Google Fonts.
- The owner views it at the artifact URL above. A Claude session with the
  Artifact tool republishes it by passing that `url`; it must read the
  artifact first.
- Plain static hosting also works: `npm run build` and serve `dist/`.

## 7. Known issues and open items

- **Not tested on a real iPhone.** Frame rate, scroll feel and hold pacing
  are unverified on a device. Ask the owner how it feels.
- Contact email is a placeholder (`hello@example.com`, in index.html). Ask
  the owner for the real one.
- Kanji drawn on canvas (雷 in the thunder stance) may use a system fallback
  font, because the Shippori Mincho kanji subset isn't preloaded.
- Credits don't mention the ALTER cast yet (the knight and the beast).
- `ctx.roundRect` needs Safari 16+.
- `prefers-reduced-motion` only softens shakes and flashes; there's no
  reduced cut.

## 8. Ideas the owner hasn't seen yet (ask before building)

- Sound (declined once, may be worth re-offering for ALTER only, behind a tap).
- Make ALTER even more of a selling point: tease it on the title screen,
  more shots (sword-lock close-up with sparks, a sky-wide wide shot before
  the beam), anime "smear frames" in the slash barrage.
- Credit lines for the ALTER cast; Blot reacting to ALTER in the credits.

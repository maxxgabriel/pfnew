# SITE3 — the motion site, in ink (round 37)

The owner on v2: *"no effects at all nothing good in the website actually make it
ink style our original one and there are really no effects in there mate no
animations at all."*

Two things follow:

1. **Motion was invisible on their phone.** The OS "Reduce motion" switch turned
   every animation off. Fixed in `src/site/motion.ts`: `calm` only drops the big
   vestibular movement (smooth-scroll inertia, scroll stretch, parallax, 3D lean).
   **Everything else always plays.** Never gate an entrance, draw, boil or
   stamp on reduced motion again.
2. **The look goes back to the film's ink.** No electric blue, no pop stickers,
   no plastic 3D lettering. It's sumi ink on paper with one red Spark: the look of
   `src/site/art/logo_ink.webp` and the film (`film.html`).

The structure stays (matvoyce order: hero → playground carousel → what I make →
styles → contact pill → footer), and so do the menu, piece dialog, film link,
interaction kit (`interact.ts`), `reveal.ts` and `fx.ts`. What changes is the
skin, plus a set of ink motions that **hit**: big, clear, one strong shape at a
time.

## Palette and type

| token | value | use |
|---|---|---|
| `--paper` | `#efe9dc` | the ground everywhere (also the theme colour) |
| `--paper-2` | `#e4dccb` | washes, card grounds |
| `--ink` | `#1b1714` | all type and line |
| `--wash` | `#8a8378` | quiet text, far mountains |
| `--red` | `#e8432a` | **the Spark only**: the dot, the cursor, one underline, the seal. Never a big fill. |

- **Display:** `Permanent Marker` (`@fontsource/permanent-marker`, installed),
  uppercase, always through the `#ink` filter (below). Its letters are the same
  family as `logo_ink`.
- **Hand notes:** `Caveat Brush` (`@fontsource/caveat-brush`, installed): eyebrows,
  captions, the signature.
- **Small UI:** Inter 600/700, kept for nav, buttons and counts.
- Drop Anton and Knewave. Delete the pop lettering images from the page
  (`title_playground`, `title_make`, `pill_hi`, `logo_*` except `logo_ink`,
  `sticker_*` except `sticker_spark` and `sticker_seal`). Headings become live
  text in the brush face. `style_*` stay: they are content (the styles he draws in).
- The ground has a paper fibre texture (an inline SVG noise, multiplied, low
  opacity), not flat colour.

## The ink filters (`src/site/ink.ts`, new)

One hidden SVG with:

- `#ink`: feTurbulence (fractalNoise ~0.04, 3 octaves) → feDisplacementMap
  (scale ~5) → slight blur → alpha threshold. It gives brush edges and a wet
  bleed. Its turbulence seed cycles 1→2→3 at 8 fps: the boil, like the film's
  drawings.
- `#ink-wet`: the same chain with its own nodes, used while ink is *arriving*.
  `wet(el)` puts an element on `#ink-wet` and animates displacement 40→5 and blur
  4→0.6 over ~0.9s, then swaps it back to `#ink`. Ink lands wet and dries.
  Only one element is wet at a time; queue them.

Write the SVG attributes **quoted** (an unquoted `result=n/>` silently breaks the
chain).

## Motions that hit (all phone-first; nothing needs hover)

1. **Preloader → brush.** The counter becomes a hand-numbered `000→100` in the
   brush face. At 100 one horizontal ink stroke sweeps across the screen
   (a clip-path or mask with a ragged edge), wipes the loader away and reveals
   the hero.
2. **Hero, painted in.** `MAX` / `GABRIEL` huge (phone: two lines filling the
   width; desktop: as v2's size). Each letter is brushed on in turn: a ragged
   mask sweeps left→right per letter, staggered ~0.06s, each landing `wet()`.
   Then the **red Spark** (a red disc, `sticker_spark` or a CSS circle with the
   ink filter) drops from above, squashes on landing and settles as the dot
   after MAX, exactly where `logo_ink` has it. The ink boy (`idle_*` cycle,
   8 fps) sits on the X and blinks. Behind: `ink_far` and `ink_mid` mountains
   (from `src/assets/sketchbg`) layered at the bottom with parallax.
   Scrolling away: the letters **run**. Scrub the `#ink` displacement up and drag
   the letters down a little, so the ink drips off as the hero leaves.
3. **The flood.** Between the hero and the playground, **one** big ink blot
   (an SVG path with the `#ink` filter, or a radial mask) grows from the Spark
   until the screen is black ink (scrubbed, pinned ~1 screen). `THE PLAYGROUND`
   is brushed in **paper-coloured** on the black, then the ink drains down
   (clip from the top) to reveal the carousel. One shape, no particles.
4. **Carousel in ink.** Each piece sits in a hand-drawn frame (an SVG rect with
   `#ink`, the stroke drawn in with stroke-dashoffset when it becomes active).
   The active piece is full colour; the others are washed (grayscale + low
   contrast, as if in diluted ink). The title under it is brushed in with
   `wet()` on every change. Swipe, drag and the arrows all work. Fix: on desktop
   the pictures sat too low. Centre the active piece vertically in the stage.
5. **What I make.** Four huge brush words. As each crosses the middle of the
   screen a single red brush underline swipes under it (scrubbed) and its ink
   boy pose pops in beside it (reuse the existing per-service boy). The words
   not in focus are washed to `--wash`.
6. **Styles.** The two marquee rows stay, but each tile has a torn-paper edge
   and an ink frame. Scroll velocity speeds and reverses them (already).
7. **Contact.** `SAY HI` brushed huge across the pill. When it arrives a **red
   hanko seal** (`sticker_seal`, or a red square with `MG` carved out in paper
   colour) **stamps** down: scale 2.4→1, a 2-frame shake, and the page punches
   once. The boy waves (`wave_*`/`bye_*`).
8. **Footer.** The ink mountains again; *Max Gabriel* in Caveat Brush **writes
   itself** as the footer arrives (a mask sweeping along the line, scrubbed to the
   last screen of scroll). The red Spark is the dot on the i.
9. **Press anywhere** (touch or click): one ink drop lands under the finger, a
   single dark blot with the `#ink` filter that blooms and fades in ~0.6s. It
   replaces `fx.ts`'s red ring. One shape, never a cluster.
10. **Cursor (fine pointers only):** the red Spark dot stays; the ring becomes a
    single tapered ink tail (canvas, one stroke following the last ~16
    positions, fading). Labels (`data-mode`) become paper text on an ink blot.
11. **The ink boy runs** along the bottom edge while you scroll (`run8_*` cycle,
    faster with scroll speed, flipped when scrolling up, `idle_*` when still).
    Phone: smaller, never covering buttons.

## Rules

- No electric blue anywhere (`--blue`, `--ix-blue` gone). Red only as the Spark.
- No clusters of small things: no splatter fields, no particle sprays, no
  confetti. One blot, one stroke, one seal.
- Works at 390×844, 844×390, 768×1024, 1440×900 and 2560×1080. Nothing needs
  hover. 60 fps on a phone: animate transforms, opacity, clip-path and filter
  attributes on few elements, never layout.
- Keep the film link (`VITE_FILM_URL`), the menu, the piece dialog and every
  aria label. Headings that become brush text keep real text for screen readers.
- Typecheck (`npx tsc -p tsconfig.app.json --noEmit`) and lint
  (`npx oxlint`) clean.

# HOME — the portfolio site (round 39)

The owner: *"a proper portfolio website … like matvoyce … 0 transitions 0 anything …
go frame by frame … every little affect … we csn use out chibli brilliantly"*, then
*"why not thr whole website?"*.

**Entry:** `home.html` → `src/home/main.ts`. **Look:** sumi ink `#1b1714` on paper
`#efe9dc`, the red Spark `#e8432a` as the one accent, `--paper-2 #e4dccb` and
`--wash #8a8378` for tints. **Type:** Permanent Marker (display, always uppercase),
Caveat Brush (hand notes), Inter 600/700 (UI). **Motion reference:**
`docs/study/MATVOYCE_FRAMES.md` (load, hero, page-wide), `MATVOYCE_PHONE.md`,
`MATVOYCE_HOVER.md`, `MATVOYCE_SCROLL.md`. Read the ones that exist before building.
Technique only — never their type, logos, copy, palette or layout pixel-for-pixel.

## The rules every section follows

1. **Nothing appears; everything arrives.** Display words come in through the band
   slicer (`src/home/slices.ts`: `bandText` + `bandsIn`, or `data-slice` for
   on-scroll). UI text scrambles (`scramble`). Words that swap roll letter by letter
   (`rollWord`). Lines of body copy rise through clips.
2. **Two easings only** (from the study): ease-out-quart for entrances
   (`power4.out` / `var(--ease-out)`), ease-in-out-quart for fades and wipes
   (`power4.inOut` / `var(--ease-inout)`). Entrances 0.5–0.9 s, wipes 0.3–0.5 s.
3. **The boy is the mascot, everywhere.** Use his drawings (`src/assets/sketch/<key>.webp`,
   load with `url(key)` from `src/home/art.ts`; `manifest.json` lists every key;
   ink keys are plain, style twins are prefixed `pixel-`, `water-`, `clay-`, `chalk-`,
   `comic-`, `hose-`). He reacts, pops, peeks, waves — he never just sits as a picture.
   Cycle frames at 8–12 fps for life.
4. **Phone first**, then desktop: 390×844 and 1440×900 must both be great, plus
   844×390 and 2560×1080. Nothing depends on hover (touch gets press feedback instead:
   a quick squash on press). Phones scroll natively (no Lenis), nothing pins on phone
   unless it really reads.
5. **No clusters of small things** (the owner's rule): one or two sparkles, not swarms.
6. Each section lives in `src/home/<section>.ts` (+ `<section>.css` imported from it),
   injects its own markup into its empty container in `home.html`, and exports
   `init<Section>()`. Don't edit another section's files. Shared helpers: `slices.ts`,
   `art.ts`, `base.css` (ask before changing them).
7. `npx tsc -p tsconfig.app.json --noEmit` and `npx oxlint` clean. Screenshot with
   `node scripts/shoot-home.mjs <phone|1440x900> <fractions>` (dev server on :5199 —
   start it with `npx vite --port 5199 --strictPort` if it's down) and record motion with
   `node scripts/study/rec-local.mjs http://localhost:5199/home.html <outDir> <WxH> <secs>`
   + `scripts/study/frames.sh`. **Look at your section moving before calling it done.**

## Sections (top to bottom)

| # | Section | Reference move | Ours |
|---|---|---|---|
| 1 | **Hero** `hero.ts` | stepped counter, sliced name, push; on phones a tilted video frame between the name lines; on desktop the frame grows on scroll | done: counter → banded name → push → the boy drops onto the X → Spark. **To add:** the tilted ink-framed **reel** between MAX and GABRIEL where the boy runs (run8 cycle over `ink_far`), he leaps out of the frame and lands on the X; on desktop the reel grows to full screen as you scroll (pinned), playing the boy's showreel (cycling his best moments in each style) |
| 2 | **Work** `work.ts` | featured work (desktop: see SCROLL study; phone: one-at-a-time carousel, title slides 0.35 s) | the six pieces: The Sketch (the film, `./film.html`), Six styles, The duel, Living worlds, The run, Fire kick — each a live canvas card of the boy (see `src/site/playground.ts` for the drawings each used). Opening a piece runs the **wipe** (`wipe.ts`) |
| 3 | **What I do** `make.ts` | the line nearest mid-screen is full ink, others 10 %; stickers pop round the active line; the page background tints per line | CHARACTER ANIMATION / MOTION DESIGN / INTERFACES / CREATIVE CODE; the active line's tint (pale wash colours from his style worlds), and the boy pops in beside it in a pose for that craft |
| 4 | **Styles** `styles.ts` | the brands logo grid (staggered entrance) | the seven styles he draws in: tiles of the boy in ink, pixel, watercolour, clay, chalk, comic, rubber hose (`src/site/art/style_*.webp`); tap/hover a tile and he does a move in that style |
| 5 | **Contact** `contact.ts` | the big lime pill with running diagonal stripes | a huge ink pill "SAY HI" with running diagonal ink stripes, the boy waving on top (`wave_*`), the red seal; `mailto:hello@example.com` (placeholder) |
| 6 | **Footer** `footer.ts` | full-colour footer that the page lifts away from; its centre word loops through type styles; the fixed header fades out as it arrives | ink-black footer, the `MAX GABRIEL` wordmark looping through his 7 style lettering (`src/site/art/logo_{ink,pixel,water,clay,chalk,comic,hose}.webp`) with a banded swap; link columns; the boy runs across it |
| 7 | **Menu** `menu.ts` | full-screen fade in the page colour 0.45 s, lines rise 70 ms apart, MENU rolls to CLOSE; closing is a 0.3 s fade | same, in ink; each line with a boy pose that pops on hover/press |
| 8 | **Wipe** `wipe.ts` | page transition: a striped wipe from the bottom with one pill label naming the destination, holds, wipes off upward | an ink striped wipe with a red-Spark pill label; export `wipe(label, during)` |
| 9 | **Cursor** `cursor.ts` | a custom illustrated cursor | fine pointers only: a small ink brush-tip cursor with the red Spark; grows over links |

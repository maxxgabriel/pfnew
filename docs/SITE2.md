# SITE v2 — the motion site, rebuilt on matvoyce.tv's structure (round 36)

The owner, on v1: *"its just like any other website nowadays lol. can you try
seeing matvoyce.tv for source"* → *"yes, but louder"*, partner colour
**electric blue** → *"make it almost 1:1 mate no limits"*.

**What 1:1 means here:** the STRUCTURE, layout system, section order, pacing,
interactions, motion behaviours and timings of matvoyce.tv, as closely as we
can. What you SEE is Max's own: his lettering in the 7 art styles, his
colours (red + electric blue on paper), the ink boy, his stickers and copy.
Never his typeface, logos, wordmarks, icons, copy, cyan/lime palette or assets
(CLAUDE.md: original, not copied). No fake client logos.

## Palette and type
Paper `#fbf9f3`, ink `#111111`, electric blue `#1f4bff` (the big name, the
footer takeover), red `#e8432a` (pills, chips, accents). Display: **Anton**
(bundled: `@fontsource/anton`), set italic by `skewX(-9deg)`, huge, tight.
Small text: **Inter** (bundled: `@fontsource/inter`), tiny 11–13px, two-line
blocks in the header like a credits line.

## Layout and motion (desktop 1440–2560 first; phone versions as noted)
1. **Header (fixed):** top-left the small MAX GABRIEL lettering logo (a
   sticker-like wordmark image that boils); top-centre "Motion designer &
   animator, / making things move." (two tiny lines); top-right-centre
   "Based in India / working everywhere" in grey; far right "MENU +". On
   phone: logo left, MENU right, tagline moves to the bottom-left of the hero.
2. **Loader:** paper screen, a giant three-digit counter 000→100 in electric
   blue Anton italic at the bottom centre; EACH DIGIT rolls independently
   (vertical masked columns) and mid-roll the glyphs are cut into 3–4
   horizontal slices that slide sideways a little out of register (the
   "jumbled slices" look), snapping clean at rest. ~2.5 s.
3. **Hero:** at 100 the counter slices away and "MAX" (top-left) and
   "GABRIEL" (bottom-right) assemble from horizontal slices sliding in from
   alternating sides out of register, then lock; the two words fill the
   screen (~40vh letters). A small red rounded chip bottom-left with a looping
   marquee "SCROLL — SCROLL — SCROLL". The ink boy sits on the top of the "X",
   legs swinging (idle drawings), and hops off as you scroll.
4. **Featured section = "THE PLAYGROUND":** a centred lettered title sticker
   ("THE PLAYGROUND" in a lettering image + a small sticker) with "His best
   experiments" tiny above; then a big carousel: one piece at a time large in
   the middle (the live loop / film), its title in huge lettering above it,
   red arrow buttons left/right and a blue "Open piece" pill; on scroll the
   carousel advances (scrubbed) and arrows step it. Pieces: The Sketch (opens
   film.html), Six styles, The duel, Living worlds, The run, Fire kick.
5. **"What I make":** tiny label, then giant stacked words in light grey Anton
   italic: CHARACTER ANIMATION / MOTION DESIGN / INTERFACES / CREATIVE CODE.
   As you scroll the active word turns ink-black and grows slightly, and 2–3
   stickers pop in around it (springy scale+rotate) — for each word the boy
   or a prop acting it out (he animates, poses, taps a UI card, types code).
   One at a time; the others stay pale.
6. **Big-ups strip (instead of client logos):** "Styles I draw in" — a
   two-row marquee of the 7 style stickers (ink, pixel, clay, watercolour,
   chalk, comic, rubber hose), opposite directions, speed follows scroll.
7. **Contact pill:** a giant red rounded pill rising from the bottom, tiny
   line "Always open for new projects and collaborations" above big
   lettering "SAY HI, MAX!" inside; it scales/settles with an elastic ease;
   tap = mailto (placeholder hello@example.com). The boy waves from its edge.
8. **Footer takeover:** the page floods electric blue (a big rounded-top
   panel sliding up). Left column tiny "Explore" + big Anton links PLAYGROUND
   / FILM / ABOUT; right column tiny "Follow" + INSTAGRAM / BEHANCE / LINKEDIN
   / GITHUB (placeholders); top-right tiny email; centre the **living logo**:
   MAX GABRIEL lettering that swaps style every ~0.8 s through the 7 styles
   (ink brush, pixel, clay, watercolour, chalk, pop comic, rubber hose), each
   swap with a quick squash/spring and a sparkle sticker, plus a ribbon
   "MOTION · INTERFACES · CODE" wrapping under it. Bottom tiny copyright.
9. **Menu overlay:** MENU + opens a full-screen paper panel (clip-path from
   the top-right corner): huge Anton italic links each with a small looping
   drawing of the boy beside it; close with ×.

Everywhere: Lenis smooth scroll; GSAP ScrollTrigger; springy, cartoony eases
(back.out, elastic.out) for stickers and pills, expo for type; constant small
life (boiling logo, swinging legs, marquee chips) even when idle;
prefers-reduced-motion respected. Nothing depends on hover. Phone layout as
captured from the reference: same order, stacked, the two-word hero stacked.

## Art (ChatGPT image tool; `art/raw/site2/` → `src/site/art/*.webp`)
- `logo_<style>.webp` ×7: "MAX GABRIEL" hand-lettered, bold, in each style
  (ink, pixel, clay, water, chalk, comic, hose), transparent, same size/box.
- `title_playground.webp`, `title_make.webp`: lettering for "THE PLAYGROUND"
  and "WHAT I MAKE" (comic-sticker lettering, red/blue/ink, white sticker outline).
- `sticker_*.webp`: spark, eraser, brush, seal, star sparkle, film strip,
  pencil, speech bubble "HI!" — die-cut stickers (white outline), cartoon.
- `style_<style>.webp` ×7: one round sticker per art style (the boy's head in
  that style) for the marquee.
- `pill_hi.webp`: "SAY HI, MAX!" lettering for the pill.

## Interaction kit (Claude, round 36)
`src/site/interact.ts` (+ `interact.css`): hover and press life on every control
(text roll, glyph scramble, letter hops, drawn underlines, magnetic + squishy
pills, wobbling stickers, tilting cards with a shine, the red Spark cursor with
a ring that grows into a labelled bubble via `data-cursor="Open"`).
`src/site/reveal.ts`: scroll entrances (`data-reveal="lines|chars|pop|wipe|fade"`,
`data-parallax`, `data-skew`) and defaults for anything un-animated.
`src/site/life.ts` starts both: call `startLife()` once from `src/site/main.ts`
after the sections exist. Mark elements with the data attributes to choose the
effect; autoWire/autoReveal cover the rest.

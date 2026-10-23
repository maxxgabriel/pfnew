# matvoyce.tv — frame by frame (round 39)

The owner: *"a website like matvoyce … you took ideas right but 0 transitions 0 anything
… go frame by frame and see what actually happens. every little affect. every little
animation transitions motions every 1s"*.

Recorded with Playwright (desktop 1440×900, 25 fps video; `scripts/study/record.mjs`),
frames pulled with `scripts/study/frames.sh` and read at 4, 10 and 25 fps. This file
is the **load, hero and the page-wide behaviour**. Hover/menu: `MATVOYCE_HOVER.md`.
Scroll sections + stack: `MATVOYCE_SCROLL.md`. Phone: `MATVOYCE_PHONE.md`.
Technique only: we never reuse their type, logos, copy or palette.

## The one big lesson

Nothing on matvoyce ever *appears*. Every element **arrives**: it is cut, rises, rolls,
assembles, pushes or is wiped in, and it does so in **slices** (horizontal bands that
land at slightly different times). That slicing is the house signature. It's used on
the counter, the name, the menu label, and the section titles. Our v1/v2 sites faded
and slid things in; that is why they read as "0 transitions".

## 0.0 – 2.2 s · blank paper

- Off-white paper (≈ `#fdfcf7`), nothing else. The page holds ~2 s before anything moves
  (fonts + assets). The silence is deliberate: the first motion lands harder.

## 2.3 – 2.5 s · the tagline types in

- "Type designer & animator, working for brands globally." (two lines, small, black,
  centre-top area). It doesn't fade: it **scrambles in**. At 2.3 s the line is a row of
  dots/garbage glyphs; by 2.5 s the letters have resolved left to right.
  ≈ 0.2 s total. Technique: text scramble (per-character random glyphs resolving with a
  left-to-right stagger), or SplitText chars with a stepped reveal.

## 2.4 – 3.4 s · the counter rises from under the screen edge

- Huge cyan digits "000" (~ 25 % of the viewport height, condensed italic display face)
  rise from **below the bottom edge**: the viewport bottom is the mask.
- Stagger left → right (first 0 leads by ~0.1 s).
- While rising the digits are **stretched tall** (scaleY ≈ 1.3, narrower) and relax to
  normal as they stop: speed squash/stretch on type.
- Decelerating ease (expo/power4 out), ~0.9 s.

## 3.4 – 8.0 s · the counter counts, in steps

- It does **not** count smoothly. It jumps in clusters and **holds**: 000 → ~035 (hold
  ~0.6 s) → ~070 (hold) → 100 (hold ~0.5 s). The holds feel like loading checkpoints.
- Each change takes ≈ 0.4 s and passes through in-between digits (012 → 023 → 024 → 034
  → 035): a slot-machine roll.
- Each digit is cut into **3–4 horizontal bands**; each band rolls with its own small
  delay/offset, so for a few frames the digit looks sheared/glitched, then snaps clean.
  A tiny overshoot on landing.
- The tagline and counter drift slowly upward as one block over the whole count
  (≈ 3–5 % of the viewport): nothing is ever perfectly still.

## 8.1 – 9.6 s · "100" leaves, the name assembles in slices

- 8.1: "100" starts sinking out through the bottom edge (same banded break-up, reversed).
- 8.2: the header assembles at the same time: "UK based / Working globally" fades in
  (8.2), the MENU label **glitch-slices** in (8.5–9.0).
- 8.2 – 9.6: MAT (upper) and VOYCE (lower) build from below in slices: every letter is
  4–6 horizontal strips; each strip slides up into place with its own delay, so letters
  are half-built and jagged for ~1 s. Neighbouring letters are out of sync (the T before
  the M, the C before the V). Settles at ~9.6 s.

## 9.6 – 10.4 s · the camera push

- Once assembled, the whole name **scales up and spreads**: MAT travels to the top-left,
  VOYCE to the bottom-right, both grow until they nearly fill the screen edge to edge
  (≈ 1.6×). ≈ 0.8 s, ease in-out. It reads as the camera pushing into the name.

## 9.8 – 11.0 s · sparkles

- Four-point sparkle stars (white fill, black 2 px outline, 10–40 px) pop on and around
  the letters: ~6 of them, each scales 0 → 1 → 0 over ~0.5 s at a different moment.
  A celebration beat after the name lands, then gone.
  (For us: one or two at most — the owner's "no clusters" rule.)

## 9.8 s → · the SCROLL chip

- Bottom-left: a lime (`#e4f97a`-ish) rounded rectangle with a black 2 px border and a
  hard drop shadow; inside, "SCROLL ——— SCROLL ——— " runs as a **marquee**, right to
  left, continuously. It appears with a quick scale/fade at 9.8 s and leaves once you scroll.

## Page-wide

- **Custom cursor**: the system cursor is replaced by a cyan arrow with a black outline
  (an illustrated cursor, not a dot). Hover states: see `MATVOYCE_HOVER.md`.
- **Header**: fixed; left nothing (the name is the hero), centre the tagline, then
  "UK based / Working globally" (second line grey), right "MENU +" in the condensed display face.
- **Smooth scroll**: the scroll glides (Lenis-style inertia).
- **12.4 – 15 s, leaving the hero**: the name parallaxes up faster than the scroll and
  MAT leaves first; VOYCE lingers, then exits off the top.
- **Colour**: paper ground, one loud brand colour (cyan) for the big type, black for
  UI, lime as the accent chip/pill, and per-section background tints in the services
  list (pale blue, mint, pale yellow, lavender) — see `MATVOYCE_SCROLL.md`.
- **Footer**: the page lifts away to reveal a full cyan footer underneath (curtain
  reveal) with a huge gradient wordmark that morphs/boils, link columns either side.

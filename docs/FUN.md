# FUN — a site that never stops playing (round 41)

The owner: *"i need a hell lot of animations shapes aniamtions letgters aniamtions a lot of fun in
website"*, matvoyce.tv as the bar, *"anything lookng coopl … sum them up as s story"*, and art that
is hand-made, not generic. **Entry:** `fun.html` → `src/fun/main.ts`. Branch `claude/fun-site`.

## The look (POP)

Warm paper `#fbf7ef`, ink `#151311`, signal red `#ff3d22`, butter yellow `#ffd54a`, sky `#4fb6ff`,
mint `#7fddb4`. Display type: **Anybody** (Google Fonts, variable: width 50–150 %, weight 100–900),
uppercase, and the letters' width/weight are animated through `--ds` / `--dg`. UI text: Inter.

## What's built so far (the mock)

- **The name is a playground** (`hero.ts`): MAX GABRIEL drops in letter by letter and lands with a
  squash; the red ball bounces along GABRIEL and becomes the dot after MAX; he falls in onto the X.
  Then forever: a width wave through the name, a letter trick every couple of seconds (flip, stretch,
  jelly, hop, tilt, hairline-to-bold), he hops letter to letter. Letters, stickers and he answer taps.
- **Hand-drawn stickers** (`stickers.ts`): sun, sparkle, ink pot, boombox, bolt round the name; the
  glove points down inside a turning ring of text (the scroll cue). Each has its own life (the sun
  swaggers, the boombox pumps on a 118 bpm beat, the ink pot hops…) and a tap trick, and all of them
  **boil** like hand-drawn animation (`boil.ts`: a turbulence displacement whose seed steps 8×/s).
- **One card** (`card.ts`): SQUISH, a ball bouncing along a word that squashes under it; dealt in on
  scroll, leans to the pointer with a glare; the flipbook and FRAME BY FRAME badge stuck on it, the
  stopwatch on the section title; the boy peeks over its top edge from behind.

## The stickers (made with ChatGPT)

`scripts/gen-fun.sh` makes them through the Codex CLI on the owner's ChatGPT (one shared STYLE
block: a crisp hand-inked 1930s rubber-hose prop on a modern indie studio sticker sheet, thick
brush-pen outlines, flat fills from the palette, little graphic details, on flat magenta).
`node scripts/cutout-fun.mjs [names]` keys the magenta out (or keeps the alpha if the image came
back transparent), crops, and writes `src/assets/fun/<name>.webp`. The global Codex config names a
model a ChatGPT login can't use, so the script passes `-m gpt-6-sol`.

Have: spark, sun, sparkle, inkpot, boombox, bolt, glove, flipbook, brush, stopwatch, badge, hi, boing.

## Rules

Letters are the owner's favourite part: keep them. No clusters of many small things. Phone first
(390×844), then 1440×900, 844×390, 2560×1080; nothing depends on hover. Shoot every change.

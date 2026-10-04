# CLAUDE.md — read this first

This repo is **Max Gabriel's portfolio**: a single-canvas, scroll-driven
animated film (vanilla TypeScript + Vite, no framework). Animation *is* the
product; projects are deliberately absent.

Before changing anything, read:

0. `docs/STORY.md` — the story the whole film is being rebuilt around, every
   approved idea mapped onto it, and the build order. Start here.
1. `docs/BRIEF.md` — the owner's creative brief and every decision they've
   made since (what they asked for, what they approved, **what they rejected**).
2. `docs/HANDOFF.md` — architecture, the beat timeline, how holds work, every
   act, the dev/screenshot workflow, how it ships, known issues, next ideas.

## Hard rules

- **Ask before big creative guesses.** The owner explicitly wants to be asked
  when the direction is unclear. Propose 2–4 concrete options (they like
  `AskUserQuestion` with short descriptions), then build.
- **Don't reintroduce rejected work.** Pick-a-side, the manifesto interlude,
  the hand-scroll interludes and the "glass" effects (idle knocking, VHS
  rewind, overheat burn, cracks, reel slicing, confetti pile) were built and
  **rejected**; they were reverted in `085d0d6`. Don't bring any back unless
  the owner asks.
- **Original, not copied.** References (Mat Voyce, Demon Slayer, Fate/HF) are
  for energy and technique. Don't reproduce their characters, logos or text.
- **Never re-time existing acts casually.** Everything is authored in *film
  beats*. To give a moment more time, add a **hold** (`src/core/holds.ts`)
  instead of shifting beats.
- **Look at it.** Render screenshots (`scripts/shoot.mjs`) of every change at
  phone size (390×844 @2x) and check them before you call anything done. The
  owner watches on an iPhone.
- **Keep it phone-first and touch-only.** Nothing may depend on hover.
- Don't put model names in commits. Commit to the working branch and push. No
  PR unless asked.

## Quick commands

```sh
npm install
npx vite --port 5199 --strictPort        # dev server (scripts expect :5199)
npx tsc -p tsconfig.app.json --noEmit    # typecheck
npx oxlint                               # lint
node scripts/shoot.mjs 0,3.6,18.5 phone 8 700   # screenshots at RAW beats → scripts/shots/
scripts/sheet.sh out.png scripts/shots/*.png     # contact sheet
node scripts/perf.mjs 1                  # JS ms/frame per act
npm run artifact                         # build → artifact/maxgabriel.html (single file)
```

# Max Gabriel — a film you scroll

The portfolio is one continuous animated film on a single canvas. Scrolling
moves the playhead (forward and back); ambient motion runs on the clock, so
the frame keeps moving when you stop.

One object carries the whole film: a circle. A mascot, Blot (the first drop
of ink, with eyes and a red scarf), watches every act.

1. **Ink.** An ensō is painted and the name is written in brush. Pulling back
   turns the circle into a moon over sumi-e mountains; ink floods the sky; two
   brush-painted warriors duel with blades of light through falling blossom,
   lock (with a vertigo zoom), then fire beams at each other. The camera dives
   into the point where they meet.
2. **Machine.** What comes out is a ball. The paper tears and it drops into a
   poster-coloured chain reaction that spells MAKE / THINGS / THAT / MOVE.
3. **Alter.** The cannon's shot turns to lightning and tears up the screen
   into the night sky, where ink bleeds in from every edge. The set piece, cut like an anime episode: eighteen shots of a
   corrupted black knight (red-veined, a black blade whose runes ignite) against
   a beast of living ink that falls out of a target ring in a bruised purple
   sky. Close-ups, impact frames, a slash barrage, tendrils at the camera, and a
   beam of darkness. It plays in a hold, so it has its own clock
   (`src/acts/alter.ts`).
4. **Match.** It falls like a star into a floodlit stadium. Broadcast camera,
   chalk tactics, comic split-screen panels, a bullet-time orbit at the
   strike, a cloth-sim net.
5. **Hello.** Through the net and back onto paper. Contact.
6. **Credits**, and a post-credits scene.

**Thunder** (gold, the one colour used nowhere else) strikes four times: a
bolt signs the name on the title; a one-flash finisher in the duel (stance,
charge, a six-fold zig-zag, a black-on-white impact frame, and the cut landing
a beat late); the cannon ball tearing up the screen out of the machine; and #10's
dash through two defenders. The two long ones are holds (`src/core/holds.ts`):
the film pauses at a beat while the scroll plays the moment.

## For agents and contributors

Start with `CLAUDE.md`, then `docs/BRIEF.md` (creative brief and decision log)
and `docs/HANDOFF.md` (architecture, timeline, workflow, open items).

## Develop

```sh
npm install
npx vite --port 5199 --strictPort         # dev server (the scripts expect :5199)
npm run build                             # dist/
npm run artifact                          # dist/ inlined into artifact/maxgabriel.html
node scripts/shoot.mjs 0,3.6,18.5 phone 8 # screenshots at raw scroll beats
```

Code map: `src/main.ts` (playhead, loop, HUD) · `src/acts/*` (one file per act)
· `src/core/brush.ts` (sumi brush) · `src/core/bolt.ts` (lightning) ·
`src/core/holds.ts` (holds) · `src/core/*` (math, sprites, particles, type).
Act timings are in film beats; see `src/core/frame.ts`.

The contact email in `index.html` is a placeholder.

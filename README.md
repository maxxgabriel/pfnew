# Max Gabriel — a film you scroll

The portfolio is one continuous animated film on a single canvas. Scrolling
moves the playhead (forward and back); ambient motion runs on the clock, so
the frame keeps moving when you stop.

One object carries the whole film: a circle.

1. **Ink.** An ensō is painted and the name is written in brush. Pulling back
   turns the circle into a moon over sumi-e mountains; ink floods the sky; two
   blades of light duel, lock, then fire beams at each other. The camera dives
   into the point where they meet.
2. **Machine.** What comes out is a ball. The paper tears and it drops into a
   poster-coloured chain reaction that spells MAKE / THINGS / THAT / MOVE.
3. **Match.** The cannon fires it into the night sky; it falls like a star
   into a stadium where blue and green are still at it. Broadcast camera,
   chalk tactics, the shot, a cloth-sim net.
4. **Hello.** Through the net and back onto paper. Contact.

## Develop

```sh
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/
npm run artifact     # dist/ inlined into artifact/maxgabriel.html (single file)
node scripts/shoot.mjs 0,3.6,9.3 phone 8   # screenshots at given beats
```

Code map: `src/main.ts` (playhead, loop, HUD) · `src/acts/*` (one file per act)
· `src/core/brush.ts` (sumi brush renderer) · `src/core/*` (math, sprites,
particles, type). Act timings are in beats; see `src/core/frame.ts`.

The contact email in `index.html` is a placeholder.

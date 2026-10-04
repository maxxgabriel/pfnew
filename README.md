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
3. **Arcade.** The cannon fires it through the glass of a cartoon TV. Pong
   (blue v green), a Breakout wall that spells PLAY, a glitch storm, and the
   pixels blow outward into stars.
4. **Match.** It falls like a star into a floodlit stadium. Broadcast camera,
   chalk tactics, comic split-screen panels, a bullet-time orbit at the
   strike, a cloth-sim net.
5. **Hello.** Through the net and back onto paper. Contact.
6. **Credits**, and a post-credits scene.

Woven through it:

- **Pick a side.** Two hilts after the title; your colour wins the beam lock,
  Pong and the match (switch any time from the chip by the seal).
- **The manifesto.** ONE STROKE. / NO UNDO. / SO MAKE IT MOVE., spliced into
  the white-out after the duel.
- **The hand-scroll.** At each act change the frame becomes one panel of a
  painted scroll between wooden rollers; it rolls shut after the credits.
- **The glass.** Stop scrolling and Blot knocks on the inside of the screen;
  scroll back and it rewinds like tape; fling it and the film overheats and
  burns. The cannon ball cracks the screen, a blade clash cuts the chapter
  reel in two, and the goal confetti piles up on the bottom edge.

Interludes are spliced in by `src/core/timeline.ts`: the film holds its frame
while they play, so the acts keep their own timing.

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

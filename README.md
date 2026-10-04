# Max Gabriel — a film you scroll

The portfolio is one continuous animated film on a single canvas. Scrolling
moves the playhead (forward and back); ambient motion runs on the clock, so
the frame keeps moving when you stop.

It tells one story about one page. A drop of ink falls off the brush by
mistake and becomes **Blot** (eyes, a red scarf), the witness in every act.
The brush paints a circle, the **Spark**, and two strokes from the same
brush, **Blue** and **Green**, fight over it. Every time one of them grabs it,
the page can't hold it and redraws itself in a new style.

1. **Ink.** The ensō becomes a moon over sumi-e mountains. An ink Dragon rises
   with the pearl; Blue and Green duel for it with blades of light; Blue's
   thunder snaps Green's blade; the Dragon swallows the pearl and coils into
   an ensō that tears the paper. Blue falls through.
2. **Machine.** The pearl drops out as a ball into a poster-coloured chain
   reaction (MAKE / THINGS / THAT / MOVE). The letters assemble into TITAN,
   Green's robot, which punches the ball; the gold bolt splits the frame.
3. **Alter.** The back of the page, cut like an anime episode: Blue as a
   corrupted black knight against Green reborn as a violet swordsman. Dead
   Calm, Beneath the Surface, the Void, a beam clash. The Spark is released as
   a star.
4. **Night Ride.** Blot on a motorbike chases the star through a neon city in
   the rain, and skids to a stop at the stadium.
5. **Match.** The same two, one more time. The Zone drains the pitch to chalk
   before #10's thunder dash. Green wins.
6. **Hello.** Powers of Ten: the camera pulls out through every world, circle
   inside circle, back to the page, where the Hand signs the name.
7. **Credits**, an X-Ray pencil test of how it was made, and a post-credits
   scene.

The big moments play in **holds** (`src/core/holds.ts`): the film pauses at a
beat while the scroll plays the set piece, so scrolling back plays it in
reverse.

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

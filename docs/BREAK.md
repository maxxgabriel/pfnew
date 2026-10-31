# BREAK LOOSE — the site as a music video (round 40)

The owner: *"a full music video like a website here, with a lot of crazy ass animations or some
story, but made as motion graphics only. No filmed footage. It can be 2D, 3D or both. What matters
to me is that it's creative and unique."* Picked: **the page breaks into song**; **no music**
(*"music is totally not needed use all creativity in website making. just make sure its crazy"*);
**the boy is the star**; and *"it should be a scrolllable thing things happpen when scroll its
scroll bases"*.

**Entry:** `break.html` → `src/break/main.ts`. Branch `claude/break-loose` (from `claude/motion-site`).

## The idea

It opens as the most generic website there is — a grey skeleton landing page, still loading. It
scrolls like one. Then something knocks from behind the media box. The boy punches his way out,
and from there the page's own parts are the cast: they keep time, peel off, break into 3D slabs,
become a dance floor, fall away, circle him as sketches, and slam back together as Max's real site
in ink and paper. No music: the rhythm is in the cutting. The beat runs on the clock (118 bpm), so
the page keeps dancing while you watch; the scroll is the playhead (in beats) and decides what has
happened. Scroll back and it all plays in reverse.

## Running order (`src/break/timeline.ts`)

| beats | part | what happens | file |
|---|---|---|---|
| 0 | LOAD | grey skeleton site, shimmer; a second in, something knocks behind the box (knock-knock every couple of seconds); the template's own scroll pill until you scroll | `scenes/open.ts` |
| 1.5 | KNOCK | the page locks on the media box; three knocks bulge its skin like rubber (his fist's silhouette as a height map) | `open.ts` |
| 6–8 | PUSH, RIP | a fist pushes, the X seams strain and split, the four flaps burst open over a dark well | `open.ts` |
| 9–16 | OUT | an eye looks out; he leaps over the camera and lands on the call-to-action: first colour, red; impact frame; the landing ripples through the page; the box swings shut | `open.ts` |
| 21 | SNAP | he snaps (red ring); the page keeps time; one part joins per bar (kick, headlines, level-meter copy lines, nav hi-hats, backbeat); he hops up and moonwalks; the camera punches in on the kick | `scenes/snap.ts` |
| 41 | PEEL | he hangs off the nav; it peels like a sticker, becomes a ribbon he rides; the camera tilts: the site is a sheet in the dark; build; one beat of silence | `scenes/peel.ts`, `ribbon.ts` |
| 61 | DROP | the sheet falls away, every block becomes a slab: carousel round him on the red board (cuts every 2 beats), then a tunnel (cuts every beat), then down into a floor | `scenes/drop.ts` |
| 93 | FLOOR | a dance floor of tiles lit in patterns; every style change re-draws the whole frame: ink, pixel, comic, watercolour, clay, chalk, rubber hose, each with its own move; last bar one style per beat | `scenes/floor.ts`, `post.ts` |
| 117 | QUIET | the floor falls; the box he came from floats; he sits on it with his coffee (this is fine); it opens; the Spark | `scenes/quiet.ts` |
| 137 | RISE | he holds the Spark; it pulses faster (a visible snare roll); the parts circle him as outlines; one beat of nothing | `quiet.ts` |
| 153 | SLAM | the page slams back in paper; the outlines are yanked into place top to bottom, landing in ink; the Spark becomes the logo dot; the fire tornado; he kicks the name in; SAY HI | `scenes/home.ts` |
| 177–193 | HOME | his site; it scrolls like one; the name changes style every two bars; he waits in the corner; the button is a real link | `home.ts` |

## How it is built

- One WebGL stage (three.js) over a tall scroll track. World units are page px; world y = −page y.
  The flat camera (`flat()` in `director.ts`) sees the page 1:1 like a browser; `orbit()` circles a target.
- **Every frame is a pure function of (beat, clock).** `Director.update` resets everything to rest
  (flat grey page, boy hidden, flat camera), then each scene in running order piles its changes on.
  Nothing is simulated, so scrubbing backwards is free.
- **Blocks** (`page.ts`): each layout block is a rounded rectangle extruded to depth 1 and scaled in z
  to its thickness — flat it is a web page, thick it is a slab. Looks: grey template → `ink` (his site)
  → `wire` (outline). Anything right at the lens dissolves.
- **The media box** (`Media`): four flaps cut along its X over a dark well; knocks displace the skin
  with his fist's silhouette (`heightMap('closeup_2')`).
- **The boy** (`actor.ts`): his drawings on a quad, placed by the foot (or middle/top), sized by head
  size so sequences keep one scale; billboarded in 3D. Style twins are `pixel-…`, `comic-…` etc.
- **Post** (`post.ts`): impact frames, chromatic kick, ink wipes, grain, vignette, and the seven style passes.
- **Ribbon** (`ribbon.ts`): the nav painted onto a strip; peel (cylinder curl) blends into a Catmull-Rom path.

## Rules followed

No words except the name, the seal and SAY HI. One strong shape over many small (no particles,
no swarms; one ring at a time). Phone first; checked at 390×844, 1440×900, 844×390, 2560×1080.
Only the boy reacts to a tap. Reduced motion: no shake, no beat cuts, no style passes, impact frames
softened. 60 fps through every section on the dev machine (`scripts/perf-break.mjs`).

## Dev

```sh
npx vite --port 5199 --strictPort
node scripts/shoot-break.mjs 0,13.3,21.1,104 phone 2   # beats, size, clock seconds [, idle 0..1]
node scripts/perf-break.mjs phone 8                     # frame time per section
```
`window.__brk`: `seek(beat)`, `freeze(seconds | null)`, `idle(0..1 | null)`, `ready`.

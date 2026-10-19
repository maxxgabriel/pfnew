# WORLD — one explorable ink world (round 38, draft for the owner's OK)

The owner on v3: *"nope its still really bad how about instead if guessing you
ask me what is it that i actually want"*. Asked; their answers:

| question | answer |
|---|---|
| What is the portfolio at its core? | **One explorable world** |
| What's worst now? | Barely moves, looks cheap, generic layout, wrong ink feel (all four) |
| Which motion? | Character acts, ink and paint FX, hover and tap life, big transitions (all four) |
| What should a visitor leave with? | **Be wowed** |
| How do they move? | **Scroll as a journey** (a path through an open world, not page sections) |
| What does it look like? | **Districts per style** |
| What's in it? | Animation scenes, style portals, about and contact, hidden secrets (all four) |
| The scroll film? | **A place in the world** |
| Camera? | *"use all of them"*: side-scroller, winding map, into the depth, mixed |
| Seams? | *"use them all"*: portals, paint-over, seamless blend, hard cuts |
| The boy's role? | **The star**: you travel past him while he performs |
| First build size? | **All seven styles** |

The motion site (SITE2/SITE3) is replaced by this.

## The map (draft)

Scrolling moves you along one path. Each district has its own camera, its own
scene the boy performs, and one thing to find. Every seam type is used.

| # | District | Camera | The boy performs | To find | Seam out |
|---|---|---|---|---|---|
| 1 | **Ink** (home) | Side-scroller over sumi mountains | Brushed into being from one line; MAX GABRIEL paints itself; the Spark drops | Tap the moon: it winks (secret) | **Hard cut** on his jump |
| 2 | **Pixel** | Side-scroller, platformer | The run → sprint, scroll speed drives his legs; a moonwalk if you scroll back | A pixel signpost: *who I am* (about) | **Paint-over**: watercolour washes over the pixels |
| 3 | **Watercolour** | Into the depth, the sea coming at you | The surf on the great wave | A bottle in the water: a secret note | **Portal**: a comic panel border he leaps through |
| 4 | **Comic** | Mixed: panel to panel | The duel under the comic moon | Halftone stars hide a secret frame | **Seamless blend** into clay |
| 5 | **Clay** | Winding map, a top-down diorama | The leap and the fall across the islands | **The theatre: the scroll film plays here** | **Hard cut** on a fall |
| 6 | **Chalk** | Into the depth, down a blackboard road | Chalk surf through drawn-on clouds | Tap the eraser: it rubs him out and he redraws himself (secret) | **Portal**: a door drawn in chalk |
| 7 | **Rubber hose** | Side-scroller, 1930s cartoon stage | The broom gag, the knock, the hat tip | **Contact**: a mailbox and a red hanko seal; tap to say hi | Loops home: the iris closes and opens on Ink |

Always on: anything you tap reacts (hover on desktop too); ink drops under
every press; the HUD is just the wordmark, a district name and a menu that
jumps to any district.

## Art

Already drawn: the boy in all seven styles (pixel-, water-, clay-, chalk-,
comic-, hose- cycles), backgrounds for ink, pixel, watercolour, comic and
rubber hose (`src/assets/sketchbg`). To generate: clay and chalk worlds, the
theatre, the mailbox, the signpost and the portals.

## Engine

The film's canvas engine (beats, holds, worlds, seams, `src/sketch/*`) already
does scroll-driven scenes, parallax worlds and style twins. The world is built
on it as a new entry (`world.html`), one module per district, so the film itself
stays playable inside the theatre.

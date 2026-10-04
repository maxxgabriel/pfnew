# Creative brief and decision log

The owner (Max Gabriel) wrote the brief below at the start of this rebuild.
The decision log after it records what they chose, approved and rejected in
the sessions since. Treat the log as binding; when it is silent, ask.

---

## The original brief (owner's words, lightly formatted)

### The goal

Revamp the whole frontend. You can change everything.

I want a portfolio with enough animation, motion graphics, composition, and
personality that people stop and think, "woah, what was that?" They should
want to scroll through it again.

Push the creative work much further. Think hard about the idea and execute it
properly. The result needs to look polished, feel original, and have an aura.
A generic AI-looking website with ordinary transitions does not meet the
brief.

### Animation is the main thing

Animation should be the core of the experience. I do not care about making
projects the main focus.

I want a lot of motion, with variety across typography, shapes, objects,
characters, backgrounds, and scenes. Think about the entire animation
experience, not just section entrances.

Things should keep moving regardless of whether someone is hovering or
scrolling. The page should feel alive while I am simply watching it.

By animation, I mean proper, complete, neat animated sequences. Small
bounces, basic fades, and normal transitions are not enough. More effects
alone will not fix weak animation or an unpolished visual direction.

### The reference: Mat Voyce (https://matvoyce.tv/)

Take inspiration from the animation language, energy, craft, and things
moving continuously. Do not copy the website, its artwork, or its
compositions. "animations is everything in matvoyce i dont care about
projects." "animations should have everything." "think more about it."

### Techniques to explore

- A movie-like scroll experience: a directed sequence with strong
  composition and connected scenes.
- 2.5D parallax: layers, depth, foreground/background, camera movement.
- Kinetic typography.
- Shape animation and motion graphics.
- Ambitious transitions, beyond the normal ones.
- Continuous movement even when the visitor is not interacting.
- Varied animation subjects.
- Complete animation craft: coherent, finished, neat timing and composition.

Examples of the ambition (not a required art direction): light sabers
fighting then a zoom out into the screen; blue and green wands fighting with
Harry-Potter energy; sumi-e-style animation.

### Rejected before this rebuild

The knot as the central visual; static pages with a few transitions; generic
AI portfolio layouts; copying Mat Voyce; unpolished animation; the
chrome/optical-sculpture direction; a grid of simple cartoon loops; the
"Sketchbook" stick-figure comic that was in the repo before this rebuild.

### How to work with me

Think more before choosing the direction. Ask if you have a real doubt about
what I mean. Do not make another large creative guess, build the whole thing,
and present it as finished without resolving that doubt. Do not call a
result polished, cinematic, or impressive just because it has many effects.

### Viewing

I am on iOS. Give me a page I can open on my phone. Motion and navigation
must work with touch, without depending on hover.

---

## Decision log

**Direction.** Offered three directions (Ink Duel / Loud Cartoon Machine /
Night Match). Owner: *"all 3 of them. mix all of them brilliantly."* Result:
one film joined by a circle (ensō → moon → orb → ball → star → ensō).

**Content.** *"You pick, keep it minimal."* Later: *"No, pure animation"* (no
projects). Contact is a placeholder: `hello@example.com` (replace when the
owner gives a real one). GitHub link: `github.com/maxxgabriel`.

**Round 2: approved and built.** Ink warriors; Arcade act; credits and a
post-credits scene; bigger camera moves (comic split panels, bullet time);
a mascot (Blot, an ink drop with a red scarf). Declined at the time: sound
design, tap-to-play interactions, a film-countdown cold open.

**Round 3: built, then REJECTED and reverted** (`47dd7c8` and `9be58dc`,
reverted in `085d0d6`). The owner said *"remove the last changes i guess it
doesnt look that good."* Don't reintroduce any of these without being asked:
- pick a side (viewer chooses blue/green; flips the outcomes)
- the manifesto interlude ("ONE STROKE / NO UNDO / SO MAKE IT MOVE")
- painted hand-scroll (emakimono) interludes at act changes, and the mural
- "glass" effects: Blot knocking on the screen when idle, staring warriors,
  VHS rewind on back-scroll, film overheat/burn on fast scroll, the ball
  cracking the screen, blade clashes slicing the chapter bar, confetti piling
  on the bottom edge

**Round 4: thunder (approved).** *"crazy animation effect… like the one
zenitsu does."* Built in gold (a colour used nowhere else) at four places:
the title signature, a duel finisher, the machine→arcade cut, and #10's dash.
Rhythm matters more than the lightning: stillness, charge, an instant flash,
an impact frame, then the delayed cut.

**Round 5: ALTER (approved, the centrepiece).** Reference: Saber Alter vs
Berserker (Fate/stay night: Heaven's Feel), red/blue/purple/black. Owner:
*"make this one bigger and longer and more eye catchy should look like im
watching anime. make this the main selling point of the whole website. make
this fucking crazy."* Built as an 18-shot, hard-cut act (`src/acts/alter.ts`)
between the arcade and the match, with its own red chapter mark (IV).

**Round 6: Arcade removed, ALTER cleaned up.** Owner: *"remove the arcade
act"*, and fix ALTER's animations that *"look weird… broken pieces and the
ones that don't have clean transitions"* (they like most of it). The machine
now cuts straight to ALTER on the gold bolt; chapters renumbered (III Alter,
IV Match, V Hello, VI Credits). ALTER fixes: ink-bleed open/close instead of
a crossfade (no more double moon), a standing wide, a real leg stepping
into the water, the roar framed on the head, a dash with afterimages instead
of a flat wedge, an ink-on-white impact frame, wounds and tendrils redrawn,
the beam aimed on a diagonal with a close-up where it actually hits, and a
flash on every sub-cut. Next requested: Dead Calm (Giyu, Water Breathing
11th form) and a Domain Expansion (Gojo) somewhere in the film.

**Round 6b: Dead Calm and the Void (approved, "looks real good").** Built
inside ALTER with no on-screen text, by the owner's choice.

**Round 7: the story (approved direction, not built yet).** Owner: the film
*"doesn't make sense from outside: light saber, football, anime battle"*;
*"make a story… a crazy story"*. They loved every suggestion from the last
round and asked for all of them, stitched into one story: see
`docs/STORY.md`. Standing guidance from the owner: no text in the new set
pieces; *"you don't have to follow any docs… if you feel something will feel
better just do it and report to me"*; *"dedication and passion… clean
transitions, crazy animation, crazy motion graphics"*; suggest new ideas
before building them.

**Round 8: ALTER cleaned up, the enemy replaced (approved).** Owner: *"remove
the tentacles… it looks so weird… change the enemy, don't make it a monster…
make it clean."* Offered three replacements; they picked **Green, reborn**: a
violet swordsman, blade against blade. The ink-blob beast and its tendrils are
gone and must not come back. Built with STORY step 1 (smears, orbit charge,
beam clash, match cuts, Blot in Dead Calm and the void).

**Round 9: the whole story, built overnight.** Owner: *"fix some bad edits…
the light saber fighter, their knee… just float… go over and over till you
fix… make it clean"*; *"all acts on their own make sense, but it doesn't make
any sense as a book… stitch up everything so the light saber, the anime
fight and the football make sense together… I'm down if you add another act…
think out of the box"*. Built every remaining STORY item: the Ink Dragon and
the swallow, the red-eye drop, TITAN and the screen split, Beneath the
Surface, Night Ride (a new act, IV), the Zone, Powers of Ten (with the Hand
signing the name), X-Ray and the new credit lines. Fixes: the warriors' legs
are real trousers that follow hip, knee and ankle (no more floating knees);
ALTER's beams are soft, tapered light; the duel is framed so nothing is
cropped. The book is stitched by continuity (Blue falls through the tear and
becomes the knight; Green builds TITAN, is reborn in ALTER, wins the match;
the Spark changes shape every act; Blot is in every world) and by one line
under the Machine and Match cards. Sound is still not built.

**What the owner responds to.** Big, cinematic, anime-like set pieces;
continuity jokes (Blot); hard cuts, impact frames, speed lines. Proposals
with clear options before a build.

**What the owner reacted against.** Additions that clutter the frame without a
strong set piece (round 3).

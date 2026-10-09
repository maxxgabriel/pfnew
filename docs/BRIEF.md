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

**Round 10: rethink — The Signature.** After round 9 the owner: the story
still didn't click and the vibe was lost; the anime arc (ALTER) was too long.
I first misread that as "replace ALTER" and pitched The Bedroom (it was all a
kid playing; ALTER swapped for a hand-shadow bridge). After step 1 the owner
corrected it: *"the anime was alright, just shorten… remove the night drive
as well and the dragon as well. we need to rethink."* Then, on the twist:
*"try to think harder. zoom out and think more."* Offered Player 2 (a
two-player game) and The Signature; they picked **The Signature**: every big
movement in the film was a pen stroke, and zoomed out they join into Max's
signature. ALTER stays at about a third. The dragon and the Night Ride are
removed. See `docs/STORY.md` v4. Lesson: when the owner says "shorten", don't
replace; when unsure, ask.

**Round 16: the Reel (current).** The owner asked for fresh ideas using three
references (a pdhouse motion guide on Notion, which this environment's
network blocks; cth9191/animate; heygen-com/hyperframes). Pitched story-led
concepts; the owner: *"we are saying a story and not showing our skills.
remember how we did it very well the first time?"* — the first film's
format was right: a showreel with a thread, each act a different craft.
Agreed plan: 4 chapters each with one "how did they do that" moment
(Ink, Machine, Impact, the Page), kinetic type as the glue between worlds,
one art direction (paper, ink, a few strong colours), the references used
for quality (HyperFrames' seam law, animate's craft and review rules), and a
**vertical slice first**: Ink built to the best bar plus its exit, judged on
the phone before the rest. **Website only, never a video format.** Built:
src/reel — on white paper, the fight paints a hanging scroll (each cut flows
into the landscape), then MACHINE slams on and the camera dives through it.
The owner approved the slice (*"yup looks greate. complete whole website
then"*), then cut Machine and TITAN (*"get the machine part taken out its
very weird. even the titan. think of something else"*) and approved all four
replacements (*"all sounds good. do all of it"*). The full reel: I Ink, II
Flock (murmuration), III Fold (origami crane), IV Neon (type city), V Shadow
(anamorphic shadow art: one bulb, shards, a shadow that snaps into
pictures), VI Impact (the rivals in silhouette at sunset, beam clash,
white-out), VII the Page (every chapter live in a brushed circle, the seal,
a signature, contact). See `docs/STORY.md` v9.

**Round 17: less is more.** The owner cut Flock, Neon, the painted birds
and Shadow's shard cloud: *"i hate multiple small things together its yuck
for me"*; the birds didn't match the aesthetic; the neon city with the
letter buildings looked bad. The reel is now I Ink, II Fold, III Shadow,
IV Impact, V Page (`docs/STORY.md` v10). **Never build swarms, flocks,
particle clouds or anything made of many small pieces repeated together.**

**Round 19: The Sketch v12 (separate branch `claude/sketch-v12`).** An
ideation session pitched 16 quality ideas; the owner liked all of them and
asked for the lot, with ChatGPT (Codex, device-code login) used for every
pose and for some code. Built on its own branch while another session kept
working on the main one: the Eraser as a villain, the one-line birth, the
Wave, the Deep and the whale, the duel inside it, the brush-painted slide,
the 360° orbit, the signature, the loop, idle life. See `docs/STORY.md` v12.

**What the owner responds to.** Big, cinematic, anime-like set pieces;
continuity jokes (Blot); hard cuts, impact frames, speed lines. Proposals
with clear options before a build.

**What the owner reacted against.** Additions that clutter the frame without a
strong set piece (round 3).

**Round 11: the shooting star, and the character problem.** The match's goal
became a Ryusei-Blade-style special move (meteor hold). Drawing #10 in code
failed three times (a stick-figure rig, a 2D cel rig, a 3D model built with
three.js): the owner called each "weird". What worked: the owner generated
consistent anime key poses with ChatGPT from one character sheet (magenta
background), and code cut them out and animated them. Lesson: **code draws
light, motion, particles and type; people come from real drawings.**

**Round 12: INK — the loop (current direction, replaces everything).** The
owner, asked what I'd actually suggest and open to major changes: the site is
**a showpiece** (not for hiring), they **code**, **no projects yet**. Of
everything built they like **the ink duel** most; the star should be
**animation and interaction**; the first seconds should give **every feeling
at once** (hype, delight, awe, mind-blown). They rejected the anime-opening,
playable-goal, infinite-zoom and source-code pitches, and several twists, then
asked for twists **like Dark, 1899 or Silo**. Chosen: **A + B** — a time loop
the site remembers across visits (Dark), and on the last loop the painted sky
tears to show every other visitor's world (Silo). Everything but the ink world
is cut (still in git history). See `docs/STORY.md` v5.

**Round 13: One Day (current).** The owner dropped the ink spirits ("i wont
prefer using those small guys") and the loop/duel plan, and asked to build
around the **tranquil, beautiful scenes of anime edits**, not the fights.
Answers: a **mix** of "one day", "four seasons" and "a train window"; ink and
painted colour each where it fits; **no people; no sound**. Reference: the
Your Name style key art (sharp, vivid, crisp clouds, star flares). The owner
has a ChatGPT subscription and no API key: they signed in to the **Codex
CLI** with a device code, and the paintings are generated through it
(`.claude/skills/codex-images`). Never ask for passwords or keys in chat.

**Round 14: Ink in Water (current).** On One Day: *"this looks so bad lol.
lets use the original style and not use generated image"*. Picked: ink drawn
in code, and a new idea: **Ink in Water**. The owner suggested using Codex
(ChatGPT, gpt-6.1-sol) as a sub-agent to save usage: it wrote the fluid
solver (src/water/fluid.ts) to a spec; reviewed and fixed (drag, wet-edge
renderer). Codex is run with `codex exec … < /dev/null` (it waits on stdin
otherwise).

**Round 15: Two Drops (current).** Ink in Water had "no story or
animations". The owner first seemed to want the old film restored, then
clarified: *"not restore… do something in the current art style"*. Built a
story in the ink-in-water style with the first film's swordsmen (Two Drops +
The Last Stroke): src/water/story.ts. Lesson: the owner wants story and set
pieces, not just mood.

**Round 29: the desk as a camera set.** Round 28's desk round the picture
(always on, on PC) "kind of deletes the whole immersion". Lesson: fill a big
screen by moving a camera through a world, not by framing the film with
panels. Now the film is a sheet on a real desk: the page opens on the desk and
pushes in, eases back over it when the reader stops, and pulls back at the end
(the contact card taped beside the drawing); between those moments the film
fills the screen. The desk must feel "lively active and fun", real (not
cartoon), and not "girly": a green cutting mat on a white desk with a plant,
markers, swatches, a watercolour tin. Wide paper chapters also get big ink
doodles that draw themselves into the empty margins.

**Round 30: the story spills onto the desk.** The desk is "not the life of
it": the camera visits it at the opening, the end, a long pause, and when
the story leaves the paper — the Eraser is the real eraser, he tumbles off
the page into the paint, the night sheet is lifted off to show the sea, he
knocks on the page and flies round the coffee, the fire kick burns through
the sheet. The light changes with the story and the scrapped drafts pile up.
The comic POW words are gone.

**Round 31: pop culture.** The owner wants iconic, instantly recognised
moments woven into the story (like the light-blade duel, the broom chase and
the fire tornado): memes and movie/game beats, read from a pose or a camera
move, never a costume. Built: this is fine, distracted, a surprised cut-in,
imma head out, the 45° lean, the snap with "and i am maxx.", red light green
light (a real scroll game), and the Toy Story freeze on the desk.

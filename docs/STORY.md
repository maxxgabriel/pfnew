# STORY — The First Drop

This is the story the film is being rebuilt around, and the plan for every
idea the owner approved in round 7. It turns "ink duel, cartoon machine,
anime fight, football" into one tale with one object, one witness and one
rule.

**Status:** approved by the owner as a direction ("I loved them, stitch them
together, make a crazy story"). Nothing in the "To build" column exists yet.
Build it in the order at the end, one piece at a time, with a new preview
link after each.

**Working rules from the owner (round 7):**

- No on-screen text in the new set pieces. The story is told entirely by
  picture, motion and continuity. (Existing type such as the title, chapter
  cards, the match broadcast graphics and the credits can stay.)
- Creative steering belongs to the agent: if something will feel better, do
  it and report it. Suggest genuinely new ideas before building them.
- Clean transitions, crazy animation, crazy motion graphics. Dedication over
  shortcuts.

---

## 1. The logline

> Before a single stroke is painted, one drop of ink falls off the brush by
> mistake. The brush paints a circle, and the circle comes alive: the
> **Spark**, the thing that makes drawings move. Two strokes from the same
> brush, **Blue** and **Green**, will fight over it forever. Every time one of
> them grabs it, the page can't hold it and **turns into a new world** — ink
> scroll, cartoon poster, anime, the back of the page, a neon city, a
> floodlit stadium. Only the mistake, **Blot**, remembers every world. At the
> end the camera pulls all the way out, and it was one drawing on one page all
> along. The drop was the hero.

## 2. The rule of the world (why the genres change)

**The Spark can't be owned.** Whenever someone takes it by force, the medium
breaks and the story is redrawn in a new style, with the same rivals
reincarnated in that style:

| world | medium | Blue is | Green is | the Spark is |
|---|---|---|---|---|
| Ink | sumi-e scroll | a swordsman with a blade of blue light | his rival, green light | the moon, then the pearl the Dragon chases |
| Machine | screen-printed cartoon poster | (off-page: fell through) | the engineer behind TITAN | a football-sized ball |
| Alter | the **back of the page**, where ink bleeds through reversed: red, violet, black | the black knight, corrupted by holding the Spark too long | — | the target ring, then a star |
| Night Ride | neon on wet asphalt | — | — | a falling star; Blot chases it |
| Match | live broadcast | the blue team (defending) | the green team, #10 | the match ball |
| Hello | back to paper | — | — | the first ensō again |

That one rule explains the lightsabers, the football and the anime battle:
it is the same rivalry being redrawn each time the Spark is grabbed. The
audience doesn't need it spelled out. It reads through repetition: the same
two colours, the same circle, the same little witness in every world.

## 3. The cast

- **The Hand.** The artist (Max). Seen only at the very start (the brush) and
  the very end (the Powers of Ten reveal). Never a face.
- **Blot.** The first drop, a mistake. An ink drop with eyes and a red scarf.
  The audience's eyes: in every world, Blot is there, reacting. Comic
  relief, then quietly the hero.
- **The Spark.** The circle. Ensō → moon → pearl → ball → gold bolt → target
  ring → star → ball → ensō. Every transition in the film is the Spark
  changing shape.
- **Blue.** Proud, fast, the thunder user. Wins the duel by grabbing the
  Spark, and pays for it: falls through the page and comes back as the
  corrupted knight in Alter. Redeemed in Dead Calm, when their blue surfaces
  for one moment.
- **Green.** Loses the duel (snapped blade). Comes back as the builder of
  TITAN, and finally wins as #10 in the Match. Green's arc is the
  underdog's.
- **The Dragon.** Guardian of the Spark, made of living brush strokes. It
  swallows the pearl to keep it from the rivals. On the back of the page its
  bleed-through is **the Beast**: the same ink, reversed, every discarded
  stroke given a body.

## 4. The film, beat by beat

Legend: **[exists]** is in the film now and stays (maybe re-motivated);
**[new]** is to build; **[change]** reworks something that exists.

### Prologue — The First Drop

1. **[exists]** Black. The brush. An ink drop falls.
2. **[new] Title foreshadow.** For a single frame inside that first drop, the
   red eye of the knight from Alter flashes. Nobody catches it the first
   time; returning viewers do. (Draw the red slit and veins from `shotEyes`
   inside the drop for 1–2 frames, around intro 0.4–0.5 s.)
3. **[change]** The drop lands and *becomes Blot*: it wobbles, blinks, and
   watches the brush paint the ensō. That ensō is the Spark.
4. **[exists]** MAX / GABRIEL brush-written, the seal, the gold bolt signs it.

### I · Ink — The Pearl

5. **[exists]** Pull back: the ensō is the moon over sumi-e mountains. Ink
   floods the sky. Night.
6. **[new] The Ink Dragon.** Out of the flood rises a vast sumi-e dragon made
   entirely of living brush strokes (whiskers, plates of scales, a body
   hundreds of strokes long). It coils through the clouds chasing the glowing
   pearl. The camera rides alongside its body as it spirals around the moon.
   - Body: a path of segments following a spline whose head is keyed in film
     beats. Each segment is a few `brush()` strokes plus a scale plate, with
     dry "flying white" on the outer curve. Whiskers trail on the clock (`t`).
   - Clouds part in parallax layers as it passes; petals and ink spray off
     its tail.
7. **[exists]** Blue and Green duel for the pearl: clashes, petals, the
   vertigo lock, **Blue's thunder finisher** snaps Green's blade.
8. **[change]** Blue reaches for the pearl, and both fire beams. **[new]** The
   Dragon dives through the beams' meeting point and **swallows the pearl**.
   Its coils tighten into a perfect ensō; the camera dives through it, and
   the ensō *is* the hole that tears the paper (into the existing paper and
   tear at 6.75–7.85). The pearl drops out of the hole as a ball. Blue,
   still reaching, falls through after it and is gone. (That's where the
   knight comes from.)

### II · Machine — Make Things That Move

9. **[exists]** The ball drops into the poster-coloured chain reaction:
   MAKE / THINGS / THAT / MOVE. Blot rides along and gets thrown by the
   seesaw.
10. **[new] TITAN.** Instead of the spring cannon, the letters of MAKE THINGS
    THAT MOVE unbolt and **assemble into a giant robot**, Green's machine.
    It's a full anime transformation sequence:
    - plates flipping and pistons locking (each letter is a limb segment)
    - steam venting and rivets popping, eyes igniting
    - low-angle hero shots against the halftone sky.

    TITAN winds up and **punches the ball into the sky**. The ball charges
    gold.
11. **[change] The bolt splits the screen.** The gold lightning doesn't cut;
    it **tears the frame in half** down its path and the two halves slide
    apart, revealing the back of the page behind. (Replaces the cut in
    `drawMachineCut`. Render the machine frame to a buffer, split it along
    the bolt polyline into two polygons, and slide/rotate them apart.)

### III · Alter — The Back of the Page

The other side of the paper, where the ink bleeds through backwards: red,
violet, black water. The ball punched through and left a target ring in the
sky. Out of it falls **the Beast**, the Dragon's bleed-through. Waiting in the
ruins is **the black knight**, Blue, corrupted.

12. **[exists, change]** The corruption bleeds in; the title; the wide, the
    step into black water, down the blade, the eyes, the ring, the impact,
    the roar, the standoff, the dash, the clash. **[new] Match cuts** replace
    some hard cuts:
    - the title slash becomes the horizon line of the wide
    - the knight's red eye becomes the blood moon
    - later, the droplet's ripple becomes the target ring of the exit.
13. **[change] Smear frames in the slash barrage.** Every swing gets real
    anime smears: the blade stretched into a tapered ribbon for one or two
    frames, plus 2–3 ghost multiples of the knight mid-swing. Not just light
    arcs.
14. **[exists]** The tendrils lash at the camera.
15. **[exists] Dead Calm.** The eyes cool from red to blue: Blue remembers.
    Time stops in a sphere; tendrils are cut as they enter; the knight never
    seen to move. **[new] Blot is caught in it**, frozen mid-jump at the edge
    of the sphere with only the eyes sliding to follow each cut.
16. **[new] Beneath the Surface.** When the droplet hits the mirror, the
    camera follows it down through the water. Underwater:
    - ink blooms like ink dropped into a glass, slow rolling clouds
    - brush-stroke koi circling the knight's upside-down reflection, which is
      still blue
    - the reflection is the *front* of the page: the ink world from Act I,
      seen from behind
    - a red thread of corruption sinks past.

    Then the shockwave comes down from above and time comes back. (A hold
    between `drop` and `release`. Ink clouds can be layered glow sprites
    advected along a curl-noise field; caustics are moving bright bands
    with 'lighter' blending.)
17. **[exists]** Release: the red ring, the severed pieces fall.
18. **[exists] The Void.** The seal, the sphere that swallows the world, the
    beast caged and overloaded. The void is the blank page before anything
    was drawn. **[new] Blot is caught in it too**, spinning helplessly
    through the void, until a shard flies past him at the shatter.
19. **[exists]** The void cracks from the blade's point and shatters into
    glass.
20. **[change] Orbit shot on the charge.** The camera circles the knight as
    they raise the sword: ruins, moon and spires sliding past in parallax
    layers (rotate the `world()` layer set around the knight with depth-scaled
    offsets) while the sky cracks overhead.
21. **[new] Beam clash.** The Beast fires back: the Dragon's breath, violet.
    The two beams meet mid-screen and the contact point pushes back and forth:
    - the ground tears up under it
    - shockwave rings pump out each time it shifts
    - close-ups of the knight's boots sliding back through the water and the
      Beast's jaw straining.

    Blue overpowers it, and the Beast comes apart. It echoes the blue-vs-green
    beams of the ink duel; this time Blue wins clean. When the Beast
    dissolves, the **Spark is released** and shrinks to a star.
22. **[exists]** Aftermath: the knight kneels; Blot peeks out from behind the
    rock and cheers.
23. **[change] Alter → the next world.** The knight plants the sword into the
    black water and a ripple runs out. That ripple **match-cuts** to the
    ripple of a motorbike tyre slamming through a puddle in a neon street.

### Interlude — Night Ride

24. **[new]** The star is falling through a city at night, and **Blot is on a
    motorbike chasing it**:
    - red tail-light trails smearing into ribbons
    - billboards and signs whipping past in layered parallax (abstract shapes
      and colour only, no text)
    - the bike tilting through tunnels, the headlight a circle (the Spark
      motif again)
    - rain on the asphalt reflecting everything.

    It ends in **one long, legendary skid stop**: the bike sliding sideways
    on a shower of sparks right at the stadium gates. The star sails over
    the wall. (A new act file; its own hold so the existing Match timing
    doesn't move.)
25. **[change]** Match cut: the star lands on the **centre spot**, with the
    same impact ripple as the sword plant and the puddle.

### IV · Match — The Rematch

26. **[exists]** The floodlit stadium; the lights clunk on; the broadcast
    graphics ("the rematch", 89th minute); chalk tactics; comic panels.
    Blue defends, Green attacks: the rivalry reincarnated as sport.
27. **[new] The Zone.** Just before #10's thunder dash, the stadium **drains to
    white chalk line-art**: the stands become hatching, the crowd freezes,
    and only the ball and the two runners stay in colour. A heartbeat of
    stillness, then the thunder dash snaps everything back to full colour.
    (Inside or just before the `dash` hold at film 15.0.)
28. **[exists]** Bullet time, the strike, the goal, the net. **Green finally
    wins.** Blot falls off the crossbar cheering.

### V · Hello — Powers of Ten

29. **[new]** After the goal, the camera starts pulling back out, and never
    stops:
    - out of the net → out of the stadium, which shrinks into the star in
      Alter's sky
    - → out of the back of the page, which becomes the pearl between the two
      ink warriors
    - → out of the duel, which becomes the brush's first ensō on paper
    - → the Hand, holding the brush, with Blot sitting on the paper beside
      the circle.

    Circles inside circles: one continuous zoom through every act in about
    two screens of scroll. (Each world draws into a circle-clipped region
    inside the next; the zoom is exponential, so one scale step per world
    reads at a constant speed.)
30. **[exists]** The ensō iris, the name repainted, the contact card.

### VI · Credits, and after

31. **[exists, change]** The credit roll. Add the new cast in the same style:
    the Dragon, the Beast (the Dragon's shadow), the knight (Blue, again),
    TITAN (built by Green).
32. **[new] X-Ray (post-credits).** The whole film replays at high speed,
    stripped to how it was made:
    - the warriors and the knight as glowing IK skeletons (`solve()` from
      `warrior.ts` drawn as bones)
    - the Beast as raw blobs with their wobble paths drawn
    - the Dragon as its spline and segment frames
    - camera paths as dotted curves, motion graphs scribbling along the edge
    - the beam as unblended colour layers, the void as wireframe orbits.

    It's an anime pencil test. For a motion portfolio, it's the "yes, I built
    every frame of this" moment.
33. **[exists]** Blot finds the two hilts crossed in the grass, picks one up,
    and it ignites: the Spark has chosen the drop. MAX GABRIEL WILL RETURN.
    Contact card again.

### Optional — Sound, for Alter only

34. **[new, optional]** A tap-to-enable sound button, shown only at Alter:
    - a low drone and impact hits
    - **total silence** in Dead Calm, a single water drip at the drop
    - the void humming, glass shattering
    - the beam clash roaring.

    The owner declined sound once before (round 2), so this stays optional:
    ask once more when Alter is otherwise done.

## 5. Every approved idea, and where it lives

| # | idea | where in the story | beat |
|---|---|---|---|
| 1 | Title foreshadow: the red eye in the first drop | Prologue | 2 |
| 2 | The Ink Dragon chasing the pearl | I · Ink | 6, 8 |
| 3 | TITAN, the letters assemble into a robot | II · Machine | 10 |
| 4 | The bolt splits the screen | Machine → Alter | 11 |
| 5 | Match cuts (slash → horizon, eye → moon, ripple → ring) | III · Alter | 12, 23, 25 |
| 6 | Smear frames and multiples in the slash barrage | III · Alter | 13 |
| 7 | Blot caught in Dead Calm | III · Alter | 15 |
| 8 | Beneath the Surface | III · Alter | 16 |
| 9 | Blot caught in the void | III · Alter | 18 |
| 10 | Orbit shot on the charge | III · Alter | 20 |
| 11 | Beam clash | III · Alter | 21 |
| 12 | Sword plant → ripple → centre spot match cut | Alter → Night Ride → Match | 23, 25 |
| 13 | Night Ride | Interlude | 24 |
| 14 | The Zone (chalk line-art before the dash) | IV · Match | 27 |
| 15 | Powers of Ten | V · Hello | 29 |
| 16 | X-Ray pencil test | Post-credits | 32 |
| 17 | Sound for Alter, behind a tap | III · Alter (optional) | 34 |

## 6. Build order

Do these one at a time. After each, screenshot at phone size, measure
`scripts/perf.mjs`, push, republish the preview, and report to the owner.

1. **Alter finishing pass — DONE (round 8).** Beam clash (21), smear frames
   (13), orbit charge (20), match cuts (12: slash → horizon, red eye → sky
   ring, blue eye → calm moon; the droplet → exit ripple waits for Night
   Ride), Blot in Dead Calm and the void (15, 18). **Change from this doc:**
   the owner rejected the Beast and its tendrils; the enemy in Alter is now
   **Green, reborn** (a violet swordsman), and the tendrils are flying
   slashes. Read "the Beast" below as the rival; the Dragon in Act I is
   still planned, but keep it a clean brush-stroke dragon, not a monster.
2. **Powers of Ten (29).** The ending that ties the film together; it also
   proves the "it was one page" idea everything else hangs on.
3. **The Ink Dragon (6, 8)** with the prologue changes (2, 3). This makes
   the opening as strong as Alter and sets up the Beast.
4. **TITAN and the screen split (10, 11).**
5. **Beneath the Surface (16).**
6. **Night Ride with its match cuts (23–25).** This is a new act: add it as a
   hold so Match timing doesn't move, and add its chapter mark.
7. **The Zone (27).**
8. **X-Ray (32)** and the credit lines (31).
9. Ask about **sound (34)**.

### Technical notes for whoever builds it

- Add time with **holds** (`src/core/holds.ts`), never by shifting authored
  beats. Night Ride, Beneath the Surface, the Dragon and Powers of Ten each
  want their own hold.
- Every set piece is a pure function of its progress (`q` or the hold's `p`)
  plus the clock, so scrolling back plays it in reverse. Keep it that way.
- Keep frames under ~5 ms of JS at 1× on the perf script. Buffer anything
  heavy to an offscreen canvas once (the void shatter does this).
- No `shadowBlur`; use the cached glow sprites. Whole-pixel font sizes only.
- Phone first (390×844): check every new shot there before calling it done.
- Palettes in use: ink (paper, ink, blue, green), machine (poster colours),
  Alter (`RED`, `VIOLET`, `BLUE` for Dead Calm, `VOID` for the void), gold
  for thunder only. Night Ride gets its own neon palette; the Zone is chalk
  white on green-black.

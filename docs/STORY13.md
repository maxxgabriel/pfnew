# STORY — The Storyteller (v13, plan)

**Logline.** Across a dying campfire, an old wanderer tells you about a
little ink boy who followed a Spark through the world. When the telling
falters, the fire falters. When the boy learns to make his own way, the
story reaches across the fire — and the old man hands the brush to you.

**Cast.** The boy is the owner's Wanderer: ink chibi, messy black hair,
icy streak, antenna strand, blue eyes, frayed scarf, coat and boots.
The Spark is one vermilion light, his first friend. The Eraser is one
heavy pink rubber block, without a face. The old wanderer is the boy grown
old, painted because he is real; the same scarf, streak and antenna strand
make the final reveal. You sit across the fire. The camera is your place.

**Rule.** Everything real is painted; he is ink because he is the story
being told. Every environment is a cinematic posterized painting: flat
colour masses, hard shadow shapes, one motivated light, warm against cool.
The imagined places and their physical props are painted too; only the
boy and his drawn shadow retain the ink language. His line stays visible
under coloured light. **Owner (v13 review): keep the per-act styles** — he
still turns pixel, clay, watercolour, chalk, comic or rubber hose per world
(round 27's `ACT_STYLE`), now against painted worlds.

**Worlds are drawn in code, not shown as pictures** (owner: "these are just
pictures… it will look static"). Paintings are made in layers, vectorized
into flat posterized shapes (`scripts/vectorize.py`) and rendered live with
moving hard-edged light, flicker, sway, parallax and relit/morphing seams
(`src/world/`, `docs/WORLD.md`). PC: no desk (owner: drop it); the same film,
wider and cinematic. Fire lines approved: "let me tell you.", "go on?",
"and i am maxx."

**Frame.** The fire stays lit only while the story does. An Eraser victory
shrinks the real flame; a boy's victory brings it back. No permanent fire
inset or extra meter: return to the fire at the authored moments below.
A few short handwritten lines, Caveat, belong only at the fire. The
chapters are wordless; chapter names and beat numbers here are directions,
not cards on screen. Contact details and the seal belong to the ending.

**Timing.** B below is a proposed v13 film-beat map, not a change to v12's
existing timestamps. Author the new conductor separately when approved.
Holds add reading and performance time without moving film beats. Scroll
moves the story; release leaves light, breathing and water alive. Fast
scroll must still preserve the setup, contact and landing of each seam.
This is a website, with touch as the complete control scheme.

## 0 · The Fire — B 0–4

1. **Across the fire** (0–1). Night. A low painted flame divides you from
   an old man sitting on a rock. Cool blue ground, a single dark ridge,
   warm light on his hands. He is looking at you, not performing to a
   crowd. His face is mostly in the hat's shadow; the scarf edge is clear.
2. **He begins** (1–2). His hands close around a brush across his knees.
   He leans forward. One handwritten line arrives beside the light:
   “let me tell you.” It leaves before we enter the story. A short hold
   gives the look and the line room; no explanatory paragraph.
3. **One spark** (2–3). A single red spark lifts from the flame. His gaze
   follows it. The camera follows too; he drops below the frame. No ember
   swarm. The flame's broad shape and the light on the rock do the work.
4. **Seam: spark → dawn** (3–4). The spark crosses the dark ridge. That
   ridge becomes the meadow horizon as night warms into dawn beneath it.
   Keep the spark's size and upward drift continuous; it never fills the
   screen as a red disc. It settles toward the grass and we follow down.

**Reuse / make.** Reuse the Spark's single-point motion language. Make the
entire painted fire set, old wanderer and dawn bridge. No desk opening,
page turn, title sequence over the meadow or permanent picture border.

## I · Still — B 4–10

1. **A place before a person** (4–5). Painted meadow at dawn. One grass
   bank in front, a cool low ridge behind, a warm slit of sun from the
   right. Leave a clear resting place for a small drawing in the grass.
2. **One line** (5–7). The Spark touches that place. One unbroken ink line
   travels around his sleeping shape, starting at the antenna strand,
   finding scarf, coat, boots and face. The line completes; his ink settles.
   There is no visible brush drawing him and no hand outside the picture.
3. **First friend** (7–8.5). The Spark nudges his nose. He wakes, focuses,
   sits up. It backs away when he reaches, then returns to his open palm.
   He smiles at something other than himself. Hold on this first contact.
4. **First step** (8.5–9). The Spark hops toward the ridge. He gets up,
   tests a foot against the painted ground, then follows, still uncertain.
5. **Seam: dawn → pine ridge** (9–10). Track beside him as the meadow bank
   rises into the ridge path. One near pine trunk crosses the lens; behind
   it his walk becomes a jog. Same foot contact, same travelling Spark,
   same morning sun. A physical occlusion, not a reset of the scene.

**Reuse / make.** Reuse `oneline.json`, the one-line tracer, `still_*`, wake,
curious, walk and `ib_wake` drawings where their silhouettes fit. Check the
sleeping outline against the existing trace. Make the palm-contact and
first-step transitions if the old drawings cannot carry the weight.

## II · Run — B 10–21

1. **Find the rhythm** (10–12). Keep today's ground-locked walk/run cycles
   and scroll-speed response. Pines pass as broad painted silhouettes;
   the path is a real ridge, not a line floating on paper. A backward
   scroll can play the moonwalk; his medium remains ink throughout.
2. **Distracted look-back** (12–13). A broad patch of golden sunlight opens
   behind him. He looks back at it while still moving forward. The Spark
   waits in front of him, visibly neglected; he catches himself and returns.
   Reuse the two look-back poses; no extra star or new companion needed.
3. **The Eraser** (13–14). One heavy block drops behind him. Its pass
   removes a broad piece of painted path, leaving a cold empty absence.
   The boy looks back once and runs. The threat is losing the world.
4. **Red light, green light** (hold at 14). The Eraser turns its broad end
   away; he sneaks. It pivots back; he freezes. Two exchanges, then a
   lunge. Reuse sneak/statue poses. Orientation and a red spill of light
   show the danger; do not add eyes. Touch scroll controls his advance;
   a late freeze costs a little ink at his boots, never a restart or fail gate.
5. **The lean / the leap** (14–17). The lunge passes his nose as he holds
   the stiff Smooth Criminal lean. He springs out of it into the existing
   rotoscoped gap jump, lands and sprints. Keep the grounded run's timing;
   let the lean read in a hold rather than stretching the whole chase.
6. **Over the edge** (17–19). Wind bends his scarf and pushes the Spark
   toward the cliff. He reaches too late: it blows over. He chooses to
   run off after it. A brief legs-still-running beat, a look down at you,
   then gravity takes him. Keep the comic timing in his ink poses.
7. **Seam: cliff → sea** (19–21). Track down with him past the painted
   cliff face. The sea is already visible below, storm-dark. A long brush
   dislodged from a rock ledge falls alongside him, established before he
   needs it. He catches its shaft and rolls his boots onto it. The first
   swell catches brush and boy in the same downward movement.

**Reuse / make.** Reuse `run8`, `walk8`, `moonwalk6`, `lookback_*`, `sneak_*`,
the lean staging, `roto_*` and fall poses. Repaint the Eraser and brush as
physical objects; retain their shape and motion. Replace pop-up paper
obstacles with a few large rock ledges. No iris or origami rescue.

## III · Wave — B 21–28

1. **A moving floor** (21–23). Painted storm sea, warm lightning behind a
   thick cloud bank against cold blue water. He surfs the falling brush
   down a swell. The Spark skims ahead, low enough that he can follow it.
2. **The wave stands** (23–25). A single enormous water mass rises behind
   him. Keep today's surf poses and curling-wave choreography, but paint
   a new original wave silhouette: broad dark body, one hard lit crest.
   No copied woodblock composition or field of foam particles.
3. **Nowhere left** (25–26). He banks toward a dark opening at the cliff's
   foot. A short `stunned_*` face cut-in carries the round 31 surprised
   moment here, before the wave hits. The Spark is caught in the opening.
4. **Seam: wave → cave** (26–28). The wave overtakes him and drives the
   brush into the sea cave. Follow the water through the mouth. One white
   sheet crosses the lens, then drains down a rock wall; his tumble
   continues inside. The brush lands across a rock shelf within reach.
   The Spark hits the wet floor and dims to a weak red ember.

**Reuse / make.** Reuse surf, balance, tumble and surprised drawings; reuse
`sea.ts` wave timing as blocking. Replace `bg_inksea`, `fg_inksea` and the
old wave art with layered storm paintings. No negative-ocean chapter,
whale silhouette, swallow, ribs or bulb room.

## At the fire — B 28–30

1. **The telling stops** (28–29). The cave's last red reflection becomes
   the red on the old man's knuckles. Across the same fire, his mouth has
   stopped moving. The flame sinks almost to the logs. His hand hangs
   open. Hold: this silence should feel like he cannot say what comes next.
2. **You ask him to continue** (hold at 29). He lifts his eyes to you; a
   small handwritten “go on?” appears by his shoulder. Tap the old man,
   with one generous target around his body. He takes a breath, nods and
   cups his hand toward the fire. No tapping embers, drawing or dragging.
   The hold waits for that tap; scroll alone does not answer it. Revisiting
   this beat restores a coherent state; it must not duplicate the response.
3. **Seam: fire → torch** (29–30). Push into the surviving tongue of flame.
   Match its movement to a torch flame inside the cave. Wet stone emerges
   around it. The boy is already reaching toward the torch's fallen shaft.

## IV · The Cave — B 30–43

1. **Make a little light** (30–32). He raises the torch from a dry shelf.
   Its flame is the only light source: ochre faces of rock, blue-black
   recesses. The Spark rests at his feet, barely an ember. He shelters it
   with his scarf, then sees what the torch has uncovered.
2. **Paintings older than him** (32–34). A few large original marks on the
   wall: a traveller crossing a ridge, a curling sea, an open hand. Not a
   storyboard wall or a gallery of little panels. The camera moves along
   the stone and his shadow walks across the marks. He waves; it delays.
3. **The shadow chooses** (34–35). It turns without him and draws a red
   blade against the rock. He pulls his own hilt from his belt; the blue
   blade ignites unevenly, then holds. He plants the torch in a crevice,
   leaving his hands free and the shadow's position understandable.
4. **Duel among the paintings** (35–38). Reuse the existing blue/red
   choreography: first contact; recoil; low pass; second blade lock. A
   bullet-time hold walks a short arc around the lock, showing the shadow
   attached to the wall while its blade reaches out. Torchlight remains
   dominant; blade light is brief contact light, not another ambient sun.
5. **He loses ground** (38–39). A red cut crosses the painted ridge mark.
   Its colour rubs away with the same cold absence the Eraser left outside.
   The shadow carries the Eraser's work into this place. His blue blade
   flickers. He reaches for the ember instead of pressing the attack.
6. **Low point** (39–40). The shadow knocks the torch down. Its last light
   shows him slipping off the shelf, one hand closed around the Spark.
   The ember is almost out. Hold on the reaching wrist above blackness.
7. **A hand from outside** (40–41). A huge PAINTED hand enters from above
   and catches that wrist. Age, warm firelight and the frayed scarf at its
   sleeve identify the storyteller's hand without exposing his face.
   Ink wrist against painted fingers: the two realities touch once, clearly.
8. **Seam: blade cut → sunset** (41–43). The hand lifts him to the shelf
   and lets go. The Spark brightens in his fist; his blue blade steadies.
   One upward cut splits the shadow and opens a narrow golden cleft in
   the rock. Follow his leap through that cleft as it widens into the
   sunset valley. The slit becomes the valley's lit horizon, not a ring.

**Reuse / make.** Reuse `saber_*`, `saberlock_*`, belt ignition, clash,
escape and rise drawings as blocking. The belly-split technique can inform
an opening mask, but no belly painting survives. Make wall-bound shadow
poses, the fall with protected ember, wrist catch and recovery. The hand is
new painted art explicitly requested here, not the rejected hand-scroll
interlude or hand-shadow bridge. Make all cave surfaces and paintings.

## V · Chase — B 43–52

1. **Caught by flight** (43–44). He comes through the golden cleft in
   midair. A painted broom and hat are carried out beside him; he lands
   astride the broom and the hat drops onto his head. The Spark flies free.
2. **Play returns** (44–47). A golden-hour valley opens underneath: one
   sun direction, warm cliff planes and long cool shadows. Keep the bank,
   loop, dive and recovery of today's broom chase, now between broad rock
   shoulders. The Spark stays one shape; no wings or flock are necessary.
3. **The wink** (hold at 47). Level beside the camera, he notices you and
   winks. Reuse `broom_wink_*`. The broom keeps drifting; there is no knock
   on the screen and no excursion round desk props.
4. **The catch** (47–49). He stretches, misses once, then closes his hand
   around the Spark. He opens it: the light stays with him. A quiet hold
   lets the first-friend gesture from the meadow return with confidence.
5. **His own stroke** (49–50). He throws the hat upward and leaves the
   broom. The falling brush from the sea has travelled tucked along it;
   show that shaft before he takes it. He catches the brush, dips its tip
   into the Spark's glow, and paints one broad stroke under his own feet.
6. **Seam: stroke → smoke** (50–52). Keep today's spline ride and pressure
   rhythm. The stroke curls upward; its dark edge softens into one painted
   ribbon of smoke. Ride that curve out into the smoke above the campfire.
   Descend along it to the old man's brush and the real flame below.

**Reuse / make.** Reuse broom poses, wink, catch, hat throw, brush grab and
stroke ride. Repaint broom, hat and brush; replace `bg_sunset` / `fg_sunset`
with valley plates. Make the Spark-in-palm echo and stroke/smoke bridge.

## VI · Home — B 52–64

1. **The danger follows** (52–54). Across the fire again, the old man is
   still holding his brush. The ink boy rides down the last stroke beside
   the flame. The Eraser forces its painted bulk OUT of the smoke after
   him, crossing in front of a real log. It scrubs toward the fire and the
   flame shrinks. The old man's face loses its warm light.
2. **This fire** (54–57). The boy steps between block and flame. Reuse the
   eight-angle turnaround and eye cut-in, keeping the fire's location
   readable. Toe flick, crouch, leap: the actual campfire is drawn upward
   around his spin as one cone of fire. The overhead kick drives that
   flame into the Eraser. It hits the ground; the fire roars back.
3. **“This is fine”** (hold at 57). In the new warm pool he sits and takes
   one calm sip while the scorched block struggles upright behind him.
   Reuse `fine_*` as a visual joke; no meme caption. One cup, one flame,
   one enemy. The fire is lively, not consuming a paper page or the frame.
4. **The snap** (57–59). The boy raises his hand. The old man's painted
   hand rises in the same gesture across the fire. “and i am maxx.” writes
   beside the old man in Caveat. One shared snap; the Eraser collapses to
   one inert worn block. No dust cloud, disintegration swarm or glass effect.
5. **The reveal** (59–60). The firelight finally reaches his whole face:
   icy streak through grey hair, the antenna strand, the same blue eyes,
   the same frayed scarf. Match his smile to the ink boy's. The boy settles
   into the old man's shadow and disappears as the telling ends. Hold.
6. **Your turn** (60–62). The old man offers the painted brush toward the
   camera, handle first. No visible reader hand is needed. The final warm
   ember rests beneath it as the contact card: clear name and real links,
   large touch targets, calm enough to use. No signature pad or finger
   drawing. Keep the card available until the reader chooses to continue.
7. **Head out / seal** (62–63). After the contact hold, he makes the round
   31 hands-on-knees rise, gives you one look, and steps into the dark.
   Recreate `headout_*` in the painted older body. The brush's red end
   presses the seal into the warm ground by the fire; it is a firm stamp,
   not an interactive task. The camera settles back across the logs.
8. **Seam: last spark → first spark** (63–64). One spark lifts from the
   seal's reflected glow into the fire. The old man is seated beyond it
   again as the camera regains the exact opening position. Hide the reset
   behind the single rising flame shape. Flame level, hand position and
   spark trajectory meet B 0; the next telling can begin without a jump.

**Reuse / make.** Reuse `turnA_*`, `turnB_*`, close-ups, `ftkick_*`, spin,
`fine_*`, `snap_*`, offer staging and seal motion. Reuse tornado paintings
only if they pass the new hard-shape art test; otherwise repaint their
silhouettes. Make painted older-man gestures and the final paired snap.
The Toy Story rule survives as stillness at the silent fire hold: the ink
story waits for your attention while the real fire breathes. No desk peek.

## Art list for scripts

Every plate below needs a composed wide PC version AND a tall phone crop
with enough overscan for its camera move. Paint tall compositions deliberately;
do not slice the hero, hand, cliff lip or contact area from a wide export.
Provide separated layers with shared registration, light direction and
foreground masks. Keep texture broad; no generated lettering in paintings.

- **FIRE:** cool night sky; far ridge; ground/seat midground; near log
  occluder; fire bed; low/steady/roaring flame shapes; smoke ribbon; warm
  ground/face light masks; seal ground patch. Opening, silence and Home
  reuse this one set, with a face-reveal lighting variant.
- **DAWN:** sky/sunlight field; far ridge; meadow ground; near grass bank;
  pine-trunk seam occluder; warm ground mask. No repeated tiny grass sprites.
- **RIDGE:** morning sky; far peaks; middle pine masses; path and gap/cliff
  shelf; near pine/rock occluders; vertical cliff descent; erased-path mask.
- **SEA:** storm sky/lightning light plate; far cliff with cave mouth;
  middle swell; near swell; three broad wave crest/body states; impact
  sheet and draining-water mask. Plan the descent and cave entrance together.
- **CAVE:** entrance/wet floor; duel wall and shelf; deep recess/fall void;
  near rock occluder; three original large painting marks as registered
  pigment layers; erased-pigment mask; torch flame/light masks; golden
  cleft/opening layers. No rib shapes from `bg_belly`.
- **VALLEY:** sunset sky; far valley; middle rock shoulders; near ridge;
  warm/cool plane masks; cleft arrival mask; registered stroke/smoke bridge.
- **PAINTED PROPS:** Eraser turn/lunge/scorched/inert states; brush with
  catch and offer angles; broom; hat; torch; cup. Reuse existing proportions.
- **OLD WANDERER, painted poses:** seated obscured; begin/lean; silent
  open hand; look up; nod/cup flame; brush rest; paired hand raise/snap;
  lit reveal smile; offer toward camera; hands-on-knees rise; departing;
  seated loop match. Separate face/hand light masks and huge wrist-catch
  hand: approach, contact, grip, lift, release, with scarf sleeve.
- **BOY, new ink poses:** sleeping trace corrections if needed; Spark nose
  wake and open-palm friend; first-step weight shift; cliff reach/commit;
  brush catch/roll to surf if existing fall cannot join; cave wet landing;
  torch pickup/raise/plant; shelter ember; shadow notice; protect ember;
  slipping/reaching wrist, caught wrist, hanging/lift/recovery; steady blade
  and cleft leap; palm catch echo; brush/Spark dip; shared snap alignment;
  settle into older shadow. Draw needed contact in-betweens individually.
- **SHADOW, ink silhouettes:** matched walk/wave; delayed turn; red draw;
  duel wall contacts, lock and loss; final split. Reuse boy silhouettes
  where possible, but author wall projection and separation deliberately.
- **REUSE LIBRARY:** ink run/walk/moonwalk, look-back, sneak/statue, lean,
  rotoscope, fall/surf, stunned, saber/locks, broom/wink/catch, stroke ride,
  turnaround, fire kick/spin, fine/snap. Inventory anchors before requesting
  duplicates. Existing scenery is blocking reference, not final painted art.

## Build order

1. Lock a contact sheet: ink boy beside painted old man, meadow, cave and
   fire. Check that the family resemblance reads only when the face is lit.
2. Board every seam in phone and wide frames, including the two fire returns,
   the wrist catch and the loop. Establish brush continuity before new art.
3. Block the proposed beat map with existing ink poses and flat colour masses.
   Keep v12 timings intact as reference; add v13 holds for quiet beats.
4. Finish fire/dawn/ridge, then sea/cave, then valley/Home plates and poses.
   Review each world with its incoming and outgoing seam, not in isolation.
5. Build the silent-fire tap hold and contact hold; verify forward, reverse,
   chapter seek, reload and repeat taps cannot strand or duplicate the story.
6. Check 390×844 first, then 844×390, tablet, 1440×900 and ultrawide. Inspect
   contact frames and seam midpoints; touch targets must remain generous.
   Reduced motion keeps all information with calmer camera moves and flashes.
7. Review the complete website for pacing, art consistency, loading and frame
   cost. Give moments more time with holds. No code changes are part of this doc.

## Open questions for the owner

- Are “let me tell you.” and “go on?” the right two fire lines, alongside the
  agreed “and i am maxx.”? All story chapters stay wordless either way.
- Should the old wanderer keep his hat through the reveal, or lift it as the
  fire brightens? The shared hair details must be readable in either staging.
- What real email and contact links should the final ember card carry?

# Owner instructions, references and context

Everything Max (the owner) has told the agents working on this site, in one
place: the standing rules, every reference and website they gave, every
decision, and their messages word for word. The original written brief (goal,
the Mat Voyce reference, what "animation" means to them) is at the top of
`docs/BRIEF.md`; the decision log there has the history of rounds 1–15 in
more detail.

**Binding order:** the owner's latest message > this file > `docs/BRIEF.md`
> `docs/STORY.md` / `docs/HANDOFF.md`. The owner said they report to
themselves, not to the docs: *"you report to me and not the docs"*.

---

## 1. Standing rules (distilled from everything below)

- **Website only. Never a video format.** *"im only focused on website i
  dont want a video format afterwards or ever"*.
- **Animation is the product.** Proper, complete, neat animated sequences;
  crazy motion graphics; clean transitions. Projects are deliberately absent.
- **No on-screen text in the set pieces.** *"don't write any texts or
  anything just do the animations"*. (The title, the seal and the contact
  card are the only words.)
- **Show skills, not a story.** *"we are saying a story and not showing our
  skills. remember how we did it very well on the first time?"* The format
  that works: a showreel, each chapter a different craft at full strength,
  joined by a thread and seamless transitions.
- **Creative freedom, then report.** *"do it however you think would suit
  it. i give you the creative steering. you don't have to follow any docs…
  if you feel something will feel better just do it and report to me."*
- **But suggest new ideas before building them.** *"if you have more ideas
  do suggest me before creating"*. When the direction is genuinely unclear,
  offer 2–4 concrete options (they like `AskUserQuestion` with short
  descriptions).
- **The bar is the absolute best.** *"dedication and passion… clean
  transitions crazy animation crazy motion graphics… think out of the box"*;
  *"i want the absolute best"*; *"a clean and good looking but awesome one"*.
- **Use ChatGPT (Codex) hard.** *"harness it for even little poses… theres
  no usage limit so get the best outta it also you can let it handle some
  code jobs too"* (round 19): every pose is its own generated drawing; well
  specified code jobs (tracers, scripts) can be delegated to Codex, then
  reviewed.
- **Stay signed in to Codex/ChatGPT until the owner asks to log out**
  (*"dont log out till i ask"*, round 18).
- **No clusters of many small things.** *"i hate multiple small things
  together its yuck for me"* (round 17). No flocks, swarms, shard clouds or
  dense fields of tiny repeated pieces; one strong shape beats many small.
- **Fully responsive** (round 20): *"somehow it made it for mobile lol and not
  for pc or bigger screens i need whole of this to be working perfectly
  responsive so please do that cleanly and polish things"*.
- **Phone first.** The owner watches on an iPhone (390×844). Touch only;
  nothing may depend on hover. Screenshot every change at phone size before
  calling it done.
- **Previews:** publish the single-file build as a claude.ai artifact and
  share the link (*"you can create a new link to show artifact"*). Current:
  https://claude.ai/artifact/9d3GKN33rB1VSTR2jGoDnV
- **Git:** commit to the working branch and push; no PR unless asked; no
  model names in commits.
- **Originality:** references are for energy and technique; never copy their
  characters, logos or text.

## 2. References and websites the owner gave

| Reference | What it's for | Where it's used |
|---|---|---|
| **Mat Voyce** — https://matvoyce.tv/ | The original reference for ambition, motion and personality (see `docs/BRIEF.md`). Don't copy it. | The whole site's bar |
| **pdhouse motion guide** — https://pdhouse.notion.site/motion-guide | Motion principles to harness (round 16). This environment's network blocks Notion, so it couldn't be read; try again if access opens up. | Round 16 planning |
| **cth9191/animate** — https://github.com/cth9191/animate | Animation craft rules: shape-morph bridges, stepped boil, springs, contact-sheet review of every change. | The Reel's craft and review loop |
| **heygen-com/hyperframes** — https://github.com/heygen-com/hyperframes | Seam rules: one current direction, cut mid-motion, carriers across cuts, stillness before a climax. | Every seam in the Reel |
| **Fate/stay night: Heaven's Feel** — Saber Alter vs Berserker | Energy and palette (red/blue/purple/black) for the ALTER act (round 5). | ALTER (old film) |
| **Demon Slayer** — Giyu Tomioka, Water Breathing 11th form, *Dead Calm* | A moment the owner asked to include (round 6). | Dead Calm (old film) |
| **Jujutsu Kaisen** — Gojo Satoru's *Domain Expansion* | A moment the owner asked to include (round 6). | The Void (old film) |
| Anime key poses generated with ChatGPT from one character sheet | Round 11 lesson: code draws light, motion, particles and type; people come from real drawings. | Shooting star (old film) |

## 3. Decisions (most recent first)

**Round 20 — responsive:** merged `claude/sketch-v12` into the main line;
the film now fills any screen (no portrait column); a two-column ending on
wide screens; HUD scales up; the cinematic fire tornado ported into v12's
ending.

**Round 19 — The Sketch v12 (built on its own branch, `claude/sketch-v12`):**
- An ideation session pitched 16 quality ideas (a villain, an arc, the
  Spark's origin, a one-line birth, a 360° orbit, an inkwell/whale dive, a
  Great Wave, a 1930s rubber-hose beat, a pop-up page, red-circle match
  cuts, an eye push, ink-soak seams, idle life, scroll-speed motion, a
  perfect loop, a signature). The owner: *"oh damn i liked all of it…
  can you do it?"* — and asked to log in to ChatGPT first and use it for
  every pose and some code.
- Picked: build on a **separate branch** (another session was working on
  the main one), and the v12 story as pitched (whale included).
- Built: STORY v12 (eight chapters: Still, Run, Fold, Wave, Deep, Light,
  Chase, Home); ~25 new generated sheets; Codex wrote the one-line tracer.
  Preview: https://claude.ai/artifact/2e3qybKHWFwd824v6ZoD2u

**Round 18 — story first: The Sketch (built; extended in round 19):**
- *"a story is main point… lets actually align on one"* → picked **The
  Sketch That Wanted to Move + Chasing the Spark** (`docs/STORY.md` v11).
- Interactivity: optional, parked for later (*"should optional but leave it
  for now"*).
- Aesthetic reference (editorial cards: SWARM / MELT / PULSE): blend with
  the ink, **no words**, take the feeling and don't copy it.
- Rivals: **one cameo**.
- Character: the owner's own sheet, "The Wanderer" (chibi, dry-brush ink,
  icy-blue hair highlights, blue eyes, scarf, coat). Code-drawn versions
  were not good enough (*"dude i feel like you are overdoing this"*); poses
  are now generated with the Codex CLI on the owner's ChatGPT plan from that
  sheet (`scripts/gen-sketch.sh`, `scripts/cutout-sheet.py`).
- Then: *"be the orchestrator. use chatgpt for things that it does better
  than you and delegate it tasks… go on a creative spree… complete whole of
  it… im gonna go sleep so handle all of it yourself"* and *"dont be limited
  with what you planned… make it do crazy actions too"*. Built the whole
  story (six chapters) with ~20 generated pose sheets (comedy, acrobatics,
  falls, riding the crane, brush-sword fight, cord swing, superhero
  landing, power-up, close-ups, an after-credits peek) and three painted
  backgrounds; the effects module was delegated to Codex.

**Round 17 — trimming the Reel (current, built):**
- Cut **II Flock** (the murmuration) and the little painted birds on the
  scroll: many small things together are "yuck" for the owner, and the birds
  didn't match the aesthetic.
- Cut **IV Neon**: *"the neon city looks so bad with the buildings from my
  name"*.
- Cut **Shadow's cloud of paper shards** (*"the flock is in shadow as well
  please remove that as well"*). Shadow keeps the bulb and the shadow
  pictures, which now melt from one to the next.
- New seams: the scroll closes in to the square (Ink → Fold); the crane
  flies off into the dark and becomes the bulb (Fold → Shadow).
- The Reel is now **I Ink → II Fold → III Shadow → IV Impact → V Page**.
- Next: talk with the owner about what to add (*"then we talk what to
  add"*).

**Round 16 — the Reel (built; trimmed in round 17):**
- Fresh ideas using the three references → story-led pitches → rejected:
  *"we are saying a story and not showing our skills"*. Back to the first
  film's showreel format.
- Asked *"do you think this will hit and look beautiful?… i want the absolute
  best"* → plan tightened to "how did they do that" moments per chapter.
- Vertical slice (I Ink) approved: *"yup looks great. complete whole website
  then"*.
- **Machine and TITAN cut:** *"get the machine part taken out its very weird.
  even the titan. think of something else"*.
- Offered four replacements (Murmuration, Origami, Neon type city, Light &
  shadow) → *"all sounds good. do all of it"*.
- Built: **I Ink → II Flock → III Fold → IV Neon → V Shadow → VI Impact →
  VII Page** (see `docs/STORY.md` v9). Shadow became anamorphic shadow art
  instead of hand puppets (hand shadows were on the rejected list; code-drawn
  hands read as weird).
- Open: the contact card still shows `hello@example.com` — ask for the real
  address. Suggested, not built (needs the owner's yes): tap a circle on the
  Page to jump to that chapter; optional per-chapter sound (off by default).

**Rounds 6–15 (summarised; details in `docs/BRIEF.md`):**
- Round 6: remove the Arcade act; fix the Berserker (ALTER) act's broken,
  weird pieces and unclean transitions; add Giyu's Dead Calm and Gojo's
  Domain Expansion. Then: no texts, creative freedom, report back.
- Round 6b: Dead Calm and the Void approved (*"looks real good"*); asked for
  more and bigger ideas; then *"add all of them… make a story… crazy story"*
  because light saber + football + anime battle didn't make sense from the
  outside → STORY doc written (docs only, no code changes that round).
- Rounds 7–15: various rebuilds; see BRIEF for what was approved and
  rejected (including the "glass" effects, pick-a-side, the manifesto
  interlude, the hand-scroll interludes, the ink-blob beast, the Ink Dragon,
  the Night Ride, the hand-shadow bridge, the X-Ray blueprint — all out).

## 4. The owner's messages, word for word (this branch's sessions)

Typos kept as written.

**2026-10-04**

> what i want you to do is. see the claude handoff and brief md get to know
> the repo then remove the arcade act. thrn we need to change some animations
> in the berserker act which looks weird. some look nice but there are some
> broken pieces and the ones that doesnt have clean transitions so fix that.
> after that i need you to include thr giyu tomioka 11th form dead calm
> somewhere. and domain expansion of gojou satoru. so think aboit it and
> suggest me how we can do that

> i would say don't write any texts or anything just do the animations. do it
> however you think would suit it. i give you the creative steering. you
> don't have to follow any docs or anything. if you feel something will feel
> better just do it and report to me. you report to me and not the docs so
> yeah. what i want more is dedication and passion while you do it. clean
> transitions crazy animation crazy motion graphics. that's what I would
> adore. so i want you to think out of the box and do things. if you have
> more ideas do suggest me before creating

> you csn create a new link to show articfact

> looks real good. what are your other suggestions?

> i need more bigger new ideas from you

> okay add all of them. put all your ideas stitch them up and push it in a
> file. currently what we miss is a a proper story. so i want you to stitch
> them up tohether go beyond everything and make s story out of it. because
> when you look from outside everything it doesnt make sense at all. light
> saber football anike battlr. it should make a story up and crazt story is
> what i mean. you decide rhat and hand it off to the md file and push it you
> dont need to make any changes. you just need to update md file wirh all thr
> ideas you had from last 2 messages. all suggestions of yours. i loved thrm.
> put that and put the stitch thing and push it

**2026-10-09**

> leave all that check latest and i want tyo get more ideas now fresh ideasd
> regardflesds of what we hava already done. now i want a clean and good
> looking but awesome one. use these. https://pdhouse.notion.site/motion-guide
> https://github.com/cth9191/animate https://github.com/heygen-com/hyperframes
> and tell mw how you can harness the best out of it

> yeah but we are sayi9ng a story and not showinh our skills. remmebver how we
> did it very well on the first time?

> do you think this will hit and look beautiful? and does this rwally have the
> awesome motion graphics you are saying? because i want the absolut ebest

> go on then and uhm im only focused on website i dont want a video format
> afterwards or ever so you can only focus ion website

> yup looks greate. complete whole website then

> get the machine part taken out its very weird. even the titan. think of
> something else

*(Asked to pick chapter II from Murmuration / Origami / Neon type city /
Light & shadow; dismissed the picker and wrote:)*

> all sounds good. do all of it

> continue

> push it to branch with all instruictionas i gave and related references or
> websites or context i gave

> so i want you to go through the latest branch and the thing i didnt
> actually like is the birds personally i have that thing where i hate
> multiple small things together its yuck for me. so lets remove birds kr
> anything also it doesnt match aesthetic as well. also the neon city looks
> so bad with the buildings from my name. so yeah kets remove those thrn we
> talk what to add

> tye flock is in shadow as well please remove that ws well

*(Round 18, condensed: "flood me" with design ideas → "more interactive" →
"should optional but leave it for now" → an editorial reference image "this
is an example of aesthetic" → "lets take a step back… a story is main
point" → "1 with 3 sounds awesome" → character: "show me an example of how
cute round character would look like", then the Wanderer sheet "make him
look something like this… exactly like that", then "dude i feel like you
are overdoing this. do yoy need any connector" → "use codex cli in your
session. do use device code and i will login" → "be the orchestrator…
use chatgpt… complete whole of it… im gonna go sleep" → "dont be limiyed
with what you plannrd… make it do crazy actuons too".)*

**Round 19 (ideation session → build, condensed):** *"im gonna let thr
other session work and use this session for ideation so pitch me"* → 16
pitches → *"oh damn i liked all of it these arw such great qol. can you do
it? before making a plan and matching all of up i want you to do devide code
login for chatgpt and i want you to harness it for even little poses you can
harness it perfectly so do it. theres no usage limit so get tye best outta
it also you can let it handle some code jobs too. so yeah leys do it and do
great animations and transitions everything should hit."* → network opened
(*"done try now"*) → device-code login → chose "Separate branch" and "Yes,
build it".

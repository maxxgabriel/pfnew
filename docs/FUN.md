# FUN — the site (round 41)

Round 42 rebuilt the first two pages (*"come on man we need to maker it look crazy"*); 42b made the landing the jelly page; 42c cut the trailer (*"its a website and not a … annual function video"*) and, asked for *"spiderman miles morales like ideas"*, put in the comic-panel way in (technique only: none of their characters, logos or text). A rooftops run with the leap of faith was built in the trailer's slot and cut the same day: *"the whole scroll to story i dont need it anymorw"*. Then the dive went too (*"dive not needed as well"*): no pinned, scroll-driven set piece anywhere; the hero is one plain screen and the page scrolls on to the work. The owner wants a **major revamp** next, not additions.

The owner: *"i need a hell lot of animations shapes aniamtions letgters aniamtions a lot of fun in
website"*, matvoyce.tv as the bar, art that is hand-made, *"premium aesthetic elegant and polished"*,
with comic book / pop art, kinetic type, glitch, graffiti, offset print, frame stepping, speed lines
and smears, freeze frames, zoom punches, whip pans, smash cuts, ink reveals, paint splashes, paper
and grain, VHS noise, screen print, neo-noir grading, bloom, camera shake, RGB split, text popping on
the beat. **Entry:** `index.html` → `src/fun/main.ts` (the round 35–37 motion site is now
`motion.html`). Branch `claude/fun-site`.

## Running order

| # | Section | File | What happens |
|---|---|---|---|
| 0 | The way in | `panels.ts` | Comic panels slam onto the blank paper on the beat (his eyes, his fist opening into a snap, the red ball in the air, one letter far too close, the sun), Ben-Day dots, the plates out of register for a frame, BOING! and a burst in the gutters, the camera punching panel to panel. The last panel is a window onto the landing; it blows up to the whole screen and the plates snap into register. Then the ball bounces along GABRIEL into the dot and he drops onto the X. Any touch skips it. |
| 1 | The name is rubber | `hero.ts`, `jelly.ts` | Each line of the name is an elastic string glued to the paper: grab a letter and it comes with your finger, the letters behind it stretch wide and the ones ahead squash condensed (the font's width axis), let go and the line twangs; fling it and it bounces off the screen edges and throws him (he lands on whatever letter is under him). Tap the paper: a drawn ring runs out and kicks everything it passes; the stickers are loose weights on their own springs. Small life always on (width wave, tricks, his hops, the ball keeping time). The big stunts (`stunts.ts`: STRETCH, SLOT, PUNCH, SLICE, FLIP, DOMINO) fire only when poked: tap the ball, double-tap a letter. |
| 4 | Things that move | `work.ts` | Six live cards dealt in as they arrive, leaning to the pointer: SQUISH, GLITCH, INK (brush paints, splat blooms), POW! (halftone, burst, offset print on the beat), ON TWOS (run cycle on twos with onion skins; tap: ones/twos/fours), WHOOSH (smear, speed lines, smeared letters). Loops run only on screen. |
| 5 | What I do | `skills.ts` | Five huge words; the one nearest the middle is lit and moves its own way (walk on twos, wave, stretch, code scramble, off-register print); the ground tints per word; a sticker pops beside it. |
| 6 | About, a comic page | `comic.ts` | Butter yellow with red Ben-Day dots; four panels revealed through growing ink splats: MEET MAX. / HE DRAWS. / THEN HE MAKES IT MOVE. / YOUR IDEA COULD BE NEXT. Captions printed off-register, SFX popping, his drawings living (waving on threes, running on twos). |
| 7 | One boy. Seven styles. | `styles.ts` | His face in seven styles fanned like a hand of cards, each glitching in from its own dimension as the hand is dealt; turning every couple of seconds; tap one to pull it to the middle. |
| 8 | Say hi | `contact.ts` | Arrives through an ink splat; SAY + the drawn HI! bouncing on the beat; a striped pill with the address (tap: copied, COPIED! burst, paint splashes), him waving on it. |
| 9 | Footer | `foot.ts` | Night with a red glow; the spray can crosses and the graffiti MAX appears behind it; the rocket takes you back up. |
| — | Menu | `menu.ts` | Opens in a circle from the button, links rise with their stickers, MENU rolls to CLOSE. |

Shared: `kit.ts` (one 118 bpm beat, the header's dark mode (`darkHeader`), letter splitting, pop / zoom punch / shake / glitch flash,
loops only while visible), `fx.ts` (grain, cursor), `boil.ts` (line boil on every sticker),
`stickers.ts` (each sticker's life and tap trick), `boy.ts` (his drawings by the foot).

## Look

Paper `#fbf7ef`, ink `#151311`, red `#ff3d22`, butter `#ffd54a`, sky `#4fb6ff`, mint `#7fddb4`; each
section owns a colour (paper, red/black tape, teal-black noir, paper, tints, butter, sky, red, night).
**Fonts** (Google Fonts): Anybody (the name, variable width), Anton (titles; stands in for Druk
Condensed), Bangers (comic; stands in for Komika / Badaboom / CC Wild Words), Bebas Neue (labels),
Montserrat 900 (clean trailer; stands in for Gotham Ultra), Jost (eyebrows; stands in for Futura),
Inter (text). Gotham, Druk, Futura, CC Wild Words, Komika and Badaboom are licensed fonts: buy and
self-host them to swap in.

## The stickers (made with ChatGPT)

`scripts/gen-fun.sh` makes them through the Codex CLI on the owner's ChatGPT (one shared STYLE block:
crisp hand-inked 1930s rubber-hose props on a modern studio sticker sheet, flat magenta ground);
`node scripts/cutout-fun.mjs [names]` keys the magenta out (or keeps the alpha when an image came back
transparent) and writes `src/assets/fun/<name>.webp`. The global Codex config names a model a
ChatGPT login can't use, so the script passes `-m gpt-6-luna`. Raw PNGs stay in `art/raw/fun/`
(git-ignored).

spark, sun, sparkle, ink pot, boombox, bolt, glove, flipbook, brush, stopwatch, FRAME BY FRAME badge,
HI!, BOING!, envelope, megaphone, spray can, popcorn, VHS, rocket, bulb, ink splat, red and yellow
paint splashes, graffiti MAX, speech bubble, shout burst.

## Preview

No claude.ai artifacts (the owner asked, round 42, and deleted the earlier ones). Dev server:
`npx vite --port 5173 --strictPort`; on the iPhone, `npx vite --host --port 5173` and the LAN address
it prints. `ONLY=site npx vite build --outDir <folder>` builds the front page alone (~110 files).

## Still to give

The contact address is a placeholder (`hello@example.com`, in `index.html` twice) and the social
links point at the sites' home pages.

## Dev

```sh
npx vite --port 5199 --strictPort            # dev server; the site is /
npx tsc -p tsconfig.app.json --noEmit && npx oxlint src/fun
```
`window.__fun`: `ready` (fonts and drawings in), `go('#section')`, `gsap`, `hero.stunt(i)` (run a stunt now), `hero.ripple(x, y)`, `hero.jelly` (the rubber: `letters`, `grab/drag/release`), for checking.
Checked at 390×844 @2x, 1440×900, 844×390 and 2560×1080; 60 fps through every section on the dev
machine; prefers-reduced-motion calms the shake, flashes, boil and loops.

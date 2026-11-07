# FUN — the site (round 41)

Round 42 rebuilt the first two pages (*"come on man we need to maker it look crazy"*): a cold open, a loud name and the dive replace the calm hero and the crossing tapes.

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
| 0 | Cold open | `coldopen.ts` | Black, then the name one letter per hit, each a full-screen smash cut to its own colour and typeface (zoom punch, shake, RGB split; MAX on the beat, GABRIEL on the half beats), the typeface named small in the corner like a specimen. Drawn on one canvas. Any tap, key or scroll fast-forwards it. |
| 1 | The name, loud | `hero.ts`, `stunts.ts` | The whole name smashes onto the page frozen in misregistered print (halftone over it); a beat later it plays: plates snap into register, the red ball bounces along GABRIEL into the dot, he falls onto the X. Then on the first beat of every two bars a stunt: STRETCH past both edges, SLOT (every letter spins through five typefaces), PUNCH (camera punches in on him, impact frame, speed lines), SLICE (he snaps, the name tears into strips), FLIP (four colour smash cuts), DOMINO (letters topple and spring back). He jumps clear or rides along. Tricks, hops and the ball keeping time in between. |
| 2 | The dive | `dive.ts`, `deep.ts`, `lines.ts` | Pinned with the hero (one screen, ~4 screens of scroll). The camera flies into the A (it turns red) until red fills the screen, then falls through the tagline one giant word per world, each world the colour of the letter you fell into: I MAKE LETTERS (red; typeface swaps every beat), DANCE (ink; a chorus line), AND SHAPES (butter; letters turn into shapes), MISBEHAVE (sky; letters act up, then it glitches and switches off like an old TV into the trailer). He falls alongside; every landing slams with a shake, flash and speed lines. `deep.ts` finds the thickest ink in a letter so its colour covers the screen. Scroll back and it rewinds. |
| 3 | The trailer | `trailer.ts` | Pinned, played by the scroll, neo-noir (teal-black, one red light, letterbox, VHS lines, REC timecode, his silhouette rimmed in red): ONE ANIMATOR. (zoom punch) → SEVEN STYLES. (smash cut, his faces strobing a frame each) → ZERO STILL FRAMES. (glitch, RGB split) → a FREEZE FRAME (print, halftone, stamp) → EVERYTHING MOVES. (whip pan; punches + shake on the beat over speed lines) → NOW PLAYING (neon). |
| 4 | Things that move | `work.ts` | Six live cards dealt in as they arrive, leaning to the pointer: SQUISH, GLITCH, INK (brush paints, splat blooms), POW! (halftone, burst, offset print on the beat), ON TWOS (run cycle on twos with onion skins; tap: ones/twos/fours), WHOOSH (smear, speed lines, smeared letters). Loops run only on screen. |
| 5 | What I do | `skills.ts` | Five huge words; the one nearest the middle is lit and moves its own way (walk on twos, wave, stretch, code scramble, off-register print); the ground tints per word; a sticker pops beside it. |
| 6 | About, a comic page | `comic.ts` | Butter yellow with red Ben-Day dots; four panels revealed through growing ink splats: MEET MAX. / HE DRAWS. / THEN HE MAKES IT MOVE. / YOUR IDEA COULD BE NEXT. Captions printed off-register, SFX popping, his drawings living (waving on threes, running on twos). |
| 7 | One boy. Seven styles. | `styles.ts` | His face in seven styles fanned like a hand of cards, turning every couple of seconds; tap one to pull it to the middle. |
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
ChatGPT login can't use, so the script passes `-m gpt-6-sol`. Raw PNGs stay in `art/raw/fun/`
(git-ignored).

spark, sun, sparkle, ink pot, boombox, bolt, glove, flipbook, brush, stopwatch, FRAME BY FRAME badge,
HI!, BOING!, envelope, megaphone, spray can, popcorn, VHS, rocket, bulb, ink splat, red and yellow
paint splashes, graffiti MAX, speech bubble, shout burst.

## Preview

Private claude.ai preview (open it on a phone): https://claude.ai/artifact/EjLhsMsfWUAVhBTJ414Sc7 (round 42; the round 41 link was on a different Claude account)
To refresh it: `ONLY=site npx vite build --outDir <folder>` (front page only, ~110 files), then
publish the built page's head and body content with its `assets/`, `favicon.svg` and `og-site.jpg`
to the same artifact.

## Still to give

The contact address is a placeholder (`hello@example.com`, in `index.html` twice) and the social
links point at the sites' home pages.

## Dev

```sh
npx vite --port 5199 --strictPort            # dev server; the site is /
npx tsc -p tsconfig.app.json --noEmit && npx oxlint src/fun
```
`window.__fun`: `ready` (fonts and drawings in), `go('#section')` (`#dive` goes to the first word), `gsap`, `hero.stunt(i)` (run a stunt now, for checking).
Checked at 390×844 @2x, 1440×900, 844×390 and 2560×1080; 60 fps through every section on the dev
machine; prefers-reduced-motion calms the shake, flashes, boil and loops.

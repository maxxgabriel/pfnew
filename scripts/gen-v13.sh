#!/bin/bash
# Round 24 art: the style-shift run, the ink cat, the wink, the rotoscope beat, the blade lock.
#   scripts/gen-v13.sh [only-name]   → art/raw/<name>.png (from art/raw/ref_wanderer.png)
cd "$(dirname "$0")/../art/raw" || exit 1
ONLY=$1
CHAR="The attached image is the character sheet for an ORIGINAL character, 'the Wanderer'. Draw the SAME character, identical design: chibi proportions (big round head), messy black hair with icy pale-blue highlights and one antenna strand on top, blue eyes, black scarf with frayed ends, long black coat, slim legs, small boots."
INK="Art style identical to the sheet: rough dry-brush black ink on paper."
BG="Background: flat solid pure magenta #FF00FF everywhere that is not the drawing; no ground, no shadow, no text, no labels, no red dot, no speed lines, no other objects unless asked. Each figure the same size, evenly spaced in one horizontal row, not overlapping. Landscape 3:2 (1536x1024)."
RUN6="Draw a smooth RUN CYCLE of SIX frames, running fast to the RIGHT, side view, leaning forward, arms pumping, hair and scarf streaming back: contact, down, push-off, flight, contact (other foot), flight."
gen() { # name, prompt, [ref]
  [ -n "$ONLY" ] && [ "$ONLY" != "$1" ] && return
  [ -f "$1.png" ] && return
  echo "== $1"
  timeout 900 codex exec --skip-git-repo-check -s workspace-write --color never --image=ref_wanderer.png \
    "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $1.png. $2 $BG" > "$1.log" 2>&1 < /dev/null
  [ -f "$1.png" ] && echo "   ok" || echo "   FAILED (see $1.log)"
}
# the style-shift run: the same run cycle, five different art styles
gen style_pixel "$CHAR Render him as crisp 32-bit PIXEL ART (chunky visible square pixels, limited palette, hard pixel outlines, no anti-aliasing). $RUN6"
gen style_water "$CHAR Render him as a soft loose WATERCOLOUR painting (wet bleeding edges, translucent washes of indigo, black and pale blue, paper texture). $RUN6"
gen style_clay "$CHAR Render him as a CLAYMATION figure (sculpted plasticine with thumbprints, soft studio lighting, slightly lumpy shapes, like stop-motion). $RUN6"
gen style_chalk "$CHAR Render him ONLY as a WHITE CHALK LINE DRAWING, as if sketched in chalk on a blackboard: the whole figure made of rough dusty WHITE and pale-blue chalk OUTLINES and scribbled hatching, NO black ink, NO solid black fills, NO colour other than white and pale blue chalk; grainy broken chalky strokes. $RUN6"
gen style_comic "$CHAR Render him in a bold retro POP-ART COMIC style: very thick clean black outlines, FLAT saturated colours (a DEEP ROYAL-BLUE coat, a bright YELLOW scarf, red boots, black hair with cyan highlights), BEN-DAY HALFTONE DOTS shading on the coat and skin, hard cel shadows, like a vintage comic print. $RUN6"
# the ink cat: a small original rival who steals the Spark
gen cat_run "$INK Draw an ORIGINAL small mischievous black INK CAT drawn in the same rough dry-brush ink as the sheet, chibi and cute: a round body, big pointed ears, a long curly tail, bright blue eyes, a sly grin. Draw a smooth RUN CYCLE of SIX frames of the cat bounding to the RIGHT, side view, tail streaming back."
gen cat_pose "$INK Draw the same ORIGINAL small black ink cat (round body, big pointed ears, long curly tail, blue eyes, sly grin) in FIVE separate poses, all facing RIGHT unless said: (1) sitting upright, tail curled round its paws, smug; (2) a big pounce, leaping forward with front paws reaching out; (3) running with a small round object held in its mouth (draw the object as a plain pure red #FF0000 disc); (4) looking back over its shoulder with a cheeky tongue-out grin; (5) curled up asleep in a ball, tail over its nose, peaceful."
# the wink at the camera, on the broom
gen broom_wink "$CHAR $INK He wears a tall pointed black wizard hat and rides a wooden broomstick. Draw THREE frames, flying RIGHT on the broom: (1) turning his head to look straight out at the viewer, surprised to be seen; (2) a big WINK at the viewer with a confident grin and a two-finger salute; (3) facing forward again, crouched low, tilting the broom down into a dive."
# the rotoscope beat: a fluid aerial with many in-betweens
gen roto "$CHAR $INK Draw an EIGHT-frame, very smooth, realistic-motion sequence of a BUTTERFLY TWIST (a martial-arts aerial: the body nearly horizontal, spinning one full turn in the air, legs scissoring wide), moving to the RIGHT, evenly spaced in one row, the same size, every frame a small even step of the motion like a rotoscoped film reference: take-off, rising, horizontal, spinning, spinning, horizontal, landing, standing."
# the blade lock, seen from four sides as the camera orbits (blade as flat cyan, measured in code)
gen saberlock "$CHAR $INK He holds a light-blade sword in a BLADE LOCK, pushing hard against an unseen opponent to the right, both hands on the silver hilt, the blade drawn as ONE flat solid pure cyan #00FFFF straight bar angled up and to the right. Draw FOUR views of the SAME frozen moment as a camera orbits round him: (1) side view facing right; (2) three-quarter front view; (3) front view facing the viewer, blade crossing in front; (4) three-quarter back view, seen from behind."
echo "== all done"

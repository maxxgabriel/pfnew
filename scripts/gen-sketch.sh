#!/bin/bash
# Generate the Sketch's pose sheets with the Codex CLI (see .claude/skills/codex-images).
#   scripts/gen-sketch.sh [only-name]      → art/raw/<name>.png, from art/raw/ref_wanderer.png
cd "$(dirname "$0")/../art/raw" || exit 1
ONLY=$1
CHAR="The attached image is the character sheet for an ORIGINAL character, 'the Wanderer'. Draw the SAME character, identical design and identical art style: rough dry-brush black ink on paper, chibi proportions (big round head), messy black hair with icy pale-blue highlights and one antenna strand on top, blue eyes, black scarf with frayed ends, long black coat, slim legs, small boots."
BG="Background: flat solid pure magenta #FF00FF everywhere that is not the character; no ground shadow, no ground line, no text, no labels, no red dot or spark, no other objects unless asked. Each figure the same size, evenly spaced in one horizontal row, not overlapping. Landscape 3:2 (1536x1024)."
gen() { # name, prompt
  [ -n "$ONLY" ] && [ "$ONLY" != "$1" ] && return
  [ -f "$1.png" ] && return
  echo "== $1"
  timeout 900 codex exec --skip-git-repo-check -s workspace-write --color never --image=ref_wanderer.png \
    "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $1.png. $CHAR $2 $BG" > "$1.log" 2>&1
  [ -f "$1.png" ] && echo "   ok" || echo "   FAILED (see $1.log)"
}
gen run "Draw a RUN CYCLE: six frames of the character running fast to the right, side view facing right, leaning forward, arms pumping, big strides with one frame where both feet are off the ground, hair and scarf streaming straight back."
gen still "Draw FOUR separate key poses: (1) standing perfectly stiff and frozen like a drawing, arms at sides, facing three-quarter right, neutral face; (2) straining with all its might to move, eyes squeezed shut, fists clenched, leaning forward, a drop of sweat; (3) surprised, both hands up, mouth open, looking up and to the right; (4) gripping and lifting the corner of an invisible page with both hands, pulling hard, facing right."
gen leap "Draw a LEAP in FOUR frames, facing right: (1) deep crouch, anticipation, looking up and to the right; (2) explosive take-off, body stretched up at an angle, one arm thrust up; (3) at the top of the jump, fully stretched, open hand reaching high up to the right, scarf flying; (4) the hand closed into a fist up high, catching something, a huge happy grin, legs tucked."
gen home "Draw FOUR frames: (1) landing from a jump in a low crouch, facing right; (2) standing up proud and happy, facing three-quarter right; (3) turned to face the viewer directly, front view, smiling warmly; (4) front view, holding a traditional calligraphy brush out toward the viewer with one hand, offering it, the other hand relaxed. The brush has a bamboo handle and a black ink tip."
gen dash "Draw FOUR dynamic anime action poses, facing right: (1) a low ready stance, weight back, determined serious face; (2) an extreme forward dash, body almost horizontal, one arm trailing, hair and scarf whipping back; (3) a spinning mid-air flip, body curled; (4) a skidding stop on one knee, one hand on the ground, looking forward intensely."
gen bye "Draw FOUR frames: (1) front view, waving goodbye with one raised hand, smiling with eyes closed happily; (2) three-quarter view turning away to the right, still waving; (3) seen from behind, walking away, scarf trailing; (4) from behind, smaller step, one hand raised over the shoulder in a last wave."
echo "== all done"

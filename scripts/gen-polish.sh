#!/bin/bash
# The polish pack's art (round 26): in-between drawings and foreground layers for parallax.
#   scripts/gen-polish.sh [only-name ...]   → art/raw/<name>.png   (JOBS at once, default 4)
cd "$(dirname "$0")/../art/raw" || exit 1
JOBS=${JOBS:-4}
ONLY=" $* "
STYLE="identical design and identical art style to the attached drawings: rough dry-brush black ink on paper, chibi proportions (big round head), messy black hair with icy pale-blue highlights and one antenna strand on top, blue eyes, black scarf with frayed ends, long black coat, slim legs, small boots"
BG="Background: flat solid pure magenta #FF00FF everywhere that is not the character; no ground shadow, no ground line, no text, no labels, no spark, no motion lines. The figures the same size as in the attached drawings, side by side in one row, not overlapping, feet on the same level. Landscape 3:2 (1536x1024)."
want() { [ "$ONLY" = "  " ] || [[ "$ONLY" == *" $1 "* ]]; }
go() { # name, prompt, images...
  local name=$1 prompt=$2; shift 2
  want "$name" || return; [ -f "$name.png" ] && return
  while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do sleep 2; done
  local imgs=(); for i in "$@"; do imgs+=("--image=$i"); done
  ( echo "== $name"
    timeout 1200 codex exec --skip-git-repo-check -s workspace-write --color never "${imgs[@]}" \
      "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $name.png. $prompt" > "$name.log" 2>&1 < /dev/null
    [ -f "$name.png" ] && echo "   ok $name" || echo "   FAILED $name" ) &
}
ib() { # name, from, to, what happens
  go "$1" "The first attached image is key pose A, the second is key pose B of the SAME original character (the Wanderer). Draw the TWO IN-BETWEEN animation drawings that go between A and B, like a hand-drawn animator's in-betweens: drawing 1 is one third of the way from A to B, drawing 2 is two thirds of the way. $4 Keep the character's size, proportions, facing and position over its feet consistent with A and B, $STYLE. Draw ONLY the two in-betweens (not A or B). $BG" "key_$2.png" "key_$3.png"
}
ib ib_wake still_0 curious "He comes alive: from standing stiffly, his head turns and tilts toward something up to the right, eyes widening, shoulders rising a little."
ib ib_rise hero_0 home_1 "He rises from a superhero landing (one knee and one fist down) to standing tall: the knee lifts, the fist leaves the ground, the back straightens."
ib ib_stand firetornado_7 home_1 "He stands up from a low landing crouch with one hand on the ground to standing proud: the hand leaves the ground, legs straighten."
ib ib_turn home_1 home_2 "He turns from facing three-quarter right to facing the viewer straight on: the body and head rotate toward us, the scarf swings."
ib ib_offer home_2 home_3 "Facing the viewer, he lifts a calligraphy brush (bamboo handle, black tip) from his side and holds it out toward us: the arm rises and extends."
LAYER="Match the art style of the attached painting exactly: rough dry-brush black ink and ink wash, same palette, same light. Paint ONLY the requested foreground layer; everything else is flat solid pure magenta #FF00FF (no gradients into the magenta, crisp edges against it). No character, no text, no spark. Portrait 2:3 (1024x1536)."
go fg_sunset "The attached image is a background painting. $LAYER The layer: a band of large dark dry-brush ink clouds drifting across the LOWER third, nearer to the viewer than the painting's clouds, bigger and darker, catching a little orange light on their tops; the top two thirds empty magenta." bg_sunset_ref.png
go fg_inksea "The attached image is a background painting. $LAYER The layer: one big dark ink swell rolling across the very BOTTOM fifth of the image, close to the viewer, with a crest of white dry-brush foam along its top edge; everything above it empty magenta." bg_inksea_ref.png
go fg_belly "The attached image is a background painting of the inside of a whale. $LAYER The layer: two huge dark curved ribs very close to the viewer, one rising up the LEFT edge and one up the RIGHT edge, arching inward at the top, framing the middle; the whole middle empty magenta." bg_belly_ref.png
wait
echo "== all done"

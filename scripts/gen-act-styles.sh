#!/bin/bash
# Round 27: every act in its own art style. For each sheet in scripts/style-sheets.json, Codex redraws
# the reference strip (art/raw/strips/<name>.png: the exact ink drawings, in order) in the act's style.
#   scripts/gen-act-styles.sh [only-name ...]   → art/raw/<name>.png
cd "$(dirname "$0")/../art/raw" || exit 1
JOBS=${JOBS:-6}
ONLY=" $* "
SPEC=../../scripts/style-sheets.json
want() { [ "$ONLY" = "  " ] || [[ "$ONLY" == *" $1 "* ]]; }
BG="Background: flat solid pure magenta #FF00FF everywhere that is not the character; no ground, no ground shadow, no text, no labels, no spark, no motion lines. Keep each figure in the SAME place and at the SAME size as in the third image, one row, not overlapping, feet on one level. Landscape 3:2 (1536x1024)."
run() { # name, prompt, images...
  local name=$1 prompt=$2; shift 2
  want "$name" || return; [ -f "$name.png" ] && return
  while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do sleep 2; done
  local imgs=(); for i in "$@"; do imgs+=("--image=$i"); done
  ( echo "== $name"
    timeout 1500 codex exec --skip-git-repo-check -s workspace-write --color never "${imgs[@]}" \
      "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $name.png. $prompt $BG" > "$name.log" 2>&1 < /dev/null
    [ -f "$name.png" ] && echo "   ok $name" || echo "   FAILED $name" ) &
}
while IFS=$'\t' read -r name style n blade; do
  ref=$(python3 -c "import json;print(json.load(open('$SPEC'))['styles']['$style']['ref'])")
  desc=$(python3 -c "import json;print(json.load(open('$SPEC'))['styles']['$style']['desc'])")
  B="If a figure holds only a sword HILT (a short silver cylinder), keep just the hilt in his hands: no blade."; [ "$blade" = "1" ] && B="Where a figure holds a sword, keep its blade as ONE long straight flat pure cyan #00FFFF bar exactly where the cyan bar is in the third image (no glow, constant width, not restyled)."
  CYC=""; case "$name" in *_walk|*_run) CYC="This is a WALK/RUN CYCLE: every frame is the SAME action (walking or running to the right, side view) at a different moment of the stride. Copy each frame's leg and arm positions exactly; do not invent any other pose (no waving, no sitting, no facing the viewer).";; esac
  run "$name" "$CYC The first attached image is the character sheet of an ORIGINAL character, the Wanderer (chibi, messy black hair with icy pale-blue highlights and an antenna strand, blue eyes, frayed scarf, long coat, boots). The second attached image shows him drawn in a particular art style. The third attached image shows $n drawings of him in his usual ink style. Redraw EACH of those $n drawings, in the same order, the same pose, the same facing and the same proportions, as $desc — matching the second image's style exactly. $B" ref_wanderer.png "$ref" "strips/$name.png"
done < <(python3 -c "
import json; s=json.load(open('$SPEC'))
for sh in s['sheets']: print(sh['name'], sh['style'], len(sh['keys']), 1 if sh.get('blade') else 0, sep='\t')")
# the last screen: the same standing pose in every style, one per frame
f=final_styles
want $f && [ ! -f $f.png ] && run $f "The first attached image is the character sheet of an ORIGINAL character, the Wanderer. The second attached image shows him standing, facing the viewer, holding a calligraphy brush out toward us. The next six attached images show him in six art styles. Draw SIX frames of that SAME standing pose, side by side, once in each style in this order: (1) crisp 32-bit pixel art; (2) soft watercolour; (3) claymation; (4) white chalk line drawing (white and pale-blue chalk lines only); (5) pop-art comic with royal-blue coat, yellow scarf, red boots, halftone dots; (6) 1930s black-and-white rubber-hose cartoon with white gloves and pie-cut eyes. Every frame the same size, feet on one level." ref_wanderer.png strips/final_styles.png ref_style_pixel.png ref_style_water.png ref_style_clay.png ref_style_chalk.png ref_style_comic.png ref_rubberhose.png
wait
echo "== all done"

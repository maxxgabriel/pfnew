#!/bin/bash
# Round 27: the other art styles in every chapter. Each sheet redraws one action sheet in one style.
#   scripts/gen-styles.sh [only-name ...]   → art/raw/<name>.png
cd "$(dirname "$0")/../art/raw" || exit 1
JOBS=${JOBS:-4}
ONLY=" $* "
BG="Background: flat solid pure magenta #FF00FF everywhere that is not the character; no ground, no ground shadow, no text, no labels, no spark, no motion lines. Every figure the same size, evenly spaced in one horizontal row, not overlapping. Landscape 3:2 (1536x1024)."
want() { [ "$ONLY" = "  " ] || [[ "$ONLY" == *" $1 "* ]]; }
go() { # name, prompt, images...
  local name=$1 prompt=$2; shift 2
  want "$name" || return; [ -f "$name.png" ] && return
  while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do sleep 2; done
  local imgs=(); for i in "$@"; do imgs+=("--image=$i"); done
  ( echo "== $name"
    timeout 1200 codex exec --skip-git-repo-check -s workspace-write --color never "${imgs[@]}" \
      "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $name.png. $prompt $BG" > "$name.log" 2>&1 < /dev/null
    [ -f "$name.png" ] && echo "   ok $name" || echo "   FAILED $name" ) &
}
WHO="The first attached image is the character sheet of an ORIGINAL character, the Wanderer (chibi, messy black hair with icy pale-blue highlights and an antenna strand, blue eyes, frayed scarf, long coat, boots). The second attached image shows him in a particular ART STYLE. The third attached image shows the POSES to draw (in his usual ink style)."
go sty_ride_clay "$WHO Redraw the FIRST THREE poses of the third image (riding on the back of something flying, facing right: crouched low gripping in front; kneeling up with one fist raised shouting with joy; standing surfing with arms out wide) exactly in the CLAYMATION style of the second image: sculpted plasticine with thumbprints, soft studio lighting, lumpy stop-motion shapes. Draw ONLY him, not what he rides." ref_wanderer.png ref_style_clay.png ref_ride.png
go sty_surf_water "$WHO Redraw THREE of the poses of the third image (surfing on a big calligraphy brush used as a surfboard, facing right: crouched carving a turn; standing tall arms spread; crouched low reaching up) exactly in the soft loose WATERCOLOUR style of the second image: wet bleeding edges, translucent washes of indigo, black and pale blue. Keep the brush under his feet, also in watercolour." ref_wanderer.png ref_style_water.png ref_surf.png
go sty_swim_chalk "$WHO Redraw THREE of the poses of the third image (swimming underwater with hair and scarf floating: a strong breaststroke forward to the right; kicking downward diving head first; floating still looking up in awe) exactly in the WHITE CHALK LINE DRAWING style of the second image: rough dusty white and pale-blue chalk outlines and scribbled hatching only, no black ink, no solid fills." ref_wanderer.png ref_style_chalk.png ref_swim.png
go sty_saber_comic "$WHO Redraw FOUR of the poses of the third image (fighting with a light-blade sword, facing right: a big overhead downward strike; a wide horizontal swing; blocking with the blade diagonal across the body; a spinning leap) exactly in the bold retro POP-ART COMIC style of the second image: thick black outlines, flat saturated colours (deep royal-blue coat, bright yellow scarf, red boots), Ben-Day halftone dots. Draw the light-blade as a long straight WHITE bar with a thick electric-BLUE comic outline." ref_wanderer.png ref_style_comic.png ref_saber.png
go sty_broom_pixel "$WHO Redraw FOUR of the poses of the third image (flying on a wooden broomstick wearing a tall pointed black wizard hat, facing right: flying fast and level crouched along the handle; banking hard into a turn; a steep dive; upside down at the top of a loop) exactly in the crisp 32-bit PIXEL ART style of the second image: chunky visible square pixels, limited palette, hard pixel outlines, no anti-aliasing. Include the broom and the hat, also in pixels." ref_wanderer.png ref_style_pixel.png ref_broom.png
go sty_bye "The first attached image is the character sheet of an ORIGINAL character, the Wanderer. The second attached image shows him waving goodbye (first pose). The next five attached images show him in five ART STYLES. Draw FIVE frames of the SAME pose — front view, waving goodbye with one raised hand, smiling with eyes closed — once in each style, in this order: (1) crisp 32-bit PIXEL ART with chunky square pixels; (2) soft WATERCOLOUR with bleeding indigo washes; (3) CLAYMATION plasticine; (4) WHITE CHALK line drawing (white and pale-blue chalk lines only, no black fills); (5) POP-ART COMIC with thick outlines, royal-blue coat, yellow scarf, red boots and halftone dots." ref_wanderer.png ref_bye.png ref_style_pixel.png ref_style_water.png ref_style_clay.png ref_style_chalk.png ref_style_comic.png
wait
echo "== all done"

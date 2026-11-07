#!/bin/bash
# The seven universes: the hero's cast of stickers redrawn in each medium, with the Codex CLI
# (see .claude/skills/codex-images).   scripts/gen-uni.sh <pixel|comic|water|clay|chalk|hose> [only-name]
#   → art/raw/uni/<universe>/<name>.png (flat magenta, cut out by: SRC=art/raw/uni/<u> OUT=src/assets/uni/<u> node scripts/cutout-fun.mjs)
# Same subjects as scripts/gen-fun.sh (the ink universe), so the worlds match piece for piece.
U=$1; ONLY=$2
cd "$(dirname "$0")/../art/raw" && mkdir -p "uni/$U" && cd "uni/$U" || exit 1
case $U in
  pixel) STYLE="Style: crisp 16-bit pixel art, like a sprite from a 1994 arcade game: drawn on a 48 by 48 pixel grid and scaled up with hard square pixels, no anti-aliasing, no gradients, no blur, every edge a clean staircase of pixels, a one-pixel dark outline around the subject. Limited palette: signal red #FF3D22, butter yellow #FFD54A, sky blue #4FB6FF, pale sky #CDEBFF, mint #7FDDB4, cream #FFF7E8, ink #151311, plus one darker shade of each for simple pixel shading and one light pixel highlight. Bold readable silhouette, chunky and charming." ;;
  comic) STYLE="Style: a 1960s pop-art comic book print: thick black brush-ink outlines, flat saturated fills in signal red #FF3D22, butter yellow #FFD54A, sky blue #4FB6FF, cream #FFF7E8 and ink black #151311, visible Ben-Day halftone dots inside the shadows and in one tint area, the colour fills printed very slightly out of register from the black line so a hair of colour peeks past the ink, cheap newsprint screen-print texture inside the fills. No gradients, no airbrush." ;;
  water) STYLE="Style: a loose, confident watercolour painting on rough cold-pressed paper: wet-in-wet pigment blooms, soft bleeding edges, granulation, a faint pencil underdrawing showing through, a few crisp dry-brush accents, white paper left as highlights, no black outline, no digital smoothness. Palette: vermilion, warm yellow ochre, cerulean, a soft mint, indigo for the darks, the paper's cream. Even if the subject description names flat colours or black outlines, render it as this watercolour." ;;
  clay) STYLE="Style: a stop-motion claymation prop: hand-sculpted plasticine with visible thumbprints, tool marks and slightly lumpy, rounded, chunky forms; soft even studio lighting with gentle shading on the object itself and no cast shadow on the ground; a matte clay surface; colours in signal red, butter yellow, sky blue, mint, cream and near-black clay. Charming and a little imperfect, like a frame from a stop-motion film. Even if the subject description names outlines or flat fills, render it as sculpted clay." ;;
  chalk) STYLE="Style: a chalk drawing: hand-drawn in white chalk with a few strokes of pale blue, pale yellow and salmon-pink chalk, dusty grainy strokes, scribbled hatching for shading, smudged in places, line art with little or no solid fill, and nothing black (the dark board is not part of the drawing). Even if the subject description names colours or black outlines, draw it as chalk lines." ;;
  hose) STYLE="Style: a 1930s black-and-white rubber-hose cartoon, like an early sound-era animated short: bulbous rounded forms, noodle-like curves, pie-cut eyes and white gloves wherever a face or hands appear, thick confident black ink outlines, fills in white, black and two flat greys only, no colour at all, a little film grain, bouncy and cheerful. Even if the subject description names colours, render it in black, white and grey." ;;
  *) echo "which universe?"; exit 1 ;;
esac
STYLE="$STYLE One subject, centred, filling about 75 percent of a square frame."
BG="Background: perfectly flat solid magenta #FF00FF; every pixel that is not the subject is exactly #FF00FF. No cast shadow, no glow, no white sticker border, no frame, no logos, no existing characters, no text unless asked. Square 1:1 (1024x1024)."
gen() { # name, prompt
  [ -n "$ONLY" ] && [ "$ONLY" != "$1" ] && return
  [ -f "$1.png" ] && return
  echo "== $U/$1"
  timeout 900 codex exec -m gpt-6-luna -c model_reasoning_effort=low --skip-git-repo-check -s workspace-write --color never \
    "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $1.png. $STYLE The subject: $2 $BG" > "$1.log" 2>&1
  [ -f "$1.png" ] && echo "   ok $U/$1" || echo "   FAILED $U/$1 (see $1.log)"
}
run() { gen "$@" & while [ "$(jobs -rp | wc -l)" -ge 3 ]; do sleep 2; done; }

run sun "a cheerful cartoon sun: a round face ringed with short wavy rays, wearing dark sunglasses with shine marks, grinning wide with confidence."
run sparkle "one big four-pointed sparkle star with gently concave curved sides, a shine mark near its centre, and two much smaller sparkles tucked beside it."
run inkpot "a squat ink bottle full of black ink, a label with a zigzag band, and a big cheerful splash of ink leaping out of its mouth like a crown, with only three or four big round drops frozen in the air."
run boombox "a small retro boombox: two big round speakers with cones bulging outward as if pumping a beat, a cassette window with a tape in the middle, a carry handle on top, short sound lines on both sides."
run bolt "a chunky zig-zag lightning bolt with an inner stripe and a shine mark, slightly tilted, with two short crackle lines beside it."
run spark "a round rubber ball mid-bounce, slightly squashed wider than tall, with a big shine mark at its top left and a small one beside it, and three short speed lines trailing off its left side."
run glove "a classic cartoon glove hand with three stitch lines on its back and a puffy rolled cuff, pointing one finger straight down, with three short motion lines around the fingertip."
wait

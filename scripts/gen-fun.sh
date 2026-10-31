#!/bin/bash
# Generate the fun site's hand-drawn stickers with the Codex CLI (see .claude/skills/codex-images).
#   scripts/gen-fun.sh [only-name]      → art/raw/fun/<name>.png (flat magenta, cut out by scripts/cutout-fun.mjs)
# Three at a time. The global Codex config names a model a ChatGPT login can't use, so the model is set here.
cd "$(dirname "$0")/../art/raw" && mkdir -p fun && cd fun || exit 1
ONLY=$1
STYLE="Style: a crisp hand-inked cartoon sticker, like a prop from a 1930s rubber-hose cartoon redrawn for a modern indie animation studio's sticker sheet. Thick confident black outline around every shape, drawn with a brush pen: slightly uneven, swelling on curves and thinning at the ends, alive, never mechanical. Flat bold colour fills only (no gradients, no airbrush, no soft shading, no 3D render, no paper texture), using only this palette: signal red #FF3D22, butter yellow #FFD54A, sky blue #4FB6FF, pale sky #CDEBFF, mint #7FDDB4, cream #FFF7E8, ink black #151311. The charm is in small graphic details drawn in black or cream: shine marks, stripes, zigzags, dots, little motion lines. Bold and simple, readable even when small. One subject, centred, filling about 75 percent of a square frame."
BG="Background: perfectly flat solid magenta #FF00FF; every pixel that is not the subject is exactly #FF00FF. No cast shadow, no glow, no white sticker border, no frame, no logos, no existing characters, no text unless asked. Square 1:1 (1024x1024)."
gen() { # name, prompt
  [ -n "$ONLY" ] && [ "$ONLY" != "$1" ] && return
  [ -f "$1.png" ] && return
  echo "== $1"
  timeout 900 codex exec -m gpt-6-sol -c model_reasoning_effort=low --skip-git-repo-check -s workspace-write --color never \
    "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $1.png. $STYLE The subject: $2 $BG" > "$1.log" 2>&1
  [ -f "$1.png" ] && echo "   ok $1" || echo "   FAILED $1 (see $1.log)"
}
run() { gen "$@" & while [ "$(jobs -rp | wc -l)" -ge 3 ]; do sleep 2; done; }

run spark "a round red rubber ball mid-bounce, slightly squashed wider than tall, with a big cream shine mark at its top left and a small one beside it, and three short black speed lines trailing off its left side."
run flipbook "an animator's flipbook seen at a three-quarter angle: a chunky cream paper block with a red binder clip at the top; its pages fan open in a curl as if a thumb is flicking them, and on the visible pages a small black ball is drawn mid-bounce in three positions with tiny motion arcs; a few cartoon motion lines around the fanning pages."
run inkpot "a squat glass ink bottle full of black ink, a cream label with a black zigzag band, and a big cheerful splash of black ink leaping out of its mouth like a crown, with only three or four big round drops frozen in the air."
run brush "a fat calligraphy brush with a red bamboo handle striped in cream, black bristles loaded with red paint, sweeping diagonally and leaving one bold juicy red paint stroke behind it that curls up like a wave."
run stopwatch "a chunky retro stopwatch: red case, cream face with bold black tick marks and a single black hand, a big yellow crown button on top, short cartoon motion lines on each side as if it is ringing and hopping."
run boombox "a small retro boombox: sky blue body, two big round speakers with black cones and cream centres bulging outward as if pumping a beat, a cassette window with a red tape in the middle, a cream carry handle on top, short black sound lines on both sides."
run sparkle "one big four-pointed sparkle star, butter yellow, with gently concave curved sides, a cream shine mark near its centre, and two much smaller sparkles tucked beside it."
run glove "a classic cartoon glove hand in cream white with three black stitch lines on its back and a puffy rolled cuff, pointing one finger straight down, with three short black motion lines around the fingertip."
run badge "a round scalloped badge like a bottle-cap seal, red, with a cream inner circle; hand-lettered black capital letters reading FRAME BY FRAME run around the inner ring, and a small yellow four-point star sits in the middle. The lettering must be spelled exactly: FRAME BY FRAME."
run hi "the word HI! as chunky 3D block letters seen slightly from below: cream letter faces, the extruded sides in red and sky blue, thick black outlines on every edge, bouncy and a little tilted as if they just landed, the exclamation mark leaning. Spell it exactly: HI!"
run boing "the word BOING! in chunky 3D block letters set on a bouncy wave so every letter sits at a different height: butter yellow letter faces, red extruded sides, thick black outlines, and a black coil spring under the B. Spell it exactly: BOING!"
run bolt "a chunky zig-zag lightning bolt, butter yellow with a red inner stripe and a cream shine mark, slightly tilted, with two short black crackle lines beside it."
run sun "a cheerful cartoon sun: a round butter-yellow face ringed with short wavy red rays, wearing black sunglasses with cream shine marks, grinning wide with confidence."
wait

#!/bin/bash
# The ink-slinger cameo (round 21): an ORIGINAL hero, an homage in energy only.
#   scripts/gen-slinger.sh [only-name]   → art/raw/<name>.png
cd "$(dirname "$0")/../art/raw" || exit 1
ONLY=$1
STYLE="Match the art style of the attached sheet exactly: rough dry-brush black ink on paper, chibi proportions (big round head), the same line quality and finish."
HERO="Draw an ORIGINAL young street artist hero, 'the Slinger' (an original character; no existing comic or film character, no emblem, no logo, no letters): a black hoodie with the hood up, bold RED spray-paint drips and splatter across the hoodie and black joggers, big round RED goggles over the eyes, a black bandana over the nose and mouth, red high-top sneakers, and chunky ink-pen launchers strapped to both wrists. Chibi proportions like the reference, athletic and cool."
BG="Background: flat solid pure magenta #FF00FF everywhere that is not the drawing; no ground, no shadow, no text, no labels, no other objects unless asked. Each figure the same size, evenly spaced in one horizontal row, not overlapping. Landscape 3:2 (1536x1024)."
gen() { # name, prompt
  [ -n "$ONLY" ] && [ "$ONLY" != "$1" ] && return
  [ -f "$1.png" ] && return
  echo "== $1"
  timeout 900 codex exec --skip-git-repo-check -s workspace-write --color never --image=ref_wanderer.png \
    "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $1.png. $STYLE $HERO $2 $BG" > "$1.log" 2>&1 < /dev/null
  [ -f "$1.png" ] && echo "   ok" || echo "   FAILED (see $1.log)"
}
gen slinger_swing "Draw FOUR frames of the Slinger swinging on an ink line, all facing RIGHT, a thin straight BLACK INK line shot from the wrist launcher going up out of the top of each frame from the raised right hand: (1) swinging in, body stretched out, legs trailing behind; (2) at the bottom of the swing, knees tucked, the LEFT arm reaching down and forward as if to grab someone; (3) swinging up, the left arm hooked as if carrying someone under it (draw no one else); (4) letting go of the ink line at the top of the swing, flipping, arms spread."
gen slinger_ground "Draw FOUR frames of the Slinger standing, facing LEFT toward someone small: (1) crouched in a superhero landing, one hand on the ground; (2) standing, giving a cool thumbs-up with the right hand; (3) a casual two-finger salute off the brow, relaxed; (4) shooting an ink line straight up from the wrist launcher with the right arm raised, ready to leave (draw the line as one thin straight BLACK ink line going up out of the frame)."
gen hero_thanks "Now draw the character from the attached sheet himself (the Wanderer, NOT the Slinger): FOUR frames, all facing RIGHT toward someone: (1) dangling, held up by the scruff of his coat as if carried, surprised; (2) landed, a deep polite thankful bow with both hands together; (3) standing up, waving thank you with a big grateful smile; (4) watching someone fly away up and to the right, hand shading his eyes, amazed. Same style and design as the sheet."
echo "== all done"

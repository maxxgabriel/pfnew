#!/bin/bash
# Silhouette poses for the web-swinger cameo (round 22). The look (lenses, glitch, webs) is added in code.
cd "$(dirname "$0")/../art/raw" || exit 1
ONLY=$1
FIG="Draw a slender, athletic teenage acrobat as a SOLID FLAT BLACK SILHOUETTE: one uniform pure black #000000 shape with crisp clean edges, a smooth featureless head, a skin-tight bodysuit, NO face, NO eyes, NO details, NO lines inside the shape, NO costume pattern. Slightly stylised comic proportions (long limbs, dynamic, springy)."
BG="Background: flat solid pure WHITE #FFFFFF everywhere else. No ground, no shadow, no rope, no text. Each figure the same size, evenly spaced in one horizontal row, not overlapping. Landscape 3:2 (1536x1024)."
gen() {
  [ -n "$ONLY" ] && [ "$ONLY" != "$1" ] && return
  [ -f "$1.png" ] && return
  echo "== $1"
  timeout 900 codex exec --skip-git-repo-check -s workspace-write --color never \
    "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $1.png. $FIG $2 $BG" > "$1.log" 2>&1 < /dev/null
  [ -f "$1.png" ] && echo "   ok" || echo "   FAILED (see $1.log)"
}
gen sil_swing "Draw FIVE poses of the acrobat swinging through the air from a rope held in the RIGHT hand straight above the head (do NOT draw the rope), all moving to the RIGHT: (1) swinging in, body stretched long and diagonal, legs together trailing; (2) at the bottom of the swing, knees tucked to the chest, left arm reaching down and forward; (3) swinging up with the LEFT arm curled at the side as if carrying something under it; (4) letting go at the top, a tucked flip, upside down; (5) arms and legs spread wide like a starfish in a leap."
gen sil_pose "Draw FOUR poses: (1) a crouched three-point landing, one hand flat on the ground, the other arm out behind, one knee down, head up, facing LEFT; (2) crouched low on the balls of the feet, knees wide apart, both hands on the ground between the feet, head cocked to one side, facing LEFT; (3) standing relaxed, facing LEFT, giving a casual two-finger salute from the forehead; (4) standing facing RIGHT, the right arm thrust straight up with the wrist flicked back and the hand open, about to launch upward."
echo "== all done"

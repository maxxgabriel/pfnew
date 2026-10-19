#!/bin/sh
# Round 38: the art the explorable world still needs (docs/WORLD.md).
# One image per Codex call, into art/raw/world/. Usage: sh scripts/gen-world.sh [name ...]
cd "$(dirname "$0")/.." || exit 1
mkdir -p art/raw/world
END='Large shapes only; no text logos characters people animals star fields particles or speckles. Phone centre crop must work. Single layer, no labels or borders.'
MAG='Empty areas perfectly flat pure #FF00FF magenta, not transparent, no background paper, no shadow on the magenta.'
CLAY='Palette and lighting: handmade plasticine claymation diorama, visible thumbprints and soft rounded forms, warm terracotta, butter yellow, sage green and sky blue, soft studio key light from upper left.'
CHALK='Palette and lighting: chalk drawing on a dark green-black school blackboard, soft white and pale pastel chalk strokes, smudged dust, hand-drawn lines.'
prompt() {
  case "$1" in
    cl_map) echo "Portrait 1024x1536 opaque full-frame plate. claymation diorama seen from above at a steep three-quarter angle: five rounded floating clay islands in a pale blue clay sea, joined by one clear winding clay path that snakes from the bottom edge to the top edge, a small round clearing on the middle island left empty for a building. $CLAY $END" ;;
    cl_theatre) echo "Landscape 1536x1024. a small handmade claymation theatre building, front view, rounded red clay curtains drawn open on both sides, the stage opening is one big empty dark rectangle in the centre filling 55% of the width, warm clay marquee bulbs as big round blobs along the top. $CLAY $MAG $END" ;;
    ch_sky) echo "Landscape 1536x1024 opaque full-frame plate. one-point perspective chalk drawing on a blackboard: a straight road drawn in chalk vanishing to the centre of the horizon at y52%, two simple chalk hills either side, a big chalk crescent moon upper right, generous empty board in the sky. $CHALK $END" ;;
    ch_cloud) echo "Landscape 1536x1024. one long bank of loose chalk-drawn clouds across the middle third, outlined and lightly shaded, no board. $CHALK $MAG Seamless repeating horizontally: left and right boundaries join at identical height. $END" ;;
    ch_door) echo "Portrait 1024x1536. a single tall door drawn in white chalk, standing alone, slightly open, warm pale light pouring from the gap as smudged chalk, no wall, no board. $CHALK $MAG $END" ;;
    px_sign) echo "Square 1024x1024. crisp pixel art wooden signpost: one thick post and one big blank wide plank board, no writing at all, limited 16-colour palette (warm browns, deep teal outline), light from upper left. $MAG $END" ;;
    wc_bottle) echo "Square 1024x1024. loose watercolour glass bottle with a cork and one rolled paper note inside, lying tilted as if bobbing in water, indigo and silvery ivory moonlight palette, soft watery blooms, no water drawn. $MAG $END" ;;
    hs_mailbox) echo "Portrait 1024x1536. a 1930s rubber-hose cartoon style mailbox on a bendy wooden post, round-topped box, red flag raised, thick black outlines, warm limited sunset palette, soft film grain, no face, no eyes. $MAG $END" ;;
  esac
}
NAMES=${*:-"cl_map cl_theatre ch_sky ch_cloud ch_door px_sign wc_bottle hs_mailbox"}
for n in $NAMES; do
  [ -f "art/raw/world/$n.png" ] && { echo "skip $n"; continue; }
  echo "== $n"
  codex exec --skip-git-repo-check -s workspace-write "Use your image generation tool to create ONE image and save it as art/raw/world/$n.png. Use case: illustration-story. Paint production art '$n' for an original animated portfolio. $(prompt "$n")"
done
echo GEN_WORLD_DONE

#!/bin/bash
# v13 style test (the storyteller): painted cinematic worlds, our ink hero. → art/raw/style13/*.png
cd "$(dirname "$0")/../art/raw/style13" || exit 1
STYLE="ART STYLE: painted cinematic animation frame: flat posterized colour shapes with hard-edged shadow shapes (3-5 value bands per surface), thin dark outlines, painterly texture inside shapes, ONE strong motivated light source with warm/cool contrast, rich atmosphere, film still composition. ORIGINAL work, no text, no logos, no letterbox bars."
HERO="The attached sheet is our ORIGINAL character, the Wanderer. Draw him EXACTLY in his own style: a small chibi black dry-brush INK drawing (messy black hair with icy blue highlights and an antenna strand, blue eyes, frayed scarf, long coat, boots) — he stays an ink drawing, NOT painted, sitting inside the painted world, lit by its light."
go() { local name=$1 size=$2 prompt=$3; shift 3; [ -f "$name.png" ] && return
  local imgs=(); for i in "$@"; do imgs+=("--image=$i"); done
  ( timeout 1500 codex exec --skip-git-repo-check -s workspace-write --color never "${imgs[@]}" \
      "Use your image generation tool to create ONE image ($size), then save the generated PNG into the current directory as $name.png. $STYLE $prompt" > "$name.log" 2>&1 < /dev/null
    [ -f "$name.png" ] && echo "ok $name" || echo "FAILED $name" ) & }
FIRE="Night in a deep painted forest. A small campfire, the only light. Across the fire sits an OLD WANDERER, painted (not ink), weathered, grey beard, an old frayed scarf with a faded icy-blue streak in his grey hair and one antenna-like strand: he is the boy grown old. Firelight from below on his face, his hand raised mid-story, one single spark rising from the fire into the dark. The camera is the viewer sitting across the fire."
MEADOW="Dawn over a wide painted meadow on a ridge, low golden sun, long shadows, distant blue mountains, mist in the valley. In the foreground the small black INK chibi boy stands in the grass looking up at a single glowing red spark floating just above his hand. He has a warm rim light from the sun."
CAVE="Inside a sea cave, torchlight. The rock wall is covered with ancient cave paintings (hand prints, animals, simple hunters), all original. The small black INK chibi boy stands in the foreground holding a dim red ember like a tiny lantern; his SHADOW on the cave wall is huge and holds a red light-blade. Warm torch orange against cold blue sea light from the cave mouth."
go fire_pc "landscape 16:9, 1536x864" "$FIRE"
go fire_phone "portrait 9:16, 864x1536" "$FIRE"
go meadow_pc "landscape 16:9, 1536x864" "$HERO $MEADOW" ../ref_wanderer.png
go meadow_phone "portrait 9:16, 864x1536" "$HERO $MEADOW" ../ref_wanderer.png
go cave_pc "landscape 16:9, 1536x864" "$HERO $CAVE" ../ref_wanderer.png
go cave_phone "portrait 9:16, 864x1536" "$HERO $CAVE" ../ref_wanderer.png
wait; echo "== all done"

#!/bin/bash
# Generate the "One Day" art set with the Codex CLI (see .claude/skills/codex-images).
#   scripts/gen-art.sh <out dir> [only-name]
# Skips images that already exist. Layer prompts ask for flat magenta backgrounds.
OUT=${1:?out dir}; ONLY=$2
mkdir -p "$OUT"; cd "$OUT" || exit 1
STYLE="ORIGINAL anime background painting in the style of modern Japanese anime feature-film backgrounds: sharp, very high detail, vivid saturated colour, crisp hand-painted clouds, strong cinematic sunlight, rich blues and warm highlights, clean edges. No people, no animals, no text, no signs with writing, no logos."
LAYER="This is a LAYER: the requested subject sits on a flat solid pure magenta #FF00FF background; everything that is not the subject is pure flat magenta; no shadows, glow or haze on the magenta."
PORTRAIT="Portrait 2:3 (1024x1536)."
gen() { # name, prompt, [reference image]
  local name=$1 prompt=$2 ref=$3
  [ -n "$ONLY" ] && [ "$ONLY" != "$name" ] && return
  [ -f "$name.png" ] && return
  local args=(); [ -n "$ref" ] && args=("--image=$ref")
  echo "== $name"
  timeout 900 codex exec --skip-git-repo-check -s workspace-write --color never "${args[@]}" \
    "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $name.png. $prompt" > "$name.log" 2>&1
  [ -f "$name.png" ] && echo "   ok" || echo "   FAILED (see $name.log)"
}
gen 01_sky_spring "$STYLE $PORTRAIT A sunrise sky only, no ground: pink and orange glow near the bottom fading up to clear deep blue, big soft clouds lit gold from below."
gen 02_spring_far "$STYLE $LAYER $PORTRAIT Subject: a small valley town far below with a winding river, distant blue mountains, soft morning mist in the valley, early sunlight. It fills only the bottom 40% of the frame; the top 60% is magenta."
gen 03_spring_mid "$STYLE $LAYER $PORTRAIT Subject: the grassy crest of a hill seen up close in morning light, small wildflowers. It fills only the bottom 25% of the frame."
gen 04_spring_near "$STYLE $LAYER $PORTRAIT Subject: a lone cherry tree in full pink bloom standing on the right side of the frame, trunk and roots touching the bottom edge, branches reaching up and left."
gen 05_train_interior "$STYLE $LAYER $PORTRAIT Subject: the inside of a quiet Japanese local train carriage looking out of one big window: the window frame, a sliver of seat back and wall, warm dim interior light. The glass area of the window is pure magenta (nothing seen through it)."
gen 06_train_view "$STYLE Landscape 3:2 (1536x1024). A summer coast seen from a moving train: green rice fields in front, a small village with tiled roofs, the sea and horizon behind, huge white clouds in a blue sky."
gen 07_sky_summer "$STYLE $PORTRAIT A deep blue summer midday sky with towering white cumulonimbus clouds, sharp detail. Sky only, no ground."
gen 08_summer_far "$STYLE $LAYER $PORTRAIT Subject: small town rooftops and green hills in the distance on a hot summer day, light heat haze. Bottom 35% of the frame only."
gen 09_summer_crossing "$STYLE $LAYER $PORTRAIT Subject: an empty railway level crossing in a small town: two rail tracks running into the distance, a crossing signal post with two round red lamps and a black-and-yellow striped barrier raised, utility poles with drooping wires. Bottom 55% of the frame."
gen 10_summer_near "$STYLE $LAYER $PORTRAIT Subject: tall summer grass and a few sunflowers close up along the bottom edge only (bottom 20%)."
gen 11_sky_golden "$STYLE $PORTRAIT A golden-hour sky: the sun low near the bottom, orange, pink and gold clouds glowing, blue fading to amber. Sky only, no ground."
gen 12_golden_far "$STYLE $LAYER $PORTRAIT Subject: a distant city skyline and hills in warm golden haze at sunset. Bottom 40% only."
gen 13_golden_river "$STYLE $LAYER $PORTRAIT Subject: a wide calm river with a long bridge crossing it, the setting sun glittering on the water, grassy banks. Bottom 50% only."
gen 14_golden_maple "$STYLE $LAYER $PORTRAIT Subject: red and orange autumn maple branches hanging in from the top-left corner, lit by warm evening light."
gen 15_sky_dusk "$STYLE $PORTRAIT A dusk sky at magic hour: deep blue at the top through violet to pink and orange at the horizon, clouds lit pink from below, the first few stars. Sky only, no ground."
gen 16_town_off "$STYLE $LAYER $PORTRAIT Subject: a quiet hillside Japanese town seen from above at dusk, houses and small apartment blocks, ALL windows dark (lights off). Bottom 55% of the frame."
gen 17_town_on "Edit the attached image: produce the IDENTICAL image (same framing, same buildings, same magenta background) except every window is now warmly lit from inside, glowing yellow-orange. Save it." 16_town_off.png
gen 18_stairs_off "$STYLE $LAYER $PORTRAIT Subject: an old stone stairway leading down into a town at dusk, with old iron street lamps along it, all lamps OFF. Bottom 45% of the frame."
gen 19_stairs_on "Edit the attached image: produce the IDENTICAL image (same framing, same magenta background) except the street lamps are now ON and glowing warm. Save it." 18_stairs_off.png
gen 20_sky_night "$STYLE $PORTRAIT A clear winter night sky full of stars with the Milky Way, deep navy blue. Sky only, no ground."
gen 21_night_mountains "$STYLE $LAYER $PORTRAIT Subject: snowy mountains around a lake at night, lit by moonlight. Bottom 45% only."
gen 22_night_lake "$STYLE $LAYER $PORTRAIT Subject: a perfectly still lake at night with a small wooden pier, starlight reflections, light snow on the near shore. Bottom 35% only."
gen 23_night_pines "$STYLE $LAYER $PORTRAIT Subject: snow-covered pine branches hanging in from the top-left and top-right corners at night."
echo "== all done"

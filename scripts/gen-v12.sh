#!/bin/bash
# The Sketch v12: every new pose sheet, prop and painting, made with the Codex CLI
# (see .claude/skills/codex-images). Writes art/raw/<name>.png from art/raw/ref_wanderer.png.
#   scripts/gen-v12.sh [only-name ...]     (runs up to $JOBS at once, default 3)
cd "$(dirname "$0")/../art/raw" || exit 1
JOBS=${JOBS:-3}
ONLY=" $* "
CHAR="The attached image is the character sheet for an ORIGINAL character, 'the Wanderer'. Draw the SAME character, identical design and identical art style: rough dry-brush black ink on paper, chibi proportions (big round head), messy black hair with icy pale-blue highlights and one antenna strand on top, blue eyes, black scarf with frayed ends, long black coat, slim legs, small boots."
BG="Background: flat solid pure magenta #FF00FF everywhere that is not the drawing; no ground shadow, no ground line, no text, no labels, no red dot or spark, no emote symbols, no speed lines, no other objects unless asked. Each figure the same size, evenly spaced in one horizontal row, not overlapping. Landscape 3:2 (1536x1024)."
INKSTYLE="Match the art style of the attached sheet exactly: rough dry-brush black ink and ink wash on warm cream paper, minimal, elegant, Japanese sumi-e feeling. Original design."

want() { [ "$ONLY" = "  " ] || [[ "$ONLY" == *" $1 "* ]]; }
run() { # name, full prompt, [--no-ref]
  local name=$1 prompt=$2 ref=(--image=ref_wanderer.png)
  [ "$3" = "--no-ref" ] && ref=()
  want "$name" || return
  [ -f "$name.png" ] && return
  while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do sleep 2; done
  (
    echo "== $name"
    timeout 1200 codex exec --skip-git-repo-check -s workspace-write --color never "${ref[@]}" \
      "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $name.png. $prompt" > "$name.log" 2>&1 < /dev/null
    [ -f "$name.png" ] && echo "   ok $name" || echo "   FAILED $name (see $name.log)"
  ) &
}
pose() { run "$1" "$CHAR $2 $BG"; }
prop() { run "$1" "$INKSTYLE $2 $BG"; }
paint() { run "$1" "$INKSTYLE Do not draw any character, person, text or spark. $2"; }

# ---- I: the one-line birth
run oneline "Draw the character from the attached sheet (the large standing figure at the top: three-quarter view, facing right, hands at its sides, scarf blowing left) as a SINGLE CONTINUOUS LINE DRAWING: one unbroken, even, medium-thin pure black line that never lifts from the page, looping through the hair, the antenna strand, the face outline, the scarf, the coat and the boots. No fills, no shading, no colour, no eyes filled in (the eyes are small loops of the same line). Pure white background #FFFFFF. The figure centred, filling two-thirds of the height. Portrait 2:3 (1024x1536)."

# ---- II: run, idle, the eraser chase, the rubber-hose gag
pose idle "Draw FOUR idle poses of the character passing time while waiting, side view facing right: (1) sitting cross-legged on the ground, drawing on the ground with a small calligraphy brush (bamboo handle, black tip), absorbed; (2) sitting with knees up, chin resting on its arms, looking out at the viewer, patient; (3) lying on its back asleep, the scarf draped over its face, one knee up; (4) standing and stretching both arms high above its head, eyes closed, mid-yawn."
pose sprint8 "Draw a SPRINT CYCLE of EIGHT frames, the character sprinting at top speed to the right, side view facing right, the body leaning far forward, arms pumping hard, huge strides, evenly spaced in one row, all the same size, feet on the same level: contact, down, push-off, flight, contact (other foot), down, push-off, flight. Hair and scarf streaming straight back, a fierce determined face."
pose moonwalk6 "Draw a MOONWALK cycle of SIX frames: the character FACING RIGHT (side view) but gliding BACKWARDS to the left in a smooth moonwalk dance step, one foot flat sliding back while the other is on its toes, alternating, knees bent, cool and relaxed, a cheeky smile, arms loose. Evenly spaced, all the same size, feet on the same level."
pose chase "Draw FOUR poses of the character being chased, all moving to the right: (1) running flat out while looking back over its shoulder with wide worried eyes; (2) leaping forward in a long panicked dive, arms stretched ahead; (3) skidding to a stop and turning back to face left, bracing, determined; (4) ducking low with both arms over its head as something passes just above."
pose rubberhose "Draw the SAME character redrawn in the style of a 1930s RUBBER-HOSE cartoon: black and white only, bendy noodle arms and legs, white cartoon gloves, pie-cut eyes, a bouncy round body, the same hair shape (with the antenna strand) and the same scarf, slightly film-grainy. FOUR frames, facing right: (1) running in mid-air over nothing, legs spinning in a blur circle; (2) frozen in mid-air, legs stiff, looking straight down; (3) turning to the viewer with a huge gulp, eyes bulging; (4) dropping straight down, stretched long like a noodle, hair and scarf flung up."

# ---- III: the sea, the wave, the surf
pose surf "Draw FOUR poses of the character SURFING, standing on a huge traditional calligraphy brush used as a surfboard (long bamboo handle, big black ink tip at the back), all facing right: (1) crouched low on the brush, one hand trailing back, carving a turn; (2) standing tall, arms spread wide for balance, a huge grin; (3) deep crouch inside a curling wave, one hand touching an invisible wall of water above; (4) launching off a wave top into the air, the brush under its feet, scarf streaming."
prop wave "Draw THREE frames of ONE colossal ocean wave in the style of an original Japanese woodblock print redrawn as dry-brush black ink and pale ink wash: a towering wall of water with claw-like foam fingers at the crest, deep curling hollow underneath. (1) the wave rising as a tall wall; (2) the wave cresting, the lip starting to throw forward to the left; (3) the wave fully curling over into a hollow tube, foam claws reaching down. Each frame shows the whole wave the same size."
paint bg_inksea "A night sea of black ink seen from above the water: dark ink-wash swells rolling to the horizon, a huge pale full moon low over the horizon throwing a long silver path of light across the water, a few long dry-brush cloud strokes. Portrait 2:3 (1024x1536)."

# ---- IV: the deep, the whale, the bulb inside it
pose swim "Draw FOUR poses of the character SWIMMING underwater, hair and scarf floating up and around: (1) swimming forward to the right with a strong breaststroke; (2) kicking downward, diving deeper, head first; (3) floating still, looking up and to the right in awe; (4) curled up small, looking back over its shoulder in alarm at something huge behind."
prop whale "Draw TWO frames of ONE gigantic WHALE painted in bold dry-brush black ink and grey ink wash, side view facing right, the whole whale visible, a small calm eye: (1) swimming with its mouth closed; (2) the same whale with its enormous mouth gaping wide open, about to swallow, the inside of the mouth a deep black void."
paint bg_deep "Deep underwater painted in ink wash on paper: light falling from the top in soft long diagonal shafts, the water darkening to near black at the bottom, a few large slow curling brush strokes for currents. Calm, vast, empty in the middle. Portrait 2:3 (1024x1536)."
paint bg_belly "The inside of a giant whale painted in dry-brush black ink and dark ink wash: a vast dark cavern, great arching curved ribs rising on both sides like a cathedral, a calm pool of dark water on the floor, a single empty space hanging in the middle where a light would be. Moody, quiet. Portrait 2:3 (1024x1536)."
pose escape "The character fights with a LIGHT-BLADE sword: a short silver metal cylinder hilt with a long perfectly straight blade drawn as ONE flat solid pure cyan #00FFFF bar (no glow, no gradient, constant width). Draw FOUR frames, all facing right: (1) a huge upward slash, the blade sweeping straight up overhead; (2) bursting upward through the air, blade raised high, body stretched, scarf whipping; (3) flying out in a triumphant leap, the blade held up, a fierce grin; (4) tumbling happily in mid-air, the blade switched off (only the hilt in one hand)."

# ---- V: he paints his own way down
pose paint "Draw FOUR poses, the character falling through the sky and then painting its own way down with a big traditional calligraphy brush (bamboo handle, black ink tip): (1) falling and grabbing the brush out of the air with one hand, eyes fixed on it; (2) still falling, swinging the brush in a huge sweeping stroke ahead of itself, both hands on the handle; (3) sitting on a thick black ink stroke and sliding down it like a playground slide, both arms up, joyful; (4) standing and surfing down the ink stroke on its feet, knees bent, the brush held out for balance."

# ---- VI: the orbit, the signature
pose turn8 "A CHARACTER TURNAROUND of ONE pose seen from EIGHT angles, the camera circling it: the character standing tall powering up, fists clenched at its sides, legs apart, hair and scarf blown straight UP by a rising wind, eyes glowing icy blue. Angles in order: (1) front; (2) front three-quarter turned to its left; (3) side profile facing left; (4) back three-quarter; (5) back; (6) back three-quarter the other way; (7) side profile facing right; (8) front three-quarter turned to its right. Identical size and pose in every frame, feet on the same level."
pose sign "Draw FOUR frames, front view facing the viewer: (1) leaning in close, watching something being written with wide delighted eyes, hands on its knees; (2) clapping happily, eyes closed with joy; (3) pressing a small square stamp down with both hands, like stamping a seal; (4) giving a thumbs-up and a big grin."
prop eraser "Draw FIVE frames of ONE big rectangular rubber ERASER block (pale pink rubber, a worn grey graphite-smudged rubbing edge), drawn as a heavy solid object with rough dry-brush black ink outlines, no face, no eyes, no limbs: (1) standing upright, menacing; (2) squashed down flat, about to spring; (3) stretched tall in a lunge, leaning forward to the left; (4) tilted, scrubbing along its grey edge; (5) cracked and bursting apart into exactly three big chunks."
prop popup "Draw SIX separate flat paper CUT-OUTS for a pop-up book, each a single flat cream paper shape with dry-brush black ink linework and a thin pale fold tab at its base: (1) a tall pine tree; (2) a pair of karst mountains; (3) a small house with a curved roof; (4) a round cloud; (5) a torii-like wooden gate of an original design; (6) a crescent moon on a stem."
prop brushprop "Draw ONE large traditional calligraphy BRUSH lying horizontally across the frame: a long bamboo handle with a hanging loop at its right end, a full, soft black ink-soaked tip at the left end, painted in the same dry-brush ink style with a warm bamboo tone. Only the brush, centred, filling most of the width."

wait
echo "== all done"

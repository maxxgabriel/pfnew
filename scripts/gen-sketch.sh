#!/bin/bash
# Generate the Sketch's pose sheets with the Codex CLI (see .claude/skills/codex-images).
#   scripts/gen-sketch.sh [only-name]      → art/raw/<name>.png, from art/raw/ref_wanderer.png
cd "$(dirname "$0")/../art/raw" || exit 1
ONLY=$1
CHAR="The attached image is the character sheet for an ORIGINAL character, 'the Wanderer'. Draw the SAME character, identical design and identical art style: rough dry-brush black ink on paper, chibi proportions (big round head), messy black hair with icy pale-blue highlights and one antenna strand on top, blue eyes, black scarf with frayed ends, long black coat, slim legs, small boots."
BG="Background: flat solid pure magenta #FF00FF everywhere that is not the character; no ground shadow, no ground line, no text, no labels, no red dot or spark, no other objects unless asked. Each figure the same size, evenly spaced in one horizontal row, not overlapping. Landscape 3:2 (1536x1024)."
gen() { # name, prompt
  [ -n "$ONLY" ] && [ "$ONLY" != "$1" ] && return
  [ -f "$1.png" ] && return
  echo "== $1"
  timeout 900 codex exec --skip-git-repo-check -s workspace-write --color never --image=ref_wanderer.png \
    "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $1.png. $CHAR $2 $BG" > "$1.log" 2>&1
  [ -f "$1.png" ] && echo "   ok" || echo "   FAILED (see $1.log)"
}
gen run "Draw a RUN CYCLE: six frames of the character running fast to the right, side view facing right, leaning forward, arms pumping, big strides with one frame where both feet are off the ground, hair and scarf streaming straight back."
gen still "Draw FOUR separate key poses: (1) standing perfectly stiff and frozen like a drawing, arms at sides, facing three-quarter right, neutral face; (2) straining with all its might to move, eyes squeezed shut, fists clenched, leaning forward, a drop of sweat; (3) surprised, both hands up, mouth open, looking up and to the right; (4) gripping and lifting the corner of an invisible page with both hands, pulling hard, facing right."
gen leap "Draw a LEAP in FOUR frames, facing right: (1) deep crouch, anticipation, looking up and to the right; (2) explosive take-off, body stretched up at an angle, one arm thrust up; (3) at the top of the jump, fully stretched, open hand reaching high up to the right, scarf flying; (4) the hand closed into a fist up high, catching something, a huge happy grin, legs tucked."
gen home "Draw FOUR frames: (1) landing from a jump in a low crouch, facing right; (2) standing up proud and happy, facing three-quarter right; (3) turned to face the viewer directly, front view, smiling warmly; (4) front view, holding a traditional calligraphy brush out toward the viewer with one hand, offering it, the other hand relaxed. The brush has a bamboo handle and a black ink tip."
gen dash "Draw FOUR dynamic anime action poses, facing right: (1) a low ready stance, weight back, determined serious face; (2) an extreme forward dash, body almost horizontal, one arm trailing, hair and scarf whipping back; (3) a spinning mid-air flip, body curled; (4) a skidding stop on one knee, one hand on the ground, looking forward intensely."
gen bye "Draw FOUR frames: (1) front view, waving goodbye with one raised hand, smiling with eyes closed happily; (2) three-quarter view turning away to the right, still waving; (3) seen from behind, walking away, scarf trailing; (4) from behind, smaller step, one hand raised over the shoulder in a last wave."
# ---- round two: the crazy actions
gen comedy "Draw FOUR comedy poses: (1) cross-eyed, staring at the tip of its own nose, startled, facing the viewer; (2) lying flat on its face after a fall, arms and legs splayed, seen from the side; (3) sitting up dazed on the ground rubbing its head, swirly eyes; (4) a cartoon jump of shock, both feet off the ground, arms and hair flung out, eyes wide."
gen acro "Draw FOUR acrobatic poses, moving to the right: (1) a low baseball slide, feet first, leaning back, one hand on the ground, ducking under something; (2) a cartwheel, upside down on one hand, legs spread wide; (3) a backflip, body tucked and upside down in mid-air; (4) landing the flip on one foot, arms out wide for balance, grinning."
gen fall "Draw FOUR falling poses, as if falling through the air: (1) flailing in panic, arms and legs windmilling, mouth open, hair and scarf blown upward; (2) tumbling upside down, head toward the bottom; (3) a calm skydiver spread-eagle, face down, determined; (4) diving head first straight down, arms pointed forward like an arrow, scarf streaming up."
gen ride "Draw FOUR poses of riding on the back of something flying, all facing right: (1) crouched low, both hands gripping in front, knees bent, hair blown back; (2) kneeling up, one fist raised in excitement, mouth open shouting with joy; (3) standing up surfing, knees bent, arms out wide for balance, scarf streaming back; (4) standing tall pointing forward ahead with one arm, confident."
gen sword "Draw FIVE fighting poses in which the character wields a long traditional calligraphy brush like a sword (bamboo handle, black ink tip), all facing right: (1) a battle-ready stance, brush held in both hands up by the shoulder; (2) a huge overhead downward slash; (3) a spinning horizontal slash, body twisted, scarf whipping around; (4) a lunging thrust, brush pointed forward, whole body extended; (5) blocking, brush held horizontally overhead, braced."
gen swing "Draw FOUR poses of swinging and hanging from a thin cord (draw the cord as a thin vertical black line going up out of the top of each frame): (1) hanging from the cord with one hand, feet dangling; (2) swinging forward with legs kicked out ahead, joyful; (3) swinging back, legs trailing; (4) letting go and flying forward in mid-air, arms spread."
gen hero "Draw FOUR power poses, facing right: (1) a superhero landing, one knee and one fist on the ground, head down, scarf settling; (2) slamming something down onto the ground with both hands, like pressing a big stamp; (3) a victory jump, both fists in the air; (4) a cool pose looking back over its shoulder at the viewer with a confident smile."
gen closeup "Draw TWO separate anime close-up panels of the same character side by side: (1) an extreme close-up of its eyes only, cropped to a wide horizontal strip, intense and determined, blue eyes, hair strands across; (2) a close-up of its small black-gloved hand: shown twice, once open and reaching, once closed into a tight fist."
bg() { # name, prompt
  [ -n "$ONLY" ] && [ "$ONLY" != "$1" ] && return
  [ -f "$1.png" ] && return
  echo "== $1"
  timeout 900 codex exec --skip-git-repo-check -s workspace-write --color never --image=ref_wanderer.png \
    "Use your image generation tool to create ONE image, then save the generated PNG into the current directory as $1.png. Match the art style of the attached sheet (rough dry-brush black ink and ink wash on warm cream paper, minimal, elegant) but DO NOT draw any character, person, text or spark. $2 Portrait 2:3 (1024x1536)." > "$1.log" 2>&1
  [ -f "$1.png" ] && echo "   ok" || echo "   FAILED (see $1.log)"
}
bg bg_sunset "A dramatic sunset sky painted in ink wash: a huge vermilion-orange setting sun low in the frame, bold dry-brush ink clouds streaking across it, a thin ink horizon line near the bottom. Warm cream, vermilion and black only."
bg bg_night "A night sky in ink wash on paper: deep black-indigo washes, a large pale round moon upper right, a few long soft dry-brush cloud streaks. No stars clusters. Calm and vast."
bg bg_void "An empty sheet of warm cream paper with a few huge, elegant dry-brush ink strokes sweeping diagonally across it, like the trail of a fall, lots of empty space in the middle."
# ---- round three: the power-up and the after-credits gag
gen powerup "Draw THREE frames of an anime POWER-UP, facing right: (1) crouched low gathering power, head down, fists clenched at its sides; (2) standing tall, fists clenched, hair and scarf blown straight UP by a rising wind, eyes glowing bright icy blue; (3) roaring with its head thrown back and arms flung wide, hair blazing upward."
gen extra "Draw THREE frames: (1) peeking in from the RIGHT edge of the frame: only its head, one shoulder and one waving hand are visible, the rest cut off by the right edge of the image, a cheeky grin; (2) front view, a big wink and a thumbs-up, grinning; (3) front view, laughing with eyes closed, both hands behind its head."
# ---- round four: smooth cycles and the run off the page
gen walk8 "Draw a smooth WALK CYCLE of EIGHT frames, the character walking to the right, side view facing right, evenly spaced in one row, the same size, feet on the same level: contact, down, passing, up, contact (other foot), down, passing, up. Small, even steps; arms swinging opposite to the legs; scarf trailing back."
gen run8 "Draw a smooth RUN CYCLE of EIGHT frames, the character running fast to the right, side view facing right, leaning forward, evenly spaced in one row, the same size: contact, down, push-off, flight (both feet off the ground), contact (other foot), down, push-off, flight. Arms pumping, hair and scarf streaming straight back."
gen firststep "Draw FOUR frames of the character's very FIRST STEPS, as if it has never walked before, facing right: (1) lifting one foot off the ground nervously, arms held out wide for balance, wide eyes; (2) wobbling, leaning too far forward, arms windmilling; (3) catching its balance with one foot forward, relieved; (4) taking a confident proud step forward, smiling."
gen runoff "Draw FOUR cartoon frames, facing right: (1) still running in mid-air over nothing, legs a blur of motion, not yet noticing; (2) frozen in mid-air with legs still, looking straight down with a worried face and a sweat drop; (3) looking at the viewer with a resigned, embarrassed gulp, still hovering; (4) starting to fall, arms and hair flung straight up, mouth open in a yell."
echo "== all done"

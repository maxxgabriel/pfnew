#!/bin/sh
# Dev-only: a filmstrip of every chapter seam (film beats round each boundary).
#   scripts/seams.sh [phone|desktop|WxH]   → scripts/shots/seams/<vp>-<seam>.png
vp=${1:-phone}
mkdir -p scripts/shots/seams
for s in "run 3.8" "fold 12.8" "wave 21.8" "deep 26.8" "light 31.8" "chase 39.8" "home 48.8"; do
  set -- $s
  beats=$(python3 -c "print(','.join('f:%.2f'%($2+d) for d in (-0.9,-0.6,-0.35,-0.15,0.05,0.25,0.5,0.85)))")
  OUT=scripts/shots/seams/tmp node scripts/shoot.mjs "$beats" "$vp" 8 700 > /dev/null
  if [ "$vp" = phone ]; then g=200x433; t=8x; else g=420x262; t=4x; fi
  montage scripts/shots/seams/tmp/*.png -tile $t -geometry $g+3+3 -background '#444' "scripts/shots/seams/$vp-$1.png"
  rm -rf scripts/shots/seams/tmp
done
ls scripts/shots/seams

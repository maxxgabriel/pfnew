#!/bin/sh
# Dev-only: one seam's filmstrip.  scripts/seam1.sh <name> <film beat of the seam> [phone|desktop|WxH]
vp=${3:-phone}
mkdir -p scripts/shots/seams
beats=$(python3 -c "print(','.join('f:%.2f'%($2+d) for d in (-0.9,-0.6,-0.35,-0.15,0.05,0.25,0.5,0.85)))")
OUT=scripts/shots/seams/tmp1 node scripts/shoot.mjs "$beats" "$vp" 8 700 > /dev/null
if [ "$vp" = phone ]; then g=200x433; t=8x; else g=420x262; t=4x; fi
montage scripts/shots/seams/tmp1/*.png -tile $t -geometry $g+3+3 -background '#444' "scripts/shots/seams/$vp-$1.png"
rm -rf scripts/shots/seams/tmp1

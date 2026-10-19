#!/bin/sh
# Dev-only: photograph the desk opening shot at a few moments (PC).  scripts/shoot-open.sh [WxH] [times...]
vp=${1:-desktop}; shift
mkdir -p scripts/shots/open
for t in ${*:-0.2 1.0 1.8 2.6 3.4}; do
  OUT=scripts/shots/open node scripts/shoot.mjs 0 "$vp" "$t" 900 > /dev/null && mv scripts/shots/open/d-0.00.png "scripts/shots/open/open-$t.png" 2>/dev/null
  [ -f "scripts/shots/open/${vp%%x*}-0.00.png" ] && mv "scripts/shots/open/${vp%%x*}-0.00.png" "scripts/shots/open/open-$t.png"
done
ls scripts/shots/open

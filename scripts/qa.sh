#!/bin/sh
# usage: scripts/qa.sh out.png <beats as shoot.mjs takes them, comma-separated> [phone|desktop]
# Shoots the beats and tiles them into one sheet, in the order given.
out=$1; beats=$2; kind=${3:-phone}
rm -f scripts/shots/*.png
node scripts/shoot.mjs "$beats" "$kind" 8 500 >/dev/null || exit 1
files=""
for b in $(echo "$beats" | tr ',' ' '); do
  case "$b" in
    alter:*|hold:*|titan:*) tag=$(echo "$b" | tr ':' '-') ;;
    f:*) tag=$(printf "f%.2f" "${b#f:}") ;;
    *) tag=$(printf "%.2f" "$b") ;;
  esac
  files="$files scripts/shots/${kind%${kind#?}}-$tag.png"
done
montage $files -tile 6x -geometry 300x650+4+4 -background '#777' "$out"

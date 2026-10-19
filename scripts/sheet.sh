#!/bin/sh
# usage: scripts/sheet.sh out.png files...  — tiles screenshots into one sheet
out=$1; shift
montage "$@" -tile 6x -geometry 300x650+4+4 -background '#777' "$out"

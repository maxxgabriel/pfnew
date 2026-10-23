#!/bin/sh
# frames.sh <video> <start s> <end s> <fps> <out.png> [cols] [tile width]
# Pulls frames from a recording and lays them out as a labelled contact sheet (time in seconds on each frame).
v=$1; s=$2; e=$3; fps=$4; out=$5; cols=${6:-5}; tw=${7:-480}
d=$(mktemp -d)
ffmpeg -loglevel error -ss "$s" -to "$e" -i "$v" -vf "fps=$fps,scale=$tw:-1" "$d/f_%04d.png"
i=0; for f in "$d"/f_*.png; do t=$(python3 -c "print(f'{$s+$i/$fps:.1f}s')"); convert "$f" -gravity NorthWest -fill red -undercolor white -pointsize 22 -annotate +4+4 "$t" "$f"; i=$((i+1)); done
montage "$d"/f_*.png -tile ${cols}x -geometry +3+3 -background '#444' "$out"
rm -rf "$d"

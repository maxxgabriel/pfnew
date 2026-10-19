Added 76 generated, cut and visually reviewed hero twins (1,186,300 WebP bytes; 1.186 MB). No commits were made by this task.

The complete pose inventory, including keys whose twins already existed, is in [ACT_STYLE_INVENTORY.json](ACT_STYLE_INVENTORY.json). The final source snapshot has 88 Run keys, 5 Wave keys, 27 Light keys and 20 Chase keys. Cycles, reverse/fast scrolling, idlePose, ib_rise, desktop holds, direct drawFig style-showcase calls and the new seam carriers are included. Villain-only bye_0, separate props, effects, removed Fold/Deep and the retired Light swing_0..2 are excluded. No stunned_* pose is reachable from these four chapters or their current seams.

| Ink key | Style added |
| --- | --- |
| `sprint8_0` | pixel |
| `sprint8_1` | pixel |
| `sprint8_2` | pixel |
| `sprint8_3` | pixel |
| `sprint8_4` | pixel |
| `sprint8_5` | pixel |
| `sprint8_6` | pixel |
| `sprint8_7` | pixel |
| `moonwalk6_0` | pixel |
| `moonwalk6_1` | pixel |
| `moonwalk6_2` | pixel |
| `moonwalk6_3` | pixel |
| `moonwalk6_4` | pixel |
| `moonwalk6_5` | pixel |
| `curious` | pixel |
| `lookback_0` | pixel |
| `lookback_1` | pixel |
| `sneak_0` | pixel |
| `sneak_1` | pixel |
| `sneak_2` | pixel |
| `sneak_3` | pixel |
| `roto_0` | pixel |
| `roto_1` | pixel |
| `roto_2` | pixel |
| `roto_3` | pixel |
| `roto_4` | pixel |
| `roto_5` | pixel |
| `roto_6` | pixel |
| `roto_7` | pixel |
| `rubberhose_0` | pixel |
| `rubberhose_1` | pixel |
| `rubberhose_2` | pixel |
| `rubberhose_3` | pixel |
| `runoff_3` | pixel |
| `idle_0` | pixel |
| `idle_1` | pixel |
| `idle_2` | pixel |
| `idle_3` | pixel |
| `style_pixel_0` | pixel |
| `style_pixel_1` | pixel |
| `style_pixel_2` | pixel |
| `style_pixel_3` | pixel |
| `style_pixel_4` | pixel |
| `style_pixel_5` | pixel |
| `style_water_0` | pixel |
| `style_water_1` | pixel |
| `style_water_2` | pixel |
| `style_water_3` | pixel |
| `style_water_4` | pixel |
| `style_water_5` | pixel |
| `style_clay_0` | pixel |
| `style_clay_1` | pixel |
| `style_clay_2` | pixel |
| `style_clay_3` | pixel |
| `style_clay_4` | pixel |
| `style_clay_5` | pixel |
| `style_chalk_0` | pixel |
| `style_chalk_1` | pixel |
| `style_chalk_2` | pixel |
| `style_chalk_3` | pixel |
| `style_chalk_4` | pixel |
| `style_chalk_5` | pixel |
| `style_comic_0` | pixel |
| `style_comic_1` | pixel |
| `style_comic_2` | pixel |
| `style_comic_3` | pixel |
| `style_comic_4` | pixel |
| `style_comic_5` | pixel |
| `leap_2` | water |
| `ib_rise_0` | comic |
| `ib_rise_1` | comic |
| `knock_0` | hose |
| `knock_1` | hose |
| `knock_2` | hose |
| `closeup_1` | hose |
| `closeup_2` | hose |

All assets are saved in `src/assets/sketch/<style>-<key>.webp`; metadata is in `src/assets/sketch/manifest.json`. Sheets and exact ink reference rows are saved under the existing ignored `art/raw/` and `art/raw/strips/` directories. These 15 final source sheets plus their strips occupy 27.63 MB on disk and are not added to Git or the shipped site.

Generation used the built-in image tool, with the character, style and exact pose references, following the prompt set in `scripts/gen-act-styles.sh`: same pose/facing/proportions/order, one row, pure #FF00FF background, no labels/shadows/effects; cyan guides only for actual blade-bearing sheets. Targeted redraws corrected the moonwalk sheet, the lookback hand behind the head, the chalk showcase's third/fourth stride, the single watercolour launch and the white-gloved hand closeups. Final override sheets `pixel_lookback` and `hose_hands` intentionally follow their original grouped sheets in the specification and must be cut last when rebuilding those groups.

`build-act-style-strips.py` makes the reference rows reproducible. `cut-act-styles.py` still cuts and sizes the twins with the existing pipeline. It now tells `cutout-sheet.py` to skip cyan extraction on sheets not marked `blade: true`, preventing comic hair highlights from being erased. The two new comic poses have no sword; existing blade-bearing saber/escape twins retain their blade metadata and pass the coverage check. The saber-lock orbit uses hilt anchors rather than extracted blade bars.

Validation: every final cut was opened either individually or in an ink/twin comparison sheet. Coverage, WebP dimensions, transparency, face/foot metadata, required blades and visible magenta residue pass `python3 scripts/check-act-style-coverage.py`. An earlier production build and TypeScript check passed. The final production-build attempt is currently blocked by the concurrent Light edit: `src/sketch/light.ts(8,34): TS6133: shockRing is declared but its value is never read`. This task does not edit that agent's TypeScript. Phone/desktop film screenshots could not run: Vite binding fails with EPERM and Chromium fails at launch with a socket-permission error in this sandbox.

Remaining integration: Chase's `drawArt` calls for `closeup_1` and `closeup_2` bypass `styledTwin`. Their hose twins are ready, but they will remain ink until the chapter/art restructure routes those calls through the style swap. This task leaves that behavior untouched to honor the TypeScript restriction; its only TypeScript edit added lookback, sneak and knock to FIRST_USE loading priority. The parallel restructure's changes are preserved.

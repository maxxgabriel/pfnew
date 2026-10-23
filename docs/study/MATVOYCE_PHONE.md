# matvoyce.tv on a phone: frame-by-frame motion study

Technique notes only. **Copy none of their assets, characters, logos or text.** The aim is to learn
how a type-led motion site adapts to a 390×844 touch screen, so that Max's film is phone-first.

## How it was recorded

- Device: 390×844 CSS px, DPR 1, `isMobile`, `hasTouch`, iPhone Safari 17 UA, Playwright Chromium
  (`--ignore-certificate-errors`, swiftshader GL). One take of 72.5 s, plus a DOM/CSS probe.
- Script: `scratchpad/mvs/rec_phone.mjs`. It loads the page and waits 9.8 s, then does one real CDP
  touch swipe (250 px), then a slow scroll: `scrollBy(20px)` every 50 ms (about 400 px/s) in
  420 px steps with a 1.1 s rest after each step. After that it jumps back to the top, taps MENU,
  taps CLOSE, opens the menu again in mid-page, holds a finger on a menu item, taps the carousel's
  "next" button three times, swipes the carousel sideways, taps "View project" (page transition),
  scrolls the project page and taps the logo to go home.
- Raw files: `/tmp/claude-0/-home-user-pfnew/83f49f94-e6e3-5d5b-9d64-b4827971866d/scratchpad/mv/phone/`
  - `r1/rec.webm` (video), `r1/log.json` (action times), `r1/samples.json` (element rects and
    transforms every 0.5 s in the intro and after each scroll step)
  - `r1/sheets/*.png`: contact sheets at 10 fps for the intro, menu and page transitions and 4 fps
    for the scroll; `name_full`, `menu_full`, `sec_full1/2`, `carousel_zoom` are full-resolution
    frames
  - `probe.json`, `extra.json`, `site.css` (all live CSS rules, dumped from the page)
- Video time ≈ log time (±0.05 s). All times below are seconds from navigation.
- **Caveat:** headless Chromium cannot decode their MP4 thumbnails. The hero video and the
  featured-work thumbnails therefore render as empty boxes. Only the boxes' geometry and motion are
  reliable; their content is not.

## Global facts (phone)

| thing | value |
|---|---|
| Page height | 3998 px = 4.74 viewports. Hero 844, featured work about 970, "What he does" about 510, brands 231, contact pill, footer 844 |
| Scrolling | Lenis is loaded, but **touch scroll is native** (the swipe moved 235 px with native momentum; `scrollBy` is 1:1). No smoothing or scroll-jacking on phone |
| Root size | `html{font-size:10px}` below 1200 px, so 1 rem = 10 px on phone. At ≥1200 px it becomes `0.5208vw` (fluid). Breakpoints are 768 and 1200 |
| Ground | `--color-body:#fffef8` (warm off-white). Ink `--dark:#1f1f1f` |
| Accent | cyan `rgb(0,211,255)` (name, footer, buttons). Lime/yellow-green for the contact pill and the arrow buttons. Light cyan `rgb(188,243,255)` for the transition panel |
| Easings | `--easeInOutQuart: cubic-bezier(.76,0,.24,1)` and `--easeOutQuart: cubic-bezier(.165,.84,.44,1)`. Nothing else appears in the CSS |
| Type trick | Every display word alternates two cuts of one variable font, letter by letter: `.isRegular` = `wght 1000, wdth 60` (heavy, condensed) and `.isBold` = `wght 700, wdth 150` (wide), both with `slnt 500`. This gives the hand-made, jittery rhythm. It is the site's main typographic signature, and it is used on every heading, the menu, the buttons and the transition pill |
| Masks | Every line of text sits in `overflow:hidden` with a reduced line-height (`--line-height-variable-masking:72%`). Characters slide up through that mask. Each menu char also has a `.char-clone` placed at `top:105%` under it, so a roll can carry a copy of the letter up into view |
| Tap feedback | `-webkit-tap-highlight-color:transparent`. **No :active or touch state anywhere.** A 1.5 s finger-hold on a menu item showed nothing (the desktop hover GIFs never fire on touch). Taps answer only with the resulting animation |
| Fixed chrome | Top: logo at top-left (88×50) and "UK based / Working globally" at top-right (12 px). Bottom: the tagline at bottom-left (12 px, 2 lines) and **MENU+ at bottom-right, fixed at `top: calc(100dvh - 3.6rem)`**, which puts it in the thumb zone. There is no backdrop or veil behind the chrome, so content scrolls straight under it (at 21.3 s the tagline overprints the contact pill) |

## 1. Preloader (first visit only), 0 to 7.8 s

Full-screen `#fffef8` layer, `z-index:999`, `100svh`. One centred 3-digit counter in the
accent cyan, about 80 px tall (`font-size:5.6rem` on phone, bold condensed cut), centred around y≈50%.

| t (s) | what happens |
|---|---|
| 0.0–2.0 | Blank white (fonts and JS loading. Treat it as dead time, not design) |
| 2.0 | Ground turns `#fffef8` |
| 2.1–2.9 | **"000" rises into view through a mask**: its top edge appears first, and the glyphs slide up from below a baseline clip. About 0.8 s, ease-out (fast start, slow settle) |
| 2.9–3.5 | Hold at 000 |
| 3.5–4.4 | **Odometer roll to "035"**: each digit column rolls *upward* (the old digit leaves through the top clip, the new one enters from below). The columns are staggered by about 0.1 s, and the hundreds digit stays put. While rolling, a column briefly shows two half-digits (a sliced look) |
| 4.4–5.0 | Hold at 035 |
| 5.0–5.8 | Roll to "070", same style |
| 5.8–6.4 | Hold |
| 6.4–7.2 | Roll to "100", with the hundreds column rolling too |
| 6.9 | The bottom-left tagline rises in (2 lines, staggered), so the loader layer is already gone and the counter sits on the page itself |
| 7.2–7.8 | Hold at 100 |
| 7.8–8.2 | **"100" rolls up and out** through its mask. As it leaves, the name begins in the same spot, with no gap between them |

The counter is **stepped, not continuous**: 3 jumps (0→35→70→100), each about 0.8 s of rolling
followed by about 0.6 s of hold. That reads as deliberate rather than as a progress bar. Total
designed intro ≈ 5.8 s plus the reveal. A second visit (the page transition back to home, at 68.7 s)
**skips the counter** and goes straight to the name reveal.

**Our build:** a canvas counter is easy. Draw each digit column clipped to a rect, and offset it by
`-(k + easeInOutQuart(p)) * lineH`. Stagger the columns by 0.08–0.1 s and use 3–4 fixed stops.
Keep it under about 3 s on phones. Their 2 s blank is a cost, not a feature, so our first frame
must paint instantly.

## 2. Hero name reveal on phone, 7.8 to 10 s

Layout at rest (from `samples.json`). It is stacked vertically, not overlapped as on desktop:

- "MAT": 156 px font (`15.6rem` = **40 vw**), box x 88–302, y 212–337 (the line is 125 px tall),
  centred.
- Box (the video frame): 310×167 px (**79.5 vw × 19.8 vh**), at x 40, y 338, **rotated −2.5°**
  (`matrix(.999,-.0436,…)`), with a thin dark 1.5 px stroke and a transparent fill (in the real page
  a video plays inside it).
- "VOYCE": 156 px, x 24–351 (**84 vw wide**), y 507–632. It is pulled up under the box with
  `margin-top:-1em` and sits above the box (`z-index:2`). "MAT"'s 2nd char also has `z-index:2`, so
  letters overlap the frame edges.
- Name block centre ≈ y 420 = **50 vh**. The top chrome is 50 px and the bottom chrome about 42 px.
- Colour: flat cyan `rgb(0,211,255)`. No outline.

| t (s) | what happens (see `name_full.png`) |
|---|---|
| 7.85–8.2 | "100" exits upward. The first slivers of "VOYCE" appear on the lower line's baseline clip, and "MAT"'s line starts too. The lines start almost together, with VOYCE about 50 ms ahead |
| 8.0–8.3 | Top-right "UK based / Working globally" fades in (opacity, about 0.3 s) |
| 8.2–8.9 | **Each letter rolls up through its own mask, and the roll passes through other glyphs**: frames show half-letters, wrong letters and horizontal slices (for example "MA_" over a different glyph). It is a slot-machine or split-flap roll per character, with a random stagger of about 30–80 ms per char, not a clean left-to-right order. Per char ≈ 0.4–0.6 s |
| 8.3–8.9 | The "MENU" chars roll in at bottom-right the same way, and then the "+" appears |
| 8.95–9.3 | **The box scales from 0 to 1** around its centre, already rotated −2.5°. It is about 30 px wide at 8.95, about 100 px at 9.05, about 160 px at 9.15 and full (310 px) at about 9.25. That is about 0.35 s, ease-out, with no overshoot visible |
| 9.1–9.2 | The last letters settle. Name complete ≈ **1.3 s after the counter leaves** |
| 9.5–10 | **Sparkle stars** (4-point, white fill and dark outline, 28 px on phone, `--w:2.8rem`) pop with `scale(0→1)` on letters and box corners, 3–4 at a time. They twinkle by scaling up and down and moving between spots (still going at 70 s) |

On phone the name does **not push or pin**. The samples show the hero text layers moving exactly
1:1 with scroll (heroTop.y = 212 − scrollY). `stickyContainer` is only 844 px tall, so there is no
pin length. The desktop push or grow effect is simply dropped. The hero is one ordinary screen, and
it scrolls away.

**Our build:** the roll through wrong glyphs is the key move. For each char, draw a vertical strip of
3–5 random glyphs plus the real one, clipped to the line box, and scroll it by `easeOutQuart` over
0.5 s with a random start of 0–0.25 s. Their glyphs mix two variable cuts. We can borrow the
*alternating width* idea with our own fonts, but not their typeface. The box can scale from 0 with
a fixed tilt, 0.35 s ease-out, starting as the name is about 80% done.

## 3. Scroll through the sections (phone), 9.8 to 30 s

Scroll is native. Everything below reveals on **viewport entry** (IntersectionObserver-style
triggers), not scrubbed to scroll, except the "What he does" highlight, which tracks position.

### 3a. Hero leaving (9.8–12.6)
The hero scrolls off 1:1. The sparkles keep twinkling. Nothing fades or scales. The fixed chrome
stays.

### 3b. "Featured Work" header (enters 10.1–10.8)
- A small label "His best work" (14 px, extended cut) sits above a 2-line heading of 56 px each
  ("FEATURED" / "WORK"), centred, with alternating cuts.
- Entry: each line rises out of its mask (frames 10.1 to 10.6). About 0.5 s, ease-out. The second
  line follows about 0.1 s later.
- Two small 60×60 animated GIF stickers sit beside the lines (a TV at left and a "GO!" at right).
  They loop on their own and swap fills (filled, outline, filled).

### 3c. Featured work: a **phone-only component** (`featureWorkMobile`)
- Desktop has a different featured-work layout. On phone it is a **one-at-a-time carousel**. All
  items are stacked in the same grid cell (`grid-area:1/1`). Each has a square thumbnail video
  (358×354, which is full width minus 16 px gutters), then the project title (56 px), then a "View
  project" button. `buttonNext` is `display:none` on desktop, so the button exists only on phone.
- Controls: two 36×36 lime square buttons (2 px black border, 6 px radius, arrows) at the far left
  and far right of the button row, and a cyan "View project" pill between them (2 px border, 6 px
  radius, 16 px extended text).
- Title entry on scroll (15.1–15.8): the line rises through its mask.
- **Tap "next" (carousel_zoom.png)**: the visible response comes about 0.3 s after the tap. Then
  the old title fades and slides left about 40 px with a horizontal ghost or motion blur, while the
  new title comes in from the right, sliding left about 40 px and fading in. The two overlap for
  about 0.15 s. Total ≈ **0.35 s**. The thumbnail crossfades with the title (it was not visible in
  headless). The carousel wraps at the end: after the 3rd item, "next" returns to the 1st.
- **A horizontal swipe does nothing.** The carousel is buttons-only, which is a missed touch
  affordance.

### 3d. "What he does": a scroll-tracked list (16.3–20.6)
- A centred list of 4 items, each a 2-line 56 px heading: "type design & illustration", "type
  animation", "motion design" and so on.
- **Active item**: full ink. The others have the class `outing`, set to `opacity:.1` with a
  `.8s easeOutQuart` transition. So as you scroll, the item nearest the middle of the viewport
  darkens and the rest fade to about 10%. This is the most "scroll-driven" thing on the phone page.
- When an item is active, **stickers pop around it** (pencil, peace-sign hand, a small "MV" badge,
  a burst-shaped "Hey!" sign, a small TV). They `scale(0→1)` with a slight overshoot and sit at
  the line ends, slightly overlapping the letters. When the item goes inactive, its stars go to
  `opacity:0`.
- **The page ground tints per active item**: pale blue `rgb(237,245,252)` for item 1, pale green
  `rgb(243,251,241)` for item 2, pale grey or lavender `rgb(249,249,249)` for item 3, then back to
  `#fffef8`. It is a whole-page colour wash. The cross-fade is about 0.5 s.
- **Our build:** pick the active item by the distance of each line's centre from 50 vh. Ease
  the others to 0.1 alpha over 0.8 s, not instantly. A full-screen ground tint per chapter is
  cheap on canvas and works very well on a small screen.

### 3e. Brands (20.8–23.1)
- Label "Brands Mat's worked with", then **two rows of logos as marquees moving in opposite
  directions** (row 1 starts at x 0, row 2 starts at x −2082). Each row repeats a 944 px strip
  3 times. Logos are 104 px square (`--img-size:10.4rem`, 154 at ≥768 and 204 at ≥1200).
- The drift is slow and constant (it does not speed up with scroll).

### 3f. Contact pill (21.3–24.6)
- A big lime-to-yellow pill, about 360×140 px (full width minus gutters), with a thick black
  stroke of about 4 px, a small line "Always open for new projects and collaborations" and a 40 px
  "CONTACT MAT" in alternating cuts. Its background is a looping image
  (`bg-animation-loop`, 10 s linear, translateX, with an `::after` copy at `left:-98%` so it tiles
  without a seam).
- It is in normal flow and not sticky. It enters by rising (about 0.5 s).
- On phone the tagline and MENU print over it while it passes the bottom chrome.

### 3g. Footer reveal (23.1–27.6)
- The footer is a **full-viewport cyan panel** (`footer`, `position:relative`, 844 px, `rgb(0,211,255)`)
  in normal flow. It is not a fixed curtain underneath.
- As its top edge enters the viewport (`hasFooter`):
  - the **top header fades out** (`opacity 0`, `.25s easeInOutQuart`)
  - the **fixed MENU+ and the tagline fade out** (same 0.25 s)
  - the footer carries **its own copy** of the logo (top-left) and MENU+ (top-right,
    `.isFooter`) on its top row, so the chrome seems to ride up with the panel. This hand-off
    works well.
- Inside the footer, as it scrolls in: "Explore" with WORK / ABOUT / MEDIA (40 px, left), "Email"
  with an address (right), and a centre lock-up "MAKING TYPE MOVE" with a "SINCE 2020" badge
  (its text runs as a loop inside a pill). Then "Design by", the socials as big 40 px right-aligned
  words, and a copyright line. Each line rises through its mask on entry (24.1 to 24.8: the
  WORK/ABOUT/MEDIA lines arrive one after another).
- The centre word **cycles styles on a loop** (25.3–29.8): the same word changes rendering every
  0.3–0.5 s (chrome gradient fill, outline only, flat fill, a wobble with the letters bouncing at
  different heights, a squiggle underline). It is a type-animation reel in one word, probably a
  video or sprite. On phone it fills about 80% of the width.
- The footer is the last screen (bottom = docH). There is no over-scroll trick.

## 4. Menu: open and close (phone), frame by frame

Structure: `nav` is `position:fixed; inset:0; z-index:9; background:#fffef8; opacity` animated.
It is a **full-screen fade, not a slide-in panel**. The fixed chrome (logo, UK based, tagline,
toggle) stays on top and does not move. Content, left-aligned at the 16 px gutter:

- top: "Follow me" (12 px grey) and 4 social links (12–16 px), y 116–217
- middle: **WORK / ABOUT / MEDIA**, 56 px, alternating cuts, 12 px row gap, block at y 355–520
  (centred around 52 vh)
- bottom: "Always open for new projects and collaborations" (12 px grey) and "CONTACT MAT ↗"
  (32 px), y 665–718
- On desktop each item shows a hover GIF behind it (`img.gif`). On phone these are present in the
  DOM but never shown.

**Open** (tap at 31.66; see `menu_full.png`, top row):

| t (s) | Δ | what happens |
|---|---|---|
| 31.66 | 0 | tap |
| 31.72 | +0.06 | "+" becomes "×" (instant swap). "MENU" letters start rolling up one by one |
| 31.72–32.15 | +0.06–0.5 | `nav` opacity 0→1 (≈0.45 s, easeInOutQuart). The hero shows through and fades away (light cyan at 31.88, almost gone at 32.04). The samples read 0.94 at +0.45 s |
| 31.72–32.15 | | the social lines rise through masks, top to bottom, ≈60 ms apart |
| 31.80–32.15 | +0.14–0.5 | WORK, then ABOUT, then MEDIA rise through masks. Each row moves up ≈1 line height, ≈0.35 s, easeOutQuart, ≈70 ms between rows. Bottoms are clipped while moving |
| 31.72–32.04 | | "MENU" becomes "CLOSE" by a per-char roll (old chars go up and out, new ones come up from below, about 40 ms stagger) |
| 32.04–32.3 | +0.4–0.65 | "CONTACT MAT ↗" rises. Its grey line fades in (about 0.2 s) |
| ≈32.3 | +0.65 | open is complete |

**Close** (tap at 35.13; bottom row of `menu_full.png`):

| t (s) | Δ | what happens |
|---|---|---|
| 35.15 | +0.02 | "×" becomes "+". "CLOSE" rolls back to "MENU" (35.15–35.4) |
| 35.15–35.45 | +0–0.3 | **The items do not roll out. They fade** with the panel: WORK/ABOUT/MEDIA go dark, then grey, then gone. The hero fades back in under them (the cyan returns to full by 35.4) |
| 35.2–35.4 | | the social lines slide **up** out of their masks (a reverse rise, quicker) |
| ≈35.45 | +0.32 | closed. The samples read nav opacity 0.06 at +0.45 s |

So **open ≈ 0.65 s with staggered rises, and close ≈ 0.3 s as a plain fade**. The close is half as
long and has no stagger. Opening from mid-page (38.79) behaves the same. The page beneath keeps its
scroll position, and the menu always sits at the same place in the viewport.

**Our build:** an opaque ground-coloured overlay with an alpha fade, and items that rise through
clips with a 70 ms stagger. The close should be a quick, plain fade. Put the toggle in the
**bottom-right thumb zone** on phones, at `100dvh - 36px`, and give it a 44 px hit area even
though the text is 20 px tall. The label can swap its words by a per-char roll.

## 5. Page transition (tap "View project" 56.19 s; tap the logo 65.27 s)

- `.transition` is a fixed full-screen layer (`z-index:99`, `100dvh`, `rgb(188,243,255)`). It
  carries a **looping cyan and light-cyan chevron or zigzag stripe image** that drifts sideways
  (10 s linear loop, two copies at `0` and `-98%` so it tiles). It is revealed through a
  **`mask-image` linear-gradient band** whose `--bottom` and `--top` stops are animated, so a wipe
  is just two numbers.
- In the middle sits a **white pill label** (`border-radius:5rem`, `.6rem` dark border, 56 px
  alternating-cut text, `padding 2rem 3rem`) that names the destination: "WORK…" or "HOME".

| t (s) | what happens |
|---|---|
| 56.19 | tap |
| 56.6–57.1 | **The band wipes in from the bottom** (`--top` 0→100%). The pill rides up with the band's top edge, settles at the centre and stays there. ≈0.5 s, easeInOutQuart |
| 57.1–59.0 | Hold, while the network loads the next page. The stripes drift, and 2–3 sparkles twinkle around the pill |
| 59.0–59.25 | **The band wipes off upward** (`--bottom` 0→100%) and the new page shows from the bottom. ≈0.25–0.3 s |
| 59.2–59.9 | The new page's title does the **sliced glyph-roll reveal** (as in §2). The media under it is already in place |
| back home: 66.5–66.75 in, hold to 68.5, 68.5–68.75 out, then the name reveal (68.7–70.0) and the box scale (69.2–69.5) | same, with "HOME" on the pill. No counter |

The hold is load-bound. On a fast network it would be shorter. The in-wipe and out-wipe themselves
are about 0.5 s and 0.3 s.

**Our build (useful for chapter seams):** a striped band whose two edges are tweened, plus one
bold pill label. It is one strong shape, not many small ones, so it suits the owner's rules.

## 6. Project page (61–66 s, briefly)
Title at the top (56 px, it rolled in), then full-width media cards (16 px gutters, slightly rounded corners)
stacked with about 16 px gaps. As you scroll, some cards stay pinned while the next one passes over
them (62.2–63.7: a card holds near the top while the following image slides up). A single navy
starburst shape scrolls between the cards. The fixed chrome is the same, but on a work page the
toggle moves to the top (`.isWorkPage { top: var(--gap-x) }`) unless the menu is open.

## 7. What changes from desktop to phone (from the live CSS and the layout)

| element | phone (<768) | desktop (≥1200) |
|---|---|---|
| Unit system | `1rem = 10px`, fixed | `1rem = 0.52vw` (fluid; 10 px at 1920) |
| Menu toggle | fixed **bottom-right**, `top:calc(100dvh - 3.6rem)`, 24 px | in the header grid, top row, `min(4.44vh, 2.5vw)` |
| Tagline | fixed bottom-left | static, inside the header |
| Header | 50 px, `pointer-events:none` except its links | 75 px |
| Hero | name stacked above and below the box, 40 vw letters, no pin, scrolls away | name layers absolute (MAT top-left, VOYCE bottom-right), sticky container, the video grows or pushes |
| Featured work | **separate mobile component**: a single-item carousel with arrow buttons and a "View project" button | a different layout. `buttonNext` hidden |
| Menu | left-aligned list, items 56 px | grid column 4/10, hover GIFs behind items |
| Hover GIFs and states | none (no hover on touch) | GIF previews on hover |
| Stars | 28 px | 48 px (768) and 72 px (1200) |
| Brand logos | 104 px | 154 px and 204 px |
| Transition pill text | 56 px | `min(16.7vh, 9.4vw)` |
| Viewport units | `svh` for the loader, `dvh` for the transition and the toggle position | same |

Dropped on phone: the hero pin and push, the hover previews, and the desktop featured-work layout.
Added on phone: carousel buttons, the "View project" CTA, and the toggle in the thumb zone.

## 8. Phone weaknesses (don't copy these)
1. About 2 s of blank white before anything paints. Paint the ground and a first frame instantly.
2. No touch feedback at all, and taps feel about 0.3 s late on the carousel. Give a press state of
   our own (for example a 60 ms scale to 0.96, or a darkening on `pointerdown`) that does not rely on
   hover.
3. The carousel ignores swipes. If we have anything swipeable, support swipe as well as buttons.
4. The fixed chrome has no backdrop, so the bottom tagline overprints content. Either fade the
   chrome over busy parts or give it a ground-coloured fade strip.
5. A 36 px arrow button is below the 44 px minimum tap size.

## 9. What to take for Max's film (technique only)
- **Mask-rise everything**: each line, or each char, slides up 1 line height inside a clip,
  0.35–0.6 s, easeOutQuart, with a 40–100 ms stagger. Exits are faster (0.25–0.3 s) and often only
  fade.
- **Glyph-roll name reveal**: a slot-machine roll through wrong glyphs, with a random per-char
  stagger. Total about 1.3 s.
- **A stepped counter** with 3 holds instead of a smooth count.
- **One tilted frame** (−2.5°) between two huge words, scaled in from 0 after the words.
- **Chrome hand-off** at the end: the fixed chrome fades in 0.25 s and the last panel carries its
  own copy.
- **A per-chapter ground tint** driven by which item is active.
- **Thumb-zone menu** at the bottom-right on phones.
- **A striped wipe band with a pill label** for transitions, done as two animated mask stops.
- Easings: only two curves, `easeOutQuart (.165,.84,.44,1)` for entrances and
  `easeInOutQuart (.76,0,.24,1)` for fades and wipes. Two curves are enough to read as a system.

# SITE — the motion site (round 35, branch `claude/motion-site`)

The owner: *"we need a major revamp… the ideas don't need to be crazy but
animations should hit… use gsap or framer or locomotive crazily… big screens
specifically (we will obviously build for phones as well)"*. Picked: a new
motion website (GSAP + Lenis, real web layout) instead of the canvas film; the
film is kept and shown inside it; content = **the Playground** (plus intro and
contact); **bold editorial** look; the ink boy stays **as a mascot**.

## Stack
Vite + TypeScript (vanilla, no framework), `gsap` 3.15 with ScrollTrigger,
SplitText, Flip (all free now), `lenis` smooth scroll synced to ScrollTrigger
(`lenis.on('scroll', ScrollTrigger.update)`, gsap ticker drives `lenis.raf`).
Multi-page Vite build: `index.html` = the new site, `film.html` = the canvas
film exactly as it is (today's `index.html` + `src/main.ts`), so the film keeps
working and can be embedded.

## Look (bold editorial)
Warm off-white ground `#f1eee7`, ink `#121110`, one accent: the red `#e8432a`.
Huge display type (a strong Google Font grotesk/condensed, e.g. "Anton",
"Archivo" (wide/condensed axes) or "Bricolage Grotesque"; body in the same
family or one clean sans). Lots of space. Big type does the talking; motion
makes it hit. Big screens first (1440–2560 wide), fully responsive down to
390×844 phones and phone landscape. Nothing depends on hover (hover effects are
desktop-only extras).

## Sections and their signature motion
1. **Preloader** — a counter 0→100 in giant type as the assets load; at 100
   the digits drop away and a curtain (two panels) wipes open onto the hero.
2. **Hero** — MAX GABRIEL in giant type, letters assembling (SplitText chars,
   staggered from below with rotation, expo ease); a small line "motion ·
   interfaces · code". Scroll-velocity skew on the big type; a slow parallax.
   The ink boy peeks in from the edge, ducks when you scroll fast.
3. **Statement** — 2–3 large lines that fill word by word, scrubbed to scroll
   (grey → ink), with the red on one word. Copy (placeholder, owner to revise):
   "I make interfaces that move like film." / "Every pixel has a pulse."
4. **Playground** (the heart) — pinned section, horizontal scroll on desktop:
   big cards, each an animation piece, revealed by an expanding clip-path with
   an inner parallax; the ink boy runs along the bottom edge with his run cycle
   (`run8_*` drawings), his speed and direction tied to the scroll velocity.
   Pieces (each card shows a live loop or a still + short loop from existing art):
   - **The Sketch** — the canvas film itself (opens `film.html` full screen);
   - **Six styles** — him cycling ink → pixel → watercolour → clay → chalk →
     comic → rubber hose (the `*-home_3`/twin drawings);
   - **The duel** — the moon duel (the saber drawings on the comic moon art);
   - **Living worlds** — the pixel/watercolour/comic/cartoon world layers drifting;
   - **The run** — the run/sprint cycles, scroll-scrubbed;
   - **Fire kick** — the fire-tornado sequence.
   Tapping a card **Flips** it (GSAP Flip) seamlessly into a full-screen piece
   view (the live piece large, a title, a short line, a close button); closing
   Flips it back. On phones the gallery is a vertical stack with the same
   reveals and the same Flip.
5. **Marquee + colour travel** — a giant marquee ("MOTION · INTERFACES · CODE ·")
   whose speed and direction follow the scroll; the page background morphs
   colour between sections (off-white → ink black → red → off-white).
6. **Contact** — "Let's make something that moves." assembling in huge type;
   the email (placeholder `hello@example.com`) as a big link that copies with
   a flourish; the ink boy waves; a back-to-top that rewinds the page fast.

Everywhere: magnetic buttons + a custom cursor (desktop only), image ripple on
hover (desktop only), `prefers-reduced-motion` = no smooth scroll, no skew,
simple fades. Performance: transform/opacity only, 60 fps on a mid phone.

## Rules carried over
No clusters of small things (no particle swarms/confetti); original, not
copied; the owner's earlier rejections (CLAUDE.md) still stand; screenshot
desktop (1440×900 and 1920×1080) and phone (390×844) before calling anything done.

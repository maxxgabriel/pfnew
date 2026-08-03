import { useMemo, type CSSProperties } from 'react';
import styles from './Figure.module.css';

/**
 * The figure is drawn from six strokes, always in this order. `drawn` reveals
 * them progressively, so he literally becomes more of himself as the reader
 * descends — which is the mechanic the whole picture rests on.
 */
const STROKES = ['spine', 'head', 'armL', 'armR', 'legL', 'legR'] as const;
export type Stroke = (typeof STROKES)[number];

export type Pose = 'blank' | 'standing' | 'walking' | 'tripped' | 'scribbled' | 'running' | 'holding' | 'tearing';

type Props = {
  /**
   * How many of the six strokes exist yet, 0–6. Fractional values draw the
   * stroke in progress, so a limb can be caught mid-appearance.
   */
  drawn?: number;
  pose?: Pose;
  /** Walk / run cycle phase, 0–1. Drive from scroll or a clock. */
  cycle?: number;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * THE FIGURE.
 *
 * A stick man drawn in six strokes, on a 0 0 100 160 stage with the ground at
 * y=150. Every pose moves the same six lines rather than swapping artwork, so
 * he stays recognisably one person from the first twitching stroke to the
 * moment he tears his way off the page.
 *
 * Two decisions worth knowing:
 *
 *  - Limb positions are computed, not hand-drawn per pose. A pose is a set of
 *    joint angles, so poses can be blended and a walk cycle is just the phase
 *    of two of them.
 *  - Every stroke carries a permanent jitter (see the stylesheet). He is a
 *    drawing, and a drawing that sits perfectly still reads as clip art.
 */
export function Figure({
  drawn = 6,
  pose = 'standing',
  cycle = 0,
  size = 220,
  color = 'var(--ink)',
  className,
  style,
}: Props) {
  const joints = useMemo(() => posture(pose, cycle), [pose, cycle]);

  return (
    <svg
      className={`${styles.figure} ${styles[pose]} ${className ?? ''}`}
      style={{ width: size, ...style } as CSSProperties}
      viewBox="0 0 100 160"
      fill="none"
      stroke={color}
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {STROKES.map((name, i) => {
        // How much of this stroke is drawn: 1 fully, 0 not yet, between = mid-stroke.
        const reveal = Math.min(Math.max(drawn - i, 0), 1);
        if (reveal <= 0) return null;

        return (
          <path
            key={name}
            className={styles[name]}
            d={joints[name]}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - reveal}
            /* the head is a closed shape, so it reads better slightly thinner */
            strokeWidth={name === 'head' ? 4 : undefined}
          />
        );
      })}
    </svg>
  );
}

/**
 * A pose, as path data for all six strokes.
 *
 * Hips sit at (50,95) and shoulders at (50,55) in the neutral poses; the fall
 * and scribble poses abandon that frame entirely, which is the point of them.
 */
function posture(pose: Pose, cycle: number): Record<Stroke, string> {
  // Two swing values in antiphase drive every gait from one number.
  const swing = Math.sin(cycle * Math.PI * 2);
  const anti = Math.sin(cycle * Math.PI * 2 + Math.PI);

  /*
   * Foot lift, and the reason it is not simply `abs(swing)`.
   *
   * With both feet swinging in antiphase about one hip, `abs()` lifts them by
   * the same amount at the same time — so at the passing position (cycle 0 and
   * 0.5) the two feet are at the SAME x and the SAME y, the legs draw exactly
   * on top of each other, and he reads as one-legged for those frames.
   *
   * A real gait is asymmetric: a foot is only off the ground while it is
   * travelling forward, and planted while it is travelling back. `cos` is the
   * derivative of the swing, so clamping it to positives lifts exactly the
   * forward-travelling foot — and at the passing position one foot is lifted
   * while the other is down, which is what keeps the legs distinct.
   */
  const liftL = Math.max(0, Math.cos(cycle * Math.PI * 2));
  const liftR = Math.max(0, Math.cos(cycle * Math.PI * 2 + Math.PI));

  /*
   * The ARMS need the same treatment, for the identical reason. Any vertical
   * derived symmetrically from the phase — `abs(swing)`, or `swing * k` — is the
   * same number for both arms at the passing position, so the two hands share an
   * x AND a y and the arms draw as a single stub. So the arms hang off `liftL` /
   * `liftR` too: the forward-travelling hand rises, the trailing one hangs.
   *
   * And the lift also BENDS the limb, which is the part that took three goes to
   * get right. Two straight segments hinged at one joint must cross at the
   * passing position — that is simply what legs do. The defect was that they were
   * *collinear* there: with `swing` at 0 both left the joint on the same bearing,
   * so the lifted one was merely a shorter copy drawn along the other, and no
   * amount of extra offset at the far end fixes that (measure the ANGLE at the
   * joint, not the distance between endpoints, and it stays 0°).
   *
   * A knee fixes it, and is what real animation does: each limb is drawn as two
   * segments through a mid-joint, and the lift pushes that mid-joint forward. A
   * bent limb and a straight one from the same origin cannot lie on top of each
   * other whatever the phase, so the frames at cycle 0 and 0.5 — the ones that
   * used to read as one-legged — now read as a knee coming through.
   */

  /*
   * A limb as two equal bones through a joint, solved so the limb is ALWAYS
   * `length` long. Two-bone IK, the same sum-of-angles solve an animation rig
   * does: the joint sits on the perpendicular bisector of the chord from origin
   * to end, offset by however much is needed to take up the slack.
   *
   * Fixing the length is what makes the bend correct rather than tuned. Pushing
   * the joint sideways by a constant (which is what this did first) gives a
   * limb whose length changes with the phase, so a foot lifted 30 units into a
   * 21-unit span crumples into a wedge — a shape no leg makes. Here the same
   * frame just bends more, because a shorter chord means more slack.
   *
   * `dir` is which way the joint breaks: +1 forward, -1 back. A knee and an
   * elbow break opposite ways, and that difference is most of what tells the
   * viewer which limb they are looking at.
   */
  const limb = (
    ox: number,
    oy: number,
    fx: number,
    fy: number,
    length: number,
    dir: number,
  ) => {
    let dx = fx - ox;
    let dy = fy - oy;
    let d = Math.hypot(dx, dy) || 0.001;

    /*
     * The reachable band. Nothing can reach further than it is long, and —
     * just as important — nothing folds flatter than MIN_FOLD of its length.
     * Ends outside the band are pushed onto it.
     *
     * The upper clamp is why the strides below can be generous: the geometry
     * takes back whatever it cannot afford. The lower clamp is what stops a
     * limb doubling onto itself, which is a real shape the naive solve will
     * happily produce — an arm asked to reach a point three units from its own
     * shoulder folds the hand right back onto the shoulder. At 0.55 of the
     * length the two bones subtend about 67° at the joint, which is a hard
     * bend but still legibly a bend.
     */
    const MIN_FOLD = 0.55;
    const reach = Math.min(length, Math.max(length * MIN_FOLD, d));
    const k = reach / d;
    dx *= k;
    dy *= k;
    d = reach;

    const ex = ox + dx;
    const ey = oy + dy;

    // Slack to be taken up by the bend: half a bone, minus half a chord.
    const half = length / 2;
    const off = Math.sqrt(Math.max(0, half * half - (d / 2) * (d / 2)));

    // Perpendicular to the chord. For a limb hanging down this points forward.
    const jx = (ox + ex) / 2 + (dy / d) * off * dir;
    const jy = (oy + ey) / 2 + (-dx / d) * off * dir;

    return `M${ox.toFixed(2)} ${oy.toFixed(2)} L${jx.toFixed(2)} ${jy.toFixed(2)} L${ex.toFixed(2)} ${ey.toFixed(2)}`;
  };

  /*
   * His actual proportions, measured off the standing pose so the gaits cannot
   * drift away from it: hip (50,95) to foot (38,148) is 54, shoulder (50,62) to
   * hand (32,86) is 30.
   */
  const LEG = 54;
  const ARM = 30;

  /*
   * He is side-on in the gaits, so one arm and one leg are the FAR side of him
   * and are drawn slightly shorter. This is honest perspective, but it is here
   * for a mechanical reason: two limbs of equal length hinged at one point put
   * their joints on the same circle, so whenever their ends coincide their
   * knees coincide too and the thighs land exactly on top of each other. Two
   * different radii cannot do that at any phase.
   */
  const FAR = 0.93;

  /*
   * An arm, swung as an ANGLE about the shoulder at a fixed radius, rather than
   * aimed at a point in space like a foot is.
   *
   * This is the right model because an arm in a gait holds a roughly constant
   * bend — it is not reaching for anything, it is counterweighting the legs. And
   * because the radius is fixed, the chord is fixed, so the elbow angle is
   * constant BY CONSTRUCTION: `hold` is the bend, directly. Aiming arms at
   * points is what produced wedges, since the hand rest sat 19 units from a
   * 30-long arm and every bit of lift shortened the chord further, folding the
   * hand back toward the shoulder.
   *
   * `turn` is radians from hanging straight down, positive forward.
   *
   * Two antiphase arms MUST cross — that is not the defect, and chasing a
   * non-zero closest approach is chasing something a gait cannot have. The
   * defect is extended parallel overlap: at the crossing phase two arms of the
   * same hold are the same shape, so they lie along each other for their whole
   * length and stack into a solid blob. Giving the two arms noticeably different
   * HOLDS is what fixes it — a nearly-straight arm and a folded one cannot be
   * parallel however the phase lines up — which is why the callers below pass a
   * different bend for the near and far arm rather than mirroring one value.
   */
  const arm = (sx: number, sy: number, turn: number, hold: number, len: number) =>
    limb(sx, sy, sx + Math.sin(turn) * len * hold, sy + Math.cos(turn) * len * hold, len, -1);

  switch (pose) {
    /*
     * The neutral frame every other pose is measured against: head centred at
     * (50,38) with r=14 so its underside meets the spine at y=52, shoulders at
     * y=62, hips at y=95. Getting these to actually touch matters more than it
     * sounds — a head floating off the neck reads as broken clip art.
     */
    case 'blank':
    case 'standing':
      return {
        spine: 'M50 52 L50 95',
        head: 'M50 24 A14 14 0 1 1 49.9 24 Z',
        armL: 'M50 62 L32 86',
        armR: 'M50 62 L68 86',
        legL: 'M50 95 L38 148',
        legR: 'M50 95 L62 148',
      };

    case 'walking': {
      // Head and shoulders lean together, so the neck never disconnects.
      const lean = swing * 1.5;
      /*
       * A SIDE-ON gait, so both feet swing around the same centre line (x=50)
       * in antiphase — one forward while the other is back. Resting them apart
       * at 38/62 and then swinging them is a front-facing stance with a
       * side-facing walk bolted on: the feet travel toward each other and meet
       * in the middle, which draws as one thick leg instead of a stride.
       *
       * The feet also lift as they pass under the body (abs of the phase), or
       * he skates rather than walks.
       */
      const STRIDE = 15;
      return {
        spine: `M${50 + lean} 52 L${50 - lean} 95`,
        head: `M${50 + lean} 24 A14 14 0 1 1 ${49.9 + lean} 24 Z`,
        /*
         * Knees break forward, elbows back. The stride numbers are generous
         * because the IK clamps whatever cannot be reached, so a leg at full
         * extension straightens itself rather than needing a tuned maximum.
         */
        /*
         * Arms counter the legs, so each swings with the OPPOSITE leg. The far
         * arm hangs nearly straight (0.97) and the near one is visibly bent
         * (0.75), which is what stops them merging when they cross; the far
         * shoulder also sits a little behind and below the near one, as it does
         * in any side view.
         */
        armL: arm(46, 64, -0.35 + anti * 0.46, 0.97, ARM * FAR),
        armR: arm(50 + lean, 62, 0.35 + swing * 0.46, 0.75, ARM),
        legL: limb(50 - lean, 95, 50 + swing * STRIDE, 148 - liftL * 9, LEG, 1),
        legR: limb(50 - lean, 95, 50 + anti * STRIDE, 148 - liftR * 9, LEG * FAR, 1),
      };
    }

    case 'running': {
      /*
       * Pitched forward: shoulders lead the hips. Side-on like the walk, with
       * both feet swinging around the hip rather than around two separate
       * resting positions, but with a much longer stride and a much higher
       * knee lift — the difference between a walk and a run is mostly how far
       * off the ground the trailing foot gets.
       */
      const shoulder = 57 + swing * 2;
      const hip = 48 + swing * 2;
      const STRIDE = 28;
      return {
        spine: `M${shoulder} 54 L${hip} 95`,
        head: `M${shoulder + 3} 26 A14 14 0 1 1 ${shoulder + 2.9} 26 Z`,
        /*
         * Same rig as the walk, driven harder: a longer stride and a much
         * higher lift. The IK absorbs both — the higher the knee comes, the
         * shorter the chord and so the deeper the fold, which is precisely the
         * difference between walking and running.
         */
        /*
         * Pumping, not swinging: a much wider arc than the walk, and tight
         * holds — a sprinter's elbow stays near 90°. Same trick as the walk to
         * keep them legible through the crossing, with the two holds further
         * apart because the wider arc gives them more chance to line up.
         */
        armL: arm(shoulder - 4, 65, -0.45 + anti * 1.05, 0.85, ARM * FAR),
        armR: arm(shoulder, 63, 0.45 + swing * 1.05, 0.6, ARM),
        /*
         * Knee lift is what separates a run from a walk, but it is bounded by
         * the leg's own length: past about 14 units off the ground the ankle
         * comes so close to the hip that the leg folds to a wedge rather than
         * a knee. The stride does the rest of the work.
         */
        legL: limb(hip, 95, hip + swing * STRIDE, 146 - liftL * 14, LEG, 1),
        legR: limb(hip, 95, hip + anti * STRIDE, 146 - liftR * 14, LEG * FAR, 1),
      };
    }

    case 'tripped':
      // Mid-air, pitched forward, limbs flung — the instant before landing.
      return {
        spine: 'M38 84 L74 100',
        head: 'M28 78 A13 13 0 1 1 27.9 78 Z',
        armL: 'M46 88 L28 66',
        armR: 'M46 88 L36 112',
        legL: 'M74 100 L96 82',
        legR: 'M74 100 L92 120',
      };

    case 'scribbled':
      /*
       * Not a pose so much as a collapse: the six strokes become overlapping
       * scrawl on the ground. Still six paths, so he can be redrawn from here
       * without a cut — which is what makes the next spread work.
       */
      return {
        spine: 'M30 138 C42 128, 58 146, 72 134 C60 142, 44 130, 32 140',
        head: 'M24 132 C18 124, 28 118, 34 124 C40 130, 30 138, 24 132 Z',
        armL: 'M36 136 C26 142, 46 148, 34 150',
        armR: 'M52 138 C64 132, 54 150, 68 144',
        legL: 'M64 140 C78 134, 70 150, 84 142',
        legR: 'M70 146 C82 148, 74 138, 90 146',
      };

    case 'holding':
      // Upright, one arm raised — he has taken the pen.
      return {
        spine: 'M50 52 L50 95',
        head: 'M50 24 A14 14 0 1 1 49.9 24 Z',
        armL: 'M50 62 L30 84',
        armR: 'M50 62 L78 44',
        legL: 'M50 95 L38 148',
        legR: 'M50 95 L62 148',
      };

    case 'tearing':
      // Braced, both arms up and gripping — pulling the page apart.
      return {
        spine: 'M50 54 L47 96',
        head: 'M50 26 A14 14 0 1 1 49.9 26 Z',
        armL: 'M50 64 L26 38',
        armR: 'M50 64 L76 36',
        legL: 'M47 96 L30 146',
        legR: 'M47 96 L66 144',
      };
  }
}

/*
 * The running order, in beats of scroll. Like a song: intro, verse, build, drop, verse, breakdown,
 * build, final drop, outro. To give a moment more room, move everything after it together.
 *
 *  0  LOAD     a generic grey website, still loading (skeleton shimmer); something knocks behind the box
 *  1.5 KNOCK   the page stops on the media box. Knocks from behind: the skin bulges like rubber.
 *  6  PUSH     a fist pushes through, the X seams strain and split
 *  8  RIP      the four flaps burst open along the X; a dark well behind the page; an eye looks out
 * 13  OUT      he leaps out of the box, over the camera, and lands on the call-to-action: it turns red
 * 21  SNAP     he snaps and the page starts keeping time (every bar, a new part joins in)
 * 41  PEEL     the nav peels off and becomes a ribbon he rides; the page tilts: it is a sheet in space
 * 61  DROP     the page breaks along its layout into slabs that fly in 3D; cuts on every beat
 * 93  FLOOR    the slabs fall flat into a dance floor; every beat a different drawing style
 * 117 QUIET    everything falls away; one box floats in the dark; it opens; the Spark
 * 137 RISE     he takes the Spark; the pieces come back as ink outlines, circling faster
 * 153 SLAM     the final drop: every piece slams back into place, now his site, ink on paper
 * 177 HOME     Max's site, alive. Say hi.
 */
export const T = {
  pin: 1.5, k1: 2.2, k2: 3.6, k3: 5, push: 6.4, rip: 8.4, peek: 9.2, jump: 12.9, land: 16.4, stand: 18,
  snap: 21, peel: 41, drop: 61, floor: 93, quiet: 117, rise: 137, slam: 153, home: 177, end: 193,
};
export const TOTAL = T.end;
/** scroll px per beat, from the stage height */
export const pxPerBeat = (H: number) => Math.round(H * 0.13);

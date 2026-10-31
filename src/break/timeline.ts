/*
 * The running order, in beats of scroll. Like a song: intro, verse, build, drop, verse, breakdown,
 * build, final drop, outro. To give a moment more room, move everything after it together.
 *
 *  0  LOAD     a generic grey website, still loading (skeleton shimmer). It scrolls like any page.
 *  4  KNOCK    the page stops. Something knocks from behind the media box: the skin bulges like rubber.
 * 11  PUSH     a fist pushes through, the X seams strain and split
 * 13  RIP      the four flaps burst open along the X; a dark well behind the page; an eye looks out
 * 17  OUT      he leaps out of the box, over the camera, and lands on the call-to-action: it turns red
 * 26  SNAP     he snaps and the page starts keeping time (every bar, a new part joins in)
 * 46  PEEL     the nav peels off and becomes a ribbon he rides; the page tilts: it is a sheet in space
 * 66  DROP     the page breaks along its layout into slabs that fly in 3D; cuts on every beat
 * 98  FLOOR    the slabs fall flat into a dance floor; every beat a different drawing style
 * 122 QUIET    everything falls away; one box floats in the dark; it opens; the Spark
 * 142 RISE     he takes the Spark; the pieces come back as ink outlines, circling faster
 * 158 SLAM     the final drop: every piece slams back into place, now his site, ink on paper
 * 182 HOME     Max's site, alive. Say hi.
 */
export const T = {
  pin: 4, k1: 5.5, k2: 7.5, k3: 9.5, push: 11, rip: 13, peek: 13.8, jump: 17.5, land: 21, stand: 22.6,
  snap: 26, peel: 46, drop: 66, floor: 98, quiet: 122, rise: 142, slam: 158, home: 182, end: 198,
};
export const TOTAL = T.end;
/** scroll px per beat, from the stage height */
export const pxPerBeat = (H: number) => Math.round(H * 0.13);

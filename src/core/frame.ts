/** Everything a scene needs to draw one frame of the film. */
export interface Frame {
  ctx: CanvasRenderingContext2D;
  /** viewport in CSS px */
  w: number;
  h: number;
  /** layout unit: 1/100 of the composition column */
  u: number;
  portrait: boolean;
  /** the playhead, in beats, eased toward the scroll position */
  B: number;
  /** playhead speed, beats per second (signed) */
  vB: number;
  /** wall clock in seconds — the ambient motion runs on this, scroll or not */
  t: number;
  dt: number;
  /** seconds since the film was ready; drives the opening title */
  intro: number;
  reduced: boolean;
  /** true on the frame the playhead passes beat `b`, in either direction */
  crossed(b: number): boolean;
  /** true only when passing `b` going forward */
  crossedFwd(b: number): boolean;
  shake(amount: number): void;
  flash(amount: number, color?: string): void;
}

/** Act boundaries in beats. One beat is ~0.7 of a screen of scrolling. */
export const ACT = {
  machineEnd: 12.6,
  arcadeStart: 12.3,
  arcadeEnd: 16.62,
  matchStart: 16.3,
  matchEnd: 24.0,
  finaleStart: 23.0,
  creditsStart: 26.55,
  END: 34.0,
};

export const CHAPTERS = [
  { at: 0, n: 'I', name: 'Ink' },
  { at: 7.4, n: 'II', name: 'Machine' },
  { at: 12.55, n: 'III', name: 'Arcade' },
  { at: 16.5, n: 'IV', name: 'Match' },
  { at: 23.6, n: 'V', name: 'Hello' },
  { at: 26.7, n: 'VI', name: 'Credits' },
];

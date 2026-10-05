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
  /** set while a hold is playing: the film is paused at B and `p` runs 0→1 */
  hold: { kind: 'thunder' | 'titan' | 'dash' | 'alter' | 'powers' | 'sign'; p: number } | null;
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
  /** the ball turns into a gold bolt and tears up the screen: the cut out of the machine */
  cut: [12.3, 12.4] as const,
  machineEnd: 12.4,
  matchStart: 12.4,
  matchEnd: 20.0,
  finaleStart: 18.7,
  creditsStart: 22.55,
  END: 30.0,
};

export const CHAPTERS = [
  { at: 0, n: 'I', name: 'Ink' },
  { at: 7.4, n: 'II', name: 'Machine' },
  // Alter plays inside a hold at 12.63; its chapter starts as the bolt cuts to the night sky
  { at: 12.45, n: 'III', name: 'Alter' },
  { at: 12.66, n: 'IV', name: 'Match' },
  // the pull-back plays inside a hold at 18.7, and the page follows it
  { at: 18.69, n: 'V', name: 'Hello' },
  { at: 22.7, n: 'VI', name: 'Credits' },
];

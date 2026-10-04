import { C } from './style';

/**
 * PICK A SIDE.
 *
 * The viewer's choice of rival. Whoever they pick overpowers the beam lock,
 * wins the Pong rally, wears the attacking kit in the match and scores, and
 * is the blade Blot picks up after the credits. Until they choose, the film
 * flips a coin.
 */
export type Side = 'blue' | 'green';

export const SIDE: { pick: Side; chosen: boolean; changedAt: number } = {
  pick: Math.random() < 0.5 ? 'blue' : 'green',
  chosen: false,
  changedAt: -10,
};

export interface Team { c: string; hot: string; name: string; short: string; word: string; fg: string }
export const TEAM: Record<Side, Team> = {
  blue: { c: C.blue, hot: C.blueHot, name: 'BLUE', short: 'BLU', word: 'Blue', fg: C.white },
  green: { c: C.green, hot: C.greenHot, name: 'GREEN', short: 'GRN', word: 'Green', fg: C.ink },
};

export const win = () => TEAM[SIDE.pick];
export const lose = () => TEAM[SIDE.pick === 'blue' ? 'green' : 'blue'];
/** +1 when green (the right-hand fighter) wins, -1 when blue does */
export const winDir = () => (SIDE.pick === 'green' ? 1 : -1);

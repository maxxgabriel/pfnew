export type Key = 'ink'|'pixel'|'water'|'comic'|'clay'|'chalk'|'hose';
export interface WorldFrame {
  ctx: CanvasRenderingContext2D; w: number; h: number; u: number; portrait: boolean;
  P: number; vP: number; t: number; dt: number; idle: number; calm: boolean; face: number; intro: number;
  crossedFwd(L: number): boolean; shake(px: number): void; flash(a: number, col?: string): void;
  hot(id: string, x: number, y: number, r: number): void; since(id: string): number; over(id: string): boolean;
}
export interface District { key: Key; name: string; len: number; preload(): void; draw(f: WorldFrame,L: number): void; tap?(id: string,f: WorldFrame): void }
export const clamp = (n: number) => Math.max(0, Math.min(1,n));

/*
 * The finger, for the day scenes: where it is, how fast it moves, whether it's
 * held down (holding stops the rain), taps, and the phone's tilt (the layers
 * drift with it like looking through a window). Everything only listens; the
 * page still scrolls.
 */

export const finger = { x: 0, y: 0, vx: 0, vy: 0, down: false, t: -99, downAt: -99 };
export const taps: { x: number; y: number; t: number }[] = [];
export const tilt = { x: 0, y: 0, tx: 0, ty: 0, on: false };

export function fingerDown(x: number, y: number, t: number) {
  finger.down = true;
  finger.downAt = t;
  finger.x = x;
  finger.y = y;
  finger.vx = finger.vy = 0;
  finger.t = t;
}
export function fingerMove(x: number, y: number, t: number) {
  const dt = Math.max(0.008, t - finger.t);
  finger.vx = (x - finger.x) / dt;
  finger.vy = (y - finger.y) / dt;
  if (Math.hypot(x - finger.x, y - finger.y) > 12) finger.downAt = t; // moving isn't holding
  finger.x = x;
  finger.y = y;
  finger.t = t;
}
export function fingerUp() {
  finger.down = false;
  finger.vx = finger.vy = 0;
}
export function addDayTap(x: number, y: number, t: number) {
  taps.push({ x, y, t });
  if (taps.length > 40) taps.shift();
}
/** seconds the finger has been held still (0 if not held) */
export function holding(t: number) {
  return finger.down ? Math.max(0, t - finger.downAt) : 0;
}
/** the finger, if it moved recently */
export function liveFinger(t: number) {
  return t - finger.t < 1.5 ? finger : null;
}

function onTilt(e: DeviceOrientationEvent) {
  if (e.gamma == null || e.beta == null) return;
  tilt.on = true;
  tilt.tx = Math.max(-1, Math.min(1, e.gamma / 25));
  tilt.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
}
let asked = false;
/** turn on tilt (iOS asks for permission, which needs a tap) */
export function enableTilt() {
  if (asked) return;
  asked = true;
  const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof D?.requestPermission === 'function') {
    D.requestPermission().then((r) => { if (r === 'granted') window.addEventListener('deviceorientation', onTilt); }).catch(() => {});
  } else window.addEventListener('deviceorientation', onTilt);
}
export function stepTilt(dt: number) {
  const k = 1 - Math.exp(-dt * 4);
  tilt.x += (tilt.tx - tilt.x) * k;
  tilt.y += (tilt.ty - tilt.y) * k;
}

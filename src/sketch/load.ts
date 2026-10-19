/*
 * THE LOADER.
 *
 * The drawings and paintings are separate files (inlined only in a
 * single-file build), fetched a few at a time in the order the film needs
 * them — chapter I's first — so the opening plays while the rest arrives.
 * Anything a scene asks for before it has loaded jumps the queue.
 */

const MAX_AT_ONCE = 6;
interface Job { url: string; prio: number; im: HTMLImageElement; started: boolean }
const jobs = new Map<string, Job>();
let running = 0;

function pump() {
  while (running < MAX_AT_ONCE) {
    let next: Job | null = null;
    for (const j of jobs.values()) if (!j.started && (!next || j.prio < next.prio)) next = j;
    if (!next) return;
    const j = next;
    j.started = true;
    running++;
    const done = () => { running--; pump(); };
    j.im.onload = done;
    j.im.onerror = done;
    j.im.decoding = 'async';
    j.im.src = j.url;
  }
}

/** queue an image (lower prio loads sooner); returns its element, which fills in when loaded */
export function queue(url: string, prio: number): HTMLImageElement {
  let j = jobs.get(url);
  if (!j) {
    j = { url, prio, im: new Image(), started: false };
    jobs.set(url, j);
    queueMicrotask(pump);
  } else if (prio < j.prio) j.prio = prio;
  return j.im;
}

/** a scene wants this now: move it to the front */
export function hurry(url: string) {
  const j = jobs.get(url);
  if (j && !j.started) { j.prio = -1; pump(); }
}

// The boy's drawings and the paintings, shared with the old site module (src/site/art.ts).
export { url, image, load, pose, background } from '../site/art';
const siteArt = import.meta.glob('../site/art/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
/** the lettering/sticker art in src/site/art (logo_ink, logo_pixel … style_*, sticker_*) */
export const artUrl = (name: string) => siteArt[`../site/art/${name}.webp`];

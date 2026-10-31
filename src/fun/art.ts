/*
 * Only the drawings this site uses (the shared loader in src/site/art.ts pulls in all 465 of his
 * drawings and every painting): the poses below, and his face in the seven styles.
 */
const poses = import.meta.glob(
  ['../assets/sketch/{bye,comedy,extra,fall,ftkick,hero,leap,powerup,run8,snap,still}_*.webp', '../assets/sketch/curious.webp'],
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;
const faces = import.meta.glob('../site/art/style_*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

/** one of his drawings, by key (e.g. run8_3) */
export const url = (key: string) => poses[`../assets/sketch/${key}.webp`];
/** his face in a style: ink, pixel, comic, water, clay, chalk, hose */
export const faceUrl = (style: string) => faces[`../site/art/style_${style}.webp`];

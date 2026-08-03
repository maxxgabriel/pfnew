import styles from './Paper.module.css';

/**
 * THE PAPER — the surface everything is drawn on.
 *
 * Two fixed layers over the whole book:
 *
 *   tooth   the fibre of the sheet, so ink sits *in* paper rather than on a
 *           flat colour
 *   edges   the shadow of the binding down one side, and a soft falloff at
 *           the outer edge, which is what makes it read as a bound book
 *           rather than a background colour
 *
 * The tooth is one rasterised noise tile, not a live SVG filter: a filter over
 * a scrolling page is expensive, and this only ever needs compositing once.
 */
export function Paper() {
  return (
    <div className={styles.paper} aria-hidden="true">
      <div className={styles.tooth} />
      <div className={styles.spine} />
      <div className={styles.edges} />
    </div>
  );
}

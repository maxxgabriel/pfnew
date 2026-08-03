import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
/*
 * TWO FAMILIES, and the roman/italic split of the first does the work of three.
 *
 * Bodoni Moda carries both the display type and the "handwritten" voice — upright for
 * headlines, italic for the cards. That replaced a condensed poster face (Anton) and a
 * marker script (Caveat), which between them made the book read as casual rather than
 * considered.
 *
 * The `wght` files rather than `index.css`: the full package ships an optical-size
 * axis too, and nothing here changes optical size — it would be a second variable
 * font downloaded to be ignored.
 */
import '@fontsource-variable/bodoni-moda/wght.css';
import '@fontsource-variable/bodoni-moda/wght-italic.css';
import '@fontsource-variable/space-grotesk/index.css';
/*
 * Bangers is the cover's face — the one comic register that lives OUTSIDE the
 * Bodoni roman/italic pairing. It only ever appears on the cover (the masthead
 * and the burst words), so the sketchbook's own voice is untouched; when the
 * cover lifts away the book goes back to ink on paper.
 */
import '@fontsource/bangers/index.css';
import '@fontsource/luckiest-guy/index.css';
import './styles/global.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { useEffect, useId } from 'react';

type Props = {
  /** Distance of the RGB channel split in pixels */
  intensity?: number;
};

/**
 * CHROMATIC ABERRATION — a hidden SVG filter that splits red and cyan channels.
 *
 * Apply to any element via `filter: url(#<id>)`. The filter is rendered once in
 * the DOM and referenced by ID, so multiple elements can share it.
 */
export function ChromaticAberration({ intensity = 2 }: Props) {
  const id = useId().replace(/:/g, '_');

  useEffect(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML = `
      <filter id="${id}" color-interpolation-filters="sRGB">
        <feOffset in="SourceGraphic" dx="${intensity}" dy="0" result="red-shift" />
        <feComponentTransfer in="red-shift" result="red">
          <feFuncR type="identity" />
          <feFuncG type="discrete" tableValues="0" />
          <feFuncB type="discrete" tableValues="0" />
        </feComponentTransfer>

        <feOffset in="SourceGraphic" dx="${-intensity}" dy="0" result="cyan-shift" />
        <feComponentTransfer in="cyan-shift" result="cyan">
          <feFuncR type="discrete" tableValues="0" />
          <feFuncG type="identity" />
          <feFuncB type="identity" />
        </feComponentTransfer>

        <feBlend in="red" in2="cyan" mode="screen" />
      </filter>
    `;
    document.body.appendChild(svg);
    return () => { svg.remove(); };
  }, [id, intensity]);

  return null;
}

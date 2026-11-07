/*
 * Line boil: the wobble of hand-drawn animation, where every frame is traced again and the ink
 * never sits quite still. A turbulence displacement whose seed steps about eight times a second;
 * anything with `filter: url(#boil)` shimmers like it was drawn by hand on every frame.
 */
export function initBoil(calm: boolean) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = `<filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="1" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="c"/>
    <feDisplacementMap in="SourceGraphic" in2="c" scale="1.8" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
  document.body.prepend(svg);
  if (calm) return;
  const turb = svg.querySelector('feTurbulence')!;
  let k = 0;
  setInterval(() => { k = (k + 1) % 3; turb.setAttribute('seed', String(1 + k * 7)); }, 125);
}

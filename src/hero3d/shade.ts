import * as THREE from 'three';

/*
 * Anime 3D shading for the hero.
 *
 * TOON: a hard terminator between a lit tone and a tinted shadow tone (cool
 * blue-violet shadows, like cel animation), a faint second band near the
 * light, and a rim of coloured light on the edge that faces the rim source.
 * Works for skinned and rigid meshes, reads vertex colours.
 *
 * OUTLINE: the inverted hull: the same mesh pushed out along its normals,
 * back faces only, flat dark: the ink line.
 *
 * Every material shares one set of uniforms, so a frame sets the light once.
 */

// colours pass straight through: the page is drawn in sRGB and so is he
THREE.ColorManagement.enabled = false;

export const U = {
  uLight: { value: new THREE.Vector3(-0.5, 0.6, 0.6).normalize() },
  uRimDir: { value: new THREE.Vector3(0.6, 0.3, -0.5).normalize() },
  uRim: { value: new THREE.Color('#9fe8ff') },
  uRimA: { value: 1 },
  uSil: { value: 0 },
  uShadow: { value: new THREE.Color('#8f93c8') },
  uOutline: { value: 0.006 },
  uLine: { value: new THREE.Color('#0d0f1c') },
};

const toonVert = /* glsl */ `
#include <common>
#include <color_pars_vertex>
#include <skinning_pars_vertex>
varying vec3 vN;
varying vec3 vV;
void main() {
  #include <color_vertex>
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
  vV = -mvPosition.xyz;
}
`;

const toonFrag = /* glsl */ `
#include <common>
#include <color_pars_fragment>
uniform vec3 uLight;
uniform vec3 uRimDir;
uniform vec3 uRim;
uniform float uRimA;
uniform float uSil;
uniform vec3 uShadow;
uniform vec3 uBase;
uniform float uGloss;
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 base = uBase;
  #ifdef USE_COLOR
    base *= vColor.rgb;
  #endif
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  float nl = dot(n, normalize(uLight));
  float lit = smoothstep(-0.02, 0.06, nl);
  vec3 col = mix(base * uShadow, base, lit);
  // a soft second band toward the light, and a sharp gloss for hair
  col += base * 0.07 * smoothstep(0.7, 0.75, nl);
  vec3 h = normalize(normalize(uLight) + v);
  col += vec3(1.0) * uGloss * smoothstep(0.93, 0.95, dot(n, h)) * lit;
  // rim: the edge that faces the rim light
  float fres = 1.0 - max(dot(n, v), 0.0);
  float rim = smoothstep(0.5, 0.58, fres) * smoothstep(-0.1, 0.35, dot(n, normalize(uRimDir)));
  col = mix(col, uRim, clamp(rim * uRimA, 0.0, 1.0));
  if (uSil > 0.5) col = mix(vec3(0.02, 0.025, 0.045), uRim, clamp(rim * uRimA * 1.2, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function toon(color: THREE.ColorRepresentation, o: { vertexColors?: boolean; gloss?: number; side?: THREE.Side } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uBase: { value: new THREE.Color(color) }, uGloss: { value: o.gloss ?? 0 } },
    vertexShader: toonVert,
    fragmentShader: toonFrag,
    vertexColors: !!o.vertexColors,
    side: o.side ?? THREE.FrontSide,
  });
}

const outlineVert = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
uniform float uOutline;
uniform float uWidth;
void main() {
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  transformed += normalize(objectNormal) * uOutline * uWidth;
  #include <project_vertex>
}
`;
const outlineFrag = /* glsl */ `
uniform vec3 uLine;
void main() { gl_FragColor = vec4(uLine, 1.0); }
`;

export function outline(width = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uOutline: U.uOutline, uLine: U.uLine, uWidth: { value: width } },
    vertexShader: outlineVert,
    fragmentShader: outlineFrag,
    side: THREE.BackSide,
  });
}

/** an unlit textured decal (eyes, brows, mouth, the number), hidden in silhouette */
export function decal(tex: THREE.Texture) {
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  return m;
}

/* ============================================================ textures */

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/** an anime eye, looking toward +x of the texture (the nose side is +x): lash line, teal iris, two glints */
export function eyeTex(mirror: boolean) {
  return canvasTex(256, 256, (c) => {
    if (mirror) {
      c.translate(256, 0);
      c.scale(-1, 1);
    }
    // the white
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(30, 120);
    c.quadraticCurveTo(110, 40, 226, 92);
    c.quadraticCurveTo(200, 200, 120, 206);
    c.quadraticCurveTo(52, 196, 30, 120);
    c.fill();
    // the iris: tall, teal, darker at the top
    c.save();
    c.clip();
    const g = c.createLinearGradient(0, 60, 0, 220);
    g.addColorStop(0, '#0f4450');
    g.addColorStop(0.45, '#1f8f8a');
    g.addColorStop(1, '#6ff0cf');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(140, 136, 58, 76, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#062226';
    c.beginPath();
    c.ellipse(142, 136, 22, 36, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(8,40,44,0.8)';
    c.lineWidth = 6;
    c.beginPath();
    c.ellipse(140, 136, 58, 76, 0, 0, Math.PI * 2);
    c.stroke();
    // lid shadow across the top of the eye
    c.fillStyle = 'rgba(40,60,110,0.35)';
    c.fillRect(0, 0, 256, 104);
    c.restore();
    // glints
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(118, 108, 18, 22, -0.3, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(162, 172, 8, 0, Math.PI * 2);
    c.fill();
    // the upper lash line: heavy, with a flick at the outer corner
    c.fillStyle = '#121423';
    c.beginPath();
    c.moveTo(18, 128);
    c.quadraticCurveTo(100, 30, 236, 84);
    c.lineTo(244, 100);
    c.quadraticCurveTo(110, 58, 30, 132);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(22, 124);
    c.lineTo(4, 112);
    c.lineTo(34, 116);
    c.fill();
    // a soft lower lash
    c.strokeStyle = 'rgba(60,40,50,0.7)';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(80, 200);
    c.quadraticCurveTo(140, 214, 196, 176);
    c.stroke();
  });
}

export function browTex() {
  return canvasTex(256, 64, (c) => {
    c.fillStyle = '#8d97ad';
    c.beginPath();
    c.moveTo(20, 44);
    c.quadraticCurveTo(120, 12, 236, 30);
    c.lineTo(232, 40);
    c.quadraticCurveTo(120, 28, 24, 54);
    c.closePath();
    c.fill();
  });
}

export function mouthTex() {
  return canvasTex(128, 64, (c) => {
    c.strokeStyle = '#7a3d3d';
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(30, 30);
    c.quadraticCurveTo(64, 38, 98, 28);
    c.stroke();
  });
}

export function numberTex(n: string) {
  return canvasTex(256, 256, (c) => {
    c.fillStyle = '#10131c';
    c.font = '900 190px "Dela Gothic One", "Arial Black", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(n, 128, 138);
  });
}

// "landscape" variant: an animated ASCII landscape (sun, clouds, mountains, pines, a lake)
// with birds crossing, clouds drifting and the water shimmering. The scene itself lives in
// profile/landscape.json, exported from the Design canvas; this file only draws it as SVG.
import { readFileSync } from 'node:fs';
import { root, esc } from './lib.mjs';

const S = JSON.parse(readFileSync(root + 'profile/landscape.json', 'utf8'));
const MONO_BOLD = readFileSync(root + 'fonts/jbmono-Bold.woff2').toString('base64');
const W = 880;
const H = S.height;
const CW = S.fontSize * 0.6; // JetBrains Mono advance
const X0 = (W - S.cols * CW) / 2;
const BASE = S.fontSize * 0.78; // baseline inside a row
const ALT = 'An ASCII landscape: a halftone sun over snowy mountains, pine forests and a lake, with clouds drifting and birds crossing.';

const FRAME = { light: { sky: '#fbfaf6', line: '#e7e7e7', bird: '#3a3a3a' }, dark: { sky: '#0b0f17', line: '#252525', bird: '#d6d6d6' } };

function textRow(runs, x, y) {
  const body = runs.map(([c, t]) => (c ? `<tspan class="${c}">${esc(t)}</tspan>` : esc(t))).join('');
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}">${body}</text>`;
}

function style(mode) {
  const vars = { ...S.colors[mode], ...FRAME[mode] };
  // A class with no color in this theme (the stars in light) is not drawn.
  const fills = Object.entries(S.classes).map(([c, v]) => `.${c}{fill:${vars[v] ?? 'none'}}`).join('');
  const shim = Object.entries(S.shimmer).map(([c, [s, rev]]) => `.${c}{animation:shim ${s}s ease-in-out infinite${rev ? ' reverse' : ''}}`).join('');
  return `@font-face{font-family:RLand;src:url(data:font/woff2;base64,${MONO_BOLD}) format('woff2');font-weight:700}
text{font-family:RLand,'JetBrains Mono',ui-monospace,monospace;font-size:${S.fontSize}px;font-weight:700;white-space:pre;font-variant-ligatures:none}
${fills}${shim}
.drift{animation:drift 44s ease-in-out infinite alternate}.k2{animation-duration:58s;animation-direction:alternate-reverse}.k3{animation-duration:50s;animation-delay:-12s}
.bird text{font-size:10px;fill:${vars.bird}}.bird .sm text{font-size:8px}
.fly{animation:fly 28s linear infinite}.slow{animation-duration:36s}
.up{animation:flap .5s steps(1) infinite}.down{animation:flap .5s steps(1) infinite reverse}
@keyframes fly{0%{transform:translate(0,0)}25%{transform:translate(240px,-8px)}50%{transform:translate(470px,4px)}75%{transform:translate(700px,-6px)}100%{transform:translate(930px,0)}}
@keyframes flap{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes drift{from{transform:translateX(-16px)}to{transform:translateX(16px)}}
@keyframes shim{0%,100%{fill-opacity:1}50%{fill-opacity:.4}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.bird{display:none}}`;
}

// [top, font size small?, flight duration class, delay]
const BIRDS = [[58, false, '', 0], [69, true, '', -1.1], [50, true, '', -1.8], [118, false, 'slow', -15], [128, true, 'slow', -16.2]];

function bird([top, small, slow, delay], i) {
  const d = `animation-delay:${delay}s`;
  const off = i % 2 ? 'animation-delay:-.25s' : '';
  return `<g class="fly ${slow}" style="${d}"><g transform="translate(-24 ${top + 10})"${small ? ' class="sm"' : ''}><text class="up" style="${off}">v</text><text class="down" style="${off}">-</text></g></g>`;
}

export function landscapeFiles(_data, mode) {
  const f = FRAME[mode];
  const top = H - S.art.length * S.rowH;
  const art = S.art.map((r, i) => textRow(r, X0, top + i * S.rowH + BASE)).join('\n');
  const clouds = S.clouds.map((c) => `<g transform="translate(${c.x} ${c.y})"><g class="drift ${c.k}">${c.rows.map((r, i) => textRow(r, 0, i * S.rowH + BASE)).join('')}</g></g>`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ALT)}">
<title>${esc(ALT)}</title>
<style>${style(mode)}</style>
<defs><clipPath id="card"><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14"/></clipPath></defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${f.sky}"/>
<g clip-path="url(#card)">
${clouds}
<g class="bird">${BIRDS.map(bird).join('')}</g>
${art}
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${f.line}"/>
</svg>`;
  return { scene: svg };
}

export function landscapeReadme(_data, pic) {
  return `<p align="center">${pic('scene', '100%', ALT)}</p>\n`;
}

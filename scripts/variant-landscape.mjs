// "landscape" variant: an animated ASCII landscape (sun, clouds, mountains, pines, a lake)
// with birds crossing, clouds drifting and the water shimmering. The scene itself lives in
// profile/landscape.json, exported from the Design canvas; this file only draws it as SVG.
import { readFileSync } from "node:fs";
import { root, esc } from "./lib.mjs";

const S = JSON.parse(readFileSync(root + "profile/landscape.json", "utf8"));
const MONO_BOLD = readFileSync(root + "fonts/jbmono-Bold.woff2").toString(
  "base64",
);
const W = 880;
const H = S.height;
const CW = S.fontSize * 0.6; // JetBrains Mono advance
const X0 = (W - S.cols * CW) / 2;
const BASE = S.fontSize * 0.78; // baseline inside a row
const ALT =
  "An ASCII landscape: a halftone sun (a crescent moon at night) over snowy mountains, pine forests and a lake, with clouds drifting and birds crossing by day, owls by night.";

const FRAME = { light: { bird: "#3a3a3a" }, dark: { bird: "#d6d6d6" } };

// At night the sun becomes a pale crescent moon: same disc, recoloured, with a bite taken
// out of its upper right by a second, offset circle.
const SUN = ["u1", "u2", "u3"];
const MOON = { u1: "#eef1f8", u2: "#cdd5e6", u3: "#8f9bb8" };
function moonArt(art) {
  const cells = [];
  art.forEach((r, y) => {
    let x = 0;
    for (const [c, t] of r)
      for (const ch of t) {
        if (SUN.includes(c) && ch !== " ") cells.push([x, y]);
        x++;
      }
  });
  const xs = cells.map(([x]) => x * CW),
    ys = cells.map(([, y]) => y * S.rowH);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2,
    cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const R = (Math.max(...xs) - Math.min(...xs)) / 2;
  const bx = cx + R * 0.62,
    by = cy - R * 0.22,
    br = R * 0.84;
  return art.map((r, y) => {
    const out = [];
    let x = 0;
    for (const [c, t] of r)
      for (const ch of t) {
        const bitten =
          SUN.includes(c) && Math.hypot(x * CW - bx, y * S.rowH - by) < br;
        const cls = bitten ? null : c,
          glyph = bitten ? " " : ch;
        if (out.length && out[out.length - 1][0] === cls)
          out[out.length - 1][1] += glyph;
        else out.push([cls, glyph]);
        x++;
      }
    return out;
  });
}

function textRow(runs, x, y) {
  const body = runs
    .map(([c, t]) => (c ? `<tspan class="${c}">${esc(t)}</tspan>` : esc(t)))
    .join("");
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}">${body}</text>`;
}

function style(mode) {
  const vars = {
    ...S.colors[mode],
    ...FRAME[mode],
    ...(mode === "dark" ? MOON : {}),
  };
  // A class with no color in this theme (the stars in light) is not drawn.
  const fills = Object.entries(S.classes)
    .map(([c, v]) => `.${c}{fill:${vars[v] ?? "none"}}`)
    .join("");
  const shim = Object.entries(S.shimmer)
    .map(
      ([c, [s, rev]]) =>
        `.${c}{animation:shim ${s}s ease-in-out infinite${rev ? " reverse" : ""}}`,
    )
    .join("");
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
const BIRDS = [
  [58, false, "", 0],
  [69, true, "", -1.1],
  [50, true, "", -1.8],
  [118, false, "slow", -15],
  [128, true, "slow", -16.2],
];

function bird([top, small, slow, delay], i) {
  const d = `animation-delay:${delay}s`;
  const off = i % 2 ? "animation-delay:-.25s" : "";
  return `<g class="fly ${slow}" style="${d}"><g transform="translate(-24 ${top + 10})"${small ? ' class="sm"' : ""}><text class="up" style="${off}">v</text><text class="down" style="${off}">-</text></g></g>`;
}

// Night has owls, not birds: two perched on the tallest pine tips and one that glides
// across the sky now and then, passing in front of the moon as a dark silhouette. Each
// perched owl is a stack of small layers (a dark backing, body, head, eyes) animated on cycles of
// different lengths, so blinks, glances, head tilts and feather ruffles never line up
// the same way twice in a row.
const OWL_FS = 8;
const OWL_CW = OWL_FS * 0.6;
const OWL_LH = 7.2; // row pitch, a little tighter than the font size
// [column, row of the pine tip, which way it likes to look (1 right, -1 left), phase in s]
const PERCHES = [
  [19, 24, 1, 0],
  [231, 40, -1, -7.3],
];
// One row of owl text: runs are [text, class]; the row sits on a 5-column grid.
function owlRow(row, runs, x = 0) {
  const body = runs
    .map(([t, c]) => (c ? `<tspan class="${c}">${esc(t)}</tspan>` : esc(t)))
    .join("");
  return `<text x="${x}" y="${(row * OWL_LH + OWL_FS * 0.8).toFixed(2)}">${body}</text>`;
}
const owlEyes = (l, r, cls) =>
  owlRow(1, [[" "], [l, cls], [",", "beak"], [r, cls]]);
const owlGlow = (cy) =>
  [1.5, 3.5]
    .map(
      (c) =>
        `<circle class="glow" cx="${(c * OWL_CW).toFixed(2)}" cy="${cy.toFixed(2)}" r="4.2" fill="url(#owl-glow)"/>`,
    )
    .join("");
function perchedOwl([col, row, , phase], i) {
  const x = X0 + col * CW + CW / 2 - 2.5 * OWL_CW,
    y = row * S.rowH - 4 * OWL_LH + 1.2;
  const at = (s) => `style="animation-delay:${(phase - s).toFixed(1)}s"`;
  const eyeY = OWL_LH + OWL_FS * 0.8 - 2.2;
  return (
    `<g class="owl" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">` +
    `<rect class="back" x="1.2" y="${(OWL_LH + 1).toFixed(1)}" width="${(5 * OWL_CW - 2.4).toFixed(1)}" height="${(2 * OWL_LH).toFixed(1)}" rx="5"/>` +
    `<g class="ruffle" ${at(0)}>` +
    `<g class="calm" ${at(0)}>${owlRow(2, [["("], ["vvv", "chest"], [")"]])}</g>` +
    `<g class="puff" ${at(0)}>${owlRow(2, [["{"], ["vvv", "chest"], ["}"]])}</g>` +
    `${owlRow(3, [[' " "', "foot"]])}</g>` +
    `<g class="tilt" ${at(2)}>${owlRow(0, [[" v_v"]])}${owlRow(1, [["(   )"]])}` +
    `<g class="look${i}" ${at(4)}>` +
    `<g class="open" ${at(1)}>${owlGlow(eyeY)}${owlEyes("o", "o", "eye")}</g>` +
    `<g class="shut" ${at(1)}>${owlEyes("-", "-", "lid")}</g>` +
    `</g></g></g>`
  );
}
// The glider: mostly a level glide, with a slow pair of wingbeats every few seconds.
const GLIDE_S = 64,
  FLIGHT = 0.75,
  GLIDE_X = [-50, 930];
const MOON_X = [636, 702]; // where the crescent sits, to time the silhouette
function glidingOwl() {
  const pose = (cls, l, r) =>
    `<g class="${cls}"><text y="0"><tspan class="wing">${esc(l)}</tspan>(<tspan class="eye">o</tspan><tspan class="beak">,</tspan><tspan class="eye">o</tspan>)<tspan class="wing">${esc(r)}</tspan></text></g>`;
  return `<g class="owl gx"><g class="gy"><g class="bob">${pose("w0", "~-", "-~")}${pose("w1", "\\\\", "//")}${pose("w2", "//", "\\\\")}</g></g></g>`;
}
const OWL_DEFS = `<defs><radialGradient id="owl-glow"><stop offset="0" stop-color="#ffd75e" stop-opacity=".5"/><stop offset="1" stop-color="#ffd75e" stop-opacity="0"/></radialGradient></defs>`;
const OWL_STYLE = (() => {
  const pct = (v) => `${+v.toFixed(2)}%`;
  const [x0, x1] = GLIDE_X,
    ow = 9 * OWL_CW;
  const when = (x) => ((x - x0) / (x1 - x0)) * FLIGHT * 100; // % of the cycle at which the glider's left edge is at x
  const m0 = when(MOON_X[0] - ow),
    m1 = when(MOON_X[1]);
  const look = (i, d) => `.look${i}{animation:look${i} 13s ease-in-out infinite}
@keyframes look${i}{0%,18%,42%,70%,84%,100%{transform:translateX(0)}22%,38%{transform:translateX(${1.3 * d}px)}74%,80%{transform:translateX(${-1.1 * d}px)}}`;
  return `.owl text{font-size:${OWL_FS}px;fill:#cdb58c;paint-order:stroke;stroke:#0b0f17;stroke-width:2.6px;stroke-linejoin:round}
.owl .eye{fill:#ffd75e}.owl .lid{fill:#8d7a58}.owl .beak{fill:#e8973a}.owl .chest{fill:#9c8862}.owl .foot{fill:#e8973a}.owl .wing{fill:#a8946f}
.owl .back{fill:#0b0f17}
.shut,.puff,.w1,.w2{opacity:0}
.open{animation:owl-open 9s steps(1) infinite}.shut{animation:owl-shut 9s steps(1) infinite}
@keyframes owl-open{0%,23.6%,62%,65.4%{opacity:1}22%,60.4%,63.8%{opacity:0}}
@keyframes owl-shut{0%,23.6%,62%,65.4%{opacity:0}22%,60.4%,63.8%{opacity:1}}
.glow{animation:owl-glow 5s ease-in-out infinite}
@keyframes owl-glow{0%,100%{opacity:.55}50%{opacity:1}}
${PERCHES.map(([, , d], i) => look(i, d)).join("\n")}
.tilt{transform-origin:${(2.5 * OWL_CW).toFixed(1)}px ${(2 * OWL_LH).toFixed(1)}px;animation:owl-tilt 21s ease-in-out infinite}
@keyframes owl-tilt{0%,30%,44%,74%,85%,100%{transform:rotate(0)}33%,41%{transform:rotate(-10deg)}77%,82%{transform:rotate(8deg)}}
.ruffle{transform-origin:${(2.5 * OWL_CW).toFixed(1)}px ${(3.6 * OWL_LH).toFixed(1)}px;animation:owl-ruffle 27s linear infinite}
@keyframes owl-ruffle{0%,52%,56.4%,100%{transform:none}52.6%,54.2%,55.8%{transform:scale(1.07,1.03) rotate(-3deg)}53.4%,55%{transform:scale(1.07,1.03) rotate(3deg)}}
.calm{animation:owl-calm 27s steps(1) infinite}.puff{animation:owl-puff 27s steps(1) infinite}
@keyframes owl-calm{0%,56.4%{opacity:1}52%{opacity:0}}
@keyframes owl-puff{0%,56.4%{opacity:0}52%{opacity:1}}
.gx{transform:translateX(${x0}px);animation:owl-gx ${GLIDE_S}s linear infinite -22s}
.gy{transform:translateY(76px);animation:owl-gy ${GLIDE_S}s ease-in-out infinite -22s}
@keyframes owl-gx{0%{transform:translateX(${x0}px)}${pct(FLIGHT * 100)},100%{transform:translateX(${x1}px)}}
@keyframes owl-gy{0%{transform:translateY(76px)}20%{transform:translateY(98px)}${pct((m0 + m1) / 2)}{transform:translateY(80px)}${pct(FLIGHT * 100)},100%{transform:translateY(46px)}}
.gx text{animation:owl-moon ${GLIDE_S}s linear infinite -22s}.gx .wing{animation:owl-moon-w ${GLIDE_S}s linear infinite -22s}
@keyframes owl-moon{0%,${pct(m0 - 1.5)},${pct(m1 + 1.5)},100%{fill:#cdb58c}${pct(m0 + 1)},${pct(m1 - 1)}{fill:#4a5470}}
@keyframes owl-moon-w{0%,${pct(m0 - 1.5)},${pct(m1 + 1.5)},100%{fill:#a8946f}${pct(m0 + 1)},${pct(m1 - 1)}{fill:#3d4660}}
.bob{animation:owl-bob 4.8s ease-in-out infinite}
@keyframes owl-bob{0%,50%,100%{transform:translateY(0)}60%,84%{transform:translateY(1.4px)}72%,96%{transform:translateY(-1.2px)}}
.w0{animation:owl-w0 4.8s steps(1) infinite}.w1{animation:owl-w1 4.8s steps(1) infinite}.w2{animation:owl-w2 4.8s steps(1) infinite}
@keyframes owl-w0{0%,66%,78%,90%{opacity:1}54%,72%,84%{opacity:0}}
@keyframes owl-w1{0%,66%,90%{opacity:0}54%,84%{opacity:1}}
@keyframes owl-w2{0%,78%,90%{opacity:0}72%{opacity:1}}`;
})();

export function landscapeFiles(_data, mode) {
  const top = H - S.art.length * S.rowH;
  const art = (mode === "dark" ? moonArt(S.art) : S.art)
    .map((r, i) => textRow(r, X0, top + i * S.rowH + BASE))
    .join("\n");
  const clouds = S.clouds
    .map(
      (c) =>
        `<g transform="translate(${c.x} ${c.y})"><g class="drift ${c.k}">${c.rows.map((r, i) => textRow(r, 0, i * S.rowH + BASE)).join("")}</g></g>`,
    )
    .join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ALT)}">
<title>${esc(ALT)}</title>
<style>${style(mode)}</style>
<defs><clipPath id="card"><rect width="${W}" height="${H}"/></clipPath></defs>
<g clip-path="url(#card)">
${clouds}
${mode === "dark" ? `<style>${OWL_STYLE}</style>${OWL_DEFS}` : `<g class="bird">${BIRDS.map(bird).join("")}</g>`}
${art}
${mode === "dark" ? glidingOwl() + PERCHES.map(perchedOwl).join("") : ""}
</g>
</svg>`;
  return { scene: svg };
}

export function landscapeReadme(_data, pic) {
  return `<p align="center">${pic("scene", "100%", ALT)}</p>\n`;
}

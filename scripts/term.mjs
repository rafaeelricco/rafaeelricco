// Character-grid renderer shared by the terminal variants (nvim, ascii, man).
// Colors come from Rafael's own "ricco" colorscheme (dotfiles/nvim/lua/core/profiles.lua
// and ghostty/themes/ricco-*). Text is JetBrains Mono, subset to ASCII, box drawing and blocks.
import { readFileSync } from "node:fs";
import { root, esc } from "./lib.mjs";

const b64 = (f) => readFileSync(root + "fonts/" + f).toString("base64");
const MONO = b64("jbmono-Regular.woff2");
const MONO_BOLD = b64("jbmono-Bold.woff2");

export const FS = 14; // font size
export const CW = 8.4; // advance width (0.6em)
export const LH = 20; // line height

export const RICCO = {
  dark: {
    bg: "#141414",
    bg2: "#1b1b1b",
    sel: "#303030",
    fg: "#f0f0f0",
    dim: "#9a9a9a",
    faint: "#5c5c5c",
    line: "#2c2c2c",
    keyword: "#82d2ce",
    string: "#e394dc",
    number: "#ebc88d",
    func: "#efb080",
    prop: "#aaa0fa",
    tag: "#87c3ff",
    green: "#3fa266",
    yellow: "#f1b467",
    red: "#e34671",
    blue: "#81a1c1",
    cyan: "#88c0d0",
    onMode: "#141414",
    ansi: [
      "#242424",
      "#fc6b83",
      "#3fa266",
      "#d2943e",
      "#81a1c1",
      "#b48ead",
      "#88c0d0",
      "#f0f0f0",
    ],
    heat: ["#262626", "#1d4a30", "#2a7048", "#3fa266", "#70b489"],
  },
  light: {
    bg: "#fcfcfc",
    bg2: "#f2f2f2",
    sel: "#e1e1e1",
    fg: "#141414",
    dim: "#717171",
    faint: "#a8a8a8",
    line: "#e1e1e1",
    keyword: "#b3003f",
    string: "#9e94d5",
    number: "#b8448b",
    func: "#db704b",
    prop: "#6049b3",
    tag: "#1f8a65",
    green: "#1f8a65",
    yellow: "#c08532",
    red: "#cf2d56",
    blue: "#3c7cab",
    cyan: "#4c7f8c",
    onMode: "#fcfcfc",
    ansi: [
      "#141414",
      "#cf2d56",
      "#1f8a65",
      "#a16900",
      "#3c7cab",
      "#b8448b",
      "#4c7f8c",
      "#d8d8d8",
    ],
    heat: ["#ececec", "#c9e4d7", "#8cc7ab", "#55a583", "#1f8a65"],
  },
};

export function svg(T, w, h, title, body, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><style>
@font-face{font-family:JB;src:url(data:font/woff2;base64,${MONO}) format('woff2');font-weight:400}
@font-face{font-family:JB;src:url(data:font/woff2;base64,${MONO_BOLD}) format('woff2');font-weight:700}
text{font-family:JB,"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;font-size:${FS}px;white-space:pre}
.b{font-weight:700}.u{text-decoration:underline}
${Object.entries(T)
  .filter(([, v]) => typeof v === "string")
  .map(([k, v]) => `.${k}{fill:${v}}`)
  .join("")}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.blink{animation:blink 1.06s step-end infinite}
@media (prefers-reduced-motion:reduce){.blink{animation:none}}
</style><defs>${defs}</defs><rect width="${w}" height="${h}" fill="${T.bg}"/>${body}<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${T.line}"/></svg>\n`;
}

// segs: [[text, cls], ...] ; cls like "fg b" ; x,y in px (y = baseline)
export const row = (x, y, segs, extra = "") =>
  `<text x="${x}" y="${y}"${extra} xml:space="preserve">${segs.map(([s, c]) => `<tspan class="${c || "fg"}">${esc(s)}</tspan>`).join("")}</text>`;
export const len = (segs) => segs.reduce((a, [s]) => a + [...s].length, 0);

// Reveal a row character by character starting at `begin` seconds.
let clipId = 0;
export function typed(x, y, segs, begin, cps = 28) {
  const n = len(segs);
  if (!n) return { svg: "", end: begin };
  const dur = n / cps;
  const id = `ty${clipId++}`;
  const values = Array.from({ length: n + 1 }, (_, i) =>
    (i * CW).toFixed(1),
  ).join(";");
  const clip = `<clipPath id="${id}"><rect x="${x}" y="${y - FS}" width="0" height="${LH}"><animate attributeName="width" values="${values}" dur="${dur.toFixed(2)}s" begin="${begin.toFixed(2)}s" calcMode="discrete" fill="freeze"/></rect></clipPath>`;
  return {
    svg: `${clip}<g clip-path="url(#${id})">${row(x, y, segs)}</g>`,
    end: begin + dur,
    n,
    dur,
  };
}

// A block cursor that rides along a typed row, then disappears.
export function rideCursor(T, x, y, t) {
  if (!t.n) return "";
  const xs = Array.from({ length: t.n + 1 }, (_, i) =>
    (x + i * CW).toFixed(1),
  ).join(";");
  return `<rect x="${x}" y="${y - FS + 1}" width="${CW}" height="${LH - 2}" fill="${T.fg}" visibility="hidden"><set attributeName="visibility" to="visible" begin="${(t.end - t.dur).toFixed(2)}s" end="${t.end.toFixed(2)}s"/><animate attributeName="x" values="${xs}" begin="${(t.end - t.dur).toFixed(2)}s" dur="${t.dur.toFixed(2)}s" calcMode="discrete" fill="freeze"/></rect>`;
}

// Visible only from `from` (s) to `to` (s); `to` omitted = stays.
export const during = (inner, from, to) =>
  `<g visibility="${from > 0 ? "hidden" : "visible"}">${from > 0 ? `<set attributeName="visibility" to="visible" begin="${from.toFixed(2)}s"/>` : ""}${to != null ? `<set attributeName="visibility" to="hidden" begin="${to.toFixed(2)}s"/>` : ""}${inner}</g>`;

export const sparkline = (series, width) => {
  const bars = "▁▂▃▄▅▆▇█";
  const per = series.length / width;
  const v = Array.from({ length: width }, (_, i) =>
    series
      .slice(
        Math.floor(i * per),
        Math.max(Math.floor(i * per) + 1, Math.floor((i + 1) * per)),
      )
      .reduce((a, d) => a + d.count, 0),
  );
  const max = Math.max(1, ...v);
  return v
    .map((n) =>
      n
        ? bars[Math.min(7, Math.max(1, Math.round(Math.sqrt(n / max) * 7)))]
        : bars[0],
    )
    .join("");
};

export const pad = (s, n) =>
  s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
export function wrapText(text, max) {
  const out = [""];
  for (const w of String(text || "").split(/\s+/)) {
    if ((out[out.length - 1] + " " + w).trim().length <= max)
      out[out.length - 1] = (out[out.length - 1] + " " + w).trim();
    else out.push(w);
  }
  return out;
}
export const short = (iso) =>
  new Date(iso)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
    .toLowerCase();

// "creation" variant: a robot hand and a human hand reach for each other in ASCII,
// a spark jumps the gap inside a projects.exe window; then `ls -la ~/projects`.
import { config } from './lib.mjs';
import { RICCO, CW, LH, FS, svg, row, typed, during, short } from './term.mjs';
import { robot, human } from './hands.mjs';
import { bracketChip } from './variant-ascii.mjs';

const V = config.variants.terminal;
const A = config.variants.activity;
const W = 880;
let T;

const SMALL = 8, scw = SMALL * 0.6, srh = 6.4;       // dot-matrix cell
const SCALE = 1.375, WX = 117, WY = 80;               // crop of the hand world, centered on the gap
const COLS = Math.floor(W / scw), ROWS = 30;
const toWorld = (c, r) => [WX + (c * scw + scw / 2) / SCALE, WY + (r * srh + srh / 2) / SCALE];
const toScreen = (x, y) => [(x - WX) * SCALE, (y - WY) * SCALE];

function grad(f, x, y) { const e = 1.5; return [(f(x + e, y) - f(x - e, y)) / (2 * e), (f(x, y + e) - f(x, y - e)) / (2 * e)]; }
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// Shade one hand into rows of [char, class] runs.
function shade(f, ramp, classes, metal) {
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    const cells = [];
    for (let c = 0; c < COLS; c++) {
      const [x, y] = toWorld(c, r);
      const d = f(x, y);
      if (d >= 0) { cells.push([' ', '']); continue; }
      const [gx, gy] = grad(f, x, y);
      const n = Math.hypot(gx, gy) || 1;
      const lambert = Math.max(0, (gx / n) * -0.35 + (gy / n) * -0.94);
      const depth = Math.min(1, -d / 14);
      let tone = 0.5 + 0.35 * lambert - 0.15 * depth;
      if (metal) {
        const band = Math.pow(Math.abs(Math.sin(y * 0.09 + x * 0.01)), 4);
        tone = 0.45 + 0.3 * lambert + 0.3 * band - 0.1 * depth;
        if (x > 236 && x < 262 && Math.abs(((x - 236) % 9) - 4.5) < 1) tone = 0.08; // wrist joint seams
      }
      if (d > -1.8) tone = Math.max(tone, 0.9);
      const k = Math.max(1, Math.min(ramp.length - 1, Math.floor(tone * (ramp.length - 1) + BAYER[r % 4][c % 4] / 16)));
      cells.push([ramp[k], classes[Math.min(classes.length - 1, Math.floor((k / ramp.length) * classes.length))]]);
    }
    // merge runs
    const runs = [];
    for (const [ch, cl] of cells) { const last = runs[runs.length - 1]; if (last && last[1] === cl) last[0] += ch; else runs.push([ch, cl]); }
    out.push(runs);
  }
  return out;
}

function grid(rows, y0) {
  return rows.map((runs, r) => {
    const txt = runs.map(([s, c]) => (c ? `<tspan class="${c}">${s}</tspan>` : s)).join('');
    return txt.trim() ? `<text x="0" y="${(y0 + r * srh + SMALL).toFixed(1)}" xml:space="preserve" style="font-size:${SMALL}px">${txt}</text>` : '';
  }).join('');
}

function headerSvg() {
  const sceneH = ROWS * srh + 30, H = sceneH + 124, y0 = 18;
  const robotRows = shade(robot, ' ·▪■', ['faint', 'blue', 'cyan'], true);
  const humanRows = shade(human, ' ·•●', ['dim', 'fg', 'fg'], false);
  const dur = 6, ease = 'keySplines=".45 0 .55 1;.45 0 .55 1" calcMode="spline" keyTimes="0;.5;1"';
  let out = `<g><animateTransform attributeName="transform" type="translate" values="0 0;14 0;0 0" dur="${dur}s" repeatCount="indefinite" ${ease}/>${grid(robotRows, y0)}</g>`;
  out += `<g><animateTransform attributeName="transform" type="translate" values="0 0;-14 0;0 0" dur="${dur}s" repeatCount="indefinite" ${ease}/>${grid(humanRows, y0)}</g>`;

  // gap position in screen space (between fingertips)
  const [gx0, gy0] = toScreen(437, 140);
  const gapX = gx0, gapY = y0 + gy0;
  // projects.exe window drawn in box characters around the gap
  const bw = 26, bh = 6, bx = gapX - (bw * CW) / 2, by = gapY - 2.6 * LH;
  const title = ' projects.exe ', ctl = ' _ □ x ';
  let win = row(bx, by + FS, [['┌─', 'fg'], [title, 'fg b'], ['─'.repeat(bw - 2 - title.length - ctl.length - 1), 'fg'], [ctl, 'fg'], ['┐', 'fg']]);
  for (let r = 1; r < bh - 1; r++) win += row(bx, by + r * LH + FS, [['│', 'fg']]) + row(bx + (bw - 1) * CW, by + r * LH + FS, [['│', 'fg']]);
  win += row(bx, by + (bh - 1) * LH + FS, [['└' + '─'.repeat(bw - 2) + '┘', 'fg']]);
  out += `<g opacity=".9">${win}</g>`;

  // spark at the closest moment
  const burst = [[0, 0, '*'], [-12, -10, '+'], [12, -9, '+'], [-11, 11, '+'], [13, 10, '+'], [0, -16, '.'], [0, 16, '.']];
  out += `<g opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.42;.5;.62;1" dur="${dur}s" repeatCount="indefinite"/>${burst.map(([dx, dy, ch]) => `<text x="${gapX + dx}" y="${gapY + dy + 5}" text-anchor="middle" class="yellow b" style="font-size:${ch === '*' ? 18 : 12}px">${ch}</text>`).join('')}</g>`;

  // copy
  const ty = sceneH + 28;
  out += row(32, ty, [['PRODUCT ENGINEER BUILDING', 'fg']], ' style="font-size:20px"');
  out += row(32, ty + 30, [['FULL-STACK AND ', 'fg'], ['AI', 'fg b'], [' APPLICATIONS', 'fg']], ' style="font-size:20px"');
  out += row(32, ty + 62, [['~ ', 'blue'], ['$ ', 'dim'], ['human + machine, shipped to production', 'dim']]);
  out += row(W - 32, ty + 8, [['r a f a e l', 'fg b']], ' text-anchor="end" style="font-size:22px"');
  out += row(W - 32, ty + 34, [['r i c c o', 'fg b']], ' text-anchor="end" style="font-size:22px"');
  out += row(W - 32, ty + 62, [['r1cco.com', 'dim']], ' text-anchor="end"');
  return svg(T, W, H, 'A robot hand and a human hand reach for each other. Rafael Ricco, product engineer building full-stack and AI applications.', out);
}

function lsSvg(data) {
  const names = [...A.featured.map((f) => f.repo), ...V.telescope.filter((n) => n.endsWith('.nvim'))];
  const items = names.map((n) => data.repos[n]);
  const x0 = 14, top = 8, H = top * 2 + (items.length + 4) * LH;
  const y = (r) => top + r * LH + FS;
  const cmd = typed(x0, y(0), [['~ ', 'blue'], ['$ ', 'dim'], ['ls -la ~/projects', 'fg']], 0.4, 24);
  let out = cmd.svg;
  out += during(row(x0, y(1), [[`total ${items.length}`, 'dim']]), cmd.end + 0.2);
  items.forEach((r, i) => {
    const desc = (r.description || '').length > 44 ? r.description.slice(0, 43) + '…' : r.description || '';
    out += during(row(x0, y(2 + i), [
      ['drwxr-xr-x  ', 'dim'], ['rafael  ', 'number'], [(r.language || '-').toLowerCase().padEnd(11), 'prop'], [short(r.pushed_at).padEnd(8), 'dim'],
      [(r.name + '/').padEnd(18), r.name.endsWith('.nvim') ? 'keyword b' : 'blue b'], ['# ' + desc, 'faint'],
    ]), cmd.end + 0.35 + i * 0.12);
  });
  const done = cmd.end + 0.35 + items.length * 0.12 + 0.2;
  out += during(row(x0, y(items.length + 3), [['~ ', 'blue'], ['$ ', 'dim']]) + `<rect class="blink" x="${x0 + 4 * CW}" y="${y(items.length + 3) - FS + 1}" width="${CW}" height="${LH - 2}" fill="${T.fg}"/>`, done);
  return svg(T, W, H, `Projects: ${names.join(', ')}`, out);
}

export function creationFiles(data, mode) {
  T = RICCO[mode];
  const files = { header: headerSvg(), ls: lsSvg(data) };
  V.links.forEach((l, i) => (files[`btn-${i + 1}`] = bracketChip(l.label).svg(T)));
  return files;
}

export function creationReadme(data, pic) {
  const btns = V.links.map((l, i) => `<a href="${l.url}">${pic(`btn-${i + 1}`, String(bracketChip(l.label).w), l.label)}</a>`).join(' ');
  return `<p align="center">${pic('header', '100%', 'A robot hand and a human hand reach for each other. Rafael Ricco, product engineer building full-stack and AI applications.')}</p>

<p align="center"><a href="https://github.com/${config.github.username}?tab=repositories">${pic('ls', '100%', 'ls -la ~/projects')}</a></p>

<p align="center">${btns}</p>
`;
}

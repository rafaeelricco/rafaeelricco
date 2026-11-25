// "ascii" variant: ANSI Shadow logo with a shimmer, neofetch with a spinning donut,
// a character heatmap of the last year, and plain-ASCII project boxes with sparklines.
import { config, github } from './lib.mjs';
import { RICCO, CW, LH, FS, svg, row, typed, during, sparkline, pad, wrapText, short } from './term.mjs';

const V = config.variants.terminal;
const W = 880;
let T;

const GLYPHS = {
  R: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██║  ██║', '╚═╝  ╚═╝'],
  A: [' █████╗ ', '██╔══██╗', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  F: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '██║     ', '╚═╝     '],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  L: ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
  I: ['██╗', '██║', '██║', '██║', '██║', '╚═╝'],
  C: [' ██████╗', '██╔════╝', '██║     ', '██║     ', '╚██████╗', ' ╚═════╝'],
  O: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  ' ': ['  ', '  ', '  ', '  ', '  ', '  '],
};
const banner = (word) => GLYPHS.R.map((_, r) => [...word].map((ch) => GLYPHS[ch][r]).join(''));

// The classic donut.c, one frame per step, as character rows.
function donutFrames(n, cols, rows) {
  const chars = '.,-~:;=!*#$@';
  return Array.from({ length: n }, (_, f) => {
    const A = (f / n) * Math.PI * 2, B = (f / n) * Math.PI * 4;
    const out = new Array(cols * rows).fill(' '), z = new Array(cols * rows).fill(0);
    const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
    for (let j = 0; j < 6.28; j += 0.07) {
      const ct = Math.cos(j), st = Math.sin(j);
      for (let i = 0; i < 6.28; i += 0.02) {
        const sp = Math.sin(i), cp = Math.cos(i);
        const h = ct + 2, D = 1 / (sp * h * sA + st * cA + 5), t = sp * h * cA - st * sA;
        const x = Math.floor(cols / 2 + cols * 0.53 * D * (cp * h * cB - t * sB));
        const y = Math.floor(rows / 2 + rows * 0.67 * D * (cp * h * sB + t * cB));
        const o = x + cols * y;
        const N = Math.floor(8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB));
        if (y >= 0 && y < rows && x >= 0 && x < cols && D > z[o]) { z[o] = D; out[o] = chars[Math.max(0, N)]; }
      }
    }
    return Array.from({ length: rows }, (_, r) => out.slice(r * cols, (r + 1) * cols).join('').replace(/\s+$/, ''));
  });
}

function headerSvg(data) {
  const logo = banner('RAFAEL RICCO');
  const logoLH = 16, top = 28;
  const logoW = [...logo[0]].length * CW, lx = (W - logoW) / 2;
  const nfTop = top + logo.length * logoLH + 64;
  const dCols = 44, dRows = 17, frames = donutFrames(48, dCols, dRows);
  const H = nfTop + dRows * 18 + 36;

  // logo: blocks in a sweeping gradient, box-drawing shadows dim
  const defs = `<linearGradient id="sweep" gradientUnits="userSpaceOnUse" x1="${lx}" y1="0" x2="${lx + logoW}" y2="0">
<stop offset="0" stop-color="${T.keyword}"/><stop offset=".45" stop-color="${T.string}"/><stop offset=".5" stop-color="${T.fg}"/><stop offset=".55" stop-color="${T.string}"/><stop offset="1" stop-color="${T.func}"/>
<animateTransform attributeName="gradientTransform" type="translate" values="${-logoW} 0;${logoW} 0" dur="4.5s" repeatCount="indefinite"/></linearGradient>
<linearGradient id="sweep-base" gradientUnits="userSpaceOnUse" x1="${lx}" y1="0" x2="${lx + logoW}" y2="0"><stop offset="0" stop-color="${T.keyword}"/><stop offset="1" stop-color="${T.func}"/></linearGradient>
<linearGradient id="dg" gradientUnits="userSpaceOnUse" x1="0" y1="${nfTop}" x2="0" y2="${nfTop + dRows * 18}"><stop offset="0" stop-color="${T.keyword}"/><stop offset=".55" stop-color="${T.string}"/><stop offset="1" stop-color="${T.func}"/></linearGradient>`;
  let out = '';
  logo.forEach((line, r) => {
    const blocks = line.replace(/[^█]/g, ' '), shadow = line.replace(/█/g, ' ');
    const yy = top + r * logoLH + FS;
    out += `<text x="${lx}" y="${yy}" xml:space="preserve" fill="${T.faint}">${shadow}</text>`;
    out += `<text x="${lx}" y="${yy}" xml:space="preserve" fill="url(#sweep-base)">${blocks}</text>`;
    out += `<text x="${lx}" y="${yy}" xml:space="preserve" fill="url(#sweep)" opacity=".9">${blocks}</text>`;
  });
  const sub = 'product engineer  ·  full-stack & AI  ·  rio grande do sul, brasil';
  out += row(W / 2, top + logo.length * logoLH + 28, [[sub, 'dim']], ' text-anchor="middle"');
  out += `<line x1="24" x2="${W - 24}" y1="${nfTop - 22.5}" y2="${nfTop - 22.5}" stroke="${T.line}" stroke-dasharray="2 4"/>`;

  // donut, frame by frame
  const n = frames.length, dur = 4;
  frames.forEach((fr, i) => {
    const vis = frames.map((_, k) => (k === i ? 'visible' : 'hidden')).join(';');
    out += `<g visibility="${i ? 'hidden' : 'visible'}" fill="url(#dg)"><animate attributeName="visibility" values="${vis}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>${fr.map((l, r) => (l ? `<text x="28" y="${nfTop + r * 18 + 13}" xml:space="preserve">${l.replace(/&/g, '&amp;')}</text>` : '')).join('')}</g>`;
  });

  // neofetch
  const total = data.contributions.reduce((a, d) => a + d.count, 0);
  const since = new Date(data.contributions[0].date).getUTCFullYear();
  const ix = 28 + dCols * CW + 28, iy = (k) => nfTop + 6 + k * LH;
  const info = [
    [['rafael', 'keyword b'], ['@', 'fg'], ['ricco', 'keyword b']],
    [['─'.repeat(12), 'faint']],
    ...[
      ['role', 'product engineer'],
      ['based in', 'rio grande do sul, brasil'],
      ['stack', 'typescript, python, react, node.js'],
      ['focus', 'full-stack and AI applications'],
      ['editor', 'neovim 0.12'],
      ['terminal', 'ghostty'],
      ['shell', 'zsh'],
      ['theme', 'ricco'],
      ['repos', `${data.user.public_repos} public`],
      ['commits', `${total.toLocaleString('en-US')} contributions since ${since}`],
      ['now', 'shipping job-kit-ai, building postie'],
    ].map(([k, v]) => [[pad(k, 10), 'func b'], [v, 'fg']]),
  ];
  let t = 0.5;
  info.forEach((segs, k) => { const ty = typed(ix, iy(k), segs, t, 70); out += ty.svg; t = ty.end + 0.05; });
  const sw = 3 * CW;
  T.ansi.forEach((c, k) => {
    out += during(`<rect x="${ix + k * sw}" y="${iy(info.length) + 4}" width="${sw}" height="14" fill="${c}"/>`, t + k * 0.06);
  });
  out += during(`<rect class="blink" x="${ix}" y="${iy(info.length + 1) + 2}" width="${CW}" height="${LH - 2}" fill="${T.fg}"/>`, t + 0.6);
  return svg(T, W, H, `Rafael Ricco: product engineer, full-stack and AI, Rio Grande do Sul, Brasil. ${total} contributions since ${since}.`, out, defs);
}

function heatmapSvg(data) {
  const weeks = 48, lx = 16, gx = lx + 4 * CW, y0 = 8;
  const days = data.contributions.slice(-weeks * 7 - ((new Date(data.contributions.at(-1).date).getUTCDay() + 1) % 7));
  const cells = [];
  for (let w = 0; w < weeks; w++) cells.push(days.slice(w * 7, w * 7 + 7));
  const max = Math.max(1, ...days.map((d) => d.count));
  const chars = [' ', '.', ':', '+', '#'];
  const lvl = (c) => (c <= 0 ? 0 : Math.min(4, 1 + Math.floor(Math.sqrt(c / max) * 3.999)));
  const H = y0 * 2 + 12 * LH;
  const yr = (r) => y0 + r * LH + FS;
  let out = '';
  const cmd = typed(lx, yr(0), [['~ ', 'blue'], ['$ ', 'dim'], ['git log --author=rafael --since="1 year" | heatmap', 'fg']], 0.4, 40);
  out += cmd.svg;
  // month labels
  let lastM = -1, labels = '';
  cells.forEach((wk, w) => { const m = new Date(wk[0].date).getUTCMonth(); if (m !== lastM) { labels += row(gx + w * 2 * CW, yr(2), [[new Date(wk[0].date).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toLowerCase(), 'dim']]); lastM = m; } });
  out += during(labels, cmd.end + 0.2);
  ['', 'mon', '', 'wed', '', 'fri', ''].forEach((l, d) => { if (l) out += during(row(lx, yr(3 + d), [[l, 'faint']]), cmd.end + 0.2); });
  // grid, revealed column by column
  const id = 'hm';
  const gridW = weeks * 2 * CW;
  out += `<clipPath id="${id}"><rect x="${gx}" y="${yr(3) - FS}" width="0" height="${7 * LH}"><animate attributeName="width" from="0" to="${gridW}" begin="${(cmd.end + 0.3).toFixed(2)}s" dur="1.6s" fill="freeze"/></rect></clipPath><g clip-path="url(#${id})">`;
  for (let d = 0; d < 7; d++) {
    let segs = [];
    cells.forEach((wk) => { const c = wk[d] ? lvl(wk[d].count) : 0; segs.push([chars[c] + ' ', c ? `h${c}` : 'faint']); });
    out += row(gx, yr(3 + d), segs.map(([s, c]) => [s === '  ' ? '· ' : s, c]));
  }
  out += '</g>';
  // a scan cursor sweeping the grid
  out += during(`<rect x="${gx}" y="${yr(3) - FS}" width="${CW * 2}" height="${7 * LH}" fill="${T.fg}" opacity=".07"><animate attributeName="x" from="${gx}" to="${gx + gridW - 2 * CW}" dur="6s" repeatCount="indefinite"/></rect>`, cmd.end + 2);
  const lastYear = days.reduce((a, d) => a + d.count, 0);
  out += during(row(gx, yr(11), [[lastYear.toLocaleString('en-US'), 'green b'], [' contributions in the last 48 weeks   ', 'dim'], ['less ', 'faint'], ...[1, 2, 3, 4].map((k) => [chars[k] + ' ', `h${k}`]), ['more', 'faint']]), cmd.end + 2);
  const heatStyle = `<style>${T.heat.map((c, k) => `.h${k}{fill:${c}}`).join('')}</style>`;
  return svg(T, W, H, `${lastYear} contributions in the last 48 weeks`, heatStyle + out);
}

function boxSvg(f, repo, act) {
  const w = W / 2, cols = Math.floor((w - 16) / CW), x0 = 8, rows = 11, H = rows * LH + 16;
  const X = (c) => x0 + c * CW, yr = (r) => 8 + r * LH + FS;
  const name = ` ${repo.name} `, lang = ` ${(repo.language || 'mixed').toLowerCase()} `;
  let out = row(X(0), yr(0), [['+-', 'faint'], [name, 'keyword b'], ['-'.repeat(cols - 4 - name.length - lang.length), 'faint'], [lang, 'number'], ['-+', 'faint']]);
  for (let r = 1; r < rows - 1; r++) out += row(X(0), yr(r), [['|', 'faint']]) + row(X(cols - 1), yr(r), [['|', 'faint']]);
  out += row(X(0), yr(rows - 1), [['+' + '-'.repeat(cols - 2) + '+', 'faint']]);
  wrapText(repo.description || 'No description yet.', cols - 6).slice(0, 3).forEach((l, k) => (out += row(X(3), yr(2 + k), [[l, 'fg']])));
  const first = act.findIndex((d) => d.count > 0);
  const s = act.slice(Math.max(0, first));
  const spark = typed(X(3), yr(6), [[sparkline(s, cols - 6), 'green']], 0.6, 60);
  out += spark.svg;
  const commits = s.reduce((a, d) => a + d.count, 0);
  out += row(X(3), yr(7), [[`${commits} commits since ${short(s[0].date)}`, 'dim']]);
  out += row(X(cols - 3), yr(7), [[`pushed ${short(repo.pushed_at)}`, 'dim']], ' text-anchor="end"');
  out += row(X(3), yr(8) + 4, [['[ ', 'faint'], [f.cta || 'open repo', 'func b'], [' ]', 'faint']]);
  return svg(T, w, H, `${repo.name}: ${repo.description || ''}`, out);
}

export function bracketChip(label) {
  const text = `[ ${label} ]`;
  const w = Math.round(text.length * CW + 24);
  return { w, svg: (TT) => svg(TT, w, 36, label, row(12, 23, [['[ ', 'faint'], [label, 'func b'], [' ]', 'faint']])) };
}

export function asciiFiles(data, mode) {
  T = RICCO[mode];
  const A = config.variants.activity;
  const files = { header: headerSvg(data), heatmap: heatmapSvg(data) };
  A.featured.forEach((f, i) => (files[`box-${i + 1}`] = boxSvg(f, data.repos[f.repo], data.activity[f.repo])));
  V.links.forEach((l, i) => (files[`btn-${i + 1}`] = bracketChip(l.label).svg(T)));
  return files;
}

export function asciiReadme(data, pic) {
  const A = config.variants.activity;
  const boxes = A.featured.map((f, i) => {
    const r = data.repos[f.repo];
    return `<a href="${f.url || r.html_url}">${pic(`box-${i + 1}`, '50%', `${r.name}: ${r.description || ''}`)}</a>`;
  }).join('');
  const btns = V.links.map((l, i) => `<a href="${l.url}">${pic(`btn-${i + 1}`, String(bracketChip(l.label).w), l.label)}</a>`).join(' ');
  return `<p align="center">${pic('header', '100%', 'Rafael Ricco: product engineer, full-stack and AI, Rio Grande do Sul, Brasil.')}</p>

<p align="center">${pic('heatmap', '100%', 'Contribution heatmap of the last 48 weeks')}</p>

<p align="center">${boxes}</p>

<p align="center">${btns}</p>
`;
}

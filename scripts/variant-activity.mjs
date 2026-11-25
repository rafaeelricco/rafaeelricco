// "Activity" variant: a contribution ribbon since the account started, a hero,
// commits-per-day charts for featured repos, a repo table and link chips.
// Visual language follows the Job Kit design system: square corners, hairline
// rules, alpha ink, Inter for prose, Space Mono for every identifier.
import { readFileSync } from 'node:fs';
import { root, config, github, W, esc, clamp, date, wrap, png, BAYER, hash, smooth } from './lib.mjs';

const A = config.variants.activity;
const font = (f) => readFileSync(root + 'fonts/' + f).toString('base64');
const FONTS = {
  inter: font('inter-latin-400-normal.woff2'),
  interMedium: font('inter-latin-500-normal.woff2'),
  mono: font('space-mono-latin-400-normal.woff2'),
};

// Job Kit tokens, flattened to solid colors (SVG on an unknown page ground).
const THEMES = {
  dark: {
    canvas: '#000000', bar: '#141414', divider: '#333333',
    strong: '#f8f8f2', body: '#ecece5', soft: '#d8d8d0', muted: '#babab4', faint: '#7c7c77',
    mark: '#9ece6a',
    // 0 ground, 1 grid dot, 2..5 ink ramp, 6 mark
    pixels: ['#000000', '#262626', '#4d4d4b', '#7c7c77', '#babab4', '#f8f8f2', '#9ece6a'],
  },
  light: {
    canvas: '#ffffff', bar: '#fafafa', divider: '#ebebeb',
    strong: '#171717', body: '#454545', soft: '#5d5d5d', muted: '#8b8b8b', faint: '#b9b9b9',
    mark: '#7da75b',
    pixels: ['#ffffff', '#ececea', '#c9c9c5', '#9a9a96', '#5d5d5b', '#171717', '#7da75b'],
  },
};
let T;

const style = () => `<style>
@font-face{font-family:JInter;src:url(data:font/woff2;base64,${FONTS.inter}) format('woff2');font-weight:400}
@font-face{font-family:JInter;src:url(data:font/woff2;base64,${FONTS.interMedium}) format('woff2');font-weight:500}
@font-face{font-family:JMono;src:url(data:font/woff2;base64,${FONTS.mono}) format('woff2');font-weight:400}
text{font-family:JInter,"Inter","Segoe UI",Helvetica,Arial,sans-serif}
.m{font-family:JMono,"Space Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
image{image-rendering:pixelated}
</style>`;
const svg = (w, h, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">${style()}<rect width="${w}" height="${h}" fill="${T.canvas}"/>${body}<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${T.divider}"/></svg>\n`;
const rule = (y, x1, x2) => `<line x1="${x1}" x2="${x2}" y1="${y + 0.5}" y2="${y + 0.5}" stroke="${T.divider}"/>`;
const pixels = (x, y, w, h, b64) => `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" href="data:image/png;base64,${b64}"/>`;
const t = (x, y, s, { size = 14, fill = T.body, weight = 400, mono = false, anchor = 'start', ls = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}"${weight !== 400 ? ` font-weight="${weight}"` : ''}${mono ? ' class="m"' : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${ls ? ` letter-spacing="${ls}"` : ''}>${esc(s)}</text>`;
const month = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

// ink ramp index 2..5 from a 0..1 tone, Bayer-dithered
const ink = (tone, c, r) => {
  if (tone <= 0.02) return 0;
  const s = Math.min(1, tone) * 3.999;
  const base = Math.floor(s);
  return 2 + Math.min(3, base + (s - base > BAYER[r % 4][c % 4] / 16 ? 1 : 0));
};

// ---------- contribution ribbon ----------
function ribbon(days, cols, rows) {
  const px = new Uint8Array(cols * rows);
  const per = days.length / cols;
  const sums = Array.from({ length: cols }, (_, c) => days.slice(Math.floor(c * per), Math.floor((c + 1) * per)).reduce((a, d) => a + d.count, 0));
  const sorted = [...sums].sort((a, b) => a - b);
  const cap = sorted[Math.floor(sorted.length * 0.97)] || 1;
  const level = sums.map((s) => Math.sqrt(Math.min(1, s / cap)));
  const soft = level.map((_, c) => { let a = 0, n = 0; for (let k = -2; k <= 2; k++) if (level[c + k] != null) { a += level[c + k] * (3 - Math.abs(k)); n += 3 - Math.abs(k); } return a / n; });
  const mid = Math.floor(rows / 2);
  for (let c = 0; c < cols; c++) {
    const a = soft[c];
    for (let r = 0; r < rows; r++) {
      const d = Math.abs(r - mid) / (rows / 2);
      let tone = 0;
      const reach = 0.06 + a * 0.7;
      if (a > 0.01 && d < reach) tone = (0.12 + 0.55 * a) * smooth(reach, 0, d) * (0.75 + 0.5 * hash(c, r, 2));
      if (r === mid && c % 2 === 0) tone = Math.max(tone, 0.5);
      if (hash(c, r, 5) < a * 0.05 && d < 1) tone = Math.max(tone, 0.28);
      let v = ink(tone, c, r);
      if (!v && (c % 3 === 0 && r % 3 === 0) && hash(c, r, 9) < 0.35) v = 1;
      px[r * cols + c] = v;
    }
  }
  return px;
}

function headerSvg(data) {
  const bandH = 196, H = bandH + 232, cell = 4;
  const days = data.contributions;
  const cols = W / cell, rows = (bandH - 64) / cell;
  const band = png([ribbon(days, cols, rows)], cols, rows, T.pixels, 1);
  const start = new Date(days[0].date), end = new Date(days[days.length - 1].date);
  const span = end - start;
  const years = [];
  for (let y = start.getUTCFullYear() + 1; y <= end.getUTCFullYear(); y++) years.push(y);
  const yearMarks = years.map((y) => {
    const x = Math.round(((Date.UTC(y, 0, 1) - start) / span) * W);
    return `<line x1="${x + 0.5}" x2="${x + 0.5}" y1="14" y2="${bandH - 40}" stroke="${T.divider}" stroke-dasharray="1 3"/>${t(x + 6, 24, y, { size: 11, fill: T.muted, mono: true })}`;
  }).join('');
  const total = days.reduce((a, d) => a + d.count, 0);
  const today = days[days.length - 1];
  const last = [...days].reverse().find((d) => d.count > 0);
  const status = today.count > 0
    ? `${t(W - 36, bandH - 18, 'contributed today', { size: 12, fill: T.strong, mono: true, anchor: 'end' })}<rect x="${W - 28}" y="${bandH - 26}" width="7" height="7" fill="${T.mark}"><animate attributeName="opacity" values="1;0.25;1" dur="2s" repeatCount="indefinite"/></rect>`
    : t(W - 20, bandH - 18, `last contribution ${date(last.date)}`, { size: 12, fill: T.muted, mono: true, anchor: 'end' });
  const y0 = bandH;
  const body = `${pixels(0, 32, W, rows * cell, band)}${yearMarks}
${t(20, bandH - 18, `${total.toLocaleString('en-US')} contributions since ${month(start)}`, { size: 12, fill: T.muted, mono: true })}${status}
${rule(y0, 0, W)}
${t(32, y0 + 86, A.name, { size: 64, fill: T.strong, weight: 500, ls: -2.6 })}
${t(34, y0 + 116, A.handle, { size: 13, fill: T.muted, mono: true })}
${t(33, y0 + 160, A.line1, { size: 19, fill: T.strong })}
${t(33, y0 + 192, A.line2, { size: 16, fill: T.soft })}`;
  return svg(W, H, `${A.name}: ${A.line1} ${total} contributions since ${month(start)}.`, body);
}

// ---------- commits-per-day chart ----------
function chart(series, cols, rows) {
  const px = new Uint8Array(cols * rows);
  const per = series.length / cols;
  const raw = Array.from({ length: cols }, (_, c) => { const s = series.slice(Math.floor(c * per), Math.max(Math.floor(c * per) + 1, Math.floor((c + 1) * per))); return s.reduce((a, d) => a + d.count, 0) / s.length; });
  const R = Math.max(2, Math.round(cols / 40));
  const v = raw.map((_, c) => { let a = 0, n = 0; for (let k = -R; k <= R; k++) { const x = raw[c + k]; if (x == null) continue; const w = Math.exp(-(k * k) / (R * R)); a += x * w; n += w; } return a / n; });
  const max = Math.max(1, ...v);
  const top = 7; // rows reserved for the caption
  const usable = rows - top - 2;
  const heights = v.map((n) => (n > max * 0.01 ? Math.max(1, Math.round(Math.sqrt(n / max) * usable)) : 0));
  for (let c = 0; c < cols; c++) {
    const h = heights[c];
    for (let r = 0; r < rows; r++) {
      const fromBottom = rows - 1 - r;
      let val = 0;
      if (fromBottom < h) {
        const depth = (h - 1 - fromBottom) / Math.max(1, usable);
        const edge = fromBottom >= h - 1;
        val = edge ? 5 : ink(0.62 - depth * 0.9, c, r);
      } else if (fromBottom <= 1) {
        val = ink(0.38, c, r); // baseline
      } else if (c % 2 === 0 && r % 2 === 0 && r > top && hash(c, r, 3) < 0.5) {
        val = 1;
      }
      px[r * cols + c] = val;
    }
  }
  // mark the most recent active day
  const lastActive = [...heights.keys()].reverse().find((c) => heights[c] > 0);
  if (lastActive != null) {
    const h = heights[lastActive];
    for (let k = 0; k < Math.min(3, h); k++) px[(rows - h + k) * cols + lastActive] = 6;
  }
  return { px, total: series.reduce((a, d) => a + d.count, 0), peak: Math.max(...series.map((d) => d.count)) };
}

function cardSvg(f, repo, activity) {
  const w = W / 2, barH = 42, chartH = 196, descH = 92, footH = 44, H = barH + chartH + descH + footH, cell = 4;
  const cols = w / cell, rows = chartH / cell;
  // window: first active day in the last year, through today
  const firstActive = activity.findIndex((d) => d.count > 0);
  const series = activity.slice(Math.max(0, Math.min(firstActive, activity.length - 30)));
  const { px, total, peak } = chart(series, cols, rows);
  const b64 = png([px], cols, rows, T.pixels, 1);
  const desc = wrap(repo.description, 52, 2);
  const owner = repo.full_name.split('/')[0];
  const meta = [repo.stargazers_count ? `${repo.stargazers_count} star${repo.stargazers_count > 1 ? 's' : ''}` : '', `pushed ${date(repo.pushed_at)}`].filter(Boolean).join(', ');
  const y1 = barH + chartH, y2 = y1 + descH;
  const body = `<rect width="${w}" height="${barH}" fill="${T.bar}"/>${rule(barH - 1, 0, w)}
${t(20, 27, repo.name, { size: 14, fill: T.strong, mono: true })}${t(w - 20, 27, owner, { size: 12, fill: T.muted, mono: true, anchor: 'end' })}
${pixels(0, barH, w, chartH, b64)}
${t(20, barH + 22, `Commits per day, ${date(series[0].date)} to today`, { size: 11, fill: T.muted, mono: true })}${t(w - 20, barH + 22, `${total.toLocaleString('en-US')} total, peak ${peak}`, { size: 11, fill: T.muted, mono: true, anchor: 'end' })}
${rule(y1, 0, w)}
${t(20, y1 + 36, desc[0], { size: 15, fill: T.strong })}${t(20, y1 + 60, desc[1] || '', { size: 15, fill: T.strong })}
${t(20, y2 + 27, repo.language || 'mixed', { size: 12, fill: T.muted, mono: true })}${t(w - 20, y2 + 27, meta, { size: 12, fill: T.muted, mono: true, anchor: 'end' })}`;
  return svg(w, H, `${repo.name}: ${repo.description || ''}`, body);
}

function tableSvg(list) {
  const rowH = 52, H = rowH * list.length;
  const body = list.map((r, i) => {
    const y = i * rowH;
    return `${i ? rule(y, 0, W) : ''}${t(20, y + 32, r.name, { size: 14, fill: T.strong, mono: true })}${t(210, y + 32, clamp(r.description || 'No description yet.', 54), { size: 14, fill: T.soft })}${t(640, y + 32, r.language || '-', { size: 12, fill: T.muted, mono: true })}${t(W - 20, y + 32, `pushed ${date(r.pushed_at)}`, { size: 12, fill: T.muted, mono: true, anchor: 'end' })}`;
  }).join('');
  return svg(W, H, `More repositories by ${github.username}`, body);
}

function chipSvg(label) {
  const w = Math.round(label.length * 9 + 76);
  const arrow = `<path d="M${w - 30} ${35}l9 -9M${w - 28} ${26}h7v7" fill="none" stroke="${T.muted}" stroke-width="1.3"/>`;
  return { w, svg: svg(w, 56, label, `${t(22, 34, label, { size: 15, fill: T.strong, mono: true })}${arrow}`) };
}

export function activityFiles(data, mode) {
  T = THEMES[mode];
  const files = { header: headerSvg(data) };
  A.featured.forEach((f, i) => (files[`card-${i + 1}`] = cardSvg(f, data.repos[f.repo], data.activity[f.repo])));
  files.table = tableSvg(A.more.map((n) => data.repos[n]));
  A.links.forEach((l, i) => (files[`chip-${i + 1}`] = chipSvg(l.label).svg));
  return files;
}

export function activityReadme(data, pic) {
  T = THEMES.dark;
  const cards = A.featured.map((f, i) => {
    const r = data.repos[f.repo];
    return `<a href="${f.url || r.html_url}">${pic(`card-${i + 1}`, '50%', `${r.name}: ${r.description || ''}`)}</a>`;
  }).join('');
  const chips = A.links.map((l, i) => `<a href="${l.url}">${pic(`chip-${i + 1}`, String(chipSvg(l.label).w), l.label)}</a>`).join(' ');
  return `<p align="center">${pic('header', '100%', `${A.name} (${A.handle}): ${A.line1} ${A.line2}`)}</p>

<p align="center">${cards}</p>

<p align="center"><a href="https://github.com/${github.username}?tab=repositories">${pic('table', '100%', `More repositories by ${github.username}`)}</a></p>

<p align="center">${chips}</p>
`;
}

import { readFileSync } from 'node:fs';
import { root, github, profile, motion, layout, W, esc, clamp, compact, date, wrap, png, smooth, fbm, quantize, C, FACES } from './lib.mjs';

// Inter 500 advance widths (em), so pill buttons fit their labels exactly.
const ADV = JSON.parse(readFileSync(root + 'scripts/inter-500-advances.json', 'utf8'));
const textWidth = (s, size) => [...s].reduce((a, ch) => a + (ADV[ch] ?? 0.56), 0) * size;

function pampaFrame(t, cols, rows_, levels) {
  const px = new Uint8Array(cols * rows_);
  const aspect = cols / rows_;
  const th = t * Math.PI * 2, cx = Math.cos(th), cy = Math.sin(th);
  const sun = { x: 0.68, y: 0.62, r: 0.25 };
  const ridges = [0.6, 0.72, 0.84].map((base, i) => (u) => base + (0.3 - i * 0.06) * (fbm(u * (1.1 + i * 0.7) + i * 13, i * 3.3, 300 + i * 19, 3) - 0.5) - 0.06 * Math.sin(u * (2.2 + i) + i * 1.7));
  for (let r = 0; r < rows_; r++) {
    const v = (r + 0.5) / rows_;
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols;
      const dx = (u - sun.x) * aspect, dy = v - sun.y;
      const d = Math.hypot(dx, dy);
      // sky: dark at the top, warm toward the horizon, glow around the sun
      let tone = 0.02 + 0.5 * smooth(0.1, 0.62, v) * (0.55 + 0.45 * Math.exp(-Math.abs(dx) * 0.9));
      tone += 0.35 * Math.exp(-d * 2.6);
      if (d < sun.r) tone = 0.82 + 0.18 * smooth(sun.r, 0, d);
      // cloud bands drift on a loop
      const cl = fbm(u * 2.6 + cx * 0.6, v * 10 + cy * 0.6, 91);
      const band = smooth(0.08, 0.25, v) * (1 - smooth(0.42, 0.55, v));
      const cloud = smooth(0.52, 0.74, cl) * band;
      if (d >= sun.r) tone = tone * (1 - 0.6 * cloud) + cloud * (0.12 + 0.35 * Math.exp(-d * 2.2));
      else tone -= cloud * 0.35;
      // coxilhas, far to near; each catches a rim of sunlight
      for (let i = 0; i < ridges.length; i++) {
        const h = ridges[i](u);
        if (v > h) {
          const near = Math.exp(-Math.abs(u - sun.x) * 5);
          const rim = (v - h) * rows_ < 1.2 ? 0.85 * near * (1 - i * 0.25) : 0;
          let g = [0.24, 0.12, 0.02][i] + rim;
          if (i === 2) {
            const wind = Math.sin(u * 52 - th + v * 30 + 3 * fbm(u * 5, v * 5, 7)) * 0.5 + 0.5;
            g += 0.16 * Math.pow(wind, 6) * smooth(0.84, 0.98, v);
          }
          tone = g;
        }
      }
      px[r * cols + c] = tone < 0.03 ? 0 : quantize(tone, c, r, levels);
    }
  }
  return px;
}

// Static dithered field used behind each project card's screen.
function fieldFrame(seed, cols, rows_, levels) {
  const px = new Uint8Array(cols * rows_);
  for (let r = 0; r < rows_; r++) for (let c = 0; c < cols; c++) {
    const u = c / cols, v = r / rows_;
    const n = fbm(u * 3 + seed, v * 2.2 - seed, seed * 7);
    const tone = 0.04 + 0.55 * smooth(0.45, 0.85, n) * (0.3 + 0.7 * u) + 0.2 * smooth(0.6, 1, v) * smooth(0.5, 0.75, fbm(u * 8, v * 3, seed));
    px[r * cols + c] = tone < 0.05 ? 0 : quantize(tone * 0.8, c, r, levels);
  }
  return px;
}

const INTER_FEATURES = "'blwf','cv09','cv03','cv04','cv11','cv13','cv06','cv07','cv05','cv10','cv12','ss03'";
const style = (faces) => `<style>
${faces.map((f) => FACES[f]()).join('\n')}
text{font-family:RMono,ui-monospace,SFMono-Regular,Menlo,monospace}
image{image-rendering:pixelated}
.sans{font-family:RInter,"Inter",Arial,sans-serif;font-feature-settings:${INTER_FEATURES};letter-spacing:.01em}
.t1{fill:${C.text1}}.t2{fill:${C.text2}}.t3{fill:${C.text3}}.ac{fill:${C.accent}}
.code{font-size:13px}.code-sm{font-size:12px}.body{font-size:14px}
.label{font-family:RGeist,"Geist",Arial,sans-serif;font-size:12px;font-weight:500;letter-spacing:.04em;text-transform:uppercase}
.micro{font-family:RGeist,"Geist",Arial,sans-serif;font-size:11px;letter-spacing:.04em;text-transform:uppercase}
.title{font-size:22px;font-weight:500;letter-spacing:-.02em}
.display{font-size:36px;font-weight:500;letter-spacing:-.04em}
@media (prefers-reduced-motion:reduce){.motion{display:none}.still{display:inline!important}}
</style>`;

let clipN = 0;
const shell = (w, h, title, body, faces = ['mono', 'monoMedium', 'inter', 'geist']) => {
  const id = `card${clipN++}`, g = 4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">${style(faces)}<clipPath id="${id}"><rect x="${g}" y="${g}" width="${w - g * 2}" height="${h - g * 2}" rx="10"/></clipPath><g clip-path="url(#${id})"><rect width="${w}" height="${h}" fill="${C.page}"/>${body}</g><rect x="${g + 0.5}" y="${g + 0.5}" width="${w - g * 2 - 1}" height="${h - g * 2 - 1}" rx="10" fill="none" stroke="${C.line}"/></svg>\n`;
};
const hline = (y, x1 = 0, x2 = W) => `<line x1="${x1}" x2="${x2}" y1="${y + 0.5}" y2="${y + 0.5}" stroke="${C.line}"/>`;
const vline = (x, y1, y2) => `<line x1="${x + 0.5}" x2="${x + 0.5}" y1="${y1}" y2="${y2}" stroke="${C.line}"/>`;

// Four-cell "working" mark; one cell lit at a time.
function busy(x, y) {
  const cells = [[0, 0], [5, 0], [5, 5], [0, 5]];
  return cells.map(([dx, dy], i) => `<rect x="${x + dx}" y="${y + dy}" width="3" height="3" fill="${C.accent}" opacity="${i ? 0.25 : 1}"><animate attributeName="opacity" values="${cells.map((_, s) => (s === i ? 1 : 0.25)).join(';')}" dur="1s" calcMode="discrete" repeatCount="indefinite"/></rect>`).join('');
}
// Spacing: every panel is a card inset G from the image edge; content sits P inside the card.
const G = 4, P = 20, X0 = G + P, BAR = 40;

function head(w, name, right = '', status = '', action = '') {
  const sx = name ? X0 + name.length * 7.8 + 16 : X0;
  let rx = w - X0, btn = '';
  if (action) {
    // small "Open" pill at the right end of the bar, in the site's intro-link colors
    const tw = textWidth(action, 13) + action.length * 0.13, ih = 8, bw = Math.round(10 + tw + 6 + ih + 10), bh = 24;
    const bx = w - X0 - bw, by = G + 18 - bh / 2, ix = bx + 10 + tw + 6, iy = G + 18 - ih / 2;
    btn = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="${C.button}"/><text x="${bx + 10}" y="${G + 22.5}" class="sans" font-size="13" font-weight="500" fill="${C.buttonText}">${esc(action)}</text><path d="M${ix} ${iy + ih}L${ix + ih} ${iy}M${ix + 2.2} ${iy}H${ix + ih}V${iy + ih - 2.2}" fill="none" stroke="${C.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    rx = bx - 12;
  }
  return `<rect width="${w}" height="${BAR}" fill="${C.panel}"/>${hline(BAR - 1, 0, w)}<text x="${X0}" y="${G + 23}" class="code t1" font-weight="500">${esc(name)}</text>${status ? `${busy(sx, G + 13)}<text x="${sx + 16}" y="${G + 23}" class="label t2">${esc(status)}</text>` : ''}<text x="${rx}" y="${G + 23}" text-anchor="end" class="code-sm t3">${esc(right)}</text>${btn}`;
}
const img = (x, y, w, h, data, cls = '', extra = '') => `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" ${cls ? `class="${cls}"` : ''} ${extra} href="data:image/png;base64,${data}"/>`;

// The site's intro button: a pill, 12px side padding, 28px tall, 14px sentence-case label.
function pill(xRight, yMid, label) {
  const tw = textWidth(label, 14) + label.length * 0.14, iw = 9, gap = 7; // + .01em tracking
  const bw = Math.round(12 + tw + gap + iw + 12), bh = 28, bx = xRight - bw, by = yMid - bh / 2;
  const ix = bx + 12 + tw + gap, iy = yMid - iw / 2;
  return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="${C.button}"/><text x="${bx + 12}" y="${yMid + 5}" class="sans" font-size="14" font-weight="500" fill="${C.buttonText}">${esc(label)}</text><path d="M${ix} ${iy + iw}L${ix + iw} ${iy}M${ix + 2.5} ${iy}H${ix + iw}V${iy + iw - 2.5}" fill="none" stroke="${C.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// Card footer styles. `github.button` in the config picks one.
function footer(style, w, f0, repo, f) {
  const mid = f0 + 28, label = f.cta, path = `<text x="${X0}" y="${mid + 4}" class="code-sm t3">${esc(repo.full_name)}</text>`;
  const arrow = (x, y, s = 9, color = C.accent, sw = 1.6) => `<path d="M${x} ${y + s}L${x + s} ${y}M${x + s * 0.28} ${y}H${x + s}V${y + s * 0.72}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const tw = textWidth(label, 14) + label.length * 0.14;
  if (style === 'link') {
    const x = w - X0 - tw - 15;
    return `${path}<text x="${x}" y="${mid + 5}" class="sans" font-size="14" font-weight="500" fill="${C.accent}">${esc(label)}</text>${arrow(x + tw + 6, mid - 4.5, 9, C.accent)}`;
  }
  if (style === 'ink') {
    const bw = Math.round(14 + tw + 7 + 9 + 14), bx = w - X0 - bw;
    return `${path}<rect x="${bx}" y="${mid - 15}" width="${bw}" height="30" rx="15" fill="${C.text1}"/><text x="${bx + 14}" y="${mid + 5}" class="sans" font-size="14" font-weight="500" fill="${C.page}">${esc(label)}</text>${arrow(bx + 14 + tw + 7, mid - 4.5, 9, C.page)}`;
  }
  if (style === 'outline') {
    const bw = Math.round(14 + tw + 7 + 9 + 14), bx = w - X0 - bw;
    return `${path}<rect x="${bx + 0.5}" y="${mid - 14.5}" width="${bw - 1}" height="29" rx="14.5" fill="none" stroke="${C.line}"/><text x="${bx + 14}" y="${mid + 5}" class="sans" font-size="14" font-weight="500" fill="${C.text1}">${esc(label)}</text>${arrow(bx + 14 + tw + 7, mid - 4.5, 9, C.text3)}`;
  }
  if (style === 'row') {
    // the whole footer reads as one link row: label left, arrow right
    return `<text x="${X0}" y="${mid + 5}" class="sans" font-size="14" font-weight="500" fill="${C.text1}">${esc(label)}</text><text x="${X0 + tw + 10}" y="${mid + 4}" class="code-sm t3">${esc(repo.full_name.split('/')[1])}</text>${arrow(w - X0 - 10, mid - 5, 10, C.text1)}`;
  }
  return `${path}${pill(w - X0, mid, label)}`;
}

// ---------- panels ----------
function headerSvg() {
  const sceneY = BAR, sceneH = 240, H = sceneY + sceneH + G;
  const cell = layout.cell, cols = W / cell, rws = sceneH / cell;
  const n = motion.frames;
  const frames = Array.from({ length: n }, (_, i) => pampaFrame(i / n, cols, rws, C.scene.length));
  const anim = png(frames, cols, rws, C.scene, motion.fps);
  const still = png([frames[0]], cols, rws, C.scene, motion.fps);
  const body = `${head(W, '', `github.com/${github.username}`, 'building')}
<g transform="translate(0 ${sceneY})">${img(0, 0, W, sceneH, anim, 'motion')}${img(0, 0, W, sceneH, still, 'still', 'style="display:none"')}</g>`;
  return shell(W, H, `${profile.name}: ${profile.intro}`, body);
}

function screen(f, x, y, w, h, seed = 0) {
  // a terminal-like window floating on the dithered field
  const pad = 14, lines = f.lines || [];
  let inner = '';
  if (f.flow) {
    const bw = 92, gap = (w - pad * 2 - bw * f.flow.length) / (f.flow.length - 1);
    inner += f.flow.map((label, i) => {
      const bx = x + pad + i * (bw + gap), by = y + 46;
      const arrow = i < f.flow.length - 1 ? `<line x1="${bx + bw + 6}" x2="${bx + bw + gap - 8}" y1="${by + 17}" y2="${by + 17}" stroke="${C.accent}" stroke-dasharray="3 3"><animate attributeName="stroke-dashoffset" values="6;0" dur=".6s" repeatCount="indefinite"/></line><path d="M${bx + bw + gap - 9} ${by + 13}l5 4-5 4" fill="none" stroke="${C.accent}"/>` : '';
      return `<rect x="${bx}" y="${by}" width="${bw}" height="34" fill="${C.panel}" stroke="${C.line}"/><text x="${bx + bw / 2}" y="${by + 21}" text-anchor="middle" class="code-sm t1">${esc(label)}</text>${arrow}`;
    }).join('');
    inner += lines.map((l, i) => `<text x="${x + pad}" y="${y + 116 + i * 18}" class="code-sm t2">${esc(l)}</text>`).join('');
  } else {
    let t = 0.6 + seed * 0.35;
    const cw = 7.2;
    lines.forEach((l, i) => {
      const ly = y + 42 + i * 17;
      if (!l) { t += 0.15; return; }
      const cls = /^[$>:]/.test(l) ? 't1' : 't2';
      const mark = /^[$>:]/.test(l) ? `<tspan class="ac">${esc(l[0])}</tspan>${esc(l.slice(1))}` : esc(l).replace(/^ +/, (m) => '\u00a0'.repeat(m.length));
      const n = l.length, dur = n / (l.startsWith('$') ? 26 : 60);
      const id = `c${seed}x${i}`;
      const steps = Array.from({ length: n + 1 }, (_, k) => (k * cw).toFixed(1)).join(';');
      inner += `<clipPath id="${id}"><rect x="${x + pad}" y="${ly - 12}" width="0" height="16"><animate attributeName="width" values="${steps}" begin="${t.toFixed(2)}s" dur="${dur.toFixed(2)}s" calcMode="discrete" fill="freeze"/></rect></clipPath><text x="${x + pad}" y="${ly}" class="code-sm ${cls}" clip-path="url(#${id})">${mark}</text>`;
      t += dur + 0.2;
    });
    const last = lines.length;
    inner += `<rect x="${x + pad}" y="${y + 42 + last * 17 - 11}" width="7" height="14" fill="${C.accent}" opacity="0"><set attributeName="opacity" to="1" begin="${t.toFixed(2)}s"/><animate attributeName="visibility" values="visible;hidden" dur="1.06s" begin="${t.toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/></rect>`;
  }
  const wid = `win${seed}`;
  return `<clipPath id="${wid}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/></clipPath><g clip-path="url(#${wid})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.well}"/><rect x="${x}" y="${y}" width="${w}" height="22" fill="${C.panel}"/>${hline(y + 21, x, x + w)}${[0, 1, 2].map((i) => `<circle cx="${x + 14 + i * 10}" cy="${y + 11}" r="2.5" fill="${i === 0 ? C.accent : C.line}"/>`).join('')}${inner}</g><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="6" fill="none" stroke="${C.line}"/>`;
}

function projectSvg(f, repo, index, act) {
  const style = github.button || 'pill';
  const w = W / 2, bannerH = 196, bodyH = 164, metaH = 64, footH = style === 'none' ? G : 56 + G;
  const H = BAR + bannerH + bodyH + metaH + footH;
  const cell = layout.cell, cols = w / cell, rws = bannerH / cell;
  const field = png([fieldFrame(index * 3.7 + 1, cols, rws, C.scene.length)], cols, rws, C.scene, 1);
  const b = BAR + bannerH, m = b + bodyH, f0 = m + metaH;
  const desc = wrap(repo.description, 54, 4);
  const commits = act ? act.reduce((a, d) => a + d.count, 0) : null;
  const third = (w - G) / 3;
  const meta = [['Language', repo.language || 'mixed'], commits != null ? ['Commits, 1y', commits.toLocaleString('en-US')] : ['Stars', compact(repo.stargazers_count)], ['Updated', date(repo.pushed_at)]]
    .map(([l, v], i) => `${i < 2 ? vline(G + third * (i + 1), m, m + metaH) : ''}<text x="${G + third * i + P}" y="${m + 26}" class="micro t3">${l}</text><text x="${G + third * i + P}" y="${m + 47}" class="sans body t1" font-weight="500">${esc(v)}</text>`).join('');
  const body = `${head(w, String(index + 1).padStart(2, '0') + '  ' + repo.name, (f.kind || '').toLowerCase(), '', style === 'none' ? 'Open' : '')}
<g transform="translate(0 ${BAR})">${img(0, 0, w, bannerH, field)}${screen(f, X0, P, w - X0 * 2, bannerH - P * 2, index)}</g>${hline(b)}
<text x="${X0}" y="${b + 44}" class="sans title t1">${esc(repo.name)}</text>
${desc.map((l, k) => `<text x="${X0}" y="${b + 74 + k * 22}" class="sans body t2">${esc(l)}</text>`).join('')}
${hline(m)}${meta}${style === 'none' ? '' : hline(f0)}
${style === 'none' ? '' : footer(style, w, f0, repo, f)}`;
  return shell(w, H, `${repo.full_name}: ${repo.description || ''}`, body);
}

function reposSvg(list) {
  const headRow = 40, rowH = 48, H = BAR + headRow + list.length * rowH + G;
  const dX = 200, lX = W - 156;
  const rowsSvg = list.map((r, i) => {
    const y = BAR + headRow + i * rowH;
    return `${i ? `<line x1="${G}" x2="${W - G}" y1="${y + 0.5}" y2="${y + 0.5}" stroke="${C.lineFaint}"/>` : ''}<text x="${X0}" y="${y + 29}" class="code t1">${esc(r.name)}</text><text x="${dX}" y="${y + 29}" class="sans t2" font-size="14">${esc(clamp(r.description || 'No description yet.', 72))}</text><text x="${lX}" y="${y + 29}" class="code-sm t2">${esc(r.language || '—')}</text><text x="${W - X0}" y="${y + 29}" text-anchor="end" class="code-sm t2">${date(r.pushed_at)}</text>`;
  }).join('');
  const hy = BAR + 25;
  return shell(W, H, `More repositories by ${github.username}`, `${head(W, 'more', `${list.length} repositories`)}<text x="${X0}" y="${hy}" class="micro t3">Repository</text><text x="${dX}" y="${hy}" class="micro t3">Description</text><text x="${lX}" y="${hy}" class="micro t3">Language</text><text x="${W - X0}" y="${hy}" text-anchor="end" class="micro t3">Updated</text>${hline(BAR + headRow - 1)}${rowsSvg}`, ['mono', 'monoMedium', 'inter', 'geist']);
}

const ICONS = {
  globe: (x, y) => `<circle cx="${x + 8}" cy="${y + 8}" r="7.5" fill="none" stroke="${C.text2}"/><ellipse cx="${x + 8}" cy="${y + 8}" rx="3.2" ry="7.5" fill="none" stroke="${C.text2}"/><line x1="${x}" x2="${x + 16}" y1="${y + 8}" y2="${y + 8}" stroke="${C.text2}"/>`,
  in: (x, y) => `<rect x="${x}" y="${y}" width="16" height="16" rx="3" fill="${C.text2}"/><text x="${x + 8}" y="${y + 12.5}" text-anchor="middle" font-size="11" font-weight="600" class="sans" fill="${C.page}">in</text>`,
  grid: (x, y) => [0, 1, 2].flatMap((a) => [0, 1, 2].map((b) => `<rect x="${x + a * 6}" y="${y + b * 6}" width="4" height="4" rx="1" fill="${(a + b) % 2 ? C.accent : C.text2}"/>`)).join(''),
};
function linkSvg(link, w) {
  const H = 56 + G * 2, mid = H / 2;
  const arrow = `<path d="M${w - X0 - 9} ${mid + 4.5}L${w - X0} ${mid - 4.5}M${w - X0 - 6.5} ${mid - 4.5}H${w - X0}V${mid + 2}" fill="none" stroke="${C.text3}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  return shell(w, H, link.label, `${ICONS[link.icon](X0, mid - 8)}<text x="${X0 + 32}" y="${mid + 5}" class="sans t1" font-size="14" font-weight="500">${esc(link.label)}</text>${arrow}`, ['inter']);
}

export function sunsetFiles(data) {
  return {
    header: headerSvg(data),
    ...Object.fromEntries(github.featured.map((f, i) => [`project-${i + 1}`, projectSvg(f, data.repos[f.repo], i, data.activity[f.repo])])),
    repos: reposSvg(github.more.map((n) => data.repos[n])),
    ...Object.fromEntries(profile.links.map((l, i) => [`link-${i + 1}`, linkSvg(l, W / profile.links.length)])),
  };
}

export function sunsetReadme(data, pic) {
  const cards = github.featured.map((f, i) => {
    const r = data.repos[f.repo];
    return `<a href="${f.url || r.html_url}">${pic(`project-${i + 1}`, '50%', `${r.name}: ${r.description || ''}`)}</a>`;
  }).join('');
  return `<p align="center">${pic('header', '100%', `${profile.name}: ${profile.intro} Now ${profile.now}.`)}</p>

<p align="center">${cards}</p>

<p align="center"><a href="https://github.com/${github.username}?tab=repositories">${pic('repos', '100%', `More repositories by ${github.username}`)}</a></p>

<p align="center">${profile.links.map((l, i) => `<a href="${l.url}">${pic(`link-${i + 1}`, `${(100 / profile.links.length).toFixed(2)}%`, l.label)}</a>`).join('')}</p>
`;
}

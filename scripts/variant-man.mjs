// "man" variant: `man rafael` typed in a shell, then the page opens in less.
import { config, github } from './lib.mjs';
import { RICCO, CW, LH, FS, svg, row, typed, during, wrapText } from './term.mjs';
import { bracketChip } from './variant-ascii.mjs';

const V = config.variants.terminal;
const W = 880;
let T;

function page(data) {
  const cols = Math.floor((W - 16) / CW);
  const I = '       ', I2 = '              ';
  const L = [];
  const head = 'RAFAEL(1)', mid = 'General Commands Manual';
  const gap = cols - head.length * 2 - mid.length;
  L.push([[head, 'fg b'], [' '.repeat(Math.floor(gap / 2)) + mid + ' '.repeat(Math.ceil(gap / 2)), 'dim'], [head, 'fg b']]);
  L.push([]);
  const section = (name) => { L.push([[name, 'keyword b']]); };
  const para = (text, indent = I, cls = 'fg') => wrapText(text, cols - indent.length - 2).forEach((l) => L.push([[indent + l, cls]]));

  section('NAME');
  L.push([[I + 'rafael', 'fg b'], [' - product engineer building full-stack and AI applications', 'fg']]);
  L.push([]);
  section('SYNOPSIS');
  L.push([[I + 'rafael', 'fg b'], [' [', 'fg'], ['--from', 'func b'], [' ', 'fg'], ['customer-problem', 'string u'], ['] [', 'fg'], ['--to', 'func b'], [' ', 'fg'], ['production', 'string u'], ['] [', 'fg'], ['--stack', 'func b'], [' ', 'fg'], ['ts', 'string u'], ['|', 'fg'], ['python', 'string u'], [']', 'fg']]);
  L.push([]);
  section('DESCRIPTION');
  para('rafael is a product engineer based in Rio Grande do Sul, Brasil. Takes a customer problem to production, front end to back end, in TypeScript, Python, React and Node.js. Lately most of that work is AI applications: agents, RAG and the UI people use.');
  L.push([]);
  section('OPTIONS');
  for (const name of V.telescope.slice(0, 5)) {
    const r = data.repos[name];
    L.push([[I + '--' + name, 'func b']]);
    para(r.description || 'No description yet.', I2, 'fg');
  }
  L.push([]);
  section('ENVIRONMENT');
  for (const [k, v] of [['EDITOR', 'nvim'], ['SHELL', 'zsh'], ['TERM', 'ghostty'], ['THEME', 'ricco']]) L.push([[I + k, 'prop b'], ['=' + v, 'fg']]);
  L.push([]);
  section('FILES');
  L.push([[I + '~/.config/nvim/', 'string u'], ['   kept in github.com/' + github.username + '/dotfiles', 'dim']]);
  L.push([]);
  section('EXIT STATUS');
  L.push([[I + '0', 'number b'], ['      shipped.', 'fg']]);
  L.push([]);
  section('SEE ALSO');
  L.push([[I, 'fg'], ['r1cco.com', 'fg b'], ['(7), ', 'fg'], ['linkedin', 'fg b'], ['(1), ', 'fg'], ['job-kit-ai', 'fg b'], ['(1), ', 'fg'], ['postie', 'fg b'], ['(8)', 'fg']]);
  L.push([]);
  const foot = 'r1cco', date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const g2 = cols - foot.length - head.length - date.length;
  L.push([[foot + ' '.repeat(Math.floor(g2 / 2)) + date + ' '.repeat(Math.ceil(g2 / 2)), 'dim'], [head, 'fg b']]);
  return L;
}

function manSvg(data) {
  const lines = page(data);
  const x0 = 10, top = 8, H = top * 2 + (lines.length + 1) * LH;
  const y = (r) => top + r * LH + FS;
  // shell prompt typed first
  const cmd = typed(x0, y(0), [['~ ', 'blue'], ['$ ', 'dim'], ['man rafael', 'fg']], 0.5, 14);
  const shell = during(cmd.svg + `<rect class="blink" x="${x0 + 15 * CW}" y="${y(0) - FS + 1}" width="${CW}" height="${LH - 2}" fill="${T.fg}"/>`, 0, cmd.end + 0.5);
  // the page, drawn in quickly line by line like a pager repaint
  const open = cmd.end + 0.5;
  const body = lines.map((segs, r) => (segs.length ? during(row(x0, y(r), segs), open + r * 0.018) : '')).join('');
  const sy = top + lines.length * LH;
  const msg = ` Manual page rafael(1) line 1/${lines.length} (END) (press q to quit)`;
  const status = during(`<rect x="0" y="${sy}" width="${W}" height="${LH + top}" fill="${T.fg}"/>${row(x0, y(lines.length), [[msg, 'bg']])}<rect class="blink" x="${x0 + msg.length * CW}" y="${sy + 2}" width="${CW}" height="${LH - 4}" fill="${T.bg}"/>`, open + lines.length * 0.018);
  return svg(T, W, H, 'man rafael: product engineer building full-stack and AI applications, based in Rio Grande do Sul, Brasil.', shell + body + status);
}

export function manFiles(data, mode) {
  T = RICCO[mode];
  const files = { page: manSvg(data) };
  V.links.forEach((l, i) => (files[`btn-${i + 1}`] = bracketChip(l.label).svg(T)));
  return files;
}

export function manReadme(data, pic) {
  const btns = V.links.map((l, i) => `<a href="${l.url}">${pic(`btn-${i + 1}`, String(bracketChip(l.label).w), l.label)}</a>`).join(' ');
  return `<p align="center">${pic('page', '100%', 'man rafael: product engineer building full-stack and AI applications, based in Rio Grande do Sul, Brasil.')}</p>

<p align="center">${btns}</p>
`;
}

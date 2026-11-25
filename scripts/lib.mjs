// Builds the profile README as a stack of theme-aware SVG panels.
// Edit profile.config.json, then run: GITHUB_TOKEN=... node scripts/build-profile.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

export const root = new URL('..', import.meta.url).pathname;
export const config = JSON.parse(readFileSync(root + 'profile.config.json', 'utf8'));
export const { github, profile, theme, motion, layout } = config;
export const W = layout.width;


export const font = (file) => readFileSync(root + 'fonts/' + file).toString('base64');
export const FONTS = {
  inter: font('inter-var.woff2'),
  geist: font('geist-var.woff2'),
  mono: font('GeistMono-Regular.sub.woff2'),
  monoMedium: font('GeistMono-Medium.sub.woff2'),
  sans: font('Geist-Regular.sub.woff2'),
  sansMedium: font('Geist-Medium.sub.woff2'),
};

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const clamp = (s, n) => (String(s ?? '').length > n ? String(s).slice(0, n - 1) + '…' : String(s ?? ''));
export const compact = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n ?? 0));
export const date = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export function wrap(text, max, lines) {
  const out = [''];
  for (const word of String(text || '').split(/\s+/)) {
    const cur = out[out.length - 1];
    if ((cur + ' ' + word).trim().length <= max) out[out.length - 1] = (cur + ' ' + word).trim();
    else if (out.length < lines) out.push(word);
    else { out[out.length - 1] = clamp(cur + ' ' + word, max); break; }
  }
  return out;
}

// ---------- GitHub data ----------
export async function gh(path) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'profile-readme-builder' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch('https://api.github.com' + path, { headers });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

// ---------- PNG (indexed + animated) ----------
export const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function chunk(type, data = Buffer.alloc(0)) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function ihdr(w, h) { const b = Buffer.alloc(13); b.writeUInt32BE(w, 0); b.writeUInt32BE(h, 4); b[8] = 8; b[9] = 3; return b; }
export function rows(px, w, h) { const out = Buffer.alloc((w + 1) * h); for (let y = 0; y < h; y++) { out[y * (w + 1)] = 0; px.subarray(y * w, y * w + w).forEach((v, x) => (out[y * (w + 1) + 1 + x] = v)); } return out; }
export function png(frames, w, h, palette, fps) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr(w, h)), chunk('PLTE', Buffer.from(palette.flatMap(hex)))];
  if (frames.length === 1) {
    parts.push(chunk('IDAT', deflateSync(rows(frames[0], w, h), { level: 9 })));
  } else {
    const actl = Buffer.alloc(8); actl.writeUInt32BE(frames.length, 0); actl.writeUInt32BE(0, 4);
    parts.push(chunk('acTL', actl));
    let seq = 0;
    frames.forEach((px, i) => {
      const fc = Buffer.alloc(26);
      fc.writeUInt32BE(seq++, 0); fc.writeUInt32BE(w, 4); fc.writeUInt32BE(h, 8);
      fc.writeUInt16BE(1, 20); fc.writeUInt16BE(fps, 22);
      parts.push(chunk('fcTL', fc));
      const z = deflateSync(rows(px, w, h), { level: 9 });
      if (i === 0) parts.push(chunk('IDAT', z));
      else { const s = Buffer.alloc(4); s.writeUInt32BE(seq++); parts.push(chunk('fdAT', Buffer.concat([s, z]))); }
    });
  }
  parts.push(chunk('IEND'));
  return Buffer.concat(parts).toString('base64');
}

// ---------- noise + dither ----------
export const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const hash = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
export const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export function noise(x, y, s = 0) {
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export function fbm(x, y, s, oct = 4) { let t = 0, a = 0.5, n = 0; for (let o = 0; o < oct; o++) { t += noise(x, y, s + o * 17) * a; n += a; x = x * 2.03 + 7.1; y = y * 2.03 - 3.7; a *= 0.5; } return t / n; }
export function quantize(tone, col, row, levels) {
  const scaled = Math.max(0, Math.min(1, tone)) * (levels - 1);
  const base = Math.floor(scaled);
  return Math.min(levels - 1, base + (scaled - base > BAYER[row % 4][col % 4] / 16 ? 1 : 0));
}

// Pampa sunset: a low sun behind rolling coxilhas, drifting cloud bands, wind on the grass.

// shared theme state for the SVG atoms
export let C;
export const setTheme = (colors) => { C = colors; };
export const FACES = {
  inter: () => `@font-face{font-family:RInter;src:url(data:font/woff2;base64,${FONTS.inter}) format('woff2');font-weight:100 900}`,
  geist: () => `@font-face{font-family:RGeist;src:url(data:font/woff2;base64,${FONTS.geist}) format('woff2');font-weight:100 900}`,
  mono: () => `@font-face{font-family:RMono;src:url(data:font/woff2;base64,${FONTS.mono}) format('woff2');font-weight:400}`,
  monoMedium: () => `@font-face{font-family:RMono;src:url(data:font/woff2;base64,${FONTS.monoMedium}) format('woff2');font-weight:500}`,
  sans: () => `@font-face{font-family:RSans;src:url(data:font/woff2;base64,${FONTS.sans}) format('woff2');font-weight:400}`,
  sansMedium: () => `@font-face{font-family:RSans;src:url(data:font/woff2;base64,${FONTS.sansMedium}) format('woff2');font-weight:500}`,
};

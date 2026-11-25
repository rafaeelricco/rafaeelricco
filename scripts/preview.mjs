// Local preview of the profile README, framed like GitHub's README box.
// Rebuilds the panels (offline, from the cached GitHub data) whenever the
// config or a script changes, then reloads the page.
//   node scripts/preview.mjs [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync, watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const port = Number(process.argv[2] || process.env.PORT || 4321);
const clients = new Set();
let building = null, queued = false, lastError = '';

function build() {
  if (building) { queued = true; return; }
  const started = Date.now();
  building = spawn(process.execPath, [join(root, 'scripts/build-profile.mjs')], { cwd: root, env: { ...process.env, PROFILE_OFFLINE: '1' } });
  let err = '';
  building.stderr.on('data', (d) => (err += d));
  building.on('close', (code) => {
    building = null;
    lastError = code === 0 ? '' : err.trim();
    console.log(code === 0 ? `rebuilt in ${Date.now() - started}ms` : `build failed:\n${lastError}`);
    for (const res of clients) res.write(`data: ${code === 0 ? 'reload' : 'error'}\n\n`);
    if (queued) { queued = false; build(); }
  });
}

let timer;
const onChange = (_, file) => {
  if (file && /generated|github-cache/.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(build, 120);
};
watch(join(root, 'scripts'), onChange);
watch(join(root, 'profile.config.json'), onChange);

const page = () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>rafaeelricco README preview</title>
<style>
:root{--bg:#fff;--fg:#1f2328;--muted:#59636e;--line:#d1d9e0;--sub:#f6f8fa}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0d1117;--fg:#f0f6fc;--muted:#9198a1;--line:#3d444d;--sub:#151b23;color-scheme:dark}}
:root[data-theme=dark]{--bg:#0d1117;--fg:#f0f6fc;--muted:#9198a1;--line:#3d444d;--sub:#151b23;color-scheme:dark}
:root[data-theme=light]{color-scheme:light}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif}
.bar{position:sticky;top:0;z-index:2;display:flex;justify-content:flex-end;gap:4px;padding:10px 16px;background:var(--sub);border-bottom:1px solid var(--line)}
.bar button{all:unset;cursor:pointer;padding:5px 10px;border:1px solid var(--line);border-radius:6px;font-size:12px;color:var(--muted)}
.bar button[aria-pressed=true]{color:var(--fg);background:var(--bg);font-weight:600}
.bar button:focus-visible{outline:2px solid #4493f8}
.wrap{max-width:1012px;margin:0 auto;padding:24px 16px 48px}
.readme{padding:0}
.readme p{margin:0 0 16px;text-align:center;line-height:0}
.readme p:last-child{margin:0}
.readme img{max-width:100%;vertical-align:top}
.err{white-space:pre-wrap;font:12px/1.5 ui-monospace,Menlo,monospace;color:#cf222e;border:1px solid #cf222e;border-radius:6px;padding:12px;margin-bottom:16px}
</style></head><body>
<div class="bar" role="group" aria-label="GitHub theme"><button id="m-auto" data-m="" aria-pressed="true">System</button><button id="m-dark" data-m="dark" aria-pressed="false">Dark</button><button id="m-light" data-m="light" aria-pressed="false">Light</button></div>
<div class="wrap">${lastError ? `<div class="err">Build failed, showing the last good panels:\n${lastError.replace(/</g, '&lt;')}</div>` : ''}<article class="readme" id="readme">${readme}</article></div>
<script>
// Force a theme by pointing each <picture> at its dark or light file, as GitHub would.
let mode = '';
try { mode = localStorage.getItem('gh-mode') || ''; } catch (e) {}
function apply() {
  document.documentElement.dataset.theme = mode;
  if (!mode) delete document.documentElement.dataset.theme;
  document.querySelectorAll('#readme picture').forEach((p) => {
    const s = p.querySelector('source'), img = p.querySelector('img');
    if (!s.dataset.srcset) s.dataset.srcset = s.getAttribute('srcset');
    if (!img.dataset.src) img.dataset.src = img.getAttribute('src');
    s.setAttribute('srcset', mode === 'light' ? img.dataset.src : s.dataset.srcset);
    s.setAttribute('media', mode === 'dark' ? 'all' : mode === 'light' ? 'not all' : '(prefers-color-scheme: dark)');
  });
  document.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === mode));
}
document.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { mode = b.dataset.m; try { localStorage.setItem('gh-mode', mode); } catch (e) {} apply(); }));
apply();
new EventSource('/events').onmessage = () => location.reload();
</script></body></html>`;
};

const TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); return res.end(page()); }
  if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(': ok\n\n');
    clients.add(res);
    return req.on('close', () => clients.delete(res));
  }
  const file = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(join(root, 'profile/')) || !existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`README preview on http://localhost:${port}`));

build();

// "nvim" variant: the README is a Neovim session in Rafael's ricco colorscheme.
// Header: tabline, file tree, rafael.lua typed out in insert mode, statusline, :w.
// Projects: a Telescope picker whose selection walks the list while the preview follows.
import { config, github } from "./lib.mjs";
import {
  RICCO,
  CW,
  LH,
  FS,
  svg,
  row,
  typed,
  rideCursor,
  during,
  sparkline,
  pad,
  wrapText,
  short,
} from "./term.mjs";

const V = config.variants.terminal;
const W = 880;
let T;

const lua = [
  [["-- rafael.lua", "dim"]],
  [
    ["local", "keyword"],
    [" M = {}", "fg"],
  ],
  [],
  [
    ["M.", "fg"],
    ["name", "prop"],
    ["     = ", "fg"],
    ['"Rafael Ricco"', "string"],
  ],
  [
    ["M.", "fg"],
    ["role", "prop"],
    ["     = ", "fg"],
    ['"Product Engineer"', "string"],
  ],
  [
    ["M.", "fg"],
    ["based_in", "prop"],
    [" = ", "fg"],
    ['"Rio Grande do Sul, Brasil"', "string"],
  ],
  [
    ["M.", "fg"],
    ["stack", "prop"],
    ["    = { ", "fg"],
    ['"TypeScript"', "string"],
    [", ", "fg"],
    ['"Python"', "string"],
    [", ", "fg"],
    ['"React"', "string"],
    [", ", "fg"],
    ['"Node.js"', "string"],
    [" }", "fg"],
  ],
  [
    ["M.", "fg"],
    ["editor", "prop"],
    ["   = ", "fg"],
    ['"nvim"', "string"],
  ],
  [],
  [
    ["M.", "fg"],
    ["now", "prop"],
    [" = {", "fg"],
  ],
  [
    ['  "shipping job-kit-ai"', "string"],
    [",", "fg"],
  ],
  [
    ['  "building postie"', "string"],
    [",", "fg"],
  ],
  [["}", "fg"]],
  [],
  [
    ["function", "keyword"],
    [" M.", "fg"],
    ["workflow", "func"],
    ["()", "fg"],
  ],
  [
    ["  return", "keyword"],
    [' "customer problem -> production"', "string"],
  ],
  [["end", "keyword"]],
  [],
  [
    ["return", "keyword"],
    [" M", "fg"],
  ],
];

function headerSvg(data) {
  const rows = 1 + lua.length + 2,
    top = 6,
    H = top * 2 + rows * LH;
  const y = (r) => top + r * LH + FS; // baseline of row r
  const treeCols = 26,
    treeW = treeCols * CW + 10,
    gutter = treeW + 8,
    codeX = gutter + 4 * CW + CW;
  const shown = [...V.telescope];
  const more = Math.max(0, data.user.public_repos - shown.length);

  // tabline
  const tab = `<rect x="0" y="0" width="${W}" height="${top + LH}" fill="${T.bg2}"/><rect x="${treeW}" y="0" width="${12 * CW + 8}" height="${top + LH}" fill="${T.bg}"/>
${row(treeW + 8, y(0), [[" rafael.lua ", "fg b"]])}${row(treeW + 12 * CW + 16, y(0), [[" README.md ", "dim"]])}${row(W - 12, y(0), [["nvim v0.12", "dim"]], ' text-anchor="end"')}`;

  // file tree
  const tree = [
    [[" ~/rafaeelricco/", "blue b"]],
    [["   rafael.lua", "fg"]],
    [[" ▾ projects/", "blue"]],
    ...V.telescope
      .filter((n) => !n.endsWith(".nvim"))
      .map((n) => [
        ["   ● ", "green"],
        [n, "fg"],
      ]),
    [[" ▾ nvim/", "blue"]],
    ...V.telescope
      .filter((n) => n.endsWith(".nvim"))
      .map((n) => [
        ["   ● ", "keyword"],
        [n, "fg"],
      ]),
    [[` ▸ more/ (${more})`, "dim"]],
  ];
  const treeSvg = `<rect x="0" y="${top + LH}" width="${treeW}" height="${lua.length * LH}" fill="${T.bg2}"/><rect x="0" y="${top + LH * 2}" width="${treeW}" height="${LH}" fill="${T.sel}"/><line x1="${treeW + 0.5}" x2="${treeW + 0.5}" y1="${top + LH}" y2="${top + LH * (lua.length + 1)}" stroke="${T.line}"/>
${tree.map((segs, i) => row(4, y(i + 1), segs)).join("")}`;

  // code, typed in insert mode; relative line numbers around the last line
  let t = 0.8,
    body = "",
    cursors = "";
  const last = lua.length - 1;
  lua.forEach((segs, i) => {
    const rel = i === last ? String(i + 1) : String(last - i);
    body += row(
      gutter + 3 * CW,
      y(i + 1),
      [[rel, i === last ? "yellow b" : "faint"]],
      ' text-anchor="end"',
    );
    if (!segs.length) {
      t += 0.12;
      return;
    }
    const ty = typed(codeX, y(i + 1), segs, t, 38);
    body += ty.svg;
    cursors += rideCursor(T, codeX, y(i + 1), ty);
    t = ty.end + 0.16;
  });
  const done = t;
  const lastLen = lua[last].reduce((a, [s]) => a + s.length, 0);
  const finalCursor = during(
    `<rect class="blink" x="${codeX + (lastLen - 1) * CW}" y="${y(last + 1) - FS + 1}" width="${CW}" height="${LH - 2}" fill="${T.fg}" opacity=".5"/>`,
    done + 0.9,
  );
  const curline = `<rect x="${gutter}" y="${top + LH * (last + 1)}" width="${W - gutter}" height="${LH}" fill="${T.sel}" opacity=".45"/>`;

  // statusline and command line
  const sy = top + LH * (lua.length + 1);
  const bytes = lua.reduce(
    (a, segs) => a + segs.reduce((b, [s]) => b + s.length, 0) + 1,
    0,
  );
  const mode = (label, color) =>
    `<rect x="0" y="${sy}" width="${(label.length + 2) * CW}" height="${LH}" fill="${T[color]}"/><path d="M${(label.length + 2) * CW} ${sy}l9 ${LH / 2}-9 ${LH / 2}z" fill="${T[color]}"/>${row(CW, y(lua.length + 1), [[label, "onMode b"]])}`;
  const status = `<rect x="0" y="${sy}" width="${W}" height="${LH}" fill="${T.bg2}"/>
${during(mode("INSERT", "green"), 0, done + 0.9)}${during(mode("NORMAL", "blue"), done + 0.9)}
${row(10 * CW + 6, y(lua.length + 1), [
  ["main", "prop"],
  ["  rafael.lua", "fg"],
])}${during(row(27 * CW + 6, y(lua.length + 1), [["[+]", "yellow"]]), 0.8, done + 0.9)}
${row(
  W - 12,
  y(lua.length + 1),
  [
    ["lua  utf-8  ", "dim"],
    [`${lua.length}:1`, "fg"],
    ["  Bot", "dim"],
  ],
  ' text-anchor="end"',
)}`;
  const cy = y(lua.length + 2);
  const w1 = typed(6, cy, [[":w", "fg"]], done + 0.35, 6);
  const cmd =
    during(w1.svg, 0, done + 0.9) +
    during(
      row(6, cy, [[`"rafael.lua" ${lua.length}L, ${bytes}B written`, "dim"]]),
      done + 0.9,
    );

  return svg(
    T,
    W,
    H,
    "Rafael Ricco, Product Engineer, based in Rio Grande do Sul, Brasil. Stack: TypeScript, Python, React, Node.js. Now shipping job-kit-ai and building postie.",
    tab + treeSvg + curline + body + cursors + finalCursor + status + cmd,
  );
}

// Telescope picker; the selection walks the list on a loop and the preview follows.
function telescopeSvg(data) {
  const cols = Math.floor((W - 16) / CW),
    leftC = 40,
    rightC = cols - leftC - 1;
  const rowsN = 17,
    H = rowsN * LH + 16,
    x0 = 8,
    y = (r) => 8 + r * LH + FS;
  const X = (c) => x0 + c * CW;
  const box = (c0, r0, w, h, title) => {
    const t = title ? `─ ${title} ` : "";
    const top = "╭" + t + "─".repeat(w - 2 - [...t].length) + "╮";
    const lines = [
      row(X(c0), y(r0), [
        [top.slice(0, 1), "faint"],
        [t, "fg b"],
        [top.slice(1 + [...t].length), "faint"],
      ]),
    ];
    for (let r = 1; r < h - 1; r++)
      lines.push(
        row(X(c0), y(r0 + r), [["│", "faint"]]) +
          row(X(c0 + w - 1), y(r0 + r), [["│", "faint"]]),
      );
    lines.push(
      row(X(c0), y(r0 + h - 1), [["╰" + "─".repeat(w - 2) + "╯", "faint"]]),
    );
    return lines.join("");
  };
  const items = V.telescope.map((n) => data.repos[n]);
  const resH = rowsN - 3;
  let out =
    box(0, 0, leftC, resH, "Projects") +
    box(0, resH, leftC, 3, "Find Files") +
    box(leftC + 1, 0, rightC, rowsN, "Preview");

  // prompt
  out +=
    row(X(2), y(resH + 1), [
      ["> ", "red"],
      ["proj", "fg"],
    ]) +
    `<rect class="blink" x="${X(8)}" y="${y(resH + 1) - FS + 1}" width="${CW}" height="${LH - 2}" fill="${T.fg}"/>`;
  out += row(
    X(leftC - 2),
    y(resH + 1),
    [[`${items.length} / ${data.user.public_repos}`, "dim"]],
    ' text-anchor="end"',
  );

  // results (bottom-up like Telescope's default sorting)
  const step = 2.4,
    total = step * items.length;
  const rowOf = (i) => resH - 2 - i;
  const keyTimes = items.map((_, i) => (i / items.length).toFixed(4)).join(";");
  const ys = items.map((_, i) => 8 + rowOf(i) * LH).join(";");
  out += `<rect x="${X(1)}" y="${8 + rowOf(0) * LH}" width="${(leftC - 2) * CW}" height="${LH}" fill="${T.sel}"><animate attributeName="y" values="${ys}" keyTimes="${keyTimes}" dur="${total}s" calcMode="discrete" repeatCount="indefinite"/></rect>`;
  out += `<g><animateTransform attributeName="transform" type="translate" values="${items.map((_, i) => `0 ${(rowOf(i) - rowOf(0)) * LH}`).join(";")}" keyTimes="${keyTimes}" dur="${total}s" calcMode="discrete" repeatCount="indefinite"/>${row(X(1), y(rowOf(0)), [[">", "red b"]])}</g>`;
  items.forEach((r, i) => {
    const lang = (r.language || "").toLowerCase();
    out += row(X(3), y(rowOf(i)), [
      [pad(r.name, leftC - 15), r.name.endsWith(".nvim") ? "keyword" : "fg"],
      [pad(lang, 10), "dim"],
    ]);
  });

  // preview, one group per item, visible during its slot
  items.forEach((r, i) => {
    const px = X(leftC + 3),
      lines = [];
    lines.push([[`# ${r.name}`, "func b"]]);
    lines.push([]);
    for (const l of wrapText(
      r.description || "No description yet.",
      rightC - 6,
    ).slice(0, 4))
      lines.push([[l, "fg"]]);
    lines.push([]);
    lines.push([
      ["language  ", "dim"],
      [(r.language || "-").toLowerCase(), "number"],
    ]);
    lines.push([
      ["stars     ", "dim"],
      [String(r.stargazers_count), "number"],
    ]);
    lines.push([
      ["pushed    ", "dim"],
      [short(r.pushed_at), "number"],
    ]);
    const act = data.activity[r.name];
    if (act) {
      const first = act.findIndex((d) => d.count > 0);
      const s = act.slice(Math.max(0, first));
      lines.push([]);
      lines.push([
        [
          `commits since ${short(s[0].date)}: ${s.reduce((a, d) => a + d.count, 0)}`,
          "dim",
        ],
      ]);
      lines.push([[sparkline(s, rightC - 6), "green"]]);
    } else {
      lines.push([]);
      lines.push([
        ["github.com/", "dim"],
        [r.full_name, "tag"],
      ]);
    }
    const vis = items.map((_, k) => (k === i ? "visible" : "hidden")).join(";");
    out += `<g visibility="${i === 0 ? "visible" : "hidden"}"><animate attributeName="visibility" values="${vis}" keyTimes="${keyTimes}" dur="${total}s" calcMode="discrete" repeatCount="indefinite"/>${lines.map((segs, k) => (segs.length ? row(px, y(2 + k), segs) : "")).join("")}</g>`;
  });
  return svg(T, W, H, `Projects: ${items.map((r) => r.name).join(", ")}`, out);
}

export function cmdChip(label) {
  const text = ` ${label} `;
  const w = Math.round([...text].length * CW + 24);
  return {
    w,
    svg: (TT) =>
      svg(
        TT,
        w,
        36,
        label,
        row(12, 23, [
          [":", "yellow b"],
          [text.trimEnd().slice(1), "fg"],
        ]),
      ),
  };
}

export function nvimFiles(data, mode) {
  T = RICCO[mode];
  const files = { header: headerSvg(data), telescope: telescopeSvg(data) };
  V.links.forEach((l, i) => (files[`cmd-${i + 1}`] = cmdChip(l.cmd).svg(T)));
  return files;
}

export function nvimReadme(data, pic) {
  const chips = V.links
    .map(
      (l, i) =>
        `<a href="${l.url}">${pic(`cmd-${i + 1}`, String(cmdChip(l.cmd).w), l.cmd)}</a>`,
    )
    .join(" ");
  return `<p align="center">${pic("header", "100%", "Rafael Ricco: Product Engineer, based in Rio Grande do Sul, Brasil. Stack: TypeScript, Python, React, Node.js.")}</p>

<p align="center"><a href="https://github.com/${github.username}?tab=repositories">${pic("telescope", "100%", `Projects: ${V.telescope.join(", ")}`)}</a></p>

<p align="center">${chips}</p>
`;
}

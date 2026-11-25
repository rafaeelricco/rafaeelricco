// "fun" variant: `fortune | cowsay` with rotating fortunes, then the classic
// attempt to exit Neovim that ends with `nvim .` again.
import { config } from "./lib.mjs";
import { RICCO, CW, LH, FS, svg, row, typed, during } from "./term.mjs";
import { bracketChip } from "./variant-ascii.mjs";

const V = config.variants.terminal;
const W = 880;
let T;

function cowSvg(data) {
  const total = data.contributions.reduce((a, d) => a + d.count, 0);
  const since = new Date(data.contributions[0].date).getUTCFullYear();
  const fortunes = [
    "It works on my machine. My machine is in production.",
    `${total.toLocaleString("en-US")} contributions since ${since}. Still inside nvim.`,
    "I read the error message. Then I read it again.",
    "There is no cloud. Just someone else's VPS.",
    'git commit -m "Fix typo" (the fourth one today)',
    "Ask me about event sourcing. Actually, maybe not.",
  ];
  const wid = Math.max(...fortunes.map((f) => f.length)) + 2;
  const x0 = 24,
    top = 10,
    y = (r) => top + r * LH + FS;
  const H = top * 2 + 11 * LH;
  const cmd = typed(
    x0,
    y(0),
    [
      ["~ ", "blue"],
      ["$ ", "dim"],
      ["fortune | cowsay", "fg"],
    ],
    0.4,
    18,
  );
  let out = cmd.svg;
  const show = cmd.end + 0.3;
  let cow =
    row(x0, y(2), [[" " + "_".repeat(wid), "fg"]]) +
    row(x0, y(4), [[" " + "-".repeat(wid), "fg"]]);
  cow +=
    row(x0, y(3), [["<", "fg"]]) +
    row(x0 + (wid + 1) * CW, y(3), [[">", "fg"]]);
  const cyc = 3.6 * fortunes.length;
  fortunes.forEach((f, i) => {
    const vis = fortunes
      .map((_, k) => (k === i ? "visible" : "hidden"))
      .join(";");
    cow += `<g visibility="${i ? "hidden" : "visible"}"><animate attributeName="visibility" values="${vis}" dur="${cyc}s" calcMode="discrete" repeatCount="indefinite"/>${row(x0 + 2 * CW, y(3), [[f, "string"]])}</g>`;
  });
  const body = [
    "        \\   ^__^",
    "         \\  (  )\\_______",
    "            (__)\\       )\\/\\",
    "                ||----w |",
    "                ||     ||",
  ];
  body.forEach((l, i) => (cow += row(x0, y(5 + i), [[l, "fg"]])));
  // eyes: oo, blinking to --
  const ex = x0 + 13 * CW;
  cow += `<g>${row(ex, y(6), [["oo", "fg b"]])}<animate attributeName="visibility" values="visible;hidden;visible" keyTimes="0;.94;.98" dur="4s" calcMode="discrete" repeatCount="indefinite"/></g>`;
  cow += `<g visibility="hidden">${row(ex, y(6), [["--", "fg b"]])}<animate attributeName="visibility" values="hidden;visible;hidden" keyTimes="0;.94;.98" dur="4s" calcMode="discrete" repeatCount="indefinite"/></g>`;
  out += during(cow, show);
  return svg(T, W, H, `fortune | cowsay: ${fortunes[0]}`, out);
}

function vimSvg() {
  const x0 = 14,
    top = 8,
    rows = 14,
    H = top * 2 + rows * LH;
  const y = (r) => top + r * LH + FS;
  const open = typed(
    x0,
    y(0),
    [
      ["~ ", "blue"],
      ["$ ", "dim"],
      ["nvim README.md", "fg"],
    ],
    0.4,
    16,
  );
  let t = open.end + 0.4;
  // nvim screen
  const doc = [
    [["# Rafael Ricco", "func b"]],
    [],
    [["Product engineer building full-stack and AI applications.", "fg"]],
    [["TypeScript, Python, React, Node.js. Based in Rio Grande do Sul.", "fg"]],
    [],
    [["Status: still looking for the exit.", "dim"]],
  ];
  let screen = `<rect x="0" y="${top + LH - 4}" width="${W}" height="${(rows - 1) * LH + 4}" fill="${T.bg}"/>`;
  doc.forEach(
    (segs, i) =>
      (screen += row(x0, y(1 + i), [
        [String(i + 1).padStart(3) + " ", "faint"],
        ...segs,
      ])),
  );
  for (let i = doc.length; i < rows - 3; i++)
    screen += row(x0, y(1 + i), [["~", "blue"]]);
  const sy = y(rows - 2);
  screen += `<rect x="0" y="${sy - FS - 2}" width="${W}" height="${LH}" fill="${T.bg2}"/><rect x="0" y="${sy - FS - 2}" width="${8 * CW}" height="${LH}" fill="${T.blue}"/>${row(CW, sy, [["NORMAL", "onMode b"]])}${row(10 * CW, sy, [["README.md", "fg"]])}${row(W - 14, sy, [["markdown  6:1  All", "dim"]], ' text-anchor="end"')}`;

  // the attempts at the command line
  const cy = y(rows - 1);
  const tries = [
    [["^C", "fg"]],
    [
      [
        "Type  :qa!  and press <Enter> to abandon all changes and exit Nvim",
        "fg",
      ],
    ],
    [[":q", "fg"]],
    [["E37: No write since last change (add ! to override)", "red"]],
    [[":exit()", "fg"]],
    [["E492: Not an editor command: exit()", "red"]],
    [[":wq", "fg"]],
    null,
  ];
  let cmdline = "";
  for (let i = 0; i < tries.length; i += 2) {
    const typedT = typed(x0, cy, tries[i], t, 7);
    const msgAt = typedT.end + 0.35,
      nextAt = msgAt + 1.5;
    cmdline += during(typedT.svg, t, msgAt);
    if (tries[i + 1])
      cmdline += during(row(x0, cy, tries[i + 1]), msgAt, nextAt);
    t = tries[i + 1] ? nextAt : msgAt;
  }
  const quit = t;
  // after :wq the shell comes back, and muscle memory takes over
  const back = typed(
    x0,
    y(2),
    [
      ["~ ", "blue"],
      ["$ ", "dim"],
      ["nvim .", "fg"],
      ["   # muscle memory", "faint"],
    ],
    quit + 0.6,
    12,
  );
  const shell = row(x0, y(1), [['"README.md" 6L written', "dim"]]);
  const final = during(
    shell +
      back.svg +
      during(
        `<rect class="blink" x="${x0 + 10 * CW}" y="${y(2) - FS + 1}" width="${CW}" height="${LH - 2}" fill="${T.fg}"/>`,
        back.end,
      ),
    quit,
  );
  const out = open.svg + during(screen + cmdline, open.end + 0.4, quit) + final;
  return svg(
    T,
    W,
    H,
    "Trying to exit Neovim: ^C, :q, :exit(), :wq, then nvim . again out of muscle memory.",
    out,
  );
}

export function funFiles(data, mode) {
  T = RICCO[mode];
  const files = { cowsay: cowSvg(data), vim: vimSvg() };
  V.links.forEach(
    (l, i) => (files[`btn-${i + 1}`] = bracketChip(l.label).svg(T)),
  );
  return files;
}

export function funReadme(data, pic) {
  const btns = V.links
    .map(
      (l, i) =>
        `<a href="${l.url}">${pic(`btn-${i + 1}`, String(bracketChip(l.label).w), l.label)}</a>`,
    )
    .join(" ");
  return `<p align="center">${pic("cowsay", "100%", "fortune | cowsay")}</p>

<p align="center">${pic("vim", "100%", "Trying to exit Neovim, then opening it again.")}</p>

<p align="center">${btns}</p>
`;
}

// "cat" variant: a shocked ASCII cat on a chalkboard of engineering math, with a
// loading spinner on its forehead, darting eyes, and a progress bar that lands on "ship it".
import { config } from "./lib.mjs";
import { CW, LH, FS, svg, row, typed, during } from "./term.mjs";
import { bracketChip } from "./variant-ascii.mjs";

const V = config.variants.terminal;
const W = 880;

// A chalkboard looks the same in both themes, on purpose.
const BOARD = {
  bg: "#1e2320",
  bg2: "#252b27",
  sel: "#323a35",
  fg: "#e9ece6",
  dim: "#a3aca4",
  faint: "#5f6a62",
  line: "#3a433d",
  keyword: "#9fd6cf",
  string: "#f2a7c3",
  number: "#f1d58a",
  func: "#f3b98a",
  prop: "#c3b8f5",
  tag: "#9fc9ef",
  green: "#9fd8a8",
  yellow: "#f1d58a",
  red: "#f08a9a",
  blue: "#9fc9ef",
  cyan: "#9fd6cf",
  onMode: "#1e2320",
};

const CAT = [
  "      /\\_                     _/\\",
  "     /   \\_                 _/   \\",
  "    /      \\_______________/      \\",
  "   /                               \\",
  "  |     .--------.     .--------.    |",
  "  |    /          \\   /          \\   |",
  "  |   |            | |            |  |",
  "  |   |            | |            |  |",
  "  |    \\          /   \\          /   |",
  "  |     '--------'  ^  '--------'    |",
  "   \\                V                /",
  "----\\              ___              /----",
  "-----\\            (   )            /-----",
  "      \\            '-'            /",
  "       '-._____________________.-'",
];

const EQUATIONS = (total) => [
  [24, 34, "f(problem) = production", "fg"],
  [24, 70, "O(n log n) < O(n^2)", "dim"],
  [24, 106, "p99 < 200ms  ?", "yellow"],
  [24, 142, "while (bug) { coffee++ }", "fg"],
  [24, 178, "retry = 2^n + jitter", "cyan"],
  [24, 214, "Postgres -> Kafka -> HTTP", "dim"],
  [24, 250, "tokens x $/1M = $$$", "string"],
  [24, 286, "fit = match(job, me)", "fg"],
  [626, 34, `commits = ${total.toLocaleString("en-US")}`, "yellow"],
  [626, 70, "git rebase -i HEAD~3", "dim"],
  [626, 106, "E = mc^2", "fg"],
  [626, 142, "ship(it) => true", "green"],
  [626, 178, "1 + 1 = 10", "dim"],
  [626, 214, "lim  scope = 0", "fg"],
  [626, 232, "t->deadline", "faint"],
  [626, 268, "sqrt(-1) = i", "prop"],
];

const GRAPH = [
  "  y|        .",
  "   |      .",
  "   |    .",
  "   |  .",
  "   +-------- x",
];
const TRI = ["    /\\", "   /  \\  a^2 + b^2", "  /____\\  = c^2"];

function boardSvg(data) {
  const T = BOARD;
  const H = 470;
  const total = data.contributions.reduce((a, d) => a + d.count, 0);
  let out = "";
  // chalk equations, written in one after another
  let t = 0.3;
  for (const [x, y, s, cls] of EQUATIONS(total)) {
    const ty = typed(x, y, [[s, cls]], t, 48);
    out += ty.svg;
    t = ty.end + 0.08;
  }
  GRAPH.forEach((l, i) => (out += row(30, 330 + i * 16, [[l, "faint"]])));
  TRI.forEach((l, i) => (out += row(640, 320 + i * 18, [[l, "faint"]])));

  // the cat
  const cx = (W - 41 * CW) / 2,
    cy = 40;
  CAT.forEach((l, i) => (out += row(cx, cy + i * LH + FS, [[l, "fg"]])));
  // eyes: big pupils that dart around, plus a blink
  const eye = (col) => cx + col * CW;
  const eyeY = cy + 6.5 * LH + 2;
  const look = "0 0;-14 0;-14 0;14 2;14 2;0 0;0 0";
  const lookT = "0;.15;.35;.45;.65;.75;1";
  const pupils = [eye(13), eye(28)]
    .map(
      (x) =>
        `<circle cx="${x}" cy="${eyeY}" r="17" fill="${T.fg}"/><circle cx="${x}" cy="${eyeY}" r="13" fill="#0b0d0c"/><circle cx="${x - 5}" cy="${eyeY - 6}" r="4" fill="${T.fg}"/>`,
    )
    .join("");
  out += `<g><animateTransform attributeName="transform" type="translate" values="${look}" keyTimes="${lookT}" dur="5s" calcMode="discrete" repeatCount="indefinite"/>${pupils}</g>`;
  const lids = [eye(13), eye(28)]
    .map(
      (x) =>
        `<rect x="${x - 50}" y="${eyeY - 26}" width="100" height="52" fill="${T.bg}"/>${row(x - 44, eyeY + 5, [["------------", "fg"]])}`,
    )
    .join("");
  out += `<g visibility="hidden"><animate attributeName="visibility" values="hidden;visible;hidden" keyTimes="0;.92;.96" dur="5s" calcMode="discrete" repeatCount="indefinite"/>${lids}</g>`;

  // forehead spinner
  const sx = cx + 20.5 * CW,
    sy = cy + 1.5 * LH + FS;
  const frames = ["◐", "◓", "◑", "◒"];
  frames.forEach((f, i) => {
    const vis = frames
      .map((_, k) => (k === i ? "visible" : "hidden"))
      .join(";");
    out += `<g visibility="${i ? "hidden" : "visible"}"><animate attributeName="visibility" values="${vis}" dur=".8s" calcMode="discrete" repeatCount="indefinite"/>${row(sx, sy, [[f, "yellow b"]], ' style="font-size:22px" text-anchor="middle"')}</g>`;
  });

  // progress: calculating... then ship it, on a loop
  const by = 412,
    bx = cx - 20,
    cols = 30,
    cyc = 7;
  out += row(bx, by, [["Calculating", "fg b"]], ' style="font-size:24px"');
  [".", "..", "..."].forEach((d, i) => {
    const vis = [0, 1, 2]
      .map((k) => (k === i ? "visible" : "hidden"))
      .join(";");
    out += `<g visibility="${i ? "hidden" : "visible"}"><animate attributeName="visibility" values="${vis}" dur="1.2s" calcMode="discrete" repeatCount="indefinite"/>${row(bx + 11 * 14.4, by, [[d, "fg b"]], ' style="font-size:24px"')}</g>`;
  });
  const px = bx + 228,
    barW = cols * CW;
  out += row(px, by - 2, [
    ["[", "dim"],
    [" ".repeat(cols), "dim"],
    ["]", "dim"],
  ]);
  out += `<clipPath id="bar"><rect x="${px + CW}" y="${by - 16}" width="0" height="20"><animate attributeName="width" values="0;${barW};${barW};0" keyTimes="0;.7;.99;1" dur="${cyc}s" repeatCount="indefinite"/></rect></clipPath><g clip-path="url(#bar)">${row(px + CW, by - 2, [["#".repeat(cols), "green"]])}</g>`;
  out += `<g visibility="hidden"><animate attributeName="visibility" values="hidden;visible;hidden" keyTimes="0;.72;.99" dur="${cyc}s" calcMode="discrete" repeatCount="indefinite"/>${row(
    px + barW + 3 * CW,
    by - 2,
    [
      ["result: ", "dim"],
      ["ship it", "green b"],
    ],
  )}</g>`;
  return svg(
    T,
    W,
    H,
    "An ASCII cat on a chalkboard of engineering math, calculating, with a loading spinner on its forehead.",
    out,
  );
}

export function catFiles(data) {
  const files = { board: boardSvg(data) };
  V.links.forEach(
    (l, i) => (files[`btn-${i + 1}`] = bracketChip(l.label).svg(BOARD)),
  );
  return files;
}

export function catReadme(data, pic) {
  const btns = V.links
    .map(
      (l, i) =>
        `<a href="${l.url}">${pic(`btn-${i + 1}`, String(bracketChip(l.label).w), l.label)}</a>`,
    )
    .join(" ");
  return `<p align="center">${pic("board", "100%", "An ASCII cat on a chalkboard of engineering math, calculating.")}</p>

<p align="center">${btns}</p>
`;
}

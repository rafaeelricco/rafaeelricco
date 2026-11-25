// Builds the profile README as theme-aware SVG panels.
// Edit profile.config.json, then run: GITHUB_TOKEN=... node scripts/build-profile.mjs
// "variant" in the config picks which set of panels README.md shows; both are generated.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { root, config, github, theme, esc, gh, setTheme } from "./lib.mjs";
import { sunsetFiles, sunsetReadme } from "./variant-sunset.mjs";
import { activityFiles, activityReadme } from "./variant-activity.mjs";
import { nvimFiles, nvimReadme } from "./variant-nvim.mjs";
import { asciiFiles, asciiReadme } from "./variant-ascii.mjs";
import { manFiles, manReadme } from "./variant-man.mjs";
import { creationFiles, creationReadme } from "./variant-creation.mjs";
import { catFiles, catReadme } from "./variant-cat.mjs";
import { funFiles, funReadme } from "./variant-fun.mjs";
import { landscapeFiles, landscapeReadme } from "./variant-landscape.mjs";

const CACHE = root + "profile/github-cache.json";
const A = config.variants.activity;

async function graphql(query) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "content-type": "application/json",
      "user-agent": "profile-readme-builder",
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function contributions(user, since) {
  const days = [];
  const now = new Date();
  for (
    let y = new Date(since).getUTCFullYear();
    y <= now.getUTCFullYear();
    y++
  ) {
    const from =
      y === new Date(since).getUTCFullYear()
        ? new Date(since).toISOString()
        : `${y}-01-01T00:00:00Z`;
    const to =
      y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`;
    const d = await graphql(
      `{user(login:"${user}"){contributionsCollection(from:"${from}",to:"${to}"){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`,
    );
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks)
      for (const c of w.contributionDays)
        days.push({ date: c.date, count: c.contributionCount });
  }
  return days
    .filter((d) => d.date >= since.slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function commitsPerDay(repo) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch(
      `https://api.github.com/repos/${github.username}/${repo}/stats/commit_activity`,
      {
        headers: {
          authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "user-agent": "profile-readme-builder",
        },
      },
    );
    if (res.status === 200) {
      const weeks = await res.json();
      const today = new Date().toISOString().slice(0, 10);
      return weeks
        .flatMap((w) =>
          w.days.map((count, k) => ({
            date: new Date((w.week + k * 86400) * 1000)
              .toISOString()
              .slice(0, 10),
            count,
          })),
        )
        .filter((d) => d.date <= today);
    }
    await new Promise((r) => setTimeout(r, 2500)); // 202: GitHub is computing the stats
  }
  throw new Error(`commit activity for ${repo} not ready`);
}

async function loadData() {
  if (process.env.PROFILE_OFFLINE)
    return JSON.parse(readFileSync(CACHE, "utf8")); // local preview: no network
  try {
    const user = await gh(`/users/${github.username}`);
    const names = [
      ...new Set([
        ...github.featured.map((f) => f.repo),
        ...github.more,
        ...A.featured.map((f) => f.repo),
        ...A.more,
        ...config.variants.terminal.telescope,
      ]),
    ];
    const repos = {};
    for (const n of names) {
      const r = await gh(`/repos/${github.username}/${n}`);
      repos[n] = {
        name: r.name,
        full_name: r.full_name,
        html_url: r.html_url,
        description: r.description,
        language: r.language,
        stargazers_count: r.stargazers_count,
        pushed_at: r.pushed_at,
      };
    }
    const activity = {};
    for (const n of new Set([
      ...A.featured.map((f) => f.repo),
      ...github.featured.map((f) => f.repo),
    ]))
      activity[n] = await commitsPerDay(n);
    const data = {
      user: { public_repos: user.public_repos, followers: user.followers },
      repos,
      activity,
      contributions: await contributions(github.username, user.created_at),
    };
    writeFileSync(CACHE, JSON.stringify(data) + "\n");
    return data;
  } catch (err) {
    console.warn("GitHub fetch failed, using cache:", err.message);
    return JSON.parse(readFileSync(CACHE, "utf8"));
  }
}

const data = await loadData();
for (const [name, text] of Object.entries(config.descriptionFallbacks || {}))
  if (data.repos[name] && !data.repos[name].description)
    data.repos[name].description = text;
const variants = {
  sunset: {
    files: (mode) => {
      setTheme(theme[mode]);
      return sunsetFiles(data);
    },
    readme: sunsetReadme,
  },
  activity: {
    files: (mode) => activityFiles(data, mode),
    readme: activityReadme,
  },
  nvim: { files: (mode) => nvimFiles(data, mode), readme: nvimReadme },
  ascii: { files: (mode) => asciiFiles(data, mode), readme: asciiReadme },
  man: { files: (mode) => manFiles(data, mode), readme: manReadme },
  creation: {
    files: (mode) => creationFiles(data, mode),
    readme: creationReadme,
  },
  cat: { files: () => catFiles(data), readme: catReadme },
  fun: { files: (mode) => funFiles(data, mode), readme: funReadme },
  landscape: {
    files: (mode) => landscapeFiles(data, mode),
    readme: landscapeReadme,
  },
};

rmSync(root + "profile/generated", { recursive: true, force: true });
const versions = {};
for (const [name, v] of Object.entries(variants)) {
  const dir = `profile/generated/${name}`;
  mkdirSync(root + dir, { recursive: true });
  const all = [];
  for (const mode of ["dark", "light"]) {
    for (const [file, svg] of Object.entries(v.files(mode))) {
      writeFileSync(`${root}${dir}/${file}-${mode}.svg`, svg);
      all.push(svg);
    }
  }
  versions[name] = createHash("sha1")
    .update(all.join(""))
    .digest("hex")
    .slice(0, 10);
  console.log(`${name}: ${all.length} panels`);
}

const chosen = config.variant;
const dir = `profile/generated/${chosen}`;
const pic = (file, width, alt) =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="./${dir}/${file}-dark.svg?v=${versions[chosen]}"><img src="./${dir}/${file}-light.svg?v=${versions[chosen]}" width="${width}" alt="${esc(alt)}"></picture>`;
writeFileSync(
  root + "README.md",
  `<!-- Generated by scripts/build-profile.mjs (variant: ${chosen}). Edit profile.config.json, not this file. -->\n${variants[chosen].readme(data, pic)}`,
);

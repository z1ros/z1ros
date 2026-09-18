#!/usr/bin/env node
// Regenerates assets/signal.svg from live GitHub GraphQL data.
// Usage: GH_TOKEN=<token> node scripts/update-stats.mjs
// A user PAT (read:user + repo) includes private contribution counts; the
// Actions GITHUB_TOKEN only sees public activity.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const LOGIN = process.env.GH_LOGIN || "z1ros";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GH_TOKEN is required");
  process.exit(1);
}

// ---------------------------------------------------------------- data

async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "z1ros-signal",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const COLLECTION = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const { user } = await gql(
  `query($login: String!) { user(login: $login) { createdAt } }`,
  { login: LOGIN },
);

const now = new Date();
const created = new Date(user.createdAt);

// One contributionsCollection per year window since account creation.
const windows = [];
for (let from = new Date(created); from < now; ) {
  const to = new Date(from);
  to.setUTCFullYear(to.getUTCFullYear() + 1);
  windows.push({ from: from.toISOString(), to: (to < now ? to : now).toISOString() });
  from = to;
}

let total = 0;
let publicCommits = 0;
const days = [];
for (const w of windows) {
  const { user: u } = await gql(COLLECTION, { login: LOGIN, ...w });
  const c = u.contributionsCollection;
  total += c.contributionCalendar.totalContributions;
  publicCommits += c.totalCommitContributions;
  for (const week of c.contributionCalendar.weeks) days.push(...week.contributionDays);
}

// De-dupe overlapping edge days and sort.
const byDate = new Map();
for (const d of days) byDate.set(d.date, Math.max(byDate.get(d.date) ?? 0, d.contributionCount));
const sorted = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

// Last 12 months, with weeks for the tapestry.
const yearAgo = new Date(now);
yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
const { user: recent } = await gql(COLLECTION, {
  login: LOGIN,
  from: yearAgo.toISOString(),
  to: now.toISOString(),
});
const lastYear = recent.contributionsCollection.contributionCalendar.totalContributions;
const weeks = recent.contributionsCollection.contributionCalendar.weeks.slice(-52);

// Longest streak of consecutive days with >= 1 contribution.
let best = { len: 0, start: null, end: null };
let run = { len: 0, start: null };
let prev = null;
for (const [date, count] of sorted) {
  const consecutive = prev && (new Date(date) - new Date(prev)) / 86400000 === 1;
  if (count > 0) {
    if (consecutive && run.len > 0) run.len += 1;
    else run = { len: 1, start: date };
    if (run.len > best.len) best = { len: run.len, start: run.start, end: date };
  } else {
    run = { len: 0, start: null };
  }
  prev = date;
}

// Current streak. Up to two trailing empty days are tolerated: today (UTC)
// is still in progress, and the local day may lag UTC by a calendar day.
let current = 0;
let skipped = 0;
for (let i = sorted.length - 1; i >= 0; i--) {
  const [, count] = sorted[i];
  if (count > 0) current += 1;
  else if (current === 0 && skipped < 2) skipped += 1;
  else break;
}

// ---------------------------------------------------------------- format

const fmtNum = (n) => n.toLocaleString("en-US");
const mon = (d) =>
  new Date(d + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toLowerCase();
const fmtDay = (d) => `${mon(d)} ${new Date(d + "T00:00:00Z").getUTCDate()}`;
const today = now.toISOString().slice(0, 10);
const todayLabel = `${fmtDay(today)} ${today.slice(0, 4)}`;
const sinceLabel = `${created.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toLowerCase()} ${created.getUTCFullYear()}`;
const streakLabel = best.len
  ? `${best.len} days · ${fmtDay(best.start)} → ${fmtDay(best.end)} ${best.end.slice(0, 4)}`
  : "none yet";

const desc = `${now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })} snapshot: ${fmtNum(total)} total contributions since ${sinceLabel}, ${fmtNum(lastYear)} in the last 12 months, ${fmtNum(publicCommits)} public commits, longest streak ${best.len} days, current streak ${current} days.`;

// ---------------------------------------------------------------- svg

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const W = 1000;
const H = 640;
const PAD = 48;
const FONT = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const C = {
  bg: "#09090b",
  border: "#ffffff",
  key: "#52525b",
  dots: "#27272a",
  value: "#e4e4e7",
  accent: "#a78bfa",
  live: "#34d399",
  heat: ["#18181b", "#312e59", "#4f3f9b", "#7c5ce6", "#c4b5fd"],
};

// Heat levels from quartiles of non-zero days so a few huge days don't flatten the rest.
const nonzero = weeks
  .flatMap((w) => w.contributionDays.map((d) => d.contributionCount))
  .filter((n) => n > 0)
  .sort((a, b) => a - b);
const q = (p) => nonzero[Math.min(nonzero.length - 1, Math.floor(p * nonzero.length))] ?? 1;
const cuts = [q(0.25), q(0.5), q(0.75)];
const level = (n) => (n === 0 ? 0 : n <= cuts[0] ? 1 : n <= cuts[1] ? 2 : n <= cuts[2] ? 3 : 4);

// Tapestry: 52 weeks folded into two 26-week columns, 7 days across. Reads as a
// pixel portrait of the year, one week per row, oldest at the top.
const CELL = 14;
const GAP = 4;
const PITCH = CELL + GAP;
const GUTTER = 12;
const TAP_X = PAD;
const TAP_Y = 96;
let tapestry = "";
weeks.forEach((week, wi) => {
  const col = wi < 26 ? 0 : 1;
  const row = wi % 26;
  week.contributionDays.forEach((day, di) => {
    const x = TAP_X + col * (7 * PITCH + GUTTER) + di * PITCH;
    const y = TAP_Y + row * PITCH;
    tapestry += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${C.heat[level(day.contributionCount)]}"><title>${day.date} · ${day.contributionCount}</title></rect>`;
  });
});
const TAP_W = 2 * 7 * PITCH + GUTTER - GAP;
const TAP_H = 26 * PITCH - GAP;

// Key/value lines, neofetch style. Keys padded with dots to a fixed width.
const KEY_W = 14;
const kv = (key, value) => {
  const dots = ".".repeat(Math.max(1, KEY_W - key.length - 1));
  return { key, dots, value };
};
const headline = (text) => ({ headline: text });
const blank = () => ({ blank: true });

const lines = [
  headline(`${LOGIN}@github`),
  kv("name", "yurii tovarnytskyi"),
  kv("role", "founder · engineer · designer"),
  kv("building", "husky @ aximon.ai, underwriting ai for cre teams"),
  kv("route", "ukraine → prague → chicago → san francisco"),
  kv("stack", "ts · next · react · node · python · postgres"),
  kv("ai/ml", "llm pipelines · rag · agents · evals · on-device"),
  kv("judged", "hackharvard · hackillinois · wildhacks · uncommonhacks"),
  kv("mentored", "la hacks · won hack@brown 2026"),
  kv("writing", "yurii.blog"),
  kv("tags", "antler s26 · ex-yc eng · 4 hack wins · 4x judge"),
  blank(),
  headline("signal"),
  kv("all-time", `${fmtNum(total)} contributions since ${sinceLabel}`),
  kv("last 12 mo", `${fmtNum(lastYear)} contributions`),
  kv("public", `${fmtNum(publicCommits)} commits`),
  kv("streak", streakLabel),
  kv("current", `${current} day${current === 1 ? "" : "s"}`),
  kv("refreshed", `${todayLabel} · daily`),
];

const TEXT_X = TAP_X + TAP_W + 56;
const LINE = 24;
const FS = 14;
let textY = TAP_Y + FS;
let text = "";
for (const l of lines) {
  if (l.blank) {
    textY += LINE * 0.6;
    continue;
  }
  if (l.headline) {
    text += `<text x="${TEXT_X}" y="${textY}" fill="${C.accent}" font-weight="700">${esc(l.headline)}</text>`;
    text += `<line x1="${TEXT_X}" y1="${textY + 8}" x2="${TEXT_X + 120}" y2="${textY + 8}" stroke="${C.accent}" stroke-opacity=".35"/>`;
    textY += LINE;
    continue;
  }
  text += `<text x="${TEXT_X}" y="${textY}"><tspan fill="${C.key}">${esc(l.key)} </tspan><tspan fill="${C.dots}">${l.dots}</tspan><tspan fill="${C.value}"> ${esc(l.value)}</tspan></text>`;
  textY += LINE;
}

// Prompt + blinking cursor on the last line.
const cursorY = textY - FS + 2;
text += `<text x="${TEXT_X}" y="${textY}" fill="${C.key}">${esc(`${LOGIN} ~ %`)}</text>`;
text += `<rect class="cursor" x="${TEXT_X + 86}" y="${cursorY}" width="8" height="${FS + 2}" fill="${C.value}"/>`;

// Palette strip under the tapestry, like neofetch's color blocks.
const legendY = TAP_Y + TAP_H + 20;
const legend = C.heat
  .map((c, i) => `<rect x="${TAP_X + i * 18}" y="${legendY}" width="12" height="12" rx="2" fill="${c}"/>`)
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc" xml:space="preserve">
  <title id="title">${esc(LOGIN)} · github signal</title>
  <desc id="desc">${esc(desc)}</desc>
  <style>
    .cursor { animation: blink 1.1s steps(1) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
  </style>
  <rect width="${W}" height="${H}" rx="14" fill="${C.bg}"/>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="13.5" fill="none" stroke="${C.border}" stroke-opacity=".08"/>

  <g font-family="${FONT}" font-size="${FS}">
    <text x="${PAD}" y="${PAD + 4}"><tspan fill="${C.key}">${esc(`${LOGIN} ~ %`)}</tspan><tspan fill="${C.value}"> signal</tspan><tspan fill="${C.accent}"> --live</tspan></text>
    <circle cx="${W - PAD - 118}" cy="${PAD - 1}" r="3.5" fill="${C.live}"/>
    <text x="${W - PAD - 106}" y="${PAD + 4}" fill="${C.key}" font-size="12">auto-refreshed</text>

    ${tapestry}
    ${legend}
    <text x="${TAP_X + 100}" y="${legendY + 11}" fill="${C.key}" font-size="12">52 weeks · ${fmtNum(lastYear)}</text>

    ${text}
  </g>
</svg>
`;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(join(root, "assets", "signal.svg"), svg);

// Keep the README alt text in sync with the card.
const readmePath = join(root, "README.md");
const readme = readFileSync(readmePath, "utf8");
const updated = readme.replace(
  /(src="\.\/assets\/signal\.svg" alt=")[^"]*(")/,
  `$1${esc(desc.replace(/\.$/, ""))}$2`,
);
if (updated !== readme) writeFileSync(readmePath, updated);

console.log(desc);

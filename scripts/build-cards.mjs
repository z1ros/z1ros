#!/usr/bin/env node
// Builds the static cards: skills, experience, judged, builds.
// Usage: node scripts/build-cards.mjs   (needs rsvg-convert for the logo PNGs)

import { writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { W, PAD, FS, C, esc, textW, card, heading } from "./theme.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = (name, svg) => writeFileSync(join(root, "assets", name), svg);
const BODY_Y = 96;
const RIGHT = W - PAD;

// ------------------------------------------------------------------ skills

const SKILLS = [
  ["languages", ["typescript", "javascript", "python", "sql", "swift", "bash"]],
  ["frontend", ["next.js", "react", "react native", "tailwind", "shadcn/ui", "framer motion", "three.js"]],
  ["backend", ["node", "supabase", "postgres", "pgvector", "redis", "graphql", "rest", "websockets", "edge functions"]],
  ["infra", ["aws", "vercel", "docker", "github actions", "cloudflare", "stripe", "sentry", "posthog"]],
  [
    "ai / ml",
    [
      "llm apps",
      "rag",
      "agents",
      "tool use",
      "mcp",
      "claude api",
      "openai api",
      "prompt engineering",
      "evals",
      "structured extraction",
      "document ai",
      "ocr",
      "embeddings",
      "vector search",
      "fine-tuning",
      "whisper",
      "speech-to-text",
      "on-device inference",
      "pytorch",
      "hugging face",
      "langchain",
      "multi-agent systems",
      "eval harnesses",
      "guardrails",
      "cost / latency tuning",
    ],
    true,
  ],
  ["design", ["product design", "design systems", "figma", "brand", "motion", "prototyping", "ux research"]],
  ["founder", ["0 → 1", "gtm", "sales calls", "pitching", "hiring", "fundraising", "short-form content"]],
];

function skillsCard() {
  const LABEL_X = PAD;
  const PILL_X = PAD + 124;
  const PILL_H = 28;
  const PILL_FS = 13;
  const PAD_X = 12;
  const GAP = 8;
  const LINE = PILL_H + 8;
  const GROUP_GAP = 14;
  let y = BODY_Y;
  let body = "";
  for (const [label, items, hot] of SKILLS) {
    let x = PILL_X;
    let rowY = y;
    body += `<text x="${LABEL_X}" y="${rowY + 18}" fill="${C.key}" font-size="12">${esc(label)}</text>`;
    for (const item of items) {
      const w = Math.ceil(textW(item, PILL_FS) + PAD_X * 2);
      if (x + w > RIGHT) {
        x = PILL_X;
        rowY += LINE;
      }
      const fill = hot ? "#1a1533" : C.pill;
      const stroke = hot ? "#4c3d8f" : C.pillStroke;
      const color = hot ? C.accentSoft : C.value;
      body += `<rect x="${x}" y="${rowY}" width="${w}" height="${PILL_H}" rx="6" fill="${fill}" stroke="${stroke}"/>`;
      body += `<text x="${x + w / 2}" y="${rowY + 18}" fill="${color}" font-size="${PILL_FS}" text-anchor="middle">${esc(item)}</text>`;
      x += w + GAP;
    }
    y = rowY + LINE + GROUP_GAP;
  }
  const count = SKILLS.reduce((n, [, items]) => n + items.length, 0);
  return card({
    cmd: "skills --all",
    label: `${count} tags · ai/ml highlighted`,
    body,
    height: y - GROUP_GAP + PAD - 8,
    title: "skills",
    desc: SKILLS.map(([l, i]) => `${l}: ${i.join(", ")}`).join(". "),
  });
}

// -------------------------------------------------------------- experience

const EXPERIENCE = [
  {
    when: "2026 → now",
    role: "cto",
    org: "husky · aximon.ai",
    blurb: "underwriting ai for cre teams · $60k contracted in 5 weeks · backed by an a16z scout",
    live: true,
  },
  { when: "2026", role: "founder in residence", org: "antler s26", blurb: "san francisco · ~2% acceptance · pivoted protege → husky" },
  { when: "2026", role: "ceo", org: "protege", blurb: "ai coding mentor that lives in your editor · 1.6k downloads · sh1p s26" },
  { when: "2026", role: "cto", org: "nymble", blurb: "early-stage build" },
  { when: "2025", role: "cto", org: "stealth startup · brno", blurb: "2,000 hours · walked away when the bar stopped rising" },
  { when: "2025", role: "software engineer", org: "feedyou", blurb: "solo-shipped a $22k ai support agent · #1 microsoft ai 2019" },
  { when: "2025", role: "design engineer", org: "cuub", blurb: "largest power-bank rental network in illinois · raised $270k+" },
  { when: "2025", role: "design engineer", org: "highlight · nyc", blurb: "disney, airbnb, american express, johnson & johnson, deloitte" },
  { when: "2022 → 2024", role: "design engineer", org: "udox", blurb: "2 years · where it started" },
];

function experienceCard() {
  const WHEN_X = PAD;
  const LINE_X = PAD + 132;
  const TEXT_X = LINE_X + 28;
  const PITCH = 58;
  let body = "";
  const top = BODY_Y + 6;
  const bottom = top + (EXPERIENCE.length - 1) * PITCH;
  body += `<line x1="${LINE_X}" y1="${top}" x2="${LINE_X}" y2="${bottom}" stroke="${C.dots}" stroke-width="2"/>`;
  EXPERIENCE.forEach((e, i) => {
    const y = top + i * PITCH;
    body += `<text x="${WHEN_X}" y="${y + 5}" fill="${C.key}" font-size="12">${esc(e.when)}</text>`;
    body += e.live
      ? `<circle cx="${LINE_X}" cy="${y}" r="5" fill="${C.live}"/><circle cx="${LINE_X}" cy="${y}" r="9" fill="${C.live}" fill-opacity=".18"/>`
      : `<circle cx="${LINE_X}" cy="${y}" r="4" fill="${C.bg}" stroke="${C.accent}" stroke-width="2"/>`;
    body += `<text x="${TEXT_X}" y="${y + 5}"><tspan fill="${C.value}" font-weight="700">${esc(e.role)}</tspan><tspan fill="${C.key}"> · </tspan><tspan fill="${C.accent}">${esc(e.org)}</tspan></text>`;
    body += `<text x="${TEXT_X}" y="${y + 25}" fill="${C.dim}" font-size="12">${esc(e.blurb)}</text>`;
  });
  return card({
    cmd: "tail -n 9 experience.log",
    label: "swe → cto → design → founder",
    body,
    height: bottom + 30 + PAD,
    title: "experience",
    desc: EXPERIENCE.map((e) => `${e.when}: ${e.role} at ${e.org}, ${e.blurb}`).join(". "),
  });
}

// ------------------------------------------------------------------ judged

const JUDGED = [
  { logo: "harvard", event: "hackharvard", school: "harvard", role: "judge", when: "2026" },
  { logo: "uiuc", event: "hackillinois", school: "uiuc", role: "judge", when: "mar 2026" },
  { logo: "ucla", event: "la hacks", school: "ucla", role: "judge", when: "2026" },
  { logo: "northwestern", event: "wildhacks", school: "northwestern", role: "judge & mentor", when: "apr 2026" },
];

const logoPng = (name, h) =>
  execFileSync("rsvg-convert", ["-h", String(h), join(root, "assets", "logos", `${name}.svg`)]).toString("base64");

function judgedCard() {
  const cols = JUDGED.length;
  const colW = (W - PAD * 2) / cols;
  const LOGO_H = 84;
  const LOGO_Y = BODY_Y + 8;
  let body = "";
  JUDGED.forEach((j, i) => {
    const cx = PAD + colW * i + colW / 2;
    // Render at 2x for crisp scaling; width is left to the aspect ratio.
    const png = logoPng(j.logo, LOGO_H * 2);
    body += `<image href="data:image/png;base64,${png}" x="${cx - colW / 2 + 16}" y="${LOGO_Y}" width="${colW - 32}" height="${LOGO_H}" preserveAspectRatio="xMidYMid meet"/>`;
    const ty = LOGO_Y + LOGO_H + 34;
    body += `<text x="${cx}" y="${ty}" fill="${C.value}" font-weight="700" text-anchor="middle">${esc(j.event)}</text>`;
    body += `<text x="${cx}" y="${ty + 22}" fill="${C.accent}" font-size="12" text-anchor="middle">${esc(j.role)}</text>`;
    body += `<text x="${cx}" y="${ty + 42}" fill="${C.key}" font-size="12" text-anchor="middle">${esc(`${j.school} · ${j.when}`)}</text>`;
    if (i > 0) {
      const sx = PAD + colW * i;
      body += `<line x1="${sx}" y1="${LOGO_Y}" x2="${sx}" y2="${ty + 46}" stroke="${C.border}" stroke-opacity=".06"/>`;
    }
  });
  const footY = LOGO_Y + LOGO_H + 34 + 42;
  return card({
    cmd: "ls ~/judged",
    label: "hackathon judge & mentor",
    body,
    height: footY + PAD - 4,
    title: "hackathons judged",
    desc: JUDGED.map((j) => `${j.event} at ${j.school}, ${j.role}, ${j.when}`).join(". "),
  });
}

// ------------------------------------------------------------------ builds

const BUILDS = [
  { name: "planneeer", tag: "hack@brown 2026 · 1st", blurb: "ai-powered nyc adventure planning" },
  { name: "pitchperfect", tag: "on-device ai", blurb: "fully on-device speech transcription and pitch coaching" },
  { name: "nori", tag: "fintech", blurb: "portable financial trust profiles for us immigrants" },
  { name: "tatra-capital", tag: "production", blurb: "platform for a central european investment group" },
];

function buildsCard() {
  const colW = (W - PAD * 2 - 16) / 2;
  const ROW_H = 92;
  let body = "";
  BUILDS.forEach((b, i) => {
    const x = PAD + (i % 2) * (colW + 16);
    const y = BODY_Y + Math.floor(i / 2) * (ROW_H + 16);
    body += `<rect x="${x}" y="${y}" width="${colW}" height="${ROW_H}" rx="10" fill="${C.pill}" stroke="${C.pillStroke}"/>`;
    body += `<text x="${x + 20}" y="${y + 32}"><tspan fill="${C.key}">~/builds/</tspan><tspan fill="${C.value}" font-weight="700">${esc(b.name)}</tspan></text>`;
    body += `<text x="${x + colW - 20}" y="${y + 32}" fill="${C.accent}" font-size="12" text-anchor="end">${esc(b.tag)}</text>`;
    body += `<text x="${x + 20}" y="${y + 62}" fill="${C.dim}" font-size="12">${esc(b.blurb)}</text>`;
  });
  const rows = Math.ceil(BUILDS.length / 2);
  return card({
    cmd: "ls ~/builds",
    label: "selected · links below",
    body,
    height: BODY_Y + rows * (ROW_H + 16) - 16 + PAD,
    title: "selected builds",
    desc: BUILDS.map((b) => `${b.name}: ${b.blurb} (${b.tag})`).join(". "),
  });
}

out("skills.svg", skillsCard());
out("experience.svg", experienceCard());
out("judged.svg", judgedCard());
out("builds.svg", buildsCard());
console.log("built skills, experience, judged, builds");

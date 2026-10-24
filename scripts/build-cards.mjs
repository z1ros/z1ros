#!/usr/bin/env node
// Builds the static cards: experience, judged.
// Usage: node scripts/build-cards.mjs   (needs rsvg-convert for the logo PNGs)

import { writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { W, PAD, FS, C, esc, card, heading } from "./theme.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = (name, svg) => writeFileSync(join(root, "assets", name), svg);
const BODY_Y = 96;

// -------------------------------------------------------------- experience

const EXPERIENCE = [
  {
    when: "2026 → now",
    role: "cto",
    org: "aximon · aximon.ai",
    blurb: "underwriting ai for commercial real estate teams",
    live: true,
  },
  { when: "2026", role: "founder in residence", org: "antler s26", blurb: "san francisco · ~2% acceptance · pivoted protege → aximon" },
  { when: "2026", role: "ceo", org: "protege", blurb: "ai coding mentor that lives in your editor · 1.6k downloads · sh1p s26" },
  { when: "2025", role: "software engineer", org: "feedyou", blurb: "solo-shipped a $22k ai support agent" },
  { when: "2022 → 2025", role: "design engineer", org: "highlight · cuub · udox", blurb: "client work for disney, airbnb, american express, deloitte" },
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
    cmd: `tail -n ${EXPERIENCE.length} experience.log`,
    label: "design → engineering → founder",
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

out("experience.svg", experienceCard());
out("judged.svg", judgedCard());
console.log("built experience, judged");

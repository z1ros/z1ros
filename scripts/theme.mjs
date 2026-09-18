// Shared visual system for every generated card in assets/.

export const LOGIN = "z1ros";
export const W = 1000;
export const PAD = 48;
export const FS = 14;
export const FONT =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
export const CHAR = 0.62; // em per character; conservative for the monospace fallback chain

export const C = {
  bg: "#09090b",
  border: "#ffffff",
  key: "#52525b",
  dots: "#27272a",
  dim: "#71717a",
  value: "#e4e4e7",
  accent: "#a78bfa",
  accentSoft: "#c4b5fd",
  live: "#34d399",
  pill: "#18181b",
  pillStroke: "#27272a",
  heat: ["#18181b", "#312e59", "#4f3f9b", "#7c5ce6", "#c4b5fd"],
};

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const textW = (s, fs = FS) => s.length * fs * CHAR;

// Card frame: prompt line top-left, optional dim label top-right, body, dynamic height.
export function card({ cmd, label, body, height, title, desc }) {
  const H = Math.round(height);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc" xml:space="preserve">
  <title id="title">${esc(title)}</title>
  <desc id="desc">${esc(desc)}</desc>
  <rect width="${W}" height="${H}" rx="14" fill="${C.bg}"/>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="13.5" fill="none" stroke="${C.border}" stroke-opacity=".08"/>
  <g font-family="${FONT}" font-size="${FS}">
    <text x="${PAD}" y="${PAD + 4}"><tspan fill="${C.key}">${esc(`${LOGIN} ~ %`)}</tspan><tspan fill="${C.value}"> ${esc(cmd)}</tspan></text>
    ${label ? `<text x="${W - PAD}" y="${PAD + 4}" fill="${C.key}" font-size="12" text-anchor="end">${esc(label)}</text>` : ""}
    ${body}
  </g>
</svg>
`;
}

// Section heading inside a card: accent text with a short underline.
export function heading(x, y, text) {
  return `<text x="${x}" y="${y}" fill="${C.accent}" font-weight="700">${esc(text)}</text><line x1="${x}" y1="${y + 8}" x2="${x + 120}" y2="${y + 8}" stroke="${C.accent}" stroke-opacity=".35"/>`;
}

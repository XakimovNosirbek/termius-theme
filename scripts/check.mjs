// Quality gate for every variant: colour syntax, package.json wiring and WCAG contrast.
// Exits non-zero on any failure, so CI blocks a release that would be hard to read.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { variants } from '../src/palettes.mjs';
import { buildTheme } from '../src/theme.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HEX = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const failures = [];
const warnings = [];

function expect(variant, label, fg, bg, min, { warnOnly = false } = {}) {
  const ratio = contrast(fg, bg);
  if (ratio >= min) return;
  const msg = `${variant.label}: ${label} ${fg} on ${bg} = ${ratio.toFixed(2)} (needs ${min})`;
  (warnOnly ? warnings : failures).push(msg);
}

// ---- package.json wiring ----
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const contributed = new Map(pkg.contributes.themes.map((t) => [t.path, t]));
for (const p of variants) {
  const rel = `./themes/termius-${p.id}-color-theme.json`;
  const entry = contributed.get(rel);
  if (!entry) failures.push(`package.json: missing theme entry ${rel}`);
  else {
    if (entry.label !== p.label) failures.push(`package.json: ${rel} label "${entry.label}" != "${p.label}"`);
    if (entry.uiTheme !== p.uiTheme) failures.push(`package.json: ${rel} uiTheme "${entry.uiTheme}" != "${p.uiTheme}"`);
  }
}

for (const p of variants) {
  const theme = buildTheme(p);

  // ---- every value is a valid colour ----
  for (const [key, value] of Object.entries(theme.colors)) {
    if (!HEX.test(value)) failures.push(`${p.label}: colors.${key} = "${value}" is not #rrggbb[aa]`);
  }
  for (const r of theme.tokenColors) {
    if (r.settings.foreground && !HEX.test(r.settings.foreground)) {
      failures.push(`${p.label}: token rule "${r.name}" has bad colour ${r.settings.foreground}`);
    }
  }
  const seen = new Set();
  for (const r of theme.tokenColors) {
    if (seen.has(r.name)) failures.push(`${p.label}: duplicate token rule name "${r.name}"`);
    seen.add(r.name);
  }

  // ---- readability (WCAG 2.x) ----
  expect(p, 'editor text', p.fg, p.bg, 7);
  expect(p, 'editor text on current line', p.fg, p.bgHi, 7);
  expect(p, 'sidebar text', p.fg, p.bgAlt, 7);
  expect(p, 'muted UI text on sidebar', p.fgMuted, p.bgAlt, 4.5);
  expect(p, 'status bar text', p.fgMuted, p.bgDeep, 4.5);
  expect(p, 'button label', p.accentFg, p.accent, 4.5);
  expect(p, 'accent on editor', p.accent, p.bg, 4.5);
  expect(p, 'terminal text', p.terminalFg, p.bg, 4.5);
  expect(p, 'line numbers', p.fgSubtle, p.bg, 2.5);

  for (const [name, color] of Object.entries(p.syntax)) {
    const min = name === 'comment' || name === 'punctuation' ? 3.5 : 4.5;
    expect(p, `syntax.${name}`, color, p.bg, min);
    expect(p, `syntax.${name} on current line`, color, p.bgHi, min - 0.5);
  }

  // Terminal colours belong to the shell, and VS Code's
  // terminal.integrated.minimumContrastRatio (default 4.5) lifts dim ones at render time.
  for (const [name, color] of Object.entries(p.ansi)) {
    if (name === 'black' || name === 'brightBlack') continue;
    expect(p, `ansi.${name}`, color, p.bg, 3, { warnOnly: true });
  }
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const f of failures) console.error(`FAIL  ${f}`);

const total = variants.length;
if (failures.length) {
  console.error(`\n${failures.length} problem(s) across ${total} variants.`);
  process.exit(1);
}
console.log(`All checks passed for ${total} variants (${warnings.length} terminal warnings).`);

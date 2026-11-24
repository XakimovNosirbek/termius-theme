// Generates themes/*.json from src/palettes.mjs.
//   node scripts/build.mjs          write the files
//   node scripts/build.mjs --check  fail if the committed files are stale (CI)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { variants } from '../src/palettes.mjs';
import { buildTheme } from '../src/theme.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checkOnly = process.argv.includes('--check');
const outDir = path.join(root, 'themes');

await mkdir(outDir, { recursive: true });

let stale = 0;
for (const p of variants) {
  const file = path.join(outDir, `termius-${p.id}-color-theme.json`);
  const json = `${JSON.stringify(buildTheme(p), null, 2)}\n`;

  if (checkOnly) {
    const current = await readFile(file, 'utf8').catch(() => '');
    if (current.replace(/\r\n/g, '\n') !== json) {
      console.error(`stale: ${path.relative(root, file)}`);
      stale++;
    }
    continue;
  }

  await writeFile(file, json);
  const theme = JSON.parse(json);
  console.log(
    `${p.label.padEnd(22)} ${Object.keys(theme.colors).length} ui colors, ` +
      `${theme.tokenColors.length} token rules, ` +
      `${Object.keys(theme.semanticTokenColors).length} semantic rules`,
  );
}

if (stale) {
  console.error('\nThemes are out of date. Run `npm run build` and commit the result.');
  process.exit(1);
}
if (checkOnly) console.log('themes/ is up to date.');

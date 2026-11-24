// Renders README screenshots (images/preview-*.png) and the extension icon (images/icon.png)
// straight from the palettes, using a local headless Chrome/Chromium. No npm dependencies.
//   node scripts/preview.mjs            (set CHROME=/path/to/chrome if it is not found)
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { variants } from '../src/palettes.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const imgDir = path.join(root, 'images');
const tmpDir = path.join(os.tmpdir(), `termius-theme-preview-${process.pid}`);

function findChrome() {
  const candidates = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const hit = candidates.find((c) => existsSync(c));
  if (!hit) throw new Error('Chrome not found. Set CHROME=/path/to/chrome.');
  return hit;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Hand-tokenised sample so the screenshot shows exactly the theme's token colours.
// [syntaxKey, text]; a bare string is plain text.
const code = [
  [['comment', '// Reconnect to every host that dropped in the last sweep.']],
  [['keyword', 'import'], ' { ', ['type', 'Session'], ', ', ['function', 'connect'], ' } ', ['keyword', 'from'], ' ', ['string', "'./ssh'"], ['punctuation', ';']],
  [],
  [['decorator', '@retry'], ['punctuation', '('], ['number', '3'], ['punctuation', ')']],
  [['storage', 'export async function'], ' ', ['function', 'reconnect'], ['punctuation', '('], ['parameter', 'hosts'], ['operator', ':'], ' ', ['type', 'string'], ['punctuation', '[]) {']],
  ['  ', ['storage', 'const'], ' ', ['variable', 'live'], ' ', ['operator', '='], ' ', ['keyword', 'new'], ' ', ['type', 'Map'], ['punctuation', '<'], ['type', 'string'], ['punctuation', ', '], ['type', 'Session'], ['punctuation', '>();']],
  ['  ', ['control', 'for'], ' ', ['punctuation', '('], ['storage', 'const'], ' ', ['variable', 'host'], ' ', ['keyword', 'of'], ' ', ['parameter', 'hosts'], ['punctuation', ') {']],
  ['    ', ['control', 'if'], ' ', ['punctuation', '('], ['variable', 'live'], ['punctuation', '.'], ['function', 'has'], ['punctuation', '('], ['variable', 'host'], ['punctuation', ')) '], ['control', 'continue'], ['punctuation', ';']],
  ['    ', ['variable', 'live'], ['punctuation', '.'], ['function', 'set'], ['punctuation', '('], ['variable', 'host'], ['punctuation', ', '], ['keyword', 'await'], ' ', ['function', 'connect'], ['punctuation', '({ '], ['property', 'host'], ['punctuation', ', '], ['property', 'port'], ['operator', ':'], ' ', ['number', '22'], ['punctuation', ', '], ['property', 'keepAlive'], ['operator', ':'], ' ', ['constant', 'true'], ['punctuation', ' }));']],
  ['  ', ['punctuation', '}']],
  ['  ', ['control', 'return'], ' ', ['string', '`'], ['string', 'restored '], ['keyword', '${'], ['variable', 'live'], ['punctuation', '.'], ['property', 'size'], ['keyword', '}'], ['string', ' of '], ['keyword', '${'], ['parameter', 'hosts'], ['punctuation', '.'], ['property', 'length'], ['keyword', '}'], ['string', '`'], ['punctuation', ';']],
  [['punctuation', '}']],
];

const terminal = (p) => [
  [[p.terminalFg, '~ '], [p.ansi.brightCyan, 'ssh'], [p.terminalFg, ' deploy@prod-01']],
  [[p.ansi.brightBlack, 'Last login: Tue Nov 24 09:12:44 from 10.0.4.17']],
  [[p.ansi.brightGreen, 'deploy@prod-01'], [p.ansi.brightBlack, ':'], [p.ansi.brightBlue, '~/app'], [p.terminalFg, '$ systemctl status api']],
  [[p.ansi.brightGreen, '●'], [p.terminalFg, ' api.service — '], [p.ansi.brightGreen, 'active (running)'], [p.ansi.brightBlack, ' since 3h 12min']],
  [[p.ansi.brightYellow, 'warn'], [p.terminalFg, '  queue depth 128 '], [p.ansi.brightRed, 'error'], [p.terminalFg, ' 0 '], [p.ansi.brightMagenta, 'retry'], [p.terminalFg, ' 2']],
];

function editorWindow(p) {
  const s = p.syntax;
  const lines = code
    .map((line, i) => {
      const body = line
        .map((t) => (typeof t === 'string' ? esc(t) : `<span style="color:${s[t[0]]}${['comment', 'parameter', 'control'].includes(t[0]) ? ';font-style:italic' : ''}">${esc(t[1])}</span>`))
        .join('');
      const active = i === 6;
      return `<div class="ln${active ? ' cur' : ''}"><span class="no">${i + 1}</span><span>${body || '&nbsp;'}</span></div>`;
    })
    .join('');
  const term = terminal(p)
    .map((row) => `<div>${row.map(([c, t]) => `<span style="color:${c}">${esc(t)}</span>`).join('')}</div>`)
    .join('');
  const files = [
    ['▾ src', p.fg, false],
    ['  ssh.ts', p.fg, false],
    ['  reconnect.ts', p.fg, true],
    ['  hosts.json', p.yellow, false],
    ['  README.md', p.teal, false],
    ['▸ themes', p.fgMuted, false],
  ];
  return `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  html,body{background:${p.bgDeep};width:1200px;height:760px;overflow:hidden}
  body{font:13px/1.55 'SauceCodePro Nerd Font Mono','Source Code Pro','Cascadia Code',Consolas,monospace;color:${p.fg}}
  .ui{font-family:'Segoe UI',system-ui,sans-serif;font-size:12.5px}
  .title{height:34px;background:${p.bgDeep};border-bottom:1px solid ${p.border};display:flex;align-items:center;justify-content:center;position:relative}
  .dots{position:absolute;left:14px;display:flex;gap:8px}.dots i{width:12px;height:12px;border-radius:50%;display:block}
  .cc{background:${p.bgHi};border:1px solid ${p.border};color:${p.fgMuted};border-radius:6px;padding:3px 90px}
  .main{display:flex;height:calc(100% - 34px - 24px)}
  .act{width:48px;background:${p.bgDeep};display:flex;flex-direction:column;align-items:center;gap:18px;padding-top:14px}
  .act b{width:22px;height:22px;border-radius:5px;border:2px solid ${p.fgMuted};opacity:.7}
  .act b.on{border-color:${p.accent};opacity:1;box-shadow:-13px 0 0 -9px ${p.accent}}
  .side{width:210px;background:${p.bgAlt};border-right:1px solid ${p.border};padding:10px 0}
  .side h6{font-size:11px;letter-spacing:.06em;color:${p.fgMuted};font-weight:600;padding:0 14px 8px}
  .side div{padding:2px 14px;white-space:pre}.side .sel{background:${p.accent}33;outline:1px solid ${p.accent}99;outline-offset:-1px}
  .work{flex:1;display:flex;flex-direction:column;min-width:0}
  .tabs{height:36px;background:${p.bgAlt};display:flex;border-bottom:1px solid ${p.border}}
  .tab{padding:0 18px;display:flex;align-items:center;color:${p.fgMuted};border-right:1px solid ${p.bgAlt}}
  .tab.on{background:${p.bg};color:${p.fg};box-shadow:inset 0 2px 0 ${p.accent}}
  .crumb{height:24px;background:${p.bg};color:${p.fgMuted};padding:3px 18px}
  .ed{flex:1;background:${p.bg};padding:4px 0}
  .ln{display:flex;white-space:pre;padding-right:16px}.ln .no{width:52px;text-align:right;padding-right:22px;color:${p.fgSubtle}}
  .ln.cur{background:${p.bgHi}}.ln.cur .no{color:${p.fgMuted}}
  .panel{height:178px;background:${p.bg};border-top:1px solid ${p.border}}
  .ptabs{display:flex;gap:22px;padding:8px 18px 6px;color:${p.fgMuted};font-size:11px;letter-spacing:.05em}
  .ptabs .on{color:${p.fg};box-shadow:0 7px 0 -5px ${p.accent}}
  .term{padding:4px 18px;white-space:pre}
  .cursor{display:inline-block;width:8px;height:15px;background:${p.accent};vertical-align:-3px}
  .status{height:24px;background:${p.bgDeep};border-top:1px solid ${p.border};display:flex;align-items:center;color:${p.fgMuted};font-size:12px}
  .status .remote{background:${p.accent};color:${p.accentFg};height:100%;padding:0 12px;display:flex;align-items:center;font-weight:600}
  .status span{padding:0 10px}
  </style><body>
  <div class="title ui"><div class="dots"><i style="background:${p.red}"></i><i style="background:${p.yellow}"></i><i style="background:${p.accent}"></i></div><div class="cc">termius — reconnect.ts</div></div>
  <div class="main">
    <div class="act"><b class="on"></b><b></b><b></b><b></b></div>
    <div class="side ui"><h6>EXPLORER</h6>${files.map(([n, c, sel]) => `<div class="${sel ? 'sel' : ''}" style="color:${c}">${n}</div>`).join('')}</div>
    <div class="work">
      <div class="tabs ui"><div class="tab on">reconnect.ts</div><div class="tab">ssh.ts</div><div class="tab">hosts.json</div></div>
      <div class="crumb ui">src › reconnect.ts › reconnect</div>
      <div class="ed">${lines}</div>
      <div class="panel"><div class="ptabs ui"><span>PROBLEMS</span><span>OUTPUT</span><span class="on">TERMINAL</span></div><div class="term">${term}<div><span style="color:${p.ansi.brightGreen}">deploy@prod-01</span><span style="color:${p.terminalFg}">:~/app$ </span><span class="cursor"></span></div></div></div>
    </div>
  </div>
  <div class="status ui"><div class="remote">⇄ SSH: prod-01</div><span>⎇ main</span><span style="color:${p.red}">⊗ 0</span><span style="color:${p.yellow}">⚠ 0</span><span style="margin-left:auto">Ln 7, Col 18</span><span>UTF-8</span><span>TypeScript</span></div>
  </body>`;
}

function iconHtml() {
  const d = variants[0];
  return `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:256px;height:256px;background:transparent;overflow:hidden}</style><body>
  <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${d.bgHi}"/><stop offset="1" stop-color="${d.bgDeep}"/></linearGradient>
      <linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${d.teal}"/><stop offset="1" stop-color="${d.accent}"/></linearGradient>
    </defs>
    <rect x="8" y="8" width="240" height="240" rx="56" fill="url(#g)"/>
    <rect x="8.5" y="8.5" width="239" height="239" rx="55.5" fill="none" stroke="${d.borderStrong}" stroke-width="3"/>
    <path d="M70 92 L122 128 L70 164" fill="none" stroke="url(#a)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="134" y="152" width="58" height="20" rx="10" fill="${d.accent}"/>
  </svg></body>`;
}

function shoot(chrome, html, out, width, height, scale) {
  const file = path.join(tmpDir, `${path.basename(out, '.png')}.html`);
  return writeFile(file, html).then(() => {
    execFileSync(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--default-background-color=00000000',
      `--force-device-scale-factor=${scale}`,
      `--window-size=${width},${height}`,
      `--screenshot=${out}`,
      pathToFileURL(file).href,
    ], { stdio: 'ignore' });
    console.log(`wrote ${path.relative(root, out)}`);
  });
}

const chrome = findChrome();
await mkdir(imgDir, { recursive: true });
await mkdir(tmpDir, { recursive: true });
try {
  for (const p of variants) {
    await shoot(chrome, editorWindow(p), path.join(imgDir, `preview-${p.id}.png`), 1200, 760, 1.5);
  }
  await shoot(chrome, iconHtml(), path.join(imgDir, 'icon.png'), 256, 256, 1);
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}

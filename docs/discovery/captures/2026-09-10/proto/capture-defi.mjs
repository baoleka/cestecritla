// Screenshots of /defi/ (F1 « Tu savais que c'était dedans ? »): the six screens of 07-mecaniques.md §9.1,
// 390×844 @2x, light + dark, viewport + full page, plus a report (contrast pairs, targets, 3D blocks,
// external requests, console errors) and SHA-256 sums. Run against a local static server of prototypes/proto:
//   cd prototypes/proto && python3 -m http.server 8765
//   node docs/discovery/captures/2026-09-10/proto/capture-defi.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.env.BASE ?? 'http://127.0.0.1:8765';
const outRoot = process.argv[2] ?? '<repo>/docs/discovery/captures/2026-09-10/proto';
const dir = path.join(outRoot, 'defi');
fs.mkdirSync(dir, { recursive: true });

const ANSWER = { s: 'Je savais', d: 'Je découvre', p: 'Passer' };
const settle = (p, ms = 350) => p.waitForTimeout(ms);
async function play(p, letters) {
  for (const l of letters) {
    await p.getByRole('button', { name: ANSWER[l], exact: true }).click();
    await settle(p);
  }
}

// Each scenario drives the page then captures; `steps` runs before the capture.
const scenarios = [
  { name: 'ecran0', path: '/defi/?n=254', note: 'Écran 0 par lien (ligne de contexte impersonnelle), carte 1/5' },
  { name: 'ecran0-direct', path: '/defi/?date=2026-09-11', note: 'Écran 0 direct (tirage du jour, sans ligne de contexte)' },
  { name: '10s', path: '/defi/?n=254', steps: (p) => play(p, 's'), note: 'Carte 2/5 après un premier tap, « 2 / 5 »' },
  {
    name: 'aha',
    path: '/defi/?n=254',
    steps: async (p) => {
      await play(p, 'sd');
      await p.locator('.stage .read').click();
      await p.waitForLoadState('networkidle');
      await p.evaluate(() => document.fonts.ready);
      await settle(p);
    },
    extra: [{ suffix: '-savoir', scrollTo: '.statcard' }, { suffix: '-haut', scrollTo: 'top' }],
    note: 'SectionVerbatim c14-s02 depuis la carte 3, mesure ciblée, « Reprendre le tirage (3/5) », À savoir 77-808 avec sidecar',
  },
  { name: 'resultat', path: '/defi/?n=254', steps: (p) => play(p, 'sddpd'), note: 'Résultat : 3 mesures qui m’ont surpris·e, mosaïque, Et toi ?, Comparer, Encore ?' },
  {
    name: 'carte',
    path: '/defi/?n=254',
    steps: async (p) => {
      await play(p, 'sddpd');
      await p.getByRole('button', { name: 'Voir la carte' }).click();
      await p.waitForFunction(() => document.querySelector('#card-actions .btn') !== null, null, { timeout: 8000 });
      await settle(p);
    },
    exportCanvas: 'carte-1080x1920.png',
    note: 'Carte 1080 × 1920 dessinée dans un canvas client, texte de repli, enregistrer / envoyer',
  },
  { name: 'lien', path: '/defi/?n=254#r=ddsdp', note: 'Arrivée par lien avec #r= : « Quelqu’un a joué ce défi », les réponses reçues restent masquées' },
  { name: 'lien-resultat', path: '/defi/?n=254#r=ddsdp', steps: (p) => play(p, 'ddssp'), note: 'Résultat après un lien #r= : bloc « Vous avez découvert 2 mesures en commun », Et toi ? sans #r=' },
  { name: 'resultat-zero', path: '/defi/?n=254', steps: (p) => play(p, 'sssps'), note: 'Résultat sans découverte : « Tu connaissais les 5. En voici 5 autres ? »' },
  { name: 'silence', path: '/defi/?n=254&silence=1', steps: (p) => play(p, 'sddpd'), note: 'Silence électoral : partage gelé, lecture maintenue' },
];

const hex = (s) => {
  const m = s && s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return s;
  if (m[4] !== undefined && Number(m[4]) === 0) return null;
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
};

const audit = () => {
  const pairs = new Map();
  const bgOf = (el) => {
    let e = el;
    while (e) {
      const c = getComputedStyle(e).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
      e = e.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const key = `${cs.color} on ${bgOf(el)}`;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  }
  const targets = [...document.querySelectorAll('a, button, input, summary, [role=button]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName, text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; });
  const small = targets.filter((t) => t.h < 24 || t.w < 24);
  const blocks3d = [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).boxShadow !== 'none').length;
  const cta = document.querySelector('#cta');
  const indep = document.getElementById('independence');
  return {
    url: location.href,
    scrollWidth: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    pairs: [...pairs.entries()],
    smallTargets: small,
    targetsCount: targets.length,
    blocks3d,
    ctaBottom: cta ? Math.round(cta.getBoundingClientRect().bottom + scrollY) : null,
    independenceBottom: indep ? Math.round(indep.getBoundingClientRect().bottom + scrollY) : null,
    hasDenominator: /\bsur 5\b|\d\/5\b/.test(document.getElementById('app')?.innerText.replace(/\d \/ \d/, '') ?? ''),
    fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
    text: document.getElementById('app')?.innerText.slice(0, 600) ?? document.body.innerText.slice(0, 600),
  };
};

const b = await chromium.launch();
const report = [];
for (const sc of scenarios) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: 'no-preference' });
    const p = await ctx.newPage();
    const external = [];
    const errors = [];
    p.on('request', (r) => { if (!r.url().startsWith(base)) external.push(r.url()); });
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(base + sc.path, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await settle(p, 400);
    if (sc.steps) await sc.steps(p);
    const suffix = scheme === 'dark' ? '.dark' : '';
    const file = path.join(dir, `${sc.name}${suffix}.png`);
    await p.screenshot({ path: file, fullPage: false });
    const fileFull = path.join(dir, `${sc.name}${suffix}.full.png`);
    await p.screenshot({ path: fileFull, fullPage: true });
    const extras = [];
    for (const ex of sc.extra ?? []) {
      await p.evaluate((sel) => { if (sel === 'top') window.scrollTo(0, 0); else document.querySelector(sel)?.scrollIntoView({ block: 'start' }); }, ex.scrollTo);
      await settle(p, 200);
      const f = path.join(dir, `${sc.name}${ex.suffix}${suffix}.png`);
      await p.screenshot({ path: f, fullPage: false });
      extras.push(path.relative(outRoot, f));
    }
    if (sc.exportCanvas && scheme === 'light') {
      const dataUrl = await p.evaluate(() => document.querySelector('canvas.card-preview').toDataURL('image/png'));
      fs.writeFileSync(path.join(dir, sc.exportCanvas), Buffer.from(dataUrl.split(',')[1], 'base64'));
      extras.push(path.relative(outRoot, path.join(dir, sc.exportCanvas)));
    }
    const a = await p.evaluate(audit);
    a.pairs = a.pairs.map(([k, v]) => [k.replace(/rgba?\([^)]*\)/g, (m) => hex(m) ?? m), v]);
    report.push({ shot: sc.name, scheme, path: sc.path, note: sc.note, file: path.relative(outRoot, file), fileFull: path.relative(outRoot, fileFull), extras, external, errors, ...a });
    await ctx.close();
  }
}
await b.close();
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
const sums = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex');
  sums.push(`${h}  defi/${f}`);
}
fs.writeFileSync(path.join(dir, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log(JSON.stringify(report.map((r) => ({ shot: r.shot, scheme: r.scheme, url: r.url, errors: r.errors, external: r.external.length, w: r.scrollWidth, h: r.height, blocks3d: r.blocks3d, cta: r.ctaBottom, indep: r.independenceBottom, small: r.smallTargets, pairs: r.pairs, denominator: r.hasDenominator })), null, 1));

// Screenshots of the /q/ module (F2 « Laquelle est ici ? »): 390×844 @2x, light + dark, viewport + full page,
// the 1200×630 share card, plus a report (contrast pairs, targets, external requests, console errors).
// Run from a folder with playwright installed, against `python3 -m http.server 8765` in prototypes/proto/.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.env.PROTO_BASE ?? 'http://127.0.0.1:8765';
const outRoot = process.argv[2] ?? '<repo>/docs/discovery/captures/2026-09-10/proto';
const dir = path.join(outRoot, 'q');
fs.mkdirSync(dir, { recursive: true });

const backQ = 'back=%2Fq%2F%3Fs%3Dc12-s01&backLabel=Retour+%C3%A0+la+question';
const shots = [
  { name: 'q0-ecran0', path: '/q/?s=c12-s01', note: 'Écran 0 direct : titre, section, règle, trois options' },
  { name: 'q1-options', path: '/q/?s=c12-s01', focusOption: 1, scrollTo: '.opts', note: '10 s : lecture des options, focus clavier sur B, « Passer » et « Lire la section » sous les options' },
  { name: 'q2-aha', path: '/q/?s=c12-s01', tap: 1, scrollTo: '.opt-item:nth-child(2)', note: 'Aha : B touchée, « Celle-ci existe aussi, mais ailleurs » + « Y aller », A surlignée' },
  { name: 'q3-resultat', path: '/q/?s=c12-s01', tap: 0, scrollTo: '.q-result', note: 'Résultat : A touchée, trois localisations, « Lire la section », « Envoyer cette question », « Une autre section ? »' },
  { name: 'q3b-section', path: `/section/?id=c12-s01&${backQ}#c12-s01-m03`, backTo: '#c12-s01-m03', note: 'SectionVerbatim atteint depuis /q/ : mesure 3 ciblée, « Retour à la question », À savoir 77-808 plus bas' },
  { name: 'q5-lien', path: '/q/?s=c12-s01&from=link', note: 'Variante arrivée par lien : kicker, aucune navigation, ligne impersonnelle, confidentialité impersonnelle' },
  { name: 'q5b-lien-resultat', path: '/q/?s=c12-s01&from=link', tap: 2, scrollTo: '.q-result', note: 'Arrivée par lien après révélation : « Lire la section » en bouton principal' },
  { name: 'q6-suivante', path: '/q/?s=c12-s02', note: 'Triplet 2 (c12-s02) : la mesure « ici » n’est pas en A' },
  { name: 'q7-passer', path: '/q/?s=c12-s01', skip: true, scrollTo: '.opts', note: '« Passer » : révélation sans choix' },
  { name: 'q8-sensible', path: '/q/?s=c4-s03', tap: 0, scrollTo: '.q-result', note: 'Section sensible (D5.12) : question posée, leurres du quotidien, « Envoyer » = lien de section standard' },
  { name: 'q9-inconnue', path: '/q/?s=c99-s99', note: 'Identifiant inconnu' },
];

const hex = (s) => { const m = s && s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/); if (!m) return s; if (m[4] !== undefined && Number(m[4]) === 0) return null; return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase(); };

const b = await chromium.launch();
const report = [];
for (const shot of shots) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: 'no-preference' });
    const p = await ctx.newPage();
    const external = [];
    const errors = [];
    p.on('request', (r) => { if (!r.url().startsWith(base)) external.push(r.url()); });
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(base + shot.path, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    if (shot.focusOption != null) {
      await p.focus(`.opt-item:nth-child(${shot.focusOption + 1}) .opt`);
      // A keyboard event so :focus-visible matches (a programmatic focus alone does not always show the ring).
      await p.keyboard.press('Shift');
    }
    if (shot.tap != null) { await p.click(`.opt-item:nth-child(${shot.tap + 1}) .opt`); await p.waitForTimeout(450); }
    if (shot.skip) { await p.click('.q-controls .textlink'); await p.waitForTimeout(450); }
    if (shot.backTo) {
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(400);
      await p.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), shot.backTo);
      await p.waitForTimeout(200);
    }
    if (shot.scrollTo) { await p.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), shot.scrollTo); await p.waitForTimeout(250); }
    const suffix = scheme === 'dark' ? '.dark' : '';
    const file = path.join(dir, `${shot.name}${suffix}.png`);
    await p.screenshot({ path: file, fullPage: false });
    const fileFull = path.join(dir, `${shot.name}${suffix}.full.png`);
    await p.screenshot({ path: fileFull, fullPage: true });
    const audit = await p.evaluate(() => {
      const pairs = new Map();
      const bgOf = (el) => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor; };
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
      const targets = [...document.querySelectorAll('a, button, input, summary, [role=button]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName, text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; });
      const small = targets.filter((t) => t.h < 24 || t.w < 24);
      const blocks3d = [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).boxShadow !== 'none').length;
      const firstOpt = document.querySelector('.opt');
      return {
        scrollWidth: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        pairs: [...pairs.entries()],
        smallTargets: small,
        targetsCount: targets.length,
        optionTargets: [...document.querySelectorAll('.opt')].map((e) => Math.round(e.getBoundingClientRect().height)),
        blocks3d,
        firstOptionBottom: firstOpt ? Math.round(firstOpt.getBoundingClientRect().bottom + scrollY) : null,
        independenceBottom: document.getElementById('independence') ? Math.round(document.getElementById('independence').getBoundingClientRect().bottom + scrollY) : null,
        announce: document.getElementById('announce')?.textContent ?? null,
        activeElement: document.activeElement ? document.activeElement.className || document.activeElement.tagName : null,
        localStorageKeys: (() => { try { return Object.keys(localStorage); } catch { return null; } })(),
        fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
      };
    });
    audit.pairs = audit.pairs.map(([k, v]) => [k.replace(/rgba?\([^)]*\)/g, (m) => hex(m) ?? m), v]);
    report.push({ shot: shot.name, scheme, path: shot.path, note: shot.note, file: path.relative(outRoot, file), fileFull: path.relative(outRoot, fileFull), external, errors, ...audit });
    await ctx.close();
  }
}
// Share card, 1200×630, fixed palette (an image has no dark mode), @1x and @2x.
for (const [name, p2, dsf] of [['q4-carte-c12-s01', '/q/card.html?s=c12-s01', 1], ['q4-carte-c12-s01@2x', '/q/card.html?s=c12-s01', 2], ['q4-carte-c12-s02', '/q/card.html?s=c12-s02', 1], ['q4-carte-sensible-c4-s03', '/q/card.html?s=c4-s03', 1]]) {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: dsf, colorScheme: 'light' });
  const p = await ctx.newPage();
  const external = []; const errors = [];
  p.on('request', (r) => { if (!r.url().startsWith(base)) external.push(r.url()); });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + p2, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const file = path.join(dir, `${name}.png`);
  await p.screenshot({ path: file, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  const blocks3d = await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).boxShadow !== 'none').length);
  report.push({ shot: name, scheme: 'light', path: p2, note: 'Carte de partage 1200 × 630 (aperçu HTML de l’image pré-générée au build)', file: path.relative(outRoot, file), external, errors, blocks3d });
  await ctx.close();
}
await b.close();
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
const sums = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex');
  sums.push(`${h}  q/${f}`);
}
fs.writeFileSync(path.join(dir, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log(JSON.stringify(report.map((r) => ({ shot: r.shot, scheme: r.scheme, errors: r.errors, external: r.external.length, w: r.scrollWidth, h: r.height, blocks3d: r.blocks3d, optA: r.firstOptionBottom, opts: r.optionTargets, small: r.smallTargets, pairs: r.pairs?.length, ls: r.localStorageKeys, active: r.activeElement })), null, 1));

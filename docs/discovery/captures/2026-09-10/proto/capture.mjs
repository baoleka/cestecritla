// Screenshots of the proto modules: 390×844 @2x, light + dark, viewport + full page, plus a report.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = 'http://127.0.0.1:8765';
const outRoot = process.argv[2] ?? '<repo>/docs/discovery/captures/2026-09-10/proto';
const shots = [
  { module: 'home', name: 'home', path: '/home/' },
  { module: 'home', name: 'home-recherche-loyer', path: '/home/#q=loyer' },
  { module: 'link', name: 'link-c12-s01-k01', path: '/link/?id=c12-s01-k01' },
  { module: 'link', name: 'link-c9-s01-m04', path: '/link/?id=c9-s01-m04' },
  { module: 'section', name: 'section-c12-s01', path: '/section/?id=c12-s01', scrollEnd: true },
  { module: 'section', name: 'section-c14-s02-m09', path: '/section/?id=c14-s02#c14-s02-m09', scrollEnd: true, backTo: '#c14-s02-m09' },
  { module: 'home', name: 'home-silence', path: '/home/?silence=1#jour' },
  { module: 'concept', name: 'concept-regle-verte', path: '/concept/?slug=regle-verte' },
  { module: 'concept', name: 'concept-regle-verte-explorable', path: '/concept/?slug=regle-verte', open: 'details.explo' },
  { module: 'riposte', name: 'riposte-grille', path: '/riposte/' },
  { module: 'riposte', name: 'riposte-recto-rip-01', path: '/riposte/?id=rip-01' },
  { module: 'riposte', name: 'riposte-verso-rip-14', path: '/riposte/?id=rip-14#texte' },
  { module: 'riposte', name: 'riposte-flash-rip-07', path: '/riposte/?flash=1&date=2026-09-11', wait: 4200 },
  { module: 'root', name: 'index', path: '/' },
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
    await p.waitForTimeout(shot.wait ?? 400);
    if (shot.scrollEnd) {
      // Reach the end of the measures so the section is marked read (IntersectionObserver), then come back.
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(500);
      await p.evaluate((sel) => { const t = sel && document.querySelector(sel); if (t) t.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0); }, shot.backTo ?? null);
      await p.waitForTimeout(200);
    }
    if (shot.open) {
      await p.evaluate((sel) => { const d = document.querySelector(sel); d.open = true; d.scrollIntoView({ block: 'start' }); }, shot.open);
      await p.waitForTimeout(200);
    }
    const dir = path.join(outRoot, shot.module);
    fs.mkdirSync(dir, { recursive: true });
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
      const cta = document.querySelector('#cta .btn');
      return {
        scrollWidth: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        pairs: [...pairs.entries()],
        smallTargets: small,
        targetsCount: targets.length,
        blocks3d,
        ctaBottom: cta ? Math.round(cta.getBoundingClientRect().bottom + scrollY) : null,
        independenceBottom: document.getElementById('independence') ? Math.round(document.getElementById('independence').getBoundingClientRect().bottom + scrollY) : null,
        fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
      };
    });
    audit.pairs = audit.pairs.map(([k, v]) => [k.replace(/rgba?\([^)]*\)/g, (m) => hex(m) ?? m), v]);
    report.push({ shot: shot.name, scheme, path: shot.path, file: path.relative(outRoot, file), fileFull: path.relative(outRoot, fileFull), external, errors, ...audit });
    await ctx.close();
  }
}
await b.close();
fs.writeFileSync(path.join(outRoot, 'report.json'), JSON.stringify(report, null, 2));
const sums = [];
for (const dir of fs.readdirSync(outRoot)) {
  const full = path.join(outRoot, dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full).filter((f) => f.endsWith('.png'))) {
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(full, f))).digest('hex');
    sums.push(`${h}  ${dir}/${f}`);
  }
}
fs.writeFileSync(path.join(outRoot, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log(JSON.stringify(report.map((r) => ({ shot: r.shot, scheme: r.scheme, errors: r.errors, external: r.external.length, w: r.scrollWidth, h: r.height, blocks3d: r.blocks3d, cta: r.ctaBottom, indep: r.independenceBottom, small: r.smallTargets, pairs: r.pairs.length })), null, 1));

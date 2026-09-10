// Cross-module flows under the real headers (CSP): defi -> section -> back, q -> section, riposte grid -> verso, concept explorable, home search, share fallback, root clear button.
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://127.0.0.1:8790';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errors = [], external = [], failed = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
p.on('request', (r) => { if (!r.url().startsWith(base)) external.push(r.url()); });
p.on('requestfailed', (r) => failed.push(r.url()));
const step = (s) => console.log('==', s, '->', p.url().replace(base, ''));

// F1 defi: answer, read section, back, finish, card
await p.goto(base + '/defi/?n=254', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: 'Je savais' }).click(); await p.waitForTimeout(250);
await p.getByRole('button', { name: 'Je découvre' }).click(); await p.waitForTimeout(250);
step('defi 2 answers');
await p.locator('.stage .read').click(); await p.waitForLoadState('networkidle');
step('defi -> section');
console.log('   back link:', await p.locator('.textlink').first().innerText());
await p.locator('.textlink').first().click(); await p.waitForLoadState('networkidle');
step('section -> defi');
await p.getByRole('button', { name: 'Je découvre' }).click(); await p.waitForTimeout(200);
await p.getByRole('button', { name: 'Passer' }).click(); await p.waitForTimeout(200);
await p.getByRole('button', { name: 'Je découvre' }).click(); await p.waitForTimeout(400);
step('defi result');
console.log('   ', (await p.locator('#app').innerText()).replace(/\s+/g, ' ').slice(0, 200));
await p.getByRole('button', { name: 'Voir la carte' }).click(); await p.waitForTimeout(1500);
console.log('   canvas:', await p.evaluate(() => { const c = document.querySelector('canvas'); return c ? `${c.width}x${c.height}` : 'none'; }));
console.log('   buttons:', await p.$$eval('#app button', (bs) => bs.map((x) => x.textContent.trim()).filter(Boolean)));

// F2 q: pick, reveal, go to section
await p.goto(base + '/q/?s=c12-s01', { waitUntil: 'networkidle' });
await p.click('.opt-item:nth-child(2) .opt'); await p.waitForTimeout(400);
step('q answered');
console.log('   fb:', await p.$$eval('.fb', (f) => f.map((x) => x.textContent.trim().slice(0, 80))));
const go = await p.$eval('.fb a.textlink', (a) => a.getAttribute('href'));
await p.goto(base + go, { waitUntil: 'networkidle' });
step('q -> section');
console.log('   target:', await p.$eval('.is-target', (x) => x.id).catch(() => 'none'));

// riposte: grid -> verso -> section -> back
await p.goto(base + '/riposte/', { waitUntil: 'networkidle' });
console.log('   tiles:', await p.$$eval('.tile', (t) => t.length));
await p.locator('.tile').first().click(); await p.waitForTimeout(300);
step('riposte tile -> verso');
console.log('   ', (await p.locator('#content').innerText()).replace(/\s+/g, ' ').slice(0, 160));
const rl = await p.locator('#content a.textlink, #content a.read').first();
const rlh = await rl.getAttribute('href'); console.log('   read link:', rlh);
await rl.click(); await p.waitForLoadState('networkidle');
step('verso -> section');
console.log('   back link:', await p.locator('.textlink').first().innerText());

// riposte flash
await p.goto(base + '/riposte/?flash=1', { waitUntil: 'networkidle' });
await p.locator('#content a, #content button').filter({ hasText: /^Passer$/ }).first().click(); await p.waitForLoadState('networkidle');
step('flash Passer');

// concept explorable + share fallback (no navigator.share in headless)
await p.goto(base + '/concept/?slug=regle-verte', { waitUntil: 'networkidle' });
await p.evaluate(() => { const d = document.querySelector('details.explo'); if (d) d.open = true; });
const range = p.locator('details.explo input[type=range]');
if (await range.count()) { await range.fill('80'); await p.waitForTimeout(200); console.log('   verdict:', (await p.locator('details.explo [aria-live]').innerText()).slice(0, 100)); }
const shareBtn = p.getByRole('button', { name: /Copier le lien|Envoyer cette carte/ }).first();
console.log('   share btn:', await shareBtn.innerText().catch(() => 'none'));
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
await shareBtn.click().catch((e) => console.log('   share click err', e.message)); await p.waitForTimeout(400);
console.log('   toast:', await p.locator('[role=status]').last().innerText().catch(() => 'none'));

// home search
await p.goto(base + '/home/', { waitUntil: 'networkidle' });
await p.fill('#q', 'loyer'); await p.waitForTimeout(400);
console.log('   results:', await p.$$eval('#results a', (a) => a.length), p.url().replace(base, ''));

// root clear
await p.goto(base + '/', { waitUntil: 'networkidle' });
await p.click('#clear'); await p.waitForTimeout(300);
console.log('   root toast:', await p.locator('[role=status]').last().innerText().catch(() => 'none'));
// root links all resolve
const links = await p.$$eval('ul.modules a', (as) => as.map((a) => a.getAttribute('href')));
for (const l of links) { const r = await p.request.get(base + '/' + l); console.log('   link', r.status(), l); }

console.log('errors', errors, 'external', external, 'failed', failed);
await b.close();

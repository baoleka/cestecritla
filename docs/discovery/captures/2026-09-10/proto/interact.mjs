import { chromium } from 'playwright';
const base = 'http://127.0.0.1:8765';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// Concept: explorable buttons + range
await p.goto(base + '/concept/?slug=regle-verte', { waitUntil: 'networkidle' });
await p.click('details.explo summary');
await p.click('details.explo .btn-row button:nth-child(3)');
const over = await p.textContent('.explo .verdict');
await p.fill('#explo-range', '66');
await p.dispatchEvent('#explo-range', 'input');
const at = await p.textContent('.explo .verdict');
console.log('explorable:', over.slice(0, 40), '|', at.slice(0, 40));
console.log('share group (no Web Share):', await p.evaluate(() => [...document.querySelectorAll('.share .btn, .share .alt a, .share .alt button')].map((e) => e.tagName + ':' + e.textContent.trim() + ':' + (e.getAttribute('href') || '').slice(0, 40))));
// Copy link -> toast
await p.click('.share .alt button');
await p.waitForTimeout(150);
console.log('toast:', await p.textContent('#toast'), 'clipboard:', await p.evaluate(() => navigator.clipboard.readText()));
console.log('neighbour chips:', await p.evaluate(() => [...document.querySelectorAll('.chips a')].map((a) => a.textContent)));
console.log('statcard collapsed:', await p.evaluate(() => document.querySelector('details.statcard')?.open));

// Home: typing updates results + hash
await p.goto(base + '/home/', { waitUntil: 'networkidle' });
await p.fill('#q', 'règle verte');
await p.waitForTimeout(200);
console.log('hash:', await p.evaluate(() => location.hash), 'first result:', await p.textContent('.results li:first-child'));
await p.fill('#q', 'SMIC');
await p.waitForTimeout(200);
console.log('smic results:', await p.evaluate(() => document.querySelectorAll('.results li').length), await p.textContent('.results-note'));
await p.fill('#q', 'xyzxyz');
await p.waitForTimeout(200);
console.log('no result:', await p.textContent('#results'));
console.log('daily:', await p.textContent('#daily .label'), (await p.textContent('#daily .verbatim p')).slice(0, 60));
// Section: mark then home progress
await p.goto(base + '/section/?id=c12-s01', { waitUntil: 'networkidle' });
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(300);
console.log('marked:', await p.textContent('.progress .done'));
await p.goto(base + '/home/', { waitUntil: 'networkidle' });
console.log('home progress:', (await p.textContent('#progress')).trim().slice(0, 120));
await p.goto(base + '/', { waitUntil: 'networkidle' });
await p.click('#clear'); await p.waitForTimeout(100);
console.log('cleared:', await p.textContent('#toast'), await p.evaluate(() => localStorage.getItem('cel.progress.v1')));
// Unknown ids
await p.goto(base + '/link/?id=nope', { waitUntil: 'networkidle' }); console.log('link unknown:', (await p.textContent('#hero')).trim().slice(0, 60));
await p.goto(base + '/section/?id=c99-s01', { waitUntil: 'networkidle' }); console.log('section unknown:', (await p.textContent('#content h1')).trim());
await p.goto(base + '/link/?id=c12-s02', { waitUntil: 'networkidle' }); console.log('link by section id:', (await p.textContent('#hero .verbatim p')).slice(0, 50), await p.getAttribute('#cta .btn', 'href'));
// silence
await p.goto(base + '/section/?id=c12-s01&silence=1', { waitUntil: 'networkidle' }); console.log('silence share:', (await p.textContent('.share')).trim().slice(0, 80), 'actions:', await p.evaluate(() => document.querySelectorAll('.measures .actions').length));
// keyboard: tab to first result link and check focus ring exists
console.log('errors:', errors);
await b.close();

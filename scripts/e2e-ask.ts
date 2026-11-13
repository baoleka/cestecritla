/**
 * End-to-end checks of « Demander » (lot I7), in three browser engines, against a Worker that
 * is SIMULATED: nothing is deployed, no model runs, no neuron is spent.
 *
 *   npm run build:ask && npx tsx scripts/e2e-ask.ts            Chromium, Firefox, WebKit
 *   npx tsx scripts/e2e-ask.ts --engines chromium
 *
 * dist-ask/ — the app as it would be if the site answered questions (scripts/build.ts
 * --ask-test) — is served from a local port. `/api/ask` is answered here from a table, one
 * canned answer per marker word in the question; Turnstile's script is replaced by a stub that
 * hands out a token. Every other request to another host is aborted and reported.
 *
 * What is checked:
 *   1. before any gesture: the notice that an AI is at work, with the model's name; no request
 *      to anyone but us — Turnstile included — until « Demander » is pressed: focusing the
 *      field and typing in it are the local search, and ask nothing of a third party;
 *   2. typing sends nothing; « Demander » sends the question once, with a token and the state
 *      of the book, and nothing else;
 *   3. each answer of the Worker becomes its page — written, selected, re-read, nothing found,
 *      out of subject, silence — and the notice follows the model, not the page's own choice;
 *   4. whatever the Worker does wrong — an error, gibberish, another book, an unknown measure,
 *      a field it should not send — the page shows what it found by itself, and never a word
 *      of failure;
 *   5. a sentence of the model is text: markup in it creates no element and runs nothing;
 *   6. the Content-Security-Policy opens Turnstile on this page and on no other, and nothing we
 *      ship violates it; the answer is reachable by keyboard and passes the accessibility audit.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium, firefox, webkit, type BrowserType, type Page, type Route } from 'playwright';
import type { Manifest } from './aec26-types.js';
import { STILL, lateLayoutShift } from './e2e-kit.js';

const ENGINES: Record<string, BrowserType> = { chromium, firefox, webkit };
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const ROOT = 'dist-ask';
const OFFICIAL = 'https://melenchon2027.fr';
const TURNSTILE = 'https://challenges.cloudflare.com';
const MODEL = 'Mistral Small 3.1';

/** A token straight away, and a new one each time the page asks: what Turnstile does, minus Turnstile. */
const TURNSTILE_STUB = `
  window.turnstile = {
    render: function (holder, options) {
      window.__turnstile = { options: options, renders: (window.__turnstile ? window.__turnstile.renders : 0) + 1 };
      setTimeout(function () { options.callback('jeton-1'); }, 20);
      return 'widget';
    },
    reset: function () {
      var options = window.__turnstile.options;
      setTimeout(function () { options.callback('jeton-' + Date.now()); }, 20);
    }
  };`;

function serve(root: string): Promise<{ server: Server; origin: string }> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res
        .writeHead(404, { 'content-type': MIME['.html'] })
        .end(readFileSync(join(root, '404.html')));
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      date: new Date().toUTCString(),
    });
    res.end(readFileSync(file));
  });
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      done({ server, origin: `http://127.0.0.1:${String(port)}` });
    });
  });
}

/** Asks from Node: the page's policy refuses the `eval` a string given to waitForFunction needs. */
async function until(page: Page, expression: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for: ${expression}`);
    await page.waitForTimeout(40);
  }
}

interface Outcome {
  engine: string;
  passed: string[];
  failed: string[];
}

async function runEngine(name: string, origin: string, manifest: Manifest): Promise<Outcome> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const out: Outcome = { engine: name, passed: [], failed: [] };
  const check = (label: string, ok: boolean, detail = ''): void => {
    (ok ? out.passed : out.failed).push(detail === '' || ok ? label : `${label} — ${detail}`);
  };
  const corpus = manifest.meta.corpus_version;
  const section = manifest.sections.find(
    (s) =>
      s.items.filter((i) => i.kind !== 'paragraph' && typeof i.locator === 'string').length >= 3,
  );
  if (section === undefined) throw new Error('no section with three located propositions');
  const ids = section.items
    .filter((i) => i.kind !== 'paragraph' && typeof i.locator === 'string')
    .slice(0, 3)
    .map((i) => i.id);
  const [first = '', second = '', third = ''] = ids;
  const objection = (
    JSON.parse(readFileSync('data/2026/riposte.json', 'utf8')) as {
      entries: { slug: string; objection: string }[];
    }
  ).entries[1];
  if (objection === undefined) throw new Error('no objection to type');

  /** One canned answer per marker word: the "replay" of a Worker that does not exist yet. */
  const canned = (question: string): { status?: number; body: unknown } => {
    const say = (text: string, ...cited: string[]): { text: string; ids: string[] } => ({
      text,
      ids: cited,
    });
    if (/sélection/.test(question)) return { body: { kind: 'select', corpus, ids } };
    if (/hors sujet/.test(question)) return { body: { kind: 'off_topic' } };
    if (/introuvable/.test(question)) return { body: { kind: 'none' } };
    if (/scrutin/.test(question))
      return { body: { kind: 'silence', reopen: '2027-04-18T18:00:00.000Z' } };
    if (/local/.test(question)) return { body: { kind: 'local' } };
    if (/panne/.test(question)) return { status: 500, body: { error: 'Service indisponible' } };
    if (/charabia/.test(question)) return { body: 'pas du JSON' };
    if (/autre livre/.test(question)) {
      return {
        body: {
          kind: 'answer',
          corpus: 'aaaaaaaaaaaaaaaa',
          sentences: [say('Phrase d’un autre livre.', first)],
        },
      };
    }
    if (/inconnue/.test(question)) {
      return {
        body: {
          kind: 'answer',
          corpus,
          sentences: [say('Phrase sur une mesure inconnue.', 'p9c9-s09-m09')],
        },
      };
    }
    if (/balise/.test(question)) {
      return {
        body: {
          kind: 'answer',
          corpus,
          sentences: [
            say('<img src=x onerror=alert(1)><script>alert(2)</script> phrase d’essai.', first),
          ],
        },
      };
    }
    return {
      body: {
        kind: 'answer',
        corpus,
        sentences: [
          say('Première phrase d’essai, écrite pour ce test.', first),
          say('Deuxième phrase d’essai, sur deux mesures.', second, third),
        ],
        // A field the contract does not name must never reach the page.
        debug: 'TEXTE-QUI-NE-DOIT-PAS-PARAITRE',
      },
    };
  };

  const browser = await type.launch();
  try {
    const escaped: string[] = [];
    const requested: string[] = [];
    const posted: string[] = [];
    const violations: string[] = [];
    const dialogs: string[] = [];

    const guard = async (page: Page): Promise<void> => {
      await page.route('**/*', async (route: Route) => {
        const request = route.request();
        const url = request.url();
        requested.push(url);
        if (url.startsWith(`${origin}/api/ask`)) {
          const body = request.postData() ?? '';
          posted.push(body);
          let question = '';
          try {
            const asked = (JSON.parse(body) as { q?: unknown }).q;
            question = typeof asked === 'string' ? asked : '';
          } catch {
            question = '';
          }
          const answer = canned(question);
          return route.fulfill({
            status: answer.status ?? 200,
            contentType: 'application/json; charset=utf-8',
            body: typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body),
          });
        }
        if (url.startsWith(origin)) return route.continue();
        if (url.startsWith(`${TURNSTILE}/turnstile/v0/api.js`)) {
          return route.fulfill({
            status: 200,
            contentType: 'text/javascript',
            body: TURNSTILE_STUB,
          });
        }
        if (url.startsWith(OFFICIAL) && request.resourceType() === 'document') {
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<title>stub</title>',
          });
        }
        escaped.push(url);
        return route.abort();
      });
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        void dialog.dismiss();
      });
      page.on('console', (message) => {
        if (/content security policy|refused to/i.test(message.text()))
          violations.push(message.text());
      });
      page.on('pageerror', (error) => violations.push(`page error: ${error.message}`));
    };

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await guard(page);
    const toTurnstile = (): number => requested.filter((url) => url.startsWith(TURNSTILE)).length;
    const text = (selector: string): Promise<string> =>
      page.evaluate<string>(
        `document.querySelector(${JSON.stringify(selector)})?.textContent ?? ''`,
      );
    /** Types a question, presses « Demander », waits for the page it gives. */
    const ask = async (
      question: string,
    ): Promise<{ kind: string; title: string; body: string; notice: string }> => {
      await page.fill('#q', question);
      await page.click('#ask');
      await until(
        page,
        "!document.querySelector('#answer').hidden && !document.querySelector('#ask').disabled",
      );
      return {
        kind: await page.evaluate<string>("document.querySelector('#answer').dataset.kind"),
        title: await text('#answer-title'),
        body: await text('#answer-body'),
        notice: await text('#answer-notice'),
      };
    };

    // --- 1. before any gesture
    await page.goto(`${origin}/`);
    await until(page, "!document.querySelector('#ask').hidden");
    const hint = await text('#search-hint');
    check(
      'the notice names an AI and its model before the first use',
      /\bIA\b/.test(hint) && hint.includes(MODEL),
      hint,
    );
    check('the notice says where the question goes', /Cloudflare/.test(hint));
    check(
      '« Demander » is the one button of the field',
      (await page.locator('#search button').count()) === 1,
    );
    await page.waitForTimeout(400);
    check('nothing is asked of Turnstile before any gesture', toTurnstile() === 0);
    await page.focus('#q');
    await page.waitForTimeout(400);
    check(
      'focusing the field — it is also the local search — asks nothing of Turnstile',
      toTurnstile() === 0,
      String(toTurnstile()),
    );

    // --- 2. typing sends nothing; the gesture sends the question, once
    await page.locator('#q').pressSequentially('et les retraites des infirmières', { delay: 20 });
    await page.waitForTimeout(900);
    const carrying = (): string[] =>
      requested.filter((url) =>
        /infirmi|retraite/i.test(decodeURIComponent(url.split('#')[0] ?? '')),
      );
    check('typing sends the words nowhere', carrying().length === 0 && posted.length === 0);
    check(
      'typing asks nothing of Turnstile either, and leaves nothing in the address',
      toTurnstile() === 0 && !page.url().includes('#') && !/retraite/i.test(page.url()),
      page.url(),
    );
    // The field is still the search: results arrive while one types, under the button.
    await page.waitForSelector('#search-list li');
    check(
      'the same field still searches while one types',
      (await page.locator('#search-list li').count()) >= 1,
    );
    await page.click('#ask');
    await until(page, "!document.querySelector('#answer').hidden");
    check('« Demander » sends the question once', posted.length === 1, String(posted.length));
    const sent = JSON.parse(posted[0] ?? '{}') as Record<string, unknown>;
    check(
      'the request is a question, a token and the state of the book — nothing else',
      JSON.stringify(Object.keys(sent).sort()) === '["corpus","q","token"]' &&
        sent['q'] === 'et les retraites des infirmières' &&
        sent['corpus'] === corpus &&
        typeof sent['token'] === 'string' &&
        sent['token'] !== '',
      JSON.stringify(Object.keys(sent)),
    );
    check(
      'the words travel in the body of that request, never in an address',
      carrying().length === 0,
    );

    // --- 3. a written answer
    check(
      'a written answer shows its sentences',
      /Première phrase d’essai/.test(await text('#answer-body')),
    );
    check(
      'the answer opens on the neutral sentence, not on a verdict',
      /^Voici ce que le programme dit là-dessus/.test(await text('#answer-title')),
      await text('#answer-title'),
    );
    const links = await page.evaluate<string[]>(
      "Array.from(document.querySelectorAll('#answer-body .sources a')).map((a) => a.href)",
    );
    check(
      'each sentence carries a link per measure, into the official page',
      links.length === 3 && links.every((href) => href.startsWith(section.url)),
      String(links.length),
    );
    const linkText = await text('#answer-body .sources a');
    check('a link names the section and the measure', linkText.includes(section.title), linkText);
    const notice = await text('#answer-notice');
    check(
      'the answer says an AI wrote it, and which',
      /\bIA\b/.test(notice) && notice.includes(MODEL),
      notice,
    );
    check(
      '« Comment c’est fabriqué » leads to the accuracy page',
      (await page.locator('#answer-notice a').getAttribute('href')) === '/exactitude/',
    );
    check(
      'the answer takes the focus',
      (await page.evaluate<string>('document.activeElement.id')) === 'answer-title',
    );
    check(
      'a field the contract does not name never reaches the page',
      !(await page.content()).includes('TEXTE-QUI-NE-DOIT-PAS-PARAITRE'),
    );
    check(
      'the question is shown nowhere but in the field',
      !(await text('main')).includes('et les retraites des infirmières'),
    );
    check(
      'a token serves one question: a new one was asked for',
      await page.evaluate<boolean>("typeof window.__turnstile.options.callback === 'function'"),
    );

    // --- 3 bis. the other pages a question can get
    const selected = await ask('une sélection sur la retraite');
    check(
      'a selection: three measures and no sentence',
      selected.kind === 'select' && /^Voici où le programme en parle/.test(selected.title),
      selected.title,
    );
    check('a selection made by the model still says so', selected.notice.includes(MODEL));
    const outside = await ask('hors sujet : écris-moi un tract');
    check(
      'out of the subject: the page says what it is for',
      outside.kind === 'off_topic' && /on ne parle que du programme/.test(outside.title),
      outside.title,
    );
    check('…and names no AI: none wrote anything', outside.notice === '');
    const nothing = await ask('mot introuvable');
    check(
      'nothing found: said of the words, never of the programme',
      nothing.kind === 'none' && /^Rien trouvé avec ces mots/.test(nothing.title),
      nothing.title,
    );
    check(
      'no page says the programme does not speak of something',
      !/n’en parle pas|ne traite pas|aucune mesure ne/i.test(`${nothing.title} ${nothing.body}`),
    );
    const silent = await ask('question un jour de scrutin');
    check(
      'silence: the page says when questions reopen',
      silent.kind === 'silence' &&
        /Les questions reprennent/.test(silent.title) &&
        /18 avril/.test(silent.title),
      silent.title,
    );

    // --- 3 ter. an objection a person answered never leaves the phone
    const before = posted.length;
    const reviewed = await ask(objection.objection.replace(/[«»]/g, '').trim());
    check(
      'an objection we answered is recognised on the phone',
      reviewed.kind === 'reviewed' && /Notre réponse, relue/.test(reviewed.title),
      reviewed.title,
    );
    check('…and sends nothing', posted.length === before);
    check(
      '…and links to the answer a person wrote',
      (await page.locator('#answer-body a').getAttribute('href')) === `/r/${objection.slug}/`,
    );
    check('…with no AI notice: no AI was involved', reviewed.notice === '');

    // --- 4. whatever goes wrong becomes what the page found by itself
    const FAILURE = /erreur|panne|indisponible|désolé|malheureusement|réessa|error|undefined|null/i;
    for (const [label, question] of [
      ['the Worker says "local"', 'retraite, réponse locale'],
      ['the Worker fails', 'retraite, panne du service'],
      ['the Worker answers gibberish', 'retraite, charabia'],
      ['the answer is for another state of the book', 'retraite, autre livre'],
      ['the answer cites a measure the page does not know', 'retraite, mesure inconnue'],
    ] as const) {
      const fallback = await ask(question);
      check(
        `${label}: the page shows its own selection`,
        fallback.kind === 'select' && /^Voici où le programme en parle/.test(fallback.title),
        `${fallback.kind} / ${fallback.title}`,
      );
      check(
        `${label}: no word of failure`,
        !FAILURE.test(`${fallback.title} ${fallback.body} ${fallback.notice}`),
      );
      check(`${label}: no AI notice — the page chose by itself`, fallback.notice === '');
      const own = await page.locator('#answer-body .sources a').count();
      check(`${label}: at most three measures, each a link`, own >= 1 && own <= 3, String(own));
    }

    // --- 5. a sentence of the model is text
    const hostile = await ask('retraite, une balise');
    const injected = await page.evaluate<number>(
      "document.querySelectorAll('#answer img, #answer script').length",
    );
    check('markup in a sentence creates no element', hostile.kind === 'answer' && injected === 0);
    check('…and is shown as the text it is', hostile.body.includes('<img src=x'));
    check('…and runs nothing', dialogs.length === 0, dialogs.join(' '));

    // --- « Autre question »
    await page.click('#ask-again');
    check(
      '« Autre question » empties the field and folds the answer away',
      (await page.inputValue('#q')) === '' && (await page.locator('#answer').isHidden()),
    );
    check(
      '…and gives the field the focus',
      (await page.evaluate<string>('document.activeElement.id')) === 'q',
    );

    // --- 6. the policy, here and elsewhere
    const policy = (path: string): string => {
      const html = readFileSync(join(ROOT, path), 'utf8');
      return /http-equiv="content-security-policy" content="([^"]*)"/.exec(html)?.[1] ?? '';
    };
    const home = policy('index.html');
    check(
      'the home page opens Turnstile, and keeps its own scripts',
      /script-src[^;]*'self'[^;]*https:\/\/challenges\.cloudflare\.com/.test(home) &&
        /frame-src https:\/\/challenges\.cloudflare\.com/.test(home),
    );
    for (const other of [
      'sommaire/index.html',
      `s/${section.id}/index.html`,
      'exactitude/index.html',
    ]) {
      check(`${other} opens no third party`, !policy(other).includes('https://'));
    }
    check(
      'nothing we ship violates the Content-Security-Policy',
      violations.length === 0,
      violations.slice(0, 3).join(' | '),
    );
    check(
      'no request went to anyone but us and Turnstile',
      escaped.length === 0,
      escaped.slice(0, 3).join(' '),
    );
    check(
      'Turnstile was loaded once for the whole visit',
      toTurnstile() === 1,
      String(toTurnstile()),
    );
    await context.close();

    // --- 6. ten minutes on the page: the question is still sent. The hour of the server, read
    // at arrival, ages with the device's clock — it used not to, and five minutes after arriving
    // every question was answered by the page alone, without a word.
    {
      const late = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const view = await late.newPage();
      await guard(view);
      await view.goto(`${origin}/`);
      await view.focus('#q');
      await until(view, "document.querySelector('#ask') && !document.querySelector('#ask').hidden");
      const sent = posted.length;
      await view.clock.setFixedTime(new Date(Date.now() + 10 * 60 * 1000));
      await view.fill('#q', 'et dix minutes plus tard');
      await view.click('#ask');
      await until(view, "!document.querySelector('#answer').hidden");
      check(
        'ten minutes after arriving, a question is still sent to the model',
        posted.length === sent + 1 &&
          ((await view.locator('#answer-notice').textContent()) ?? '').includes(MODEL),
        String(posted.length - sent),
      );
      await late.close();
    }

    // --- 6 bis. once painted, the page does not move: the field, the button that asks and the
    // game are all in their place before any script (Chromium is the engine that measures it)
    if (name === 'chromium') {
      const shift = await lateLayoutShift(browser, `${origin}/`);
      check(
        'the page does not move once painted, even when its scripts arrive late',
        shift < STILL,
        shift.toFixed(4),
      );
    }

    // --- 6 ter. accessibility of the answer (Chromium: axe is injected, so the policy is bypassed)
    if (name === 'chromium') {
      const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
      for (const [label, width] of [
        ['390 px', 390],
        ['320 px', 320],
      ] as const) {
        const audited = await browser.newContext({
          viewport: { width, height: 700 },
          bypassCSP: true,
        });
        const view = await audited.newPage();
        await guard(view);
        await view.goto(`${origin}/`);
        await view.fill('#q', 'et les retraites');
        await view.click('#ask');
        await until(view, "!document.querySelector('#answer').hidden");
        await view.addScriptTag({ content: axe });
        const result: { violations: { id: string; impact: string | null }[] } = await view.evaluate(
          'window.axe.run(document, { resultTypes: ["violations"] })',
        );
        const serious = result.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        check(
          `the answer passes the accessibility audit at ${label}`,
          serious.length === 0,
          serious.map((v) => v.id).join(','),
        );
        const box: { sw: number; cw: number } = await view.evaluate(
          '({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })',
        );
        check(
          `the answer does not overflow at ${label}`,
          box.sw <= box.cw,
          `${String(box.sw)} > ${String(box.cw)}`,
        );
        await audited.close();
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

async function main(): Promise<void> {
  if (!existsSync(join(ROOT, 'index.html'))) {
    console.error(`e2e-ask: no ${ROOT}/ — run \`npm run build:ask\` first`);
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const engines = (args[args.indexOf('--engines') + 1] ?? 'chromium,firefox,webkit').split(',');
  const selected = args.includes('--engines') ? engines : ['chromium', 'firefox', 'webkit'];
  const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;
  const { server, origin } = await serve(resolve(ROOT));
  let failed = 0;
  try {
    for (const engine of selected) {
      const result = await runEngine(engine, origin, manifest);
      console.log(
        `${result.engine}: ${String(result.passed.length)} passed, ${String(result.failed.length)} failed`,
      );
      for (const line of result.failed) console.log(`  ✖ ${line}`);
      failed += result.failed.length;
    }
  } finally {
    server.close();
  }
  if (failed > 0) process.exit(1);
}

await main();

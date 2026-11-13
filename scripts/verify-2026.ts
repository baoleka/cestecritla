/**
 * Second opinion, by real browsers: the stored pages are parsed again by Chromium, Firefox and
 * WebKit, and the deep links are followed for real.
 *
 *   npx tsx scripts/verify-2026.ts                   stored pages of the corpus' crawl, Chromium
 *   npx tsx scripts/verify-2026.ts --engines chromium,firefox,webkit
 *   npx tsx scripts/verify-2026.ts --sample 60       only 60 locators per engine (quick pass)
 *   npx tsx scripts/verify-2026.ts --write           also records the result in
 *                                                    data/2026/verification.json (/exactitude reads it)
 *   npx tsx scripts/verify-2026.ts --synthetic       the synthetic site of aec26-fixture.ts: no
 *                                                    private file needed, so CI can run it
 *   npx tsx scripts/verify-2026.ts --words --engines chromium,firefox,webkit --write
 *                                                    the words of the game only (lot J4): is each
 *                                                    one lit up in its own measure? Recorded in
 *                                                    data/2026/word-links.json, which the build
 *                                                    believes for that list and that book alone
 *
 * Two questions the Node parser cannot answer about itself:
 *
 *   1. Is the DOM it reads the DOM a visitor gets? node-html-parser is not a browser: a stray
 *      tag, an entity, an unclosed element can be repaired differently. Here the extraction is
 *      written a second time, in the page, with DOM APIs — and every hash must be the same.
 *   2. Does a link locator land? Each `#…:~:text=…` is opened; the browser must scroll to the
 *      very element the manifest points at. A locator that fails in an engine is listed by id.
 *
 *   3. Is a word of the game lit up where the game says it is written? A text directive
 *      matches the first place a page writes those letters. Each word is asked of the browser
 *      alone — it must scroll to the measure the word is pinned in, and nothing in the page may
 *      write it earlier — then with the locator of its measure, as the link will carry both.
 *
 * Not one request leaves the machine: every URL is answered from the stored files or aborted,
 * page scripts are off, service workers blocked. The count of aborted requests is printed.
 *
 * It prints identifiers and numbers. Never a sentence.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type BrowserType,
  type Page,
} from 'playwright';
import { gameSources, gameWords } from '../src/lib/game-data.js';
import { proveWords } from '../src/lib/game.js';
import {
  WORD_LINKS_PATH,
  WORD_LINK_ENGINES,
  encodeDirectiveText,
  wordsFingerprint,
  type WordLinksFile,
} from '../src/lib/word-links.js';
import { SITE_ORIGIN, normalizeText, sha256 } from './aec-common.js';
import type { Dataset } from './aec-types.js';
import { buildCorpus, flatItems } from './aec26-core.js';
import { syntheticSite } from './aec26-fixture.js';
import { buildManifest, licenseClause, manifestPropositions } from './aec26-publish.js';
import { CRAWL_ROOT, parseToc, type FetchLog } from './aec26-source.js';
import type { ExposurePolicy, Manifest, PrivateCorpus, PrivateItem } from './aec26-types.js';
import { PRIVATE_CORPUS_PATH, loadCrawl } from './ingest-2026.js';
import { cssCollapse, deepLink } from './locator.js';

const ENGINES: Record<string, BrowserType> = { chromium, firefox, webkit };
const VIEWPORT = { width: 800, height: 240 };

interface Site {
  label: string;
  corpus: PrivateCorpus;
  manifest: Manifest;
  pages: ReadonlyMap<string, string>;
  log: FetchLog;
}

function loadReal(): Site {
  const corpus = JSON.parse(readFileSync(PRIVATE_CORPUS_PATH, 'utf8')) as PrivateCorpus;
  const { pages, log } = loadCrawl(resolve(CRAWL_ROOT, corpus.meta.crawl_stamp));
  const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;
  if (manifest.meta.corpus_version !== corpus.meta.corpus_version) {
    throw new Error('the manifest was not published from this corpus: run publish-2026.ts');
  }
  return { label: `crawl ${corpus.meta.crawl_stamp}`, corpus, manifest, pages, log };
}

function loadSynthetic(): Site {
  const dataset = JSON.parse(readFileSync('data/aec-2025.json', 'utf8')) as Dataset;
  const site = syntheticSite(dataset);
  const landing = site.pages.get('landing') ?? '';
  const corpus = buildCorpus({
    toc: parseToc(landing),
    pages: site.pages,
    log: site.log,
    siteOrigin: SITE_ORIGIN,
  });
  const policy = JSON.parse(
    readFileSync('data/2026/exposure-policy.json', 'utf8'),
  ) as ExposurePolicy;
  const clause = licenseClause(site.pages.get('legal') ?? '');
  const { manifest } = buildManifest({
    corpus,
    pages: site.pages,
    policy: { ...policy, locator_scope: 'all' },
    quoted: new Set(),
    license: { statement_url: `${SITE_ORIGIN}/mentions-legales/`, statement_sha256: clause.sha256 },
  });
  return { label: 'synthetic site', corpus, manifest, pages: site.pages, log: site.log };
}

type Block = { anchor: string; title: string; items: [string, string][] };

/**
 * Runs in the page: the extraction written a second time, with DOM APIs only, independently of
 * the Node parser.
 *
 * Learning note — why this is a string and not a function. `page.evaluate(fn)` sends `fn`'s
 * source text to the browser. tsx compiles this file with esbuild, which wraps every named inner
 * function in a `__name(...)` helper that exists in Node and not in the page. Plain JavaScript in
 * a string is sent as written.
 */
const EXTRACT_IN_PAGE = `(() => {
  const own = (el) => {
    if (el === null) return '';
    let text = '';
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) text += node.nodeValue || '';
      else if (node.nodeType === 1 && node.tagName !== 'UL' && node.tagName !== 'OL') text += node.textContent;
    }
    return text;
  };
  const blocks = [];
  const prose = (root, anchor) => {
    if (root === null) return;
    const items = [];
    for (const el of Array.from(root.children)) {
      if (el.matches('h2.wp-block-heading')) items.push(['heading', own(el)]);
      else if (el.matches('p.wp-block-paragraph')) items.push(['paragraph', own(el)]);
      else items.push(['unknown:' + el.tagName, '']);
    }
    blocks.push({ anchor, title: '', items });
  };
  prose(document.querySelector('main.introduction > section'), '(introduction)');
  prose(document.querySelector('main.partie > section'), '(part)');
  prose(document.querySelector('main.chapitre > section.chapitre'), '(chapter)');
  for (const section of Array.from(document.querySelectorAll('main.chapitre > div.chapitre_sections > section'))) {
    const heading = section.querySelector(':scope > h3.section-title');
    const items = [];
    for (const el of Array.from(section.children)) {
      if (el === heading) continue;
      if (el.matches('p.wp-block-paragraph')) items.push(['paragraph', own(el)]);
      else if (el.matches('div.mesure-cle')) items.push(['key_measure', own(el.querySelector(':scope > p'))]);
      else if (el.matches('ul.wp-block-list')) {
        for (const li of Array.from(el.children)) {
          if (li.matches('li.mesure')) items.push(['measure', own(li)]);
          else for (const sub of Array.from(li.querySelectorAll(':scope > ul > li.sous_mesure'))) items.push(['sub_measure', own(sub)]);
        }
      } else items.push(['unknown:' + el.tagName, '']);
    }
    blocks.push({ anchor: heading ? heading.id : '', title: heading ? heading.textContent : '', items });
  }
  return blocks;
})()`;

interface Probe {
  found: boolean;
  top: number;
  bottom: number;
  scrollY: number;
  innerHeight: number;
}

/**
 * Runs in the page after a deep link was followed: where is proposition number `index` of the
 * section `anchor`, relative to the viewport, and how far did the page scroll?
 */
const PROBE_IN_PAGE = `((args) => {
  const heading = document.getElementById(args.anchor);
  const section = heading ? heading.parentElement : null;
  const targets = [];
  if (section !== null) {
    for (const el of Array.from(section.children)) {
      if (el.matches('div.mesure-cle')) {
        const p = el.querySelector(':scope > p');
        if (p !== null) targets.push(p);
      } else if (el.matches('ul.wp-block-list')) {
        for (const li of Array.from(el.children)) {
          if (li.matches('li.mesure')) targets.push(li);
          else targets.push(...Array.from(li.querySelectorAll(':scope > ul > li.sous_mesure')));
        }
      }
    }
  }
  const target = targets[args.index];
  const first = target ? target.firstChild : null;
  if (!target || first === null) {
    return { found: false, top: 0, bottom: 0, scrollY: window.scrollY, innerHeight: window.innerHeight };
  }
  // The first characters of the item: that is where a locator starts, whatever its length.
  const range = document.createRange();
  range.setStart(first, 0);
  range.setEnd(first, Math.min(12, (first.nodeValue || '').length));
  const rect = range.getBoundingClientRect();
  return { found: true, top: rect.top, bottom: rect.bottom, scrollY: window.scrollY, innerHeight: window.innerHeight };
})`;

export const VERIFICATION_PATH = 'data/2026/verification.json';

/** data/2026/verification.json — what the browsers found, as /exactitude publishes it. */
export interface VerificationFile {
  corpus_version: string;
  verified_on: string;
  /** Items re-extracted in each browser's DOM and compared by hash. */
  items: number;
  /** Deep links the manifest holds. */
  locators: number;
  engines: {
    name: string;
    version: string;
    hash_mismatches: number;
    links_followed: number;
    links_landed: number;
  }[];
}

interface EngineReport {
  engine: string;
  version: string;
  pagesChecked: number;
  itemsChecked: number;
  hashMismatches: string[];
  rawMismatches: string[];
  locatorsTried: number;
  locatorsFailed: string[];
  controlsFailed: string[];
  aborted: number;
}

/**
 * Waits for a text directive to move the page, then for the movement to end.
 *
 * Measured on 12/11/2026: with page scripts off, WebKit scrolls to a text fragment up to half a
 * second after `load` (Chromium and Firefox do it at once). A check that reads the position
 * immediately reports a working link as broken — hence a deadline rather than a fixed pause.
 */
async function settle(page: Page, deadlineMs = 2500): Promise<void> {
  const position = (): Promise<number> => page.evaluate<number>('window.scrollY');
  const started = Date.now();
  let y = await position();
  while (y === 0 && Date.now() - started < deadlineMs) {
    await page.waitForTimeout(40);
    y = await position();
  }
  for (let i = 0; i < 10; i += 1) {
    await page.waitForTimeout(30);
    const next = await position();
    if (next === y) return;
    y = next;
  }
}

/**
 * A browser context in which the stored pages are the web: every document of the crawl is
 * answered from its file, everything else is refused and counted. Page scripts are off.
 */
async function storedContext(
  browser: Browser,
  site: Site,
  onAbort: () => void,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    serviceWorkers: 'block',
    viewport: VIEWPORT,
  });
  const byUrl = new Map<string, string>();
  for (const page of site.log.pages) {
    const body = site.pages.get(page.id);
    if (body !== undefined) byUrl.set(page.url, body);
  }
  await context.route('**/*', async (route) => {
    const request = route.request();
    const body = byUrl.get(request.url().split('#')[0] ?? '');
    if (body !== undefined && request.resourceType() === 'document') {
      await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
    } else {
      onAbort();
      await route.abort();
    }
  });
  return context;
}

async function verifyEngine(
  site: Site,
  name: string,
  sample: number | null,
): Promise<EngineReport> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const browser: Browser = await type.launch();
  const report: EngineReport = {
    engine: name,
    version: browser.version(),
    pagesChecked: 0,
    itemsChecked: 0,
    hashMismatches: [],
    rawMismatches: [],
    locatorsTried: 0,
    locatorsFailed: [],
    controlsFailed: [],
    aborted: 0,
  };
  try {
    const context = await storedContext(browser, site, () => {
      report.aborted += 1;
    });
    const page = await context.newPage();

    // --- 1. the same extraction, in the page
    const compare = (
      id: string,
      expected: readonly PrivateItem[],
      got: readonly [string, string][],
    ): void => {
      if (expected.length !== got.length) {
        report.hashMismatches.push(
          `${id}: ${String(got.length)} item(s) in the DOM, ${String(expected.length)} in the corpus`,
        );
        return;
      }
      expected.forEach((item, index) => {
        const [kind, raw] = got[index] ?? ['', ''];
        report.itemsChecked += 1;
        if (kind !== item.kind || sha256(normalizeText(raw)) !== item.hash)
          report.hashMismatches.push(item.id);
        else if (cssCollapse(raw) !== cssCollapse(item.raw)) report.rawMismatches.push(item.id);
      });
    };
    const open = async (url: string): Promise<Block[]> => {
      await page.goto(url, { waitUntil: 'load' });
      report.pagesChecked += 1;
      return page.evaluate<Block[]>(EXTRACT_IN_PAGE);
    };
    const prose = (blocks: readonly Block[], anchor: string): [string, string][] =>
      blocks.find((b) => b.anchor === anchor)?.items ?? [];

    compare(
      'p0',
      site.corpus.introduction.items,
      prose(await open(site.corpus.introduction.url), '(introduction)'),
    );
    for (const part of site.corpus.parts) {
      compare(part.id, part.items, prose(await open(part.url), '(part)'));
    }
    for (const chapter of site.corpus.chapters) {
      const blocks = await open(chapter.url);
      compare(chapter.id, chapter.items, prose(blocks, '(chapter)'));
      const sections = site.corpus.sections.filter((s) => s.chapterId === chapter.id);
      const found = blocks.filter((b) => !b.anchor.startsWith('('));
      if (found.length !== sections.length) {
        report.hashMismatches.push(`${chapter.id}: ${String(found.length)} section(s) in the DOM`);
        continue;
      }
      sections.forEach((section, index) => {
        const block = found[index];
        if (block === undefined) return;
        if (block.anchor !== section.anchor || normalizeText(block.title) !== section.title) {
          report.hashMismatches.push(`${section.id}: anchor or title differs`);
        }
        compare(section.id, flatItems(section.items), block.items);
      });
    }

    // --- 2. the deep links, followed
    const jobs: { id: string; url: string; anchor: string; index: number; chapterUrl: string }[] =
      [];
    for (const section of site.manifest.sections) {
      const chapter = site.corpus.chapters.find((c) => c.id === section.chapterId);
      const props = section.items.filter((i) => i.kind !== 'paragraph');
      props.forEach((item, index) => {
        if (typeof item.locator !== 'string' || chapter === undefined) return;
        jobs.push({
          id: item.id,
          // Without the section anchor on purpose: the page must move because of the directive.
          url: `${chapter.url}#:~:${item.locator}`,
          anchor: section.anchor,
          index,
          chapterUrl: chapter.url,
        });
      });
    }
    const step = sample === null ? 1 : Math.max(1, Math.floor(jobs.length / sample));
    const chosen = jobs.filter((_, index) => index % step === 0);
    for (const job of chosen) {
      // A fresh document each time: a same-document navigation does not replay a text directive.
      await page.goto('about:blank');
      await page.goto(job.url, { waitUntil: 'load' });
      await settle(page);
      const probe = await page.evaluate<Probe>(
        `${PROBE_IN_PAGE}(${JSON.stringify({ anchor: job.anchor, index: job.index })})`,
      );
      report.locatorsTried += 1;
      const visible = probe.found && probe.top >= 0 && probe.bottom <= probe.innerHeight;
      if (!visible || probe.scrollY === 0) report.locatorsFailed.push(job.id);
    }

    // --- 3. controls: the test above must be able to fail
    const first = chosen[0];
    if (first !== undefined) {
      await page.goto('about:blank');
      await page.goto(`${first.chapterUrl}#:~:text=zzzz%20qqqq%20xxxx%20wwww`, {
        waitUntil: 'load',
      });
      await settle(page);
      if ((await page.evaluate<number>('window.scrollY')) !== 0) {
        report.controlsFailed.push('a directive that matches nothing still scrolled the page');
      }
      // The anchor alone must bring the section title to the top: the fallback every link has.
      const section = site.manifest.sections.find((s) => s.anchor === first.anchor);
      await page.goto('about:blank');
      await page.goto(deepLink(section?.url ?? first.chapterUrl, null), { waitUntil: 'load' });
      await settle(page);
      const top = await page.evaluate<number>(
        `(document.getElementById(${JSON.stringify(first.anchor)}) || document.body).getBoundingClientRect().top`,
      );
      // Sub-pixel scrolling can leave the title a fraction of a pixel above the edge.
      if (top < -2 || top > VIEWPORT.height) {
        report.controlsFailed.push(
          `the section anchor alone does not show its title (top = ${top.toFixed(1)} px)`,
        );
      }
    }
    await context.close();
  } finally {
    await browser.close();
  }
  return report;
}

// ---------------------------------------------------------------------------------------------
// The words of the game (lot J4)
// ---------------------------------------------------------------------------------------------

interface WordJob {
  id: string;
  word: string;
  chapterUrl: string;
  anchor: string;
  /** Position of the pinned proposition among those of its section, as PROBE_IN_PAGE counts. */
  index: number;
  locator: string;
}

interface WordProbe {
  /** The pinned proposition exists in the DOM. */
  found: boolean;
  /** Places where the pinned proposition writes the word, and how many are on the screen. */
  inTarget: number;
  inTargetOnScreen: number;
  /** Places where the rest of the page writes it that are on the screen too. */
  elsewhereOnScreen: number;
  scrollY: number;
}

/**
 * Runs in the page after `#:~:text=<word>` was followed: where did the browser go?
 *
 * It is the browser's own first match that a link will light up, and browsers do not match as
 * a reader would: measured on 13/11/2026, Chromium does not find « application » in
 * « l'application » — an elided word is one word to it. So the page is not asked where the
 * word is written first; it is asked what is on the screen once the browser has scrolled to
 * ITS first match. Every place the document writes the word is listed — accents and case
 * aside, between two characters that are not letters: more generously than any engine matches
 * — and the answer is yes when the places on the screen are all inside proposition `index` of
 * section `anchor`. Text a visitor's browser does not render is left out.
 */
const WORD_PROBE_IN_PAGE = `((args) => {
  const heading = document.getElementById(args.anchor);
  const section = heading ? heading.parentElement : null;
  const targets = [];
  if (section !== null) {
    for (const el of Array.from(section.children)) {
      if (el.matches('div.mesure-cle')) {
        const p = el.querySelector(':scope > p');
        if (p !== null) targets.push(p);
      } else if (el.matches('ul.wp-block-list')) {
        for (const li of Array.from(el.children)) {
          if (li.matches('li.mesure')) targets.push(li);
          else targets.push(...Array.from(li.querySelectorAll(':scope > ul > li.sous_mesure')));
        }
      }
    }
  }
  const target = targets[args.index] || null;
  const foldChar = (c) => c.normalize('NFD').replace(/\\p{M}+/gu, '').toLowerCase();
  const needle = Array.from(args.word).map(foldChar).join('');
  const letter = /[\\p{L}\\p{N}]/u;
  const out = { found: target !== null, inTarget: 0, inTargetOnScreen: 0, elsewhereOnScreen: 0, scrollY: window.scrollY };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent === null || parent.closest('script, style, template, noscript, [hidden]') !== null) continue;
    const raw = node.nodeValue || '';
    // The folded text, and for each of its characters the place it came from in the node.
    let folded = '';
    const origin = [];
    for (let i = 0; i < raw.length; i += 1) {
      const f = foldChar(raw[i]);
      for (let k = 0; k < f.length; k += 1) origin.push(i);
      folded += f;
    }
    for (let at = folded.indexOf(needle); at !== -1; at = folded.indexOf(needle, at + 1)) {
      const before = at === 0 ? '' : folded[at - 1];
      const after = folded[at + needle.length] || '';
      if (letter.test(before) || letter.test(after)) continue;
      const range = document.createRange();
      range.setStart(node, origin[at]);
      range.setEnd(node, origin[at + needle.length - 1] + 1);
      const rect = range.getBoundingClientRect();
      const onScreen = rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (target !== null && target.contains(node)) {
        out.inTarget += 1;
        if (onScreen) out.inTargetOnScreen += 1;
      } else if (onScreen) {
        out.elsewhereOnScreen += 1;
      }
    }
  }
  return out;
})`;

interface WordReport {
  engine: string;
  version: string;
  /** The word alone scrolls to its pinned measure, and the link with both directives lands. */
  lit: string[];
  /** The engine went to another place of the page: the word is matched there first. */
  elsewhereFirst: string[];
  /** The engine matched nothing (an elided word is one word to it), or the link broke. */
  notFollowed: string[];
  controlsFailed: string[];
  aborted: number;
}

/** Where each word is pinned, as a link the browsers can be asked to follow. */
function wordJobs(
  site: Site,
  words: readonly { id: string; word: string; pin: { id: string } }[],
): WordJob[] {
  const jobs: WordJob[] = [];
  for (const word of words) {
    const section = site.manifest.sections.find((s) => s.items.some((i) => i.id === word.pin.id));
    const chapter = site.corpus.chapters.find((c) => c.id === section?.chapterId);
    if (section === undefined || chapter === undefined) {
      throw new Error(`${word.id}: its measure ${word.pin.id} is not in the manifest`);
    }
    const props = section.items.filter((i) => i.kind !== 'paragraph');
    const index = props.findIndex((i) => i.id === word.pin.id);
    const locator = props[index]?.locator;
    if (index === -1 || typeof locator !== 'string') {
      throw new Error(`${word.id}: its measure ${word.pin.id} has no locator`);
    }
    jobs.push({
      id: word.id,
      word: word.word,
      chapterUrl: chapter.url,
      anchor: section.anchor,
      index,
      locator,
    });
  }
  return jobs;
}

/**
 * Words for the synthetic site, where there is no list: the longest word of one proposition in
 * every few, taken from the site's own text. Enough to show that the pass can say yes, can say
 * « written earlier », and that its control can fail.
 */
function syntheticWords(site: Site): { id: string; word: string; pin: { id: string } }[] {
  const out: { id: string; word: string; pin: { id: string } }[] = [];
  const located = new Set(
    manifestPropositions(site.manifest)
      .filter((i) => typeof i.locator === 'string')
      .map((i) => i.id),
  );
  for (const section of site.corpus.sections) {
    const item = flatItems(section.items).find((i) => located.has(i.id));
    if (item === undefined) continue;
    const longest = (normalizeText(item.raw).match(/\p{L}{7,}/gu) ?? []).sort(
      (a, b) => b.length - a.length,
    )[0];
    if (longest === undefined) continue;
    out.push({
      id: `s${String(out.length).padStart(3, '0')}`,
      word: longest.toLowerCase(),
      pin: { id: item.id },
    });
    if (out.length >= 24) break;
  }
  return out;
}

async function verifyWords(
  site: Site,
  name: string,
  jobs: readonly WordJob[],
): Promise<WordReport> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const browser: Browser = await type.launch();
  const report: WordReport = {
    engine: name,
    version: browser.version(),
    lit: [],
    elsewhereFirst: [],
    notFollowed: [],
    controlsFailed: [],
    aborted: 0,
  };
  try {
    const context = await storedContext(browser, site, () => {
      report.aborted += 1;
    });
    const page = await context.newPage();
    const follow = async (url: string): Promise<void> => {
      // A fresh document each time: a same-document navigation does not replay a directive.
      await page.goto('about:blank');
      await page.goto(url, { waitUntil: 'load' });
      await settle(page);
    };
    const wordProbe = (job: WordJob, index = job.index): Promise<WordProbe> =>
      page.evaluate<WordProbe>(
        `${WORD_PROBE_IN_PAGE}(${JSON.stringify({ anchor: job.anchor, index, word: job.word })})`,
      );
    const onScreen = (probe: { top: number; bottom: number; innerHeight: number }): boolean =>
      probe.top >= 0 && probe.bottom <= probe.innerHeight;

    for (const job of jobs) {
      const directive = `text=${encodeDirectiveText(job.word)}`;
      // The word alone: where the engine goes is its first match.
      await follow(`${job.chapterUrl}#:~:${directive}`);
      const alone = await wordProbe(job);
      if (!alone.found || alone.inTarget === 0) {
        throw new Error(`${job.id}: the word is not in the measure it is pinned in`);
      }
      if (alone.scrollY === 0) {
        report.notFollowed.push(job.id);
        continue;
      }
      // On the screen, the word stands in its measure and nowhere else: that is where it went.
      if (alone.inTargetOnScreen === 0 || alone.elsewhereOnScreen > 0) {
        report.elsewhereFirst.push(job.id);
        continue;
      }
      // The link as it will be written: the measure's locator first, then the word. The page
      // must still land on the start of the measure.
      await follow(`${job.chapterUrl}#:~:${job.locator}&${directive}`);
      const start = await page.evaluate<Probe>(
        `${PROBE_IN_PAGE}(${JSON.stringify({ anchor: job.anchor, index: job.index })})`,
      );
      if (!start.found || start.scrollY === 0 || !onScreen(start)) {
        report.notFollowed.push(job.id);
        continue;
      }
      report.lit.push(job.id);
    }

    // --- controls: this pass must be able to say no
    const witness = jobs.find((job) => report.lit.includes(job.id));
    if (witness === undefined) {
      report.controlsFailed.push('no word was lit: nothing shows that the pass can say yes');
    } else {
      // The same word, asked of the proposition next to its own: the engine did not go there.
      await follow(`${witness.chapterUrl}#:~:text=${encodeDirectiveText(witness.word)}`);
      const beside = await wordProbe(witness, witness.index === 0 ? 1 : witness.index - 1);
      if (beside.inTargetOnScreen > 0 && beside.elsewhereOnScreen === 0) {
        report.controlsFailed.push('a word was found lit in a proposition it is not pinned in');
      }
      // A word no page writes moves nothing.
      await follow(`${witness.chapterUrl}#:~:text=zzzzqqqqxxxx`);
      if ((await page.evaluate<number>('window.scrollY')) !== 0) {
        report.controlsFailed.push('a directive that matches nothing still scrolled the page');
      }
    }
    await context.close();
  } finally {
    await browser.close();
  }
  return report;
}

/** `--words`: the words of the game, in each engine asked for. Returns false when it failed. */
async function wordsMain(
  site: Site,
  engines: readonly string[],
  synthetic: boolean,
  write: boolean,
): Promise<boolean> {
  const file = synthetic ? null : gameWords();
  const words =
    file === null
      ? syntheticWords(site)
      : (() => {
          const { proven, problems } = proveWords(file, gameSources());
          if (problems.length > 0)
            throw new Error(`the list is not proven: ${problems.join('; ')}`);
          return proven;
        })();
  const jobs = wordJobs(site, words);
  console.log(`${site.label}: ${String(jobs.length)} word(s) of the game`);
  const list = (ids: readonly string[]): string =>
    ids.length === 0 ? '' : ` — ${ids.slice(0, 30).join(', ')}${ids.length > 30 ? ', …' : ''}`;
  const reports: WordReport[] = [];
  for (const engine of engines) {
    const r = await verifyWords(site, engine, jobs);
    reports.push(r);
    console.log(
      [
        `${r.engine} ${r.version}`,
        `  lit up in their own measure: ${String(r.lit.length)}${list(r.lit)}`,
        `  matched first somewhere else in the page: ${String(r.elsewhereFirst.length)}${list(r.elsewhereFirst)}`,
        `  matched nowhere by this engine, or a link that broke: ${String(r.notFollowed.length)}${list(r.notFollowed)}`,
        `  controls: ${r.controlsFailed.length === 0 ? 'ok' : r.controlsFailed.join('; ')}`,
        `  requests aborted (nothing left the machine): ${String(r.aborted)}`,
      ].join('\n'),
    );
  }
  if (reports.some((r) => r.controlsFailed.length > 0)) return false;
  // A highlight is published when every engine agrees; a word they disagree on keeps its link.
  const highlighted = jobs
    .map((job) => job.id)
    .filter((id) => reports.every((r) => r.lit.includes(id)));
  const measureOnly = jobs.map((job) => job.id).filter((id) => !highlighted.includes(id));
  console.log(
    `in every engine: ${String(highlighted.length)} lit, ${String(measureOnly.length)} keep the link to their measure alone${list(measureOnly)}`,
  );
  if (!write) return true;
  const missing = WORD_LINK_ENGINES.filter((name) => !engines.includes(name));
  if (file === null || missing.length > 0) {
    throw new Error(`--write needs the real pages and ${WORD_LINK_ENGINES.join(', ')}`);
  }
  const record: WordLinksFile = {
    corpus_version: site.corpus.meta.corpus_version,
    words_sha256: wordsFingerprint(file.words),
    verified_on: new Date().toISOString().slice(0, 10),
    engines: reports.map((r) => ({ name: r.engine, version: r.version })),
    highlighted,
    measure_only: measureOnly,
  };
  writeFileSync(WORD_LINKS_PATH, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`written: ${WORD_LINKS_PATH}`);
  return true;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const value = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const synthetic = args.includes('--synthetic');
  if (!synthetic && !existsSync(PRIVATE_CORPUS_PATH)) {
    throw new Error(`${PRIVATE_CORPUS_PATH} is missing: run ingest-2026.ts, or use --synthetic`);
  }
  const site = synthetic ? loadSynthetic() : loadReal();
  const engines = (value('--engines') ?? 'chromium').split(',');
  if (args.includes('--words')) {
    if (!(await wordsMain(site, engines, synthetic, args.includes('--write')))) process.exit(1);
    return;
  }
  const sampleArg = value('--sample');
  const sample = sampleArg === undefined ? null : Number(sampleArg);
  const located = manifestPropositions(site.manifest).filter(
    (i) => typeof i.locator === 'string',
  ).length;
  console.log(
    `${site.label}: ${String(site.corpus.meta.counts.propositions)} propositions, ${String(located)} locators`,
  );

  let failed = false;
  const record: VerificationFile = {
    corpus_version: site.corpus.meta.corpus_version,
    verified_on: new Date().toISOString().slice(0, 10),
    items: 0,
    locators: located,
    engines: [],
  };
  for (const engine of engines) {
    const r = await verifyEngine(site, engine, sample);
    record.items = r.itemsChecked;
    record.engines.push({
      name: r.engine,
      version: r.version,
      hash_mismatches: r.hashMismatches.length + r.rawMismatches.length,
      links_followed: r.locatorsTried,
      links_landed: r.locatorsTried - r.locatorsFailed.length,
    });
    const list = (ids: readonly string[]): string =>
      ids.length === 0 ? '' : ` — ${ids.slice(0, 20).join(', ')}${ids.length > 20 ? ', …' : ''}`;
    console.log(
      [
        `${r.engine} ${r.version}`,
        `  ${String(r.pagesChecked)} pages, ${String(r.itemsChecked)} items re-extracted in the DOM: ` +
          `${String(r.hashMismatches.length)} hash mismatch(es)${list(r.hashMismatches)}`,
        `  raw text differing from the Node parser: ${String(r.rawMismatches.length)}${list(r.rawMismatches)}`,
        `  ${String(r.locatorsTried)} deep links followed: ${String(r.locatorsFailed.length)} did not land${list(r.locatorsFailed)}`,
        `  controls: ${r.controlsFailed.length === 0 ? 'ok' : r.controlsFailed.join('; ')}`,
        `  requests aborted (nothing left the machine): ${String(r.aborted)}`,
      ].join('\n'),
    );
    if (
      r.hashMismatches.length +
        r.rawMismatches.length +
        r.locatorsFailed.length +
        r.controlsFailed.length >
      0
    ) {
      failed = true;
    }
  }
  if (failed) process.exit(1);
  if (args.includes('--write')) {
    // Only a complete, clean run on the real pages is worth publishing as a result.
    if (synthetic || sample !== null)
      throw new Error('--write needs the real pages and every link');
    writeFileSync(VERIFICATION_PATH, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`written: ${VERIFICATION_PATH}`);
  }
}

await main();

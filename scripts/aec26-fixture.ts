/**
 * A synthetic "official site": the MARKUP of the 2026 edition wrapped around the TEXT of the
 * 2025 edition.
 *
 * Why it exists. The 2026 text is all rights reserved and never enters this repository
 * (D15.6) — so no real page can be a test fixture, and CI has no corpus at all. The 2025 text is
 * CC BY-NC-SA 4.0 and already here (data/aec-2025.json). Pouring it into the 2026 markup gives
 * 837 real French propositions, with their real typography, to run the whole chain on — parser,
 * identifiers, locators, manifest, browser checks — without a single sentence of the new book.
 *
 * The markup reproduces what was observed on 12/11/2026, including its oddities: sub-measures in
 * a class-less sibling `<li>`, one chapter with its own introduction, sections whose paragraphs
 * and lists interleave, a table of contents repeated around the article.
 */
import { SITE_ORIGIN, pad2, sha256 } from './aec-common.js';
import type { Dataset } from './aec-types.js';
import { BOOK_PATH_2026, type FetchLog, type FetchedPage } from './aec26-source.js';
import type { Kind26 } from './aec26-types.js';

const NNBSP = String.fromCodePoint(0x202f);
const NBSP = String.fromCodePoint(0xa0);

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * French typography as the source prints it: a narrow no-break space before `; : ! ? »`, a
 * no-break space after `«`. `normalizeText` turns both back into the plain space of the corpus.
 */
export function typeset(text: string): string {
  return text.replace(/ ([;:!?»])/g, `${NNBSP}$1`).replace(/« /g, `«${NBSP}`);
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface ExpectedItem {
  id: string;
  kind: Kind26;
  /** Normalised text, as the 2025 corpus stores it. */
  text: string;
  /** Hash of that text in the 2025 corpus: the parser must find the same one. */
  hash: string;
}

export interface SyntheticSite {
  pages: Map<string, string>;
  log: FetchLog;
  /** Every item the generator laid out, in reading order. */
  expected: ExpectedItem[];
  /** Section id → official URL with anchor. */
  sectionUrls: Map<string, string>;
  counts: { parts: number; chapters: number; sections: number; propositions: number };
}

export interface SyntheticOptions {
  /** The number the "Découvrir" page announces; defaults to the true number of propositions. */
  officialCount?: number;
  /** Replaces the licence clause of the legal notice. */
  licenseClause?: string;
}

export const SYNTHETIC_CLAUSE =
  'Sauf mention contraire, les textes de ce site sont sous licence Creative Commons. Exception : ' +
  'les contenus du livre-programme sont © La France insoumise, tous droits réservés. Le partage ' +
  'de liens vers ces pages est autorisé (et encouragé).';

function shell(title: string, canonical: string, body: string, aside = ''): string {
  return [
    '<!doctype html>',
    '<html lang="fr"><head><meta charset="utf-8">',
    `<title>${esc(title)}</title>`,
    `<link rel="canonical" href="${canonical}">`,
    '<style>.mesure-cle { font-weight: 700 }</style>',
    '<script>window.notText = "Mesure clé — this is script, not page text";</script>',
    '</head><body>',
    '<header class="site"><nav class="menu"><a href="/">Accueil</a> <a href="/programme/livre/">Le programme</a></nav></header>',
    aside,
    body,
    '<footer class="site"><p>Site de démonstration : balisage de l’édition 2026, texte de l’édition 2025.</p></footer>',
    '</body></html>',
  ].join('\n');
}

const paragraph = (html: string): string => `<p class="wp-block-paragraph">${html}</p>`;

/** Builds the synthetic site from the 2025 dataset. Deterministic: same input, same bytes. */
export function syntheticSite(dataset: Dataset, options: SyntheticOptions = {}): SyntheticSite {
  const pages = new Map<string, string>();
  const urls = new Map<string, string>();
  const expected: ExpectedItem[] = [];
  const sectionUrls = new Map<string, string>();
  const book = `${SITE_ORIGIN}${BOOK_PATH_2026}`;
  const expect = (id: string, kind: Kind26, item: { text: string; hash: string }): void => {
    expected.push({ id, kind, text: item.text, hash: item.hash });
  };

  // --- introduction: short paragraphs stand in for the headings of the 2026 introduction
  let headings = 0;
  let paragraphs = 0;
  const introBody = dataset.introduction.paragraphs.map((p) => {
    if (p.text.length < 80) {
      headings += 1;
      expect(`p0-h${pad2(headings)}`, 'heading', p);
      return `<h2 class="wp-block-heading">${typeset(esc(p.text))}</h2>`;
    }
    paragraphs += 1;
    expect(`p0-p${pad2(paragraphs)}`, 'paragraph', p);
    return paragraph(p.html);
  });
  urls.set('p0', `${book}introduction/`);
  pages.set(
    'p0',
    shell(
      'Introduction',
      `${book}introduction/`,
      `<main class="introduction"><h1>Introduction</h1><section>\n${introBody.join('\n')}\n</section></main>`,
    ),
  );

  // --- parts, chapters, sections
  const landing: string[] = [
    `<div class="partie introduction"><h2><a href="${BOOK_PATH_2026}introduction/">Introduction</a></h2></div>`,
  ];
  let chapterCount = 0;
  let propositions = 0;
  const chapterIntro = dataset.introduction.paragraphs
    .filter((p) => p.text.length >= 80)
    .slice(0, 2);

  dataset.parts.forEach((part, partIndex) => {
    const partId = `p${String(partIndex + 1)}`;
    const partTitle = `Partie ${String(partIndex + 1)} – ${part.title}`;
    const partPath = `${BOOK_PATH_2026}${part.slug}/`;
    const partToc: string[] = [];
    const landingLinks: string[] = [];

    part.chapterIds.forEach((chapterId2025, chapterIndex) => {
      const source = dataset.chapters.find((c) => c.id === chapterId2025);
      if (source === undefined) throw new Error(`fixture: no chapter ${chapterId2025}`);
      const number = chapterIndex + 1;
      const chapterId = `${partId}c${String(number)}`;
      const title = `Chapitre ${String(number)} : ${source.title.replace(/^Chapitre \d+ : /, '')}`;
      const path = `${partPath}chapitre${String(number)}/`;
      chapterCount += 1;
      landingLinks.push(`<a href="${path}">${esc(title)}</a>`);
      partToc.push(`<a class="chapitre" href="${path}">${esc(title)}</a>`);

      // One chapter carries its own introduction, like the Europe chapter of the real book.
      const withIntro = partIndex === dataset.parts.length - 1 && chapterIndex === 0;
      const intro = withIntro
        ? `<section class="chapitre">\n${chapterIntro
            .map((p, index) => {
              expect(`${chapterId}-p${pad2(index + 1)}`, 'paragraph', p);
              return paragraph(p.html);
            })
            .join('\n')}\n</section>`
        : '';

      const aside: string[] = [];
      const sections = source.sectionIds.map((sectionId2025, sectionIndex) => {
        const section = dataset.sections.find((s) => s.id === sectionId2025);
        if (section === undefined) throw new Error(`fixture: no section ${sectionId2025}`);
        const sectionId = `${chapterId}-s${pad2(sectionIndex + 1)}`;
        const anchor = slugify(section.title);
        sectionUrls.set(sectionId, `${SITE_ORIGIN}${path}#${anchor}`);
        partToc.push(`<a href="${path}#${anchor}">${esc(section.title)}</a>`);
        aside.push(`<li><a href="#${anchor}">${esc(section.title)}</a></li>`);

        const out: string[] = [
          `<h3 class="section-title" id="${anchor}">${esc(section.title)}</h3>`,
        ];
        const n = { p: 0, k: 0, m: 0 };
        let list: string[] | null = null;
        const closeList = (): void => {
          if (list !== null) out.push(`<ul class="wp-block-list">\n${list.join('\n')}\n</ul>`);
          list = null;
        };
        for (const item of section.items) {
          if (item.kind === 'paragraph') {
            closeList();
            n.p += 1;
            expect(`${sectionId}-p${pad2(n.p)}`, 'paragraph', item);
            out.push(paragraph(item.html));
          } else if (item.kind === 'key_measure') {
            closeList();
            n.k += 1;
            propositions += 1;
            expect(`${sectionId}-k${pad2(n.k)}`, 'key_measure', item);
            out.push(
              `<div class="mesure-cle"><h6>Mesure clé</h6><p>${typeset(esc(item.text))}</p></div>`,
            );
          } else {
            n.m += 1;
            propositions += 1;
            const id = `${sectionId}-m${pad2(n.m)}`;
            expect(id, 'measure', item);
            list ??= [];
            list.push(`<li class="mesure">${typeset(esc(item.text))}</li>`);
            const subs = item.subMeasures ?? [];
            if (subs.length > 0) {
              // The source does not nest sub-measures in their measure: a class-less sibling <li>.
              list.push(
                `<li>\n<ul class="wp-block-list">\n${subs
                  .map((sub, index) => {
                    propositions += 1;
                    expect(`${id}.s${String(index + 1)}`, 'sub_measure', sub);
                    return `<li class="sous_mesure">${typeset(esc(sub.text))}</li>`;
                  })
                  .join('\n')}\n</ul>\n</li>`,
              );
            }
          }
        }
        closeList();
        return `<section>\n${out.join('\n')}\n</section>`;
      });

      urls.set(chapterId, `${SITE_ORIGIN}${path}`);
      pages.set(
        chapterId,
        shell(
          title,
          `${SITE_ORIGIN}${path}`,
          [
            `<main class="chapitre ${part.slug}">`,
            `<header><h2>${esc(partTitle)}</h2><h1 id="chapitre${String(number)}">${esc(title)}</h1></header>`,
            intro,
            `<div class="chapitre_sections">\n${sections.join('\n')}\n</div>`,
            '</main>',
          ]
            .filter((line) => line !== '')
            .join('\n'),
          `<aside class="sommaire"><ul>\n${aside.join('\n')}\n</ul></aside>`,
        ),
      );
    });

    landing.push(
      `<div class="partie ${part.slug}"><h2><a href="${partPath}">${esc(partTitle)}</a></h2>\n${landingLinks.join('\n')}\n</div>`,
    );
    const partBody = part.paragraphs.map((p, index) => {
      expect(`${partId}-p${pad2(index + 1)}`, 'paragraph', p);
      return paragraph(p.html);
    });
    const next = dataset.parts[partIndex + 1];
    urls.set(partId, `${SITE_ORIGIN}${partPath}`);
    pages.set(
      partId,
      shell(
        partTitle,
        `${SITE_ORIGIN}${partPath}`,
        [
          `<main class="partie ${part.slug}">`,
          `<h2>${esc(partTitle)}</h2>`,
          `<section>\n${partBody.join('\n')}\n</section>`,
          `<nav class="tdm">\n${partToc.join('\n')}\n</nav>`,
          next === undefined
            ? ''
            : `<a class="next" href="${BOOK_PATH_2026}${next.slug}/">Partie suivante</a>`,
          '</main>',
        ]
          .filter((line) => line !== '')
          .join('\n'),
      ),
    );
  });

  urls.set('landing', book);
  pages.set(
    'landing',
    shell(
      'Table des matières',
      book,
      `<main class="livre"><h1>Table des matières</h1><nav class="tdm">\n${landing.join('\n')}\n</nav></main>`,
    ),
  );

  const announced = (options.officialCount ?? propositions)
    .toLocaleString('fr-FR')
    .replace(/\s/g, NNBSP);
  urls.set('discover', `${SITE_ORIGIN}/programme/decouvrir/`);
  pages.set(
    'discover',
    shell(
      'Découvrir le programme',
      `${SITE_ORIGIN}/programme/decouvrir/`,
      `<main><p>Le programme est le fruit d’un travail collectif. Il compte ${announced} mesures concrètes.</p></main>`,
    ),
  );
  urls.set('legal', `${SITE_ORIGIN}/mentions-legales/`);
  pages.set(
    'legal',
    shell(
      'Mentions légales',
      `${SITE_ORIGIN}/mentions-legales/`,
      [
        '<div class="content">',
        '<h2 class="wp-block-heading">Éditeur</h2>',
        paragraph('Site de démonstration.'),
        '<h2 class="wp-block-heading">Licence</h2>',
        paragraph(esc(options.licenseClause ?? SYNTHETIC_CLAUSE)),
        '<h2 class="wp-block-heading">Données personnelles</h2>',
        paragraph('Aucune.'),
        '</div>',
      ].join('\n'),
    ),
  );

  const fetched: FetchedPage[] = [...pages].map(([id, body]) => ({
    id,
    url: urls.get(id) ?? '',
    file: `${id}.html`,
    status: 200,
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: sha256(body),
    fetched_at: '2026-01-01T00:00:00.000Z',
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  }));
  return {
    pages,
    log: {
      stamp: '20260101T000000Z',
      started_at: '2026-01-01T00:00:00.000Z',
      finished_at: '2026-01-01T00:00:01.000Z',
      user_agent: 'fixture',
      requests: fetched.length,
      retries: 0,
      pages: fetched,
    },
    expected,
    sectionUrls,
    counts: {
      parts: dataset.parts.length,
      chapters: chapterCount,
      sections: dataset.sections.length,
      propositions,
    },
  };
}

/** The same site with one page rewritten — for the tests that break something on purpose. */
export function withPage(
  site: SyntheticSite,
  id: string,
  rewrite: (html: string) => string,
): SyntheticSite {
  const before = site.pages.get(id);
  if (before === undefined) throw new Error(`fixture: no page ${id}`);
  const after = rewrite(before);
  if (after === before) throw new Error(`fixture: the rewrite of ${id} changed nothing`);
  const pages = new Map(site.pages);
  pages.set(id, after);
  return { ...site, pages };
}

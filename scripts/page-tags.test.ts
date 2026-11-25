/**
 * The reader of a built page's tags (scripts/page-tags.ts): every way a review found to fetch a
 * third party, or to name a field, past the patterns of the build checks (review 17, Q6, Q12,
 * Q27) is read here for what it is.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { cssUrls, fetchedBy, resolvedFrom, stylesOf, tagsOf, tokensOf } from './page-tags.js';

const away = (page: string, html: string): string[] => {
  const urls = [...tagsOf(html).flatMap(fetchedBy), ...stylesOf(html).flatMap(cssUrls)];
  return urls.filter((value) => {
    const url = resolvedFrom(page, value);
    return url !== null && url.origin !== 'https://page.invalid';
  });
};

void test('every way of fetching another origin is read, however it is written', () => {
  for (const vector of [
    '<script src="//evil.example/x.js"></script>',
    "<script src='https://evil.example/x.js'></script>",
    '<script src=https://evil.example/x.js></script>',
    '<script src = "https://evil.example/x.js"></script>',
    '<SCRIPT SRC="HTTPS://evil.example/x.js"></SCRIPT>',
    '<link rel="preconnect" href="https://evil.example">',
    '<link rel="dns-prefetch" href="//evil.example">',
    '<link rel="modulepreload" href="//evil.example/m.js">',
    '<link rel="alternate stylesheet" href="https://evil.example/s.css">',
    '<link rel="icon" href="https://evil.example/i.png">',
    '<img srcset="/a.png 1x, https://evil.example/b.png 2x">',
    '<picture><source srcset="https://evil.example/c.webp"></picture>',
    '<video poster="https://evil.example/p.jpg"></video>',
    '<video><track src="https://evil.example/t.vtt"></video>',
    '<embed src="https://evil.example/e.swf">',
    '<object data="https://evil.example/o"></object>',
    '<input type="image" src="https://evil.example/i.png">',
    '<svg><image href="https://evil.example/s.png"></image></svg>',
    '<svg><image xlink:href="https://evil.example/s.png"></image></svg>',
    '<svg><use href="https://evil.example/s.svg#a"></use></svg>',
    '<a href="/ok/" ping="https://evil.example/ping">x</a>',
    '<base href="https://evil.example/">',
    '<style>@import "https://evil.example/s.css";</style>',
    '<style>.a{background:url(//evil.example/b.png)}</style>',
    '<p style="background-image:url(\'https://evil.example/c.png\')">x</p>',
    '<img title="1 > 0" src="https://evil.example/d.png">',
    '<script data-rel="me" src="https://evil.example/x.js"></script>',
  ]) {
    assert.equal(away('a-propos/index.html', vector).length, 1, vector);
  }
});

void test('what our pages name is not a fetch: their own files, links, data, a canonical address', () => {
  for (const vector of [
    '<script type="module" src="/_astro/x.js"></script>',
    '<link rel="preload" href="/fonts/f.woff2" as="font" crossorigin>',
    '<link rel="canonical" href="https://cestecritla.fr/a-propos/">',
    '<link rel="alternate" hreflang="fr" href="https://cestecritla.fr/">',
    '<a href="https://melenchon2027.fr/programme/" rel="noopener noreferrer">x</a>',
    '<img src="data:image/png;base64,AAAA" alt="">',
    '<a href="#haut">x</a>',
    '<style>.f{background:url(/og/x.png)}</style>',
    '<script>if (a < b && c > d) { location.href = "https://evil.example/" }</script>',
    '<meta property="og:image" content="https://cestecritla.fr/og/cestecritla-v1.png">',
  ]) {
    assert.deepEqual(away('a-propos/index.html', vector), [], vector);
  }
});

void test('a tag is read whole: a quoted « > », a value without quotes, an entity, a name in capitals', () => {
  const read = tagsOf('<input aria-label="a > b" NAME =q value=&quot;x&amp;y&quot;>');
  assert.equal(read.length, 1);
  const input = read[0] ?? { name: '', attrs: new Map<string, string>() };
  assert.equal(input.name, 'input');
  assert.equal(input.attrs.get('name'), 'q');
  assert.equal(input.attrs.get('aria-label'), 'a > b');
  assert.equal(input.attrs.get('value'), '"x&y"');
  // Text of a script is not markup: a tag written in it is no tag of the page.
  assert.deepEqual(
    tagsOf('<script>const s = "<img src=x>";</script><p>').map((tag) => tag.name),
    ['script', 'p'],
  );
  assert.deepEqual(tokensOf(' Noopener  NOREFERRER '), ['noopener', 'noreferrer']);
});

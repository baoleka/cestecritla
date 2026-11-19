/**
 * The sentences of the game (D19.2, D19.5, D19.6; src/lib/game-gists.ts): which builds may put
 * one on a card, and what the file that holds them must be.
 *
 * Two halves. The rules, on INVENTED sentences about an invented list — no word here is of any
 * programme. Then the file itself, data/2026/game-gists.json, wherever it is on disk: it is
 * written by `npm run gists -- --game` on the machine that holds the deposit, and tracked only
 * once the editor has agreed to publish it — so a checkout made before that has none, and the
 * second half says so and skips.
 *
 * What a public test CAN hold about sentences it cannot check against the book: each is pinned
 * to the measure of a word of the game, as the manifest publishes that measure today; each is
 * one line the sheet's own reader would show; each says itself whose plan it is (« Le programme
 * prévoit… »); the ones that hold a term the sheet treats as sensitive were read and are named;
 * and none shows in a build that may not show them. Fidelity to the text is checked where the
 * text is: the export refuses anything the deposit's own gates refuse (scripts/seed-ask-2026.ts).
 *
 * Run: npx tsx --test scripts/game-gists.test.ts
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { lexiconOf } from '../src/lib/chat-local.js';
import { buildGame, gameSources, gameWords } from '../src/lib/game-data.js';
import {
  GAME_GISTS_PATH,
  campaignDecided,
  depositOf,
  gameGists,
  gameGistsFingerprint,
  gameGistsNotReady,
  gameGistsOf,
  gameGistsSilence,
  readGameGists,
  type GameGist,
  type GameGistsDecision,
  type GameGistsFile,
} from '../src/lib/game-gists.js';
import { terms } from '../src/lib/search-core.js';
import { wordLists } from '../src/lib/word-lists.js';
import { wordsFingerprint } from '../src/lib/word-links.js';
import { CAMPAIGN_FROM, campaignAllows } from '../src/worker/chat.js';
import { gameGistsFrom, type GistRow } from './gists-core.js';

// ---------------------------------------------------------------------------------------------
// The rules, on invented sentences
// ---------------------------------------------------------------------------------------------

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);
const WORDS = [
  { slot: 0, id: 'w000', word: 'lampe', pin: { id: 'p1c1-s01-m01', sha256: A } },
  { slot: 1, id: 'w001', word: 'banc', pin: { id: 'p1c1-s01-m02', sha256: B } },
  { slot: 2, id: 'w002', word: 'pont', pin: { id: 'p2c1-s01-m01.s2', sha256: C } },
];
const row = (id: string, sha: string, text: string, lead?: string): GistRow => ({
  id,
  text,
  read_on: '2026-01-01',
  measure_sha256: sha,
  ...(lead === undefined ? {} : { lead_sha256: lead }),
});
const ROWS = [
  row('p9c9-s09-m09', A, 'Une phrase inventée que personne ne demande.'),
  row('p2c1-s01-m01.s2', C, 'Une phrase inventée sur un pont inventé.', A),
  row('p1c1-s01-m01', A, 'Une phrase inventée sur une lampe inventée.'),
];
const GISTS: GameGist[] = [
  { id: 'p1c1-s01-m01', sha256: A, text: 'Une phrase inventée sur une lampe inventée.' },
  {
    id: 'p2c1-s01-m01.s2',
    sha256: C,
    lead_sha256: A,
    text: 'Une phrase inventée sur un pont inventé.',
  },
];
/**
 * A file sealed on what it says: `over` changes a claim BEFORE the seal (a file honestly made
 * for another book, list or deposit); `after` retypes one under the seal (a tampered file).
 */
const sealed = (
  gists: GameGist[],
  over: Partial<GameGistsFile['meta']> = {},
  after: Partial<GameGistsFile['meta']> = {},
): GameGistsFile => {
  const claims = {
    corpus_version: 'c0ffeec0ffeec0ff',
    words_sha256: wordsFingerprint(WORDS),
    deposit_sha256: 'd'.repeat(64),
    written_by: 'session',
    read_by_a_person: false,
    ...over,
  };
  const sha256 = gameGistsFingerprint(claims, gists);
  return {
    meta: {
      title: 'invented',
      ...claims,
      sha256,
      validated: { on: '2026-12-01', by: 'editor', sha256 },
      note_fr: '',
      ...over,
      ...after,
    },
    gists,
  };
};
const CONTEXT = { corpus: 'c0ffeec0ffeec0ff', words: WORDS, deposit: 'd'.repeat(64) };
const SERVED = { campaign: { serve: true, decided_on: '2026-11-15', decided_by: 'editor' } };

void test('the sentences of the game are those of the deposit, for the measures of its words — and nothing else', () => {
  const draft = gameGistsFrom(ROWS, WORDS);
  // In the order of the list; the sentence nobody asked for stays where it is.
  assert.deepEqual(draft.gists, GISTS);
  // « banc »: its measure has no sentence in the deposit — its card keeps its link.
  assert.deepEqual(draft.without, ['w001']);
  assert.deepEqual(draft.moved, []);
  // Not a character changes on the way.
  for (const gist of draft.gists) {
    assert.equal(gist.text, ROWS.find((r) => r.id === gist.id)?.text);
  }
  // A sentence read against another state of its measure is left out, and named.
  const moved = gameGistsFrom([row('p1c1-s01-m01', B, 'Une phrase inventée.')], WORDS);
  assert.deepEqual([moved.gists, moved.moved], [[], ['w000']]);
  // Two words on one measure would not make two sentences.
  const twice = gameGistsFrom(ROWS, [
    ...WORDS,
    { slot: 3, id: 'w003', word: 'four', pin: { id: 'p1c1-s01-m01', sha256: A } },
  ]);
  assert.equal(twice.gists.filter((gist) => gist.id === 'p1c1-s01-m01').length, 1);
  assert.deepEqual(gameGistsFrom([], WORDS).gists, []);
});

void test('a file is fit only as it was sealed, on this book, this list and this deposit', () => {
  assert.deepEqual(gameGistsNotReady(sealed(GISTS), CONTEXT), []);
  // Fewer sentences than words is a file like another: a card without one keeps its link.
  assert.deepEqual(gameGistsNotReady(sealed(GISTS.slice(0, 1)), CONTEXT), []);
  assert.deepEqual(gameGistsNotReady(sealed([]), CONTEXT), []);

  const cases: [GameGistsFile, typeof CONTEXT, RegExp][] = [
    [sealed(GISTS, { corpus_version: 'another' }), CONTEXT, /another state of the book/],
    [sealed(GISTS, { words_sha256: 'another' }), CONTEXT, /list of words changed/],
    [sealed(GISTS), { ...CONTEXT, deposit: 'e'.repeat(64) }, /not those of the deposit/],
    [sealed(GISTS), { ...CONTEXT, deposit: null as unknown as string }, /not those of the deposit/],
    [sealed(GISTS, { written_by: 'editor' }), CONTEXT, /who wrote the sentences/],
    [sealed(GISTS, { read_by_a_person: true as unknown as false }), CONTEXT, /no person read them/],
    [
      sealed([{ id: 'p9c9-s09-m09', sha256: A, text: 'Une phrase inventée.' }]),
      CONTEXT,
      /p9c9-s09-m09: a sentence on no measure of the game/,
    ],
    [
      sealed([{ id: 'p1c1-s01-m01', sha256: B, text: 'Une phrase inventée.' }]),
      CONTEXT,
      /p1c1-s01-m01: its measure moved/,
    ],
    [sealed([...GISTS, ...GISTS.slice(0, 1)]), CONTEXT, /two sentences for one measure/],
    // A claim retyped under the seal — the deposit, after a new one: no longer the file agreed.
    [
      sealed(GISTS, {}, { deposit_sha256: 'e'.repeat(64) }),
      { ...CONTEXT, deposit: 'e'.repeat(64) },
      /changed after it was sealed/,
    ],
    [sealed(GISTS, {}, { link_only: ['w001'] }), CONTEXT, /changed after it was sealed/],
    [
      sealed([{ id: 'p1c1-s01-m01', sha256: A, text: 'Deux\nlignes inventées.' }]),
      CONTEXT,
      /not one line a card can hold/,
    ],
    [
      sealed([{ id: 'p1c1-s01-m01', sha256: A, text: 'x'.repeat(301) }]),
      CONTEXT,
      /not one line a card can hold/,
    ],
    [sealed([{ id: 'p1c1-s01-m01', sha256: A, text: '   ' }]), CONTEXT, /not one line/],
    // A sentence edited after the file was sealed: its fingerprint no longer says so.
    [
      {
        ...sealed(GISTS),
        gists: [{ id: 'p1c1-s01-m01', sha256: A, text: 'Une autre phrase inventée.' }],
      },
      CONTEXT,
      /changed after it was sealed/,
    ],
    [
      sealed(GISTS, { validated: { on: null, by: null, sha256: null } }),
      CONTEXT,
      /editor has not agreed to publish/,
    ],
    [
      sealed(GISTS, { validated: { on: 'bientôt', by: 'editor', sha256: null } }),
      CONTEXT,
      /editor has not agreed to publish/,
    ],
    // A session cannot agree for him.
    [
      sealed(GISTS, {
        validated: { on: '2026-12-01', by: 'session' as unknown as 'editor', sha256: null },
      }),
      CONTEXT,
      /editor has not agreed to publish/,
    ],
    [
      sealed(GISTS, { validated: { on: '2026-12-01', by: 'editor', sha256: 'older' } }),
      CONTEXT,
      /changed after the editor agreed/,
    ],
  ];
  for (const [file, context, reason] of cases) {
    assert.match(gameGistsNotReady(file, context).join(' · '), reason);
  }
  // A test build pretends his agreement, and nothing else.
  const unsigned = sealed(GISTS, { validated: { on: null, by: null, sha256: null } });
  assert.deepEqual(gameGistsNotReady(unsigned, { ...CONTEXT, test: true }), []);
  assert.match(
    gameGistsNotReady(sealed(GISTS, { corpus_version: 'another' }), {
      ...CONTEXT,
      test: true,
    })[0] ?? '',
    /another state of the book/,
  );
});

void test('the game asks for the editor’s decision on the campaign at all times — the Worker’s rule, without its clock', () => {
  const decided = { serve: true, decided_on: '2026-11-15', decided_by: 'editor' };
  const firstHour = new Date(CAMPAIGN_FROM);
  const cases: unknown[] = [
    null,
    {},
    { campaign: null },
    { campaign: decided },
    { campaign: { ...decided, serve: false } },
    { campaign: { ...decided, serve: 'true' } },
    { campaign: { ...decided, decided_by: 'session' } },
    { campaign: { ...decided, decided_by: null } },
    { campaign: { ...decided, decided_on: null } },
    { campaign: { ...decided, decided_on: 'bientôt' } },
    { campaign: { ...decided, decided_on: '2026-13-45' } },
    { campaign: { serve: null, decided_on: null, decided_by: null } },
  ];
  for (const config of cases) {
    // On the first hour of the campaign months the two rules say the same thing…
    assert.equal(
      campaignDecided(config),
      campaignAllows(config, firstHour),
      JSON.stringify(config),
    );
  }
  // …and before it the game is the stricter one: a file cannot stop itself on a date.
  assert.equal(campaignAllows({}, new Date('2026-11-18T12:00:00Z')), true);
  assert.equal(campaignDecided({}), false);
  assert.equal(campaignDecided({ campaign: decided }), true);
});

void test('a build shows the sentences only where the site asks, the campaign is decided and the file is fit', () => {
  const file = sealed(GISTS);
  const open = { mode: 'chat' as const, ask: SERVED, file, context: CONTEXT };
  assert.deepEqual(
    [...(gameGistsOf(open) ?? [])],
    GISTS.map((gist) => [gist.id, gist.text]),
  );
  // « Demander » cut: the cards go back to their titles — and name no AI (D19.5).
  assert.equal(gameGistsOf({ ...open, mode: 'off' }), null);
  // The editor takes his decision back: the next build shows none.
  assert.equal(gameGistsOf({ ...open, ask: {} }), null);
  assert.equal(
    gameGistsOf({ ...open, ask: { campaign: { ...SERVED.campaign, serve: false } } }),
    null,
  );
  // No file (a checkout made before his go), or a file that is not fit: none either.
  assert.equal(gameGistsOf({ ...open, file: null }), null);
  assert.equal(gameGistsOf({ ...open, file: sealed(GISTS, { corpus_version: 'another' }) }), null);
  const unsigned = sealed(GISTS, { validated: { on: null, by: null, sha256: null } });
  assert.equal(gameGistsOf({ ...open, file: unsigned }), null);
  assert.ok(gameGistsOf({ ...open, file: unsigned, context: { ...CONTEXT, test: true } }) !== null);
  // A build does not fail on a file it will not show: it keeps every card at its link alone,
  // and says why to whoever deploys — the same rule, in words, never a second one.
  assert.deepEqual(gameGistsSilence(open), []);
  const silences: [Partial<GameGistsDecision>, RegExp][] = [
    [{ mode: 'off' }, /does not answer questions/],
    [{ file: null }, /is not on this machine/],
    [{ ask: {} }, /decision on the campaign/],
    [{ file: unsigned }, /validated/],
    [{ file: sealed(GISTS, {}, { link_only: ['w001'] }) }, /changed after it was sealed/],
  ];
  for (const [change, why] of silences) {
    const decision: GameGistsDecision = { ...open, ...change };
    assert.equal(gameGistsOf(decision), null);
    assert.match(gameGistsSilence(decision).join('\n'), why);
  }
  // What the deposit is, as data/2026/ask.json says it.
  assert.equal(depositOf({ gists: { sha256: 'abc' } }), 'abc');
  for (const none of [null, {}, { gists: null }, { gists: { sha256: 7 } }]) {
    assert.equal(depositOf(none), null);
  }
});

void test('the file of the game carries a sentence only where there is one — and is unchanged without any', () => {
  const file = gameWords();
  const sources = gameSources();
  const plain = buildGame(file, sources, null);
  // No sentence: the file a build held before they existed, to the byte — same fingerprint.
  assert.equal(buildGame(file, sources, null, null).fingerprint, plain.fingerprint);
  assert.equal(buildGame(file, sources, null, new Map()).fingerprint, plain.fingerprint);
  assert.ok(plain.data.words.every((word) => !('gist' in word)));
  // One sentence, on the measure of one word: that word carries it, and no other.
  const first = file.words[0];
  if (first === undefined) throw new Error('the list holds no word');
  const one = buildGame(file, sources, null, new Map([[first.pin.id, 'Une phrase inventée.']]));
  assert.notEqual(one.fingerprint, plain.fingerprint);
  assert.deepEqual(
    one.data.words.filter((word) => 'gist' in word).map((word) => [word.id, word.gist]),
    [[first.id, 'Une phrase inventée.']],
  );
  // A sentence on a measure no word is pinned to reaches no card.
  const stray = buildGame(file, sources, null, new Map([['p9c9-s09-m09', 'Une phrase inventée.']]));
  assert.equal(stray.fingerprint, plain.fingerprint);
});

// ---------------------------------------------------------------------------------------------
// The file, where it is
// ---------------------------------------------------------------------------------------------

/**
 * Sentences that hold a term the sheet of « Demander » treats as sensitive
 * (data/2026/sensitive.json, read as src/lib/chat-local.ts reads a question) — each READ, and
 * kept on purpose. Those lists were made to judge a question, where a word like « illégal »
 * next to a name is a charge; in a sentence of ours about a measure the same word is usually
 * plain. So nothing is refused by rule: a sentence the lists flag must be named here with what
 * it says of whom — or its card keeps its link alone (`--link-only`). The list is exact: it
 * fails when a flagged sentence is not in it AND when an entry is no longer flagged.
 */
const KEPT_ON_READING: Readonly<Record<string, string>> = {
  'p4c1-s02-m06': 'water cut-offs the law forbids: a fact of law, nobody is accused',
  'p4c3-s01-m04': 'prices the sentence says the PROGRAMME finds abusive: its judgement, attributed',
  'p3c1-s06-m03': 'a temperature, at work',
};

const onDisk = existsSync(GAME_GISTS_PATH);

/** A text as a list of bare words: case, accents kept, every sign and space dropped. */
const bareWords = (text: string): string[] =>
  text
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '');
/**
 * Twelve words in a row — or the whole sentence, when it is shorter: a third of a sentence of
 * ours, more than a turn of phrase. (Eight was too few: one sentence shares eight words in a
 * row — a list of nouns — with the archive of the 2025 edition, which is tracked, public and
 * not ours to edit. The control that refuses a sentence copying the book reads the 2026 text,
 * on the machine that holds it: scripts/leak.test.ts.)
 */
const WINDOW = 12;
const windowsOf = (words: readonly string[], size = Math.min(WINDOW, words.length)): string[] =>
  size === 0
    ? []
    : Array.from({ length: words.length - size + 1 }, (_, at) =>
        words.slice(at, at + size).join(' '),
      );

/**
 * The sentences of the game are published by ONE gesture, the editor's: the push of their file
 * (D19.2, lot 9). Until then nothing tracked may carry one — a note, a test report, a copy of
 * what a reviewer was shown would publish it first, in a repository that is public (security
 * review of 19/11/2026: captures and copies made for the personas were staged, and left the
 * index). Read here on the machine that holds the file; a text is searched by windows of twelve
 * words, so a sentence cut, re-wrapped or quoted in part is found. Images cannot be read:
 * a capture of a card stays under private/ until the same gesture.
 */
void test(
  'data/2026/game-gists.json: until the editor has agreed to publish it, no tracked file holds one of its sentences',
  { skip: !onDisk && `${GAME_GISTS_PATH} is not on this machine yet (the editor's go, lot 9)` },
  () => {
    const file = readGameGists();
    if (file === null) throw new Error('no file');
    const windows = new Map<string, string>();
    for (const gist of file.gists) {
      for (const window of windowsOf(bareWords(gist.text))) windows.set(window, gist.id);
    }
    assert.ok(windows.size > 0, 'no sentence is long enough to be searched for');
    // Every window size the sentences were cut in: twelve words, and fewer for a short one.
    const sizes = [...new Set([...windows.keys()].map((window) => window.split(' ').length))];
    const found = (text: string): string[] => {
      const hits = new Set<string>();
      const words = bareWords(text);
      for (const size of sizes) {
        if (words.length < size) continue;
        for (const window of windowsOf(words, size)) {
          const id = windows.get(window);
          if (id !== undefined) hits.add(id);
        }
      }
      return [...hits];
    };
    // The gate can fail: a sentence of the file, re-wrapped and quoted, is found.
    const sample = file.gists[0]?.text ?? '';
    assert.deepEqual(found(`> « ${sample.replace(/ /g, '\n  ')} »`), [file.gists[0]?.id]);
    if (file.meta.validated.by === 'editor') return; // published by his gesture: nothing to hold
    const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter((path) => path !== '' && existsSync(path));
    assert.ok(!tracked.includes(GAME_GISTS_PATH), `${GAME_GISTS_PATH} is tracked before his word`);
    const findings: string[] = [];
    for (const path of tracked) {
      if (/\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|zip|gz|br|wasm)$/i.test(path))
        continue;
      if (statSync(path).size > 4 * 1024 * 1024) continue;
      const hits = found(readFileSync(path, 'utf8'));
      if (hits.length > 0) findings.push(`${path}: ${hits.join(', ')}`);
    }
    assert.deepEqual(findings, [], 'a tracked file carries a sentence of the game');
  },
);

void test(
  'data/2026/game-gists.json: pinned as the words pin their measures, sealed, and ours',
  { skip: !onDisk && `${GAME_GISTS_PATH} is not on this machine yet (the editor's go, lot 9)` },
  () => {
    const file = readGameGists();
    if (file === null) throw new Error('no file');
    const words = gameWords().words;
    const sources = gameSources();
    const corpus = sources.manifest.meta.corpus_version;
    const ask: unknown = JSON.parse(readFileSync('data/2026/ask.json', 'utf8'));
    // Fit, his agreement apart: this book, this list, the deposit the site serves.
    assert.deepEqual(
      gameGistsNotReady(file, { corpus, words, deposit: depositOf(ask), test: true }),
      [],
    );
    // Pinned to the manifest itself: the measure of each sentence is a measure of the book as
    // published today — and, for a sub-measure, under the measure it details.
    const items = new Map(
      sources.manifest.sections.flatMap((section) =>
        section.items.map((item) => [item.id, item] as const),
      ),
    );
    for (const gist of file.gists) {
      const item = items.get(gist.id) as { sha256: string; parent?: string } | undefined;
      assert.ok(item !== undefined, `${gist.id} is no item of the manifest`);
      assert.equal(gist.sha256, item.sha256, `${gist.id}: not the measure as published`);
      if (gist.lead_sha256 !== undefined) {
        const lead = items.get(item.parent ?? '') as { sha256: string } | undefined;
        assert.equal(gist.lead_sha256, lead?.sha256, `${gist.id}: not under its measure`);
      }
    }
    // One per word at most, in the order of the list; a word left to its link is named.
    const order = words.map((word) => word.pin.id);
    assert.deepEqual(
      file.gists.map((gist) => gist.id),
      order.filter((id) => file.gists.some((gist) => gist.id === id)),
    );
    const linkOnly = file.meta.link_only ?? [];
    for (const id of linkOnly) {
      const word = words.find((entry) => entry.id === id);
      assert.ok(word !== undefined, `${id} is no word of the game`);
      assert.ok(!file.gists.some((gist) => gist.id === word.pin.id), `${id} has a sentence`);
    }
    assert.equal(file.gists.length, words.length - linkOnly.length);
    // Each sentence says itself whose plan it is, in one sentence of plain text.
    for (const gist of file.gists) {
      assert.match(gist.text, /^Le programme prévoit[ ,]/, `${gist.id}: does not say whose plan`);
      assert.ok(!/[<>{}]|https?:|www\./.test(gist.text), `${gist.id}: markup or an address`);
      assert.match(gist.text, /[.!?…]$/, `${gist.id}: not a finished sentence`);
    }
  },
);

void test(
  'data/2026/game-gists.json: every sentence the sensitive lists flag was read, and is named',
  { skip: !onDisk && `${GAME_GISTS_PATH} is not on this machine yet` },
  () => {
    const file = readGameGists();
    if (file === null) throw new Error('no file');
    const lexicon = lexiconOf(wordLists(), () => []);
    const flagged = file.gists
      .filter((gist) =>
        terms(gist.text).some((term) => lexicon.sensitive(term) || lexicon.kin(term)),
      )
      .map((gist) => gist.id)
      .sort();
    assert.deepEqual(flagged, Object.keys(KEPT_ON_READING).sort());
  },
);

void test(
  'data/2026/game-gists.json: a build that may be deployed shows it only on the editor’s dated word',
  { skip: !onDisk && `${GAME_GISTS_PATH} is not on this machine yet` },
  () => {
    const file = readGameGists();
    if (file === null) throw new Error('no file');
    const words = gameWords().words;
    const corpus = gameSources().manifest.meta.corpus_version;
    const shown = gameGists(words, corpus, { mode: 'chat', test: false });
    const { on, by, sha256 } = file.meta.validated;
    if (by !== 'editor') {
      // Written on this machine, not agreed yet: no deployable build shows a sentence.
      assert.equal(shown, null);
      assert.deepEqual([on, by, sha256], [null, null, null]);
      return;
    }
    // His agreement is written where decisions are, on its day, as his — a session never
    // writes « editor » from nothing — and it was given on these very sentences: the row
    // names the seal of the file it agreed to. (Words alone were not enough: « phrases »,
    // « jeu » and « DÉCISION (utilisateur) » are in the rows that DECIDED the feature, on
    // 18/11/2026, days before any file was shown to him — found by the security review of
    // 19/11/2026.)
    assert.equal(sha256, file.meta.sha256);
    const seal = file.meta.sha256.slice(0, 12);
    const rows = readFileSync('docs/discovery/decisions.md', 'utf8').split('\n');
    assert.ok(
      rows.some(
        (line) =>
          /^\| D\d+\.\d+ \|/.test(line) &&
          line.includes(`| ${String(on)} |`) &&
          line.includes(seal) &&
          /DÉCISION \(utilisateur\)/.test(line),
      ),
      `docs/discovery/decisions.md: no decision of the editor on ${String(on)} that names the file he agreed to (${seal}…)`,
    );
    assert.ok(shown !== null && shown.size === file.gists.length);
    // Cutting « Demander » cuts them too, whatever the file says (D19.5).
    assert.equal(gameGists(words, corpus, { mode: 'off', test: false }), null);
  },
);

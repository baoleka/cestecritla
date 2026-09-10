/**
 * Repository hygiene gate (D12.3, D9.17, H-CNF-17c, H-LAN-14).
 *
 * The dépôt is a publication: it passes the same review as the screens. This gate refuses a
 * personal filesystem path, a third party's personal address, or the editor's real name in a
 * tracked file.
 *
 * Three things this gate had to get right, and the dossier says why:
 *
 *   1. NOT the bare pattern `/home/`. Written that way the gate is red on day one and disabled
 *      on day two. Measured before the 10/9 sanitisation, a personal home path appeared in 7
 *      tracked files, all under docs/discovery/, every one of them writing the pattern in
 *      order to describe this gate. Those literals are now templates (`/home/<user>`), because
 *      documenting a gate must not publish what the gate hides -- the allowlist below is what
 *      remains, as a belt-and-braces for future prose. (The prompt proposed
 *      `/home/[A-Za-z0-9._-]+/` with a trailing slash; measured, that matches nothing at all,
 *      so the slash is dropped.)
 *
 *   2. The app's own contact address is allowed. `contact@cestecritla.fr` is decided, public and
 *      meant to be published; it stays a placeholder in design/strings.json so the RENDERED kit
 *      does not hardcode it, which is a different concern from this one.
 *
 *   3. Known debt is enumerated, not whitelisted by wildcard. The two fixtures still carry a
 *      third party's address (H-LAN-14, priority 1, to leave the repo with the captures). The
 *      gate stays green while that list is exact, and fails BOTH when something outside it
 *      matches AND when an entry stops matching -- so the list cannot rot into a permanent
 *      exemption.
 *
 * The editor's real name cannot be written here, for the obvious reason. It is read from an
 * untracked `.gate-forbidden` file, one literal per line, when present.
 *
 * Run: npx tsx --test scripts/check-repo.test.ts
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const tracked = (): string[] =>
  execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f !== '');

/** Files that legitimately write a forbidden pattern in order to document this gate. */
const DOCUMENTS_THE_GATE = (path: string): boolean => path.startsWith('docs/discovery/');

/**
 * Addresses that are safe in a public tree: the app's own published contact, the pseudonymous
 * git identity, and `.invalid` placeholders — a TLD RFC 2606 reserves so that it can never
 * resolve, which is why the ingestion fixtures use it in place of the third party's address.
 */
const ALLOWED_EMAILS = [
  /contact@cestecritla\.fr/i,
  /@users\.noreply\.github\.com/i,
  /@[A-Za-z0-9.-]*\.invalid$/i,
];

/**
 * H-LAN-14, priority 1, ~1 h, before J-3: these leave the repository together with the seven
 * third-party identity captures, replaced by captures-tiers.manifest.json (SHA-256 only).
 * Until then the debt is named here rather than hidden behind a wildcard.
 */
const KNOWN_DEBT_THIRD_PARTY_ADDRESS: readonly string[] = [
  // Emptied on 10/9/2026 when H-LAN-14 was executed. The three third-party page captures left
  // the repository with the seven identity captures (see captures-tiers.manifest.json), and the
  // two ingestion fixtures had the address replaced by contact@example.invalid -- the parser
  // reads sections and measures, never an address, so the fixtures keep working unchanged.
  // The list stays here, and the test below stays green only while it is exact: an entry that
  // stops matching is a failure, so this cannot silently become a permanent exemption.
];

const THIRD_PARTY_ADDRESS = /[A-Za-z0-9._%+-]+@franceinsoumise\.org/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/gi;
const HOME_PATH = /\/home\/[A-Za-z0-9._-]+/g;

const isText = (path: string): boolean => {
  if (/\.(png|jpe?g|gif|webp|woff2?|ttf|otf|ico|pdf|zip|wasm)$/i.test(path)) return false;
  try {
    return statSync(path).size < 8 * 1024 * 1024;
  } catch {
    return false;
  }
};

const read = (path: string): string => readFileSync(path, 'utf8');

void test('no tracked file carries a personal filesystem path', () => {
  const offenders: string[] = [];
  for (const path of tracked()) {
    if (DOCUMENTS_THE_GATE(path) || !isText(path)) continue;
    const hits = read(path).match(HOME_PATH);
    if (hits !== null) offenders.push(`${path}: ${[...new Set(hits)].join(', ')}`);
  }
  assert.deepEqual(offenders, [], `personal paths in tracked files:\n${offenders.join('\n')}`);
});

void test('no tracked file carries an e-mail address that is not meant to be public', () => {
  const offenders: string[] = [];
  for (const path of tracked()) {
    if (DOCUMENTS_THE_GATE(path) || !isText(path)) continue;
    if (KNOWN_DEBT_THIRD_PARTY_ADDRESS.includes(path)) continue;
    for (const hit of new Set(read(path).match(EMAIL) ?? [])) {
      if (ALLOWED_EMAILS.some((re) => re.test(hit))) continue;
      offenders.push(`${path}: ${hit}`);
    }
  }
  assert.deepEqual(offenders, [], `unexpected addresses:\n${offenders.join('\n')}`);
});

void test('the H-LAN-14 debt list is exact — no entry has silently become obsolete', () => {
  const stale: string[] = [];
  for (const path of KNOWN_DEBT_THIRD_PARTY_ADDRESS) {
    if (!existsSync(path)) continue; // already removed: that is the goal, not a failure
    if (!THIRD_PARTY_ADDRESS.test(read(path))) stale.push(path);
  }
  assert.deepEqual(
    stale,
    [],
    `these files no longer carry the address and must leave the debt list:\n${stale.join('\n')}`,
  );
});

void test('the editor real name is absent from tracked files', () => {
  // Untracked by design: writing the name here would be the very leak this test forbids.
  if (!existsSync('.gate-forbidden')) {
    console.log('  (skipped: no .gate-forbidden file — see the header of this test)');
    return;
  }
  const literals = read('.gate-forbidden')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
  const offenders: string[] = [];
  for (const path of tracked()) {
    if (DOCUMENTS_THE_GATE(path) || !isText(path)) continue;
    const body = read(path).toLowerCase();
    for (const literal of literals) {
      if (body.includes(literal.toLowerCase())) offenders.push(`${path}: <forbidden literal>`);
    }
  }
  assert.deepEqual(offenders, [], `forbidden literals in tracked files:\n${offenders.join('\n')}`);
});

void test('third-party captures are accounted for (H-LAN-14)', () => {
  const manifest = 'docs/discovery/captures/captures-tiers.manifest.json';
  const png = (dir: string): string[] =>
    tracked().filter((p) => p.includes(`/${dir}/`) && /\.(png|jpe?g)$/i.test(p));

  // Two distinct classes, and the dossier only ever counted the first.
  //   identite/  : the seven ban-list objects themselves -- LFI logo, M27 wordmark, the official
  //                turtle, a crowd photograph with identifiable people. H-LAN-14, priority 1.
  //   prior-art/ : twenty screenshots of competitor sites. Third-party page reproductions too,
  //                lower risk, and counted nowhere in the dossier. Measured here, not assumed.
  const identity = png('identite');
  const priorArt = png('prior-art');

  if (existsSync(manifest)) {
    assert.deepEqual(identity, [], 'identity captures must be replaced by their SHA-256');
    return;
  }
  assert.equal(identity.length, 7, 'H-LAN-14 counts seven identity captures; re-measure if not');
  console.log(
    `  (H-LAN-14 debt: ${String(identity.length)} identity captures + ${String(priorArt.length)} ` +
      `prior-art screenshots still tracked, no manifest yet — P0)`,
  );
});

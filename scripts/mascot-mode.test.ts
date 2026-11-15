/**
 * Which mascot a host serves (D17.14; docs/discovery/PLAN-TORTUE.md §11): the rule, the file,
 * the build that reads it, and the launch gate that reads the validation of the generation a
 * host is given.
 *
 * What these gates are for: the second generation is drawn, tried on the preview host and
 * redrawn while production keeps serving the turtle validated on 13 November 2026 — and stays
 * deployable the whole time, for a correction of anything else.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { mascotSite } from '../src/lib/mascot-config.js';
import { generationFor } from '../src/lib/mascot-mode.js';
import { MASCOT_PATH } from './build-mode.js';
import {
  LAUNCH_PATH,
  STRINGS_PATH,
  TOKEN_SETS,
  TURTLE_CSS_PATH,
  TURTLE_SVG_PATH,
  TURTLE_VALIDATION_PATH,
  mascotBlockers,
  privacyMascotStringsHash,
  privacyStringsHash,
  turtleFingerprint,
} from './launch.js';
import {
  MASCOT2_CSS_PATH,
  MASCOT2_PALETTE_PATH,
  MASCOT2_SVG_PATH,
  MASCOT2_VALIDATION_PATH,
  mascot2Fingerprint,
} from './mascot2-kit.js';

void test('the rule: production is behind or level, never ahead; anything unreadable is the first', () => {
  const said = (file: unknown): [number, number] => [
    generationFor(file, 'apex'),
    generationFor(file, 'preview'),
  ];
  assert.deepEqual(said({ generation: 1, preview_generation: 1 }), [1, 1]);
  // The preview host is ahead: production does not move.
  assert.deepEqual(said({ generation: 1, preview_generation: 2 }), [1, 2]);
  // Production serves her: the preview does too, whatever its own line says.
  assert.deepEqual(said({ generation: 2, preview_generation: 1 }), [2, 2]);
  assert.deepEqual(said({ generation: 2 }), [2, 2]);
  // Total: a file that is not one never opens anything, and never throws.
  for (const broken of [
    null,
    undefined,
    'v2',
    2,
    [],
    [2],
    {},
    { generation: '2' },
    { generation: 3 },
  ]) {
    assert.deepEqual(said(broken), [1, 1], JSON.stringify(broken));
  }
  assert.deepEqual(said({ preview_generation: '2' }), [1, 1]);
});

void test('the committed file: production serves the turtle, and nobody has decided otherwise', () => {
  const file = JSON.parse(readFileSync(MASCOT_PATH, 'utf8')) as Record<string, unknown>;
  assert.deepEqual(Object.keys(file), [
    'generation',
    'preview_generation',
    'decided_on',
    'decided_by',
    'note_fr',
  ]);
  for (const key of ['generation', 'preview_generation']) {
    assert.ok(file[key] === 1 || file[key] === 2, `${key}: ${String(file[key])}`);
  }
  // Serving her in production is the editor's decision, and his alone (CLAUDE.md): the file
  // says 2 there only with his word, dated.
  if (file['generation'] === 2) {
    assert.equal(file['decided_by'], 'editor');
    assert.match(String(file['decided_on']), /^\d{4}-\d{2}-\d{2}$/);
  } else {
    assert.equal(file['decided_by'], null, 'nobody decides for production before the editor');
    assert.equal(file['decided_on'], null);
  }
  // Whatever it says, production as committed is deployable: its mascot is validated.
  const launch = JSON.parse(readFileSync(LAUNCH_PATH, 'utf8')) as { apex: string };
  if (launch.apex === 'app') assert.deepEqual(mascotBlockers('.', 'apex'), []);
});

void test('a build reads the file for its host — and a test build does not read it at all', () => {
  const before = { ...process.env };
  const committed = JSON.parse(readFileSync(MASCOT_PATH, 'utf8')) as unknown;
  try {
    // A build that is deployed: the file, for the host it is made for (scripts/build.ts).
    process.env['CEL_GAME_TEST'] = '';
    process.env['CEL_MASCOT_TEST'] = '2';
    process.env['CEL_HOST'] = '';
    assert.equal(mascotSite().generation, generationFor(committed, 'apex'));
    process.env['CEL_HOST'] = 'preview';
    assert.equal(mascotSite().generation, generationFor(committed, 'preview'));
    // A variable left in a shell opens nothing: only a test build listens to it.
    process.env['CEL_HOST'] = '';
    assert.equal(mascotSite().generation, generationFor(committed, 'apex'));
    // A test build: either generation, on demand, whatever the file says.
    process.env['CEL_GAME_TEST'] = '1';
    assert.equal(mascotSite().generation, 2);
    process.env['CEL_MASCOT_TEST'] = '1';
    assert.equal(mascotSite().generation, 1);
    process.env['CEL_MASCOT_TEST'] = '';
    assert.equal(mascotSite().generation, 1);
    process.env['CEL_MASCOT_TEST'] = 'two';
    assert.equal(mascotSite().generation, 1);
  } finally {
    // Left as it was found: a variable this test set must not reach another test.
    for (const key of ['CEL_GAME_TEST', 'CEL_MASCOT_TEST', 'CEL_HOST']) {
      const value = before[key];
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  }
  // The build script sets the variable on every run, so that none is ever inherited…
  const build = readFileSync('scripts/build.ts', 'utf8');
  assert.match(build, /CEL_MASCOT_TEST: mascotTest \?\? ''/);
  assert.match(build, /--mascot is for a test build/);
  // …and the pages get one constant the bundler can fold, like the game's.
  const config = readFileSync('astro.config.ts', 'utf8');
  assert.match(config, /const mascot2 = !holding && mascotSite\(\)\.generation === 2;/);
  assert.match(config, /__CEL_MASCOT2__: JSON\.stringify\(mascot2\)/);
});

/** A temporary tree of files, by path. */
function tree(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), 'cel-mascot-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(
      join(root, path),
      typeof content === 'string' ? content : JSON.stringify(content),
    );
  }
  return root;
}

void test('the launch gate reads the validation of the generation a host is given', () => {
  const tokens = {
    color: { violet: { $value: '#4C0297' } },
    'color-role': { light: { bg: '#fff', 'turtle-line': '{color.violet}' } },
  };
  const palette = {
    note_fr: '',
    chosen: 'only',
    palettes: {
      only: {
        label_fr: '',
        light: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'],
        dark: ['#AAAAAA', '#BBBBBB', '#CCCCCC', '#DDDDDD', '#EEEEEE', '#FFFFFF'],
      },
    },
    neutral: {
      label_fr: '',
      light: ['#111112', '#222223', '#333334', '#444445', '#555556', '#666667'],
      dark: ['#AAAAAB', '#BBBBBC', '#CCCCCD', '#DDDDDE', '#EEEEEF', '#FFFFFE'],
    },
  };
  // The kit of a site: a page of privacy, and the one line she adds to it.
  const kit = { 'privacy.lead': 'Rien ne part.', 'privacy.game.field.tint': 'sa couleur' };
  const root = tree({
    [STRINGS_PATH]: kit,
    [TURTLE_SVG_PATH]: '<svg xmlns="http://www.w3.org/2000/svg"/>',
    [TURTLE_CSS_PATH]: '.turtle { display: block; }',
    [MASCOT2_SVG_PATH]: '<svg xmlns="http://www.w3.org/2000/svg" class="mascot"/>',
    [MASCOT2_CSS_PATH]: '.mascot { display: block; }',
    [MASCOT2_PALETTE_PATH]: palette,
    [TOKEN_SETS[0]]: tokens,
  });
  const write = (path: string, content: unknown): void => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(content));
  };
  const dated = (fingerprint: string | null) => ({
    validated_on: '2026-12-03',
    drawing_sha256: fingerprint,
    same_character_asked_on: '2026-12-03',
    same_character_sha256: fingerprint,
  });
  const blockers = (host: 'apex' | 'preview'): string => mascotBlockers(root, host).join('\n');

  // No file at all: the first generation, and her record is the one that is read.
  assert.match(blockers('apex'), /^the turtle is not drawn or not validated/);
  write(TURTLE_VALIDATION_PATH, dated(turtleFingerprint(root)));
  assert.equal(blockers('apex'), '');
  assert.equal(blockers('preview'), '');

  // The preview host ahead: production still stands on the turtle's record. Of the host where
  // she is tried, one thing is asked and one only — not her sheet, not the editor's decision:
  // the line of the privacy page about what she writes on a phone, re-read as it stands.
  write(MASCOT_PATH, { generation: 1, preview_generation: 2, decided_on: null, decided_by: null });
  assert.equal(blockers('apex'), '');
  assert.match(
    blockers('preview'),
    /^data\/launch\.json: the line of the privacy page about the colour given to the mascot is not re-read as it stands: privacy_mascot \(D17\.3\)$/,
  );
  const reread = (more: Record<string, unknown> = {}): void => {
    write(LAUNCH_PATH, {
      privacy_mascot: {
        reviewed_on: '2026-12-02',
        reviewed_by: 'session',
        sha256: privacyMascotStringsHash(kit),
        ...more,
      },
    });
  };
  reread();
  assert.equal(blockers('preview'), '');
  // A date nobody signs is not a reading; a line changed since is not the line that was read.
  reread({ reviewed_by: null });
  assert.match(blockers('preview'), /nothing says who re-read it .* privacy_mascot\.reviewed_by$/);
  reread({ sha256: privacyMascotStringsHash({ ...kit, 'privacy.game.field.tint': 'sa teinte' }) });
  assert.match(blockers('preview'), /not re-read as it stands: privacy_mascot/);
  reread();
  assert.equal(blockers('preview'), '');
  // That line is read apart: it is not in the fingerprint of the page production serves today.
  assert.equal(privacyStringsHash(kit), privacyStringsHash({ 'privacy.lead': 'Rien ne part.' }));
  assert.notEqual(privacyMascotStringsHash(kit), privacyMascotStringsHash({}));
  // …and the turtle's own record still counts there: retouch her, and production is held.
  writeFileSync(join(root, TURTLE_CSS_PATH), '.turtle { display: inline; }');
  assert.match(blockers('apex'), /tortue|turtle|drawing changed after the sheet was validated/);
  writeFileSync(join(root, TURTLE_CSS_PATH), '.turtle { display: block; }');
  assert.equal(blockers('apex'), '');

  // Production switched with nothing behind it: her sheet, the question, the editor's word.
  write(MASCOT_PATH, { generation: 2, preview_generation: 2, decided_on: null, decided_by: null });
  assert.match(blockers('apex'), /second-generation mascot is not drawn or not validated/);
  assert.match(blockers('apex'), /is the editor's decision, dated/);
  write(MASCOT2_VALIDATION_PATH, {
    validated_on: null,
    drawing_sha256: null,
    same_character_asked_on: null,
    same_character_sha256: null,
  });
  assert.match(blockers('apex'), /the sheet is not dated by the editor: validated_on/);
  assert.match(blockers('apex'), /"same character\?" has not been asked/);
  // The turtle's record no longer speaks for production: the second generation's does.
  assert.doesNotMatch(blockers('apex'), /design\/mascot\/validation\.json/);

  const hers = mascot2Fingerprint(root);
  assert.ok(hers !== null && hers !== turtleFingerprint(root));
  write(MASCOT2_VALIDATION_PATH, dated(hers));
  // Validated — and still not decided: a session cannot write that word for him.
  assert.match(blockers('apex'), /^data\/mascot\.json: serving the second generation.*D17\.14\)$/);
  write(MASCOT_PATH, { generation: 2, decided_on: '2026-12-04', decided_by: 'session' });
  assert.match(blockers('apex'), /is the editor's decision, dated/);
  write(MASCOT_PATH, { generation: 2, decided_on: null, decided_by: 'editor' });
  assert.match(blockers('apex'), /is the editor's decision, dated/);
  write(MASCOT_PATH, { generation: 2, decided_on: '2026-12-04', decided_by: 'editor' });
  assert.equal(blockers('apex'), '');
  assert.equal(blockers('preview'), '');
  // …and production is held by the line too, like the preview before it.
  reread({ reviewed_on: null });
  assert.match(
    blockers('apex'),
    /^data\/launch\.json: the line of the privacy page .* privacy_mascot/,
  );
  reread();
  assert.equal(blockers('apex'), '');

  // A retouch of her drawing, of her stylesheet or of her colours un-validates her.
  writeFileSync(join(root, MASCOT2_CSS_PATH), '.mascot { display: inline; }');
  assert.match(blockers('apex'), /drawing changed after the sheet was validated/);
  assert.match(blockers('apex'), /drawing changed after "same character\?" was asked/);
  writeFileSync(join(root, MASCOT2_CSS_PATH), '.mascot { display: block; }');
  assert.equal(blockers('apex'), '');
  write(MASCOT2_PALETTE_PATH, { ...palette, chosen: null });
  assert.match(blockers('apex'), /drawing changed after the sheet was validated/);
  // A palette that cannot be read is a drawing nobody can have validated — and nothing throws.
  writeFileSync(join(root, MASCOT2_PALETTE_PATH), 'not json');
  assert.match(blockers('apex'), /second-generation mascot is not drawn or not validated/);

  // Rolling back is one line of data: the turtle's record speaks again, and is still good.
  write(MASCOT_PATH, { generation: 1, preview_generation: 1, decided_on: null, decided_by: null });
  assert.equal(blockers('apex'), '');
  rmSync(root, { recursive: true });
});

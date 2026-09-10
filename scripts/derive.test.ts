/**
 * Unit tests for the pure functions of scripts/derive.ts and scripts/tag-rules.ts (no file I/O).
 * Run: npx tsx --test scripts/derive.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isCandidateNgram,
  parseCitation,
  parsePercentages,
  phraseKey,
  tokenize,
} from './derive.js';
import { compileKeyword, countRuleHits, normalizeForRules } from './tag-rules.js';

void test('parsePercentages reads every "NN %" value, decimal comma included', () => {
  assert.deepEqual(parsePercentages('89 % des Français … et 92 % à la légalisation'), [89, 92]);
  assert.deepEqual(parsePercentages('314 530 personnes (93,13 % des votants)'), [93.13]);
  assert.deepEqual(parsePercentages('aucun pourcentage ici'), []);
});

void test('parseCitation extracts institute, month and year from the trailing parenthetical', () => {
  const c = parseCitation('68 % des Français … (Harris Interactive, mai 2021)');
  assert.equal(c.institute, 'Harris Interactive');
  assert.equal(c.survey_date_text, 'mai 2021');
  assert.equal(c.survey_date_iso, '2021-05');
  assert.equal(c.survey_year, 2021);
  assert.equal(c.commanditaire, null);
});

void test('parseCitation canonicalizes the institute name and accepts a year without comma', () => {
  const yougov = parseCitation('70 % … (Yougov, décembre 2020)');
  assert.equal(yougov.institute, 'YouGov');
  assert.equal(yougov.institute_raw, 'Yougov');
  assert.equal(yougov.survey_date_iso, '2020-12');
  const ifop = parseCitation('71 % … (Ifop 2022)');
  assert.equal(ifop.institute, 'Ifop');
  assert.equal(ifop.survey_date_text, '2022');
  assert.equal(ifop.survey_date_iso, null);
  assert.equal(ifop.survey_year, 2022);
});

void test('parseCitation keeps the sponsor named after "pour" as commanditaire', () => {
  const c = parseCitation('78 % … (Ifop pour l’Humanité, mai 2021)');
  assert.equal(c.institute, 'Ifop');
  assert.equal(c.commanditaire, 'l’Humanité');
  assert.equal(c.citation_text, 'Ifop pour l’Humanité, mai 2021');
});

void test('parseCitation rejects a parenthetical that is not a poll citation', () => {
  const c = parseCitation(
    '314 530 personnes ont voté en 2018 (93,13 % des votants y étaient favorables)',
  );
  assert.equal(c.institute, null);
  assert.equal(c.survey_date_text, null);
  assert.equal(parseCitation('pas de parenthèse').citation_text, null);
});

void test('tokenize strips elisions, keeps hyphens and marks phrase breaks', () => {
  const text = 'Garantir l’accès à l’eau, en Outre-mer : c’est essentiel.';
  const tokens = tokenize(text);
  assert.deepEqual(
    tokens.map((t) => t.norm),
    ['garantir', 'accès', 'à', 'eau', 'en', 'outre-mer', 'est', 'essentiel'],
  );
  const eau = tokens[3];
  assert.ok(eau !== undefined);
  assert.equal(text.slice(eau.start, eau.end), 'eau');
  assert.deepEqual(
    tokens.map((t) => t.phraseStart),
    [true, false, false, false, true, false, true, false],
  );
});

void test('phraseKey normalizes seeds the same way as n-grams', () => {
  assert.equal(phraseKey("État d'urgence"), 'état urgence');
  assert.equal(phraseKey('6e République'), '6e république');
  assert.equal(phraseKey("référendum d'initiative citoyenne"), 'référendum initiative citoyenne');
});

void test('isCandidateNgram drops stopword edges, generic verbs and generic unigrams', () => {
  assert.equal(isCandidateNgram(['règle', 'verte']), true);
  assert.equal(isCandidateNgram(['pôle', 'public']), true);
  assert.equal(isCandidateNgram(['sécurité', 'sociale', 'intégrale']), true);
  assert.equal(isCandidateNgram(['mettre', 'en', 'place']), false);
  assert.equal(isCandidateNgram(['dans', 'le', 'cadre']), false);
  assert.equal(isCandidateNgram(['de', 'la']), false);
  assert.equal(isCandidateNgram(['public']), false);
  assert.equal(isCandidateNgram(['écocide']), true);
  assert.equal(isCandidateNgram(['300', '000']), false);
});

void test('compileKeyword matches whole words, elided forms and wildcards, not hyphen compounds', () => {
  const eau = compileKeyword('eau');
  assert.equal(
    countRuleHits({ tag: 't', min: 1, patterns: [eau] }, normalizeForRules("L’eau et l'eau")),
    2,
  );
  assert.equal(
    countRuleHits({ tag: 't', min: 1, patterns: [eau] }, normalizeForRules('des eaux')),
    0,
  );
  const mer = compileKeyword('mer');
  assert.equal(
    countRuleHits(
      { tag: 't', min: 1, patterns: [mer] },
      normalizeForRules('la mer et les Outre-mer'),
    ),
    1,
  );
  const retraite = compileKeyword('retrait*');
  assert.equal(
    countRuleHits(
      { tag: 't', min: 1, patterns: [retraite] },
      normalizeForRules('Retraite à 60 ans pour les retraités'),
    ),
    2,
  );
  const secte = compileKeyword('secte');
  assert.equal(
    countRuleHits({ tag: 't', min: 1, patterns: [secte] }, normalizeForRules('le secteur public')),
    0,
  );
  const phrase = compileKeyword("garantie d'emploi");
  assert.equal(
    countRuleHits(
      { tag: 't', min: 1, patterns: [phrase] },
      normalizeForRules('la garantie d’emploi'),
    ),
    1,
  );
});

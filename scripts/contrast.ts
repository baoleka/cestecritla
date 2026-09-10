/**
 * WCAG 2.x contrast matrix for the « C'est écrit là » palette, and the role-pair gate.
 * Usage: npx tsx scripts/contrast.ts  → writes design/contrast-matrix.md and design/contrast-matrix.json
 * Every colour below was read on 2026-09-07 either on https://lafranceinsoumise.fr/charte-graphique/
 * (Couleurs 2027 + Codes HEX web), in LOGO-M27.svg (tints) or via getComputedStyle on melenchon2027.fr.
 *
 * Two jobs, on purpose (panel rouge T12, constat « la porte de contraste ne peut pas échouer ») :
 *   1. GENERATOR — the 105-pair matrix of the palette, unchanged since 2026-09-07;
 *   2. GATE — every pair actually declared in design/tokens.json `color-role` (light AND dark) is
 *      measured and compared to its threshold (4.5:1 body text, 3:1 non-text). A failure sets a
 *      non-zero exit code, so the "éliminatoire" claim of the dossier is true of the code.
 *      This is what closes H-DES-3: bg-elevated #2C2E2B and warn-bg #3A2A28 are read from the
 *      tokens themselves, so they can never again be shipped without having been measured.
 *
 * What this gate does NOT cover, and what still has to be written (do not claim otherwise):
 * the contrast of the RENDERED page (a node against its effective background, at its real size and
 * weight). The tools exist and are to be promoted into scripts/:
 * prototypes/mockups/finalistes/capture.mjs, prototypes/mockups/B/tools/contrast-check.mjs,
 * docs/discovery/captures/2026-09-10/proto/integ-live.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';

interface Swatch {
  readonly name: string;
  readonly hex: string;
  readonly group: 'core' | 'tint' | 'vive' | 'observed';
  readonly source: string;
}

const PALETTE: readonly Swatch[] = [
  { name: 'Violet', hex: '#4C0297', group: 'core', source: 'charte « Couleurs 2027 »' },
  { name: 'Rouge', hex: '#D1271C', group: 'core', source: 'charte « Couleurs 2027 »' },
  { name: 'Crème', hex: '#FFFCF4', group: 'core', source: 'charte « Couleurs 2027 »' },
  { name: 'Charbon', hex: '#212320', group: 'core', source: 'charte « Couleurs 2027 »' },
  { name: 'Violet 100', hex: '#FDEDFF', group: 'tint', source: 'LOGO-M27.svg (27 fills)' },
  { name: 'Violet 200', hex: '#E5CBFF', group: 'tint', source: 'LOGO-M27.svg (57 fills)' },
  { name: 'Corail 200', hex: '#FFD2CF', group: 'tint', source: 'LOGO-M27.svg (12 fills)' },
  { name: 'Vif violet', hex: '#7B13D6', group: 'vive', source: 'charte « Codes HEX (web) »' },
  { name: 'Vif rouge', hex: '#F91616', group: 'vive', source: 'charte « Codes HEX (web) »' },
  { name: 'Vif bleu', hex: '#3885F4', group: 'vive', source: 'charte « Codes HEX (web) »' },
  { name: 'Vif rose', hex: '#ED5FB1', group: 'vive', source: 'charte « Codes HEX (web) »' },
  { name: 'Vif jaune', hex: '#F9C900', group: 'vive', source: 'charte « Codes HEX (web) »' },
  { name: 'Vif vert', hex: '#2E9959', group: 'vive', source: 'charte « Codes HEX (web) »' },
  { name: 'Gris M27', hex: '#707070', group: 'observed', source: 'melenchon2027.fr paragraphes (computed)' },
  { name: 'Jaune M27', hex: '#F5C800', group: 'observed', source: 'melenchon2027.fr (computed)' },
  { name: 'Beige M27', hex: '#E6DFC9', group: 'observed', source: 'melenchon2027.fr (computed)' },
];

const BACKGROUNDS = ['Crème', 'Charbon', 'Violet', 'Rouge', 'Violet 100', 'Violet 200', 'Corail 200'] as const;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function grade(ratio: number): string {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'ÉCHEC';
}

const byName = new Map(PALETTE.map((s) => [s.name, s]));

interface Cell {
  readonly fg: string;
  readonly bg: string;
  readonly ratio: number;
  readonly grade: string;
}

const cells: Cell[] = [];
for (const fg of PALETTE) {
  for (const bgName of BACKGROUNDS) {
    const bg = byName.get(bgName);
    if (!bg || bg.name === fg.name) continue;
    const ratio = contrast(fg.hex, bg.hex);
    cells.push({ fg: fg.name, bg: bg.name, ratio: Math.round(ratio * 100) / 100, grade: grade(ratio) });
  }
}

const fmt = (c: Cell | undefined): string => (c ? `${c.ratio.toFixed(2)} ${c.grade}` : '—');

const lines: string[] = [];
lines.push("# Matrice de contraste WCAG 2.2 — « C'est écrit là »");
lines.push('');
lines.push('Générée par `npx tsx scripts/contrast.ts` le 2026-09-07. Ratio texte/fond ; seuils : **AAA ≥ 7**, **AA ≥ 4,5** (texte courant), **AA-large ≥ 3** (≥ 24 px ou ≥ 19 px gras, et éléments non textuels), **ÉCHEC < 3**.');
lines.push('');
lines.push('Règle éliminatoire du plan (T3) : 100 % des paires *texte courant* utilisées dans les maquettes doivent être ≥ 4,5:1.');
lines.push('');
lines.push('## Palette (toutes les valeurs lues à la source le 7/9/2026)');
lines.push('');
lines.push('| Nom | HEX | Groupe | Source |');
lines.push('|---|---|---|---|');
for (const s of PALETTE) lines.push(`| ${s.name} | \`${s.hex}\` | ${s.group} | ${s.source} |`);
lines.push('');
lines.push('## Texte (lignes) × fond (colonnes)');
lines.push('');
lines.push(`| Texte ↓ / Fond → | ${BACKGROUNDS.join(' | ')} |`);
lines.push(`|---|${BACKGROUNDS.map(() => '---').join('|')}|`);
for (const fg of PALETTE) {
  const row = BACKGROUNDS.map((bg) => fmt(cells.find((c) => c.fg === fg.name && c.bg === bg)));
  lines.push(`| **${fg.name}** \`${fg.hex}\` | ${row.join(' | ')} |`);
}
lines.push('');
lines.push('## Paires autorisées pour du texte courant (≥ 4,5:1)');
lines.push('');
const ok = cells.filter((c) => c.ratio >= 4.5).sort((a, b) => b.ratio - a.ratio);
for (const c of ok) lines.push(`- ${c.fg} sur ${c.bg} : ${c.ratio.toFixed(2)} (${c.grade})`);
lines.push('');
lines.push('## Paires interdites pour du texte courant (< 4,5:1), tolérées seulement en aplat, grand titre ≥ 3:1 ou décor');
lines.push('');
const ko = cells.filter((c) => c.ratio < 4.5).sort((a, b) => b.ratio - a.ratio);
for (const c of ko) lines.push(`- ${c.fg} sur ${c.bg} : ${c.ratio.toFixed(2)} (${c.grade})`);
lines.push('');
lines.push('## Lecture');
lines.push('');
const viveOnCreme = PALETTE.filter((s) => s.group === 'vive').map((s) => ({ s, c: cells.find((c) => c.fg === s.name && c.bg === 'Crème') }));
const failing = viveOnCreme.filter((x) => x.c && x.c.ratio < 4.5).length;
lines.push(`- Sur Crème, ${String(failing)} des 6 vives échouent AA en texte courant : les vives sont des couleurs d'aplat et de grands titres, jamais de corps de texte sur Crème.`);
const viveOnCharbon = PALETTE.filter((s) => s.group === 'vive').map((s) => cells.find((c) => c.fg === s.name && c.bg === 'Charbon'));
lines.push(`- Sur Charbon (dark mode), ${String(viveOnCharbon.filter((c) => c && c.ratio >= 4.5).length)} des 6 vives passent AA en texte courant et ${String(viveOnCharbon.filter((c) => c && c.ratio >= 3 && c.ratio < 4.5).length)} passent seulement AA-large : le thème sombre est le territoire des vives pour les titres et les aplats, pas pour le corps de texte (corriger l'annexe de reconnaissance qui disait « les vives passent »).`);
const vOnC = cells.find((c) => c.fg === 'Violet' && c.bg === 'Charbon');
lines.push(`- Violet sur Charbon = ${vOnC ? vOnC.ratio.toFixed(2) : '?'} : interdit. En dark mode, le violet de marque devient Violet 200 (${fmt(cells.find((c) => c.fg === 'Violet 200' && c.bg === 'Charbon'))}) ou Vif violet (${fmt(cells.find((c) => c.fg === 'Vif violet' && c.bg === 'Charbon'))}).`);
const grey = cells.find((c) => c.fg === 'Gris M27' && c.bg === 'Crème');
lines.push(`- Le gris de paragraphe de melenchon2027.fr (#707070) fait ${grey ? grey.ratio.toFixed(2) : '?'} sur Crème (${grey?.grade ?? '?'}, limite) : corps de texte en Charbon, le gris reste réservé aux métadonnées ≥ 16 px.`);
lines.push(`- Crème sur Rouge = ${fmt(cells.find((c) => c.fg === 'Crème' && c.bg === 'Rouge'))}, Crème sur Violet = ${fmt(cells.find((c) => c.fg === 'Crème' && c.bg === 'Violet'))} : boutons et bandeaux pleins autorisés dans les deux couleurs de marque.`);
lines.push('');

// ---------------------------------------------------------------------------------------------
// Gate: every pair declared in design/tokens.json `color-role` is measured (H-DES-3).

interface TokenLeaf {
  $value?: string;
}
interface Tokens {
  color: Record<string, TokenLeaf>;
  'color-role': Record<string, Record<string, string>>;
}

const tokens = JSON.parse(
  readFileSync(new URL('../design/tokens.json', import.meta.url), 'utf8'),
) as Tokens;

/** `{color.violet-200}` → `#E5CBFF`; a literal `#RRGGBB` is returned as is. */
function resolve(theme: string, role: string): string {
  const raw = tokens['color-role'][theme]?.[role];
  if (raw === undefined) throw new Error(`color-role.${theme}.${role} is missing from tokens.json`);
  const ref = /^\{color\.([a-z0-9-]+)\}$/.exec(raw);
  if (!ref) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(raw)) throw new Error(`color-role.${theme}.${role}: ${raw}`);
    return raw.toUpperCase();
  }
  const value = tokens.color[ref[1] ?? '']?.$value;
  if (value === undefined) throw new Error(`color.${ref[1] ?? ''} is missing from tokens.json`);
  return value.toUpperCase();
}

/** A pair the interface really renders: [foreground role, background role, kind]. */
const ROLE_PAIRS: readonly (readonly [string, string, 'text' | 'non-text'])[] = [
  ['text', 'bg', 'text'],
  ['text', 'bg-elevated', 'text'],
  ['text-muted', 'bg', 'text'],
  ['text', 'verbatim-bg', 'text'],
  ['brand', 'bg', 'text'],
  ['brand-on', 'brand', 'text'],
  ['action', 'bg', 'text'],
  ['action-on', 'action', 'text'],
  ['warn-text', 'warn-bg', 'text'],
  ['wordmark', 'bg', 'text'],
  ['wordmark-accent', 'bg', 'text'],
  ['verbatim-rule', 'verbatim-bg', 'non-text'],
  ['focus', 'bg', 'non-text'],
  ['focus', 'bg-elevated', 'non-text'],
];

const MIN = { text: 4.5, 'non-text': 3 } as const;

interface RoleCheck {
  readonly theme: string;
  readonly fg: string;
  readonly bg: string;
  readonly fgHex: string;
  readonly bgHex: string;
  readonly kind: 'text' | 'non-text';
  readonly ratio: number;
  readonly min: number;
  readonly pass: boolean;
}

const roleChecks: RoleCheck[] = [];
for (const theme of ['light', 'dark']) {
  for (const [fg, bg, kind] of ROLE_PAIRS) {
    const fgHex = resolve(theme, fg);
    const bgHex = resolve(theme, bg);
    const ratio = Math.round(contrast(fgHex, bgHex) * 100) / 100;
    roleChecks.push({ theme, fg, bg, fgHex, bgHex, kind, ratio, min: MIN[kind], pass: ratio >= MIN[kind] });
  }
}
const roleFailures = roleChecks.filter((c) => !c.pass);

lines.push('## Porte de CI — paires de rôles de `design/tokens.json` (éliminatoire)');
lines.push('');
lines.push(
  'Chaque paire ci-dessous est **rendue** par l’interface : elle est lue dans `color-role` et mesurée à chaque exécution. Seuils : **4,5:1** pour du texte, **3:1** pour un filet, une bordure ou un anneau de focus. Un échec fait sortir `scripts/contrast.ts` avec un code non nul (porte de CI n° 5). C’est ce contrôle qui lève **H-DES-3** : `bg-elevated #2C2E2B` et `warn-bg #3A2A28` sont mesurés ici, plus jamais « proposés sans mesure ».',
);
lines.push('');
lines.push('| Thème | Premier plan | Fond | Type | Ratio | Seuil | Verdict |');
lines.push('|---|---|---|---|---|---|---|');
for (const c of roleChecks) {
  lines.push(
    `| ${c.theme} | \`${c.fg}\` ${c.fgHex} | \`${c.bg}\` ${c.bgHex} | ${c.kind} | ${c.ratio.toFixed(2)} | ${c.min.toFixed(1)} | ${c.pass ? 'PASS' : 'ÉCHEC'} |`,
  );
}
lines.push('');
lines.push(
  `- ${String(roleChecks.length)} paires de rôles mesurées, ${String(roleFailures.length)} en échec.`,
);
lines.push(
  "- Non couvert par cette porte, à écrire : le contraste de la **page rendue** (chaque nœud de texte contre son fond effectif, à sa taille et à sa graisse réelles), la ban list, le reflow 320 px, la police système à 130 % et 150 %, `prefers-reduced-motion` et `prefers-color-scheme`. Outils déjà écrits à promouvoir dans `scripts/` : `prototypes/mockups/finalistes/capture.mjs`, `prototypes/mockups/B/tools/contrast-check.mjs`, `docs/discovery/captures/2026-09-10/proto/integ-live.mjs`.",
);
lines.push('');

writeFileSync('design/contrast-matrix.md', lines.join('\n'));
writeFileSync(
  'design/contrast-matrix.json',
  JSON.stringify(
    { generated_at: '2026-09-07', palette: PALETTE, backgrounds: BACKGROUNDS, cells, role_checks: roleChecks },
    null,
    2,
  ),
);
console.log(`${String(cells.length)} paires calculées ; ${String(ok.length)} ≥ 4,5:1 ; ${String(ko.length)} < 4,5:1`);
console.log(
  `${String(roleChecks.length)} paires de rôles (tokens color-role) ; ${String(roleFailures.length)} en échec`,
);
for (const c of roleFailures) {
  console.error(
    `ÉCHEC ${c.theme}: ${c.fg} (${c.fgHex}) sur ${c.bg} (${c.bgHex}) = ${c.ratio.toFixed(2)} < ${c.min.toFixed(1)}`,
  );
}
if (roleFailures.length > 0) process.exitCode = 1;

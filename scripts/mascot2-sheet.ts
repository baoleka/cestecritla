/**
 * The sheet the editor validates the second-generation mascot on (lot A1 of
 * docs/discovery/PLAN-TORTUE.md; D17.1 to D17.15): one page, in still images — her five states,
 * her colours, her signs, her poses. Written from the drawing itself
 * (design/mascot/v2/mascot.svg), the stylesheet that will ship (src/styles/mascot2.css), the
 * tokens and the candidate palettes — never from a copy.
 *
 *   npx tsx scripts/mascot2-sheet.ts                      writes design/mascot/v2/planche.html
 *   npx tsx scripts/mascot2-sheet.ts --check              fails if the committed sheet is not what
 *                                                         the drawing gives today
 *   npx tsx scripts/mascot2-sheet.ts --validated <today>  THE EDITOR'S GESTURE: dates the sheet in
 *                                                         design/mascot/v2/validation.json, bound
 *                                                         to the fingerprint of what was looked at
 *
 * The page is self-contained and makes no request: it opens from the file system. It holds the
 * drawing once; its one script copies it into each figure and writes that figure's look on the
 * copy — attributes only, each computed here. Every number the page prints is computed here
 * too: weights, shapes, contrasts.
 *
 * IN PREPARATION: the turtle that is online has her own sheet (scripts/mascot-sheet.ts,
 * design/mascot/planche.html), validated on 13 November 2026 and not touched.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import {
  MAX_BOTH_BYTES,
  MAX_DRAWING_BYTES,
  MAX_SHAPES_IN_FILE,
  MAX_SHAPES_SEEN,
  MAX_STYLESHEET_BYTES,
  SHAPES_SEEN,
  lookOf,
  type ArcProgress,
  type LookOptions,
  type MascotLook,
  type TurtleState,
} from '../src/lib/mascot2.js';
import { arcAttributes } from '../src/lib/turtle.js';
import { STRINGS_PATH, TOKEN_SETS } from './launch.js';
import {
  LINE_MIN,
  MASCOT2_CSS_PATH,
  MASCOT2_SHEET_PATH,
  MASCOT2_SVG_PATH,
  MASCOT2_VALIDATION_PATH,
  contrastRatio,
  mascot2Fingerprint,
  readPalette,
  refused,
  type PaletteSet,
  type Tints,
} from './mascot2-kit.js';

const STATES: readonly TurtleState[] = [0, 1, 2, 3, 4];
type Theme = 'light' | 'dark';

interface Tokens {
  color: Record<string, { $value?: string } | undefined>;
  'color-role': Record<string, Record<string, string> | undefined>;
}
const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

const ROLES = [
  'bg',
  'text',
  'turtle-line',
  'turtle-shell',
  'turtle-arc',
  'turtle-eye',
  'turtle-accent',
];

/** A role of a token set, resolved to its colour. */
function role(tokens: Tokens, theme: Theme, name: string): string {
  const raw = tokens['color-role'][theme]?.[name] ?? '';
  const colour = /^\{color\.([a-z0-9-]+)\}$/.exec(raw)?.[1];
  return colour === undefined ? raw : (tokens.color[colour]?.$value ?? raw);
}

/** Everything a section needs to draw her: the roles of a theme, and six tints. */
function colours(tokens: Tokens, theme: Theme, tints: Tints): string {
  return [
    ...ROLES.map((name) => `--${name}:${role(tokens, theme, name)}`),
    ...tints.map((value, index) => `--mascot-tint-${String(index + 1)}:${value}`),
  ].join(';');
}

const fr = (n: number, digits = 2): string => n.toFixed(digits).replace('.', ',');
const octets = (n: number): string => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} o`;

const CHECKS = [
  'De profil, tournée vers la droite, à tous les états ; jamais de face ni en miroir',
  'Plate : ni volume, ni ombre, ni dégradé — son reflet et le ciel du soir sont des aplats',
  'La tortue : quadrupède, tête sortie, cou visible. Le flamant : un oiseau, rien d’humain',
  'Trois arcs continus, sur la carapace puis sur l’aile ; aucun quadrillage',
  'La tortue garde les violets de la charte ; seul le flamant prend une couleur de partie ; ni mauve, ni prune, ni rose',
  'Un seul objet : la planche de surf. Ni pancarte, ni sigle, ni chiffre, ni boisson',
  'Le décor ne mesure rien : ni barre, ni graduation, ni hauteur qui dirait une progression',
  'Elle ne pousse rien, et ne sort pas de son cadre',
  'Les cinq états se distinguent à 80 px',
];

/** A look as the page's script reads it: every attribute it will write, already computed. */
const lookText = (look: MascotLook): string =>
  [
    look.state,
    look.pose,
    look.tint,
    look.sign,
    look.passage ? 1 : 0,
    ...look.arcs.flatMap((steps) => {
      const { dasharray, dashoffset } = arcAttributes(steps);
      return [dasharray, dashoffset];
    }),
  ].join('|');

/** The script of the page: puts a copy of the drawing in each figure, and writes its look. */
const PLAYER = `(() => {
  const model = document.getElementById('mascot').content.firstElementChild;
  for (const box of document.querySelectorAll('[data-look]')) {
    const [state, pose, tint, sign, passage, ...arcs] = box.dataset.look.split('|');
    const svg = model.cloneNode(true);
    svg.setAttribute('data-state', state);
    svg.setAttribute('data-pose', pose);
    svg.setAttribute('data-tint', tint);
    svg.setAttribute('data-sign', sign);
    svg.toggleAttribute('data-passage', passage === '1');
    for (const i of [0, 1, 2]) {
      for (const arc of svg.querySelectorAll('.m-arc-' + String(i + 1))) {
        arc.setAttribute('stroke-dasharray', arcs[2 * i]);
        arc.setAttribute('stroke-dashoffset', arcs[2 * i + 1]);
      }
    }
    box.append(svg);
  }
})();`;

const FORM_FR: Readonly<Record<TurtleState, string>> = {
  0: 'état 0 — la tortue',
  1: 'état 1 — elle surfe',
  2: 'état 2 — le flamant',
  3: 'état 3 — elle vole',
  4: 'état 4 — la tortue dans le ciel',
};

export function sheet(): string {
  const svg = readFileSync(MASCOT2_SVG_PATH, 'utf8').trim();
  const css = readFileSync(MASCOT2_CSS_PATH, 'utf8');
  const main = json(TOKEN_SETS[0]) as Tokens;
  const neutral = json(TOKEN_SETS[1]) as Tokens;
  const palette = readPalette();
  const strings = json(STRINGS_PATH) as Record<string, string>;
  const text = (key: string): string => {
    const value = strings[key];
    if (typeof value !== 'string') throw new Error(`${STRINGS_PATH} has no ${key}`);
    return value;
  };

  // The palette shown everywhere but in its own section: the editor's once he has chosen, the
  // first candidate until then.
  const names = Object.keys(palette.palettes);
  const shownName = palette.chosen ?? names[0] ?? '';
  const shown = palette.palettes[shownName];
  if (shown === undefined) throw new Error('design/mascot/v2/palette.json holds no palette');

  const light = colours(main, 'light', shown.light);
  const dark = colours(main, 'dark', shown.dark);
  const black =
    '--bg:#fff;--text:#000;--turtle-line:#000;--turtle-shell:#000;--turtle-arc:#000;--turtle-eye:#000;--turtle-accent:#000;' +
    [1, 2, 3, 4, 5, 6].map((n) => `--mascot-tint-${String(n)}:#000`).join(';');

  /** A place for her, and the look the page's script writes on the copy it puts there. */
  const her = (size: number, options: LookOptions): string =>
    `<div class="m" style="--mascot-size:${String(size)}px" data-look="${lookText(lookOf(options))}"></div>`;
  const figure = (caption: string, size: number, look: LookOptions): string =>
    `<figure>${her(size, look)}<figcaption>${caption}</figcaption></figure>`;
  const row = (title: string, style: string, cells: string[], note = ''): string =>
    `<section style="${style}">${title === '' ? '' : `<h2>${title}</h2>`}${note === '' ? '' : `<p class="note">${note}</p>`}<div class="row">${cells.join('')}</div></section>`;
  /** The five states, the flamingo in the colour of part 5 from state 2 on. */
  const five = (size: number, tint: MascotLook['tint'] = 5): string[] =>
    STATES.map((state) => figure(FORM_FR[state], size, { state, tint: state >= 2 ? tint : 0 }));

  // --- the two screens of the game, as the plan describes them (mock-ups, kit strings) --------
  const bars = `<p class="bar"><b>C’est écrit là</b><span>${text('nav.toc')}</span></p><p class="bar small">${text('independence.unofficial')}</p>`;
  const asking = (style: string): string =>
    `<div class="phone" style="${style}">${bars}<p class="title">${text('game.title')}</p><div class="word-row"><div><p class="kicker">${text('game.kicker')}</p><p class="word">«&nbsp;un mot&nbsp;»</p></div>${her(96, { state: 1 })}</div><p class="ask">${text('game.question.part')}</p><p><span class="quiet">${text('game.dont_know')}</span></p><div class="tiles">${[1, 2, 3, 4, 5, 6].map((n) => `<span>Titre de la partie ${String(n)}</span>`).join('')}</div></div>`;
  const ending = (style: string): string =>
    `<div class="phone" style="${style}">${bars}<p class="title">${text('game.title')}</p><div class="stage">${her(240, { state: 2, tint: 5, passage: true })}</div><p class="done">${text('game.round.done')}</p><p><span class="again">${text('game.round.again')}</span></p></div>`;

  // --- her colours: every candidate, measured ---------------------------------------------------
  const measured = (set: PaletteSet, tokens: Tokens): string => {
    const cells = ([1, 2, 3, 4, 5, 6] as const).map((part) => {
      const cell = (theme: Theme): string => {
        const tint = set[theme][part - 1] ?? '';
        const ratio = contrastRatio(role(tokens, theme, 'turtle-arc'), tint);
        const zones = refused(tint);
        const verdict = [
          ratio >= LINE_MIN ? '' : `trait ${fr(ratio)}:1 — sous ${String(LINE_MIN)}:1`,
          ...zones.map((zone) => `zone ${zone} refusée`),
        ].filter((line) => line !== '');
        return `<td><span class="chip" style="background:${tint}"></span><code>${tint}</code> ${fr(ratio)}:1${verdict.length === 0 ? '' : ` <strong>✗ ${verdict.join(' ; ')}</strong>`}</td>`;
      };
      return `<tr><th>partie ${String(part)}${set.families_fr?.[part - 1] === undefined ? '' : ` — ${set.families_fr[part - 1] ?? ''}`}</th>${cell('light')}${cell('dark')}</tr>`;
    });
    return `<table><thead><tr><th></th><th>thème clair — notre trait dessus</th><th>thème sombre — notre trait dessus</th></tr></thead><tbody>${cells.join('')}</tbody></table>`;
  };
  const tinted = (state: TurtleState, size: number): string[] =>
    ([0, 1, 2, 3, 4, 5, 6] as const).map((tint) =>
      figure(tint === 0 ? 'pâle' : `partie ${String(tint)}`, size, { state, tint }),
    );
  const palettes = names.map((name) => {
    const set = palette.palettes[name];
    if (set === undefined) return '';
    const lightSet = colours(main, 'light', set.light);
    const darkSet = colours(main, 'dark', set.dark);
    return [
      `<section style="${lightSet}"><h2>Palette « ${set.label_fr} »</h2><div class="row">${tinted(2, 150).join('')}</div><div class="row">${tinted(3, 150).join('')}</div></section>`,
      `<section style="${darkSet}"><div class="row">${tinted(2, 150).join('')}</div><div class="row">${tinted(3, 150).join('')}</div></section>`,
      `<section style="${lightSet}">${measured(set, main)}</section>`,
    ].join('\n');
  });

  // --- what the drawing weighs, and what it holds ---------------------------------------------
  const drawingBytes = gzipSync(svg).length;
  const stylesheetBytes = gzipSync(css).length;
  const shapes = (svg.match(/<(?:path|rect|circle)\b/g) ?? []).length;
  const measures = [
    `<tr><th>Le dessin, gzip</th><td>${octets(drawingBytes)}</td><td>plafond ${octets(MAX_DRAWING_BYTES)}</td></tr>`,
    `<tr><th>Sa feuille de style, gzip — sans le mouvement, qui vient au lot A2</th><td>${octets(stylesheetBytes)}</td><td>plafond ${octets(MAX_STYLESHEET_BYTES)}</td></tr>`,
    `<tr><th>Les deux</th><td>${octets(drawingBytes + stylesheetBytes)}</td><td>plafond ${octets(MAX_BOTH_BYTES)} (${octets(6 * 1024)} pour la tortue en ligne)</td></tr>`,
    `<tr><th>Formes dans le fichier</th><td>${String(shapes)}</td><td>plafond ${String(MAX_SHAPES_IN_FILE)}</td></tr>`,
    ...STATES.map(
      (state) =>
        `<tr><th>Formes visibles — ${FORM_FR[state]}</th><td>${String(SHAPES_SEEN[state].length)}</td><td>plafond ${String(MAX_SHAPES_SEEN[state])}</td></tr>`,
    ),
  ];

  const grown: [string, TurtleState, ArcProgress][] = [
    ['1<sup>er</sup> arc : 1 pas', 1, [1, 0, 0]],
    ['4 pas', 1, [4, 0, 0]],
    ['entier ; 2<sup>e</sup> : 1 pas', 2, [6, 1, 0]],
    ['2<sup>e</sup> : 4 pas', 2, [6, 4, 0]],
    ['entier ; 3<sup>e</sup> : 1 pas', 3, [6, 6, 1]],
    ['3<sup>e</sup> : 4 pas', 3, [6, 6, 4]],
    ['trois arcs entiers', 4, [6, 6, 6]],
  ];

  const neutralLight = colours(neutral, 'light', palette.neutral.light);
  const neutralDark = colours(neutral, 'dark', palette.neutral.dark);

  const body = [
    `<section style="${light}"><h2>Dans le jeu, à 390 px — maquettes</h2><p class="note">À gauche, pendant qu’on joue : elle est à côté du mot, à 96 px (72 px aujourd’hui, dans un coin). À droite, à chaque fin de manche : elle prend une scène de 240 px, et c’est là que ses évolutions se joueront. Elle ne vit que dans le bloc du jeu. Les écrans réels se jugent sur l’aperçu.</p><div class="row top">${asking(light)}${ending(light)}${asking(dark)}${ending(dark)}</div></section>`,
    row('Les cinq états, à 240 px (la scène, sa fiche)', light, five(240)),
    row('À 96 px (à côté du mot), puis à 80 px (petits écrans)', light, [...five(96), ...five(80)]),
    row('Sur fond sombre', dark, five(240)),
    row('', dark, [...five(96), ...five(80)]),
    `<section style="${light}"><h2>Sa couleur : deux palettes à départager</h2><p class="note">Le flamant naît pâle ; le joueur lui donne une couleur parmi six, une par partie du livre, ou la laisse pâle. Chaque valeur est mesurée : notre trait posé sur la teinte doit faire ${String(LINE_MIN)}:1 au moins, et aucune teinte ne tombe dans le mauve, le prune ou le rose que le dessin refuse. La tortue, elle, garde ses violets.</p></section>`,
    ...palettes,
    row(
      'Ses arcs la suivent : sur la carapace, puis sur l’aile',
      light,
      grown.map(([caption, state, arcs]) =>
        figure(caption, 150, { state, arcs, sign: 0, tint: state >= 2 ? 3 : 0 }),
      ),
      'Les mêmes trois traits continus, les mêmes six pas : ce qui a grandi se voit, ce qui manque n’est dessiné nulle part.',
    ),
    row('Signes qu’un changement approche — des attitudes, jamais une quantité', light, [
      figure('le flamant, au repos', 190, { state: 2, tint: 1, sign: 0 }),
      figure('ses ailes s’entrouvrent', 190, { state: 2, tint: 1, sign: 1 }),
      figure('en vol', 190, { state: 3, tint: 1, sign: 0 }),
      figure('elle regarde vers le haut', 190, { state: 3, tint: 1, sign: 1 }),
      figure('puis une première étoile', 190, { state: 3, tint: 1, sign: 2 }),
    ]),
    row(
      'Deux poses : on la touche, on lui demande un indice',
      light,
      [
        figure('la tortue touchée : tête levée', 170, { state: 0, pose: 'up' }),
        figure('un indice : elle regarde les tuiles', 170, { state: 0, pose: 'look' }),
        figure('en surf', 170, { state: 1, pose: 'look' }),
        figure('le flamant', 170, { state: 2, pose: 'look', tint: 4 }),
        figure('en vol', 170, { state: 3, pose: 'look', tint: 4 }),
      ],
      'Les figures (un virage, un changement de patte, un battement d’ailes) sont du mouvement : elles viennent au lot A2.',
    ),
    row('Le seul accent, et seulement à un passage : un détail de la scène', light, [
      figure('des gouttes d’écume', 190, { state: 1, passage: true }),
      figure('le rond dans l’eau', 190, { state: 2, tint: 3, passage: true }),
      figure('son reflet', 190, { state: 3, tint: 3, passage: true }),
      figure('une étoile', 190, { state: 4, tint: 3, passage: true }),
    ]),
    row('Silhouettes en noir — reconnaît-on une tortue, un surf, un flamant, un vol ?', black, [
      ...five(96),
      ...five(48),
    ]),
    row('Jeu de couleurs neutre (si la charte est retirée), clair puis sombre', neutralLight, [
      ...five(110, 0),
      ...tinted(2, 110).slice(1),
    ]),
    row('', neutralDark, [...five(110, 0), ...tinted(2, 110).slice(1)]),
    `<section><h2>Ce que le dessin pèse, et ce qu’il contient</h2><table><tbody>${measures.join('')}</tbody></table></section>`,
  ];

  return `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Ta tortue, deuxième génération — planche de validation (images fixes)</title>
<style>
body{margin:0;font:14px/1.45 system-ui,sans-serif;background:#fff;color:#212320}
header,footer{padding:16px 20px;max-width:62rem}
h1{font-size:20px;margin:0 0 4px}
section{background:var(--bg,#fff);color:var(--text,#212320);padding:14px 20px 20px}
h2{font-size:13px;font-weight:600;margin:0 0 10px}
.note{margin:-6px 0 12px;font-size:12px;max-width:46rem}
.row{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end}
.row + .row{margin-block-start:14px}
.row.top{align-items:flex-start}
figure{margin:0;text-align:center;font-size:12px}
.m{inline-size:var(--mascot-size);aspect-ratio:96/60}
li{margin:4px 0}
code{font-size:12px}
table{border-collapse:collapse;font-size:12px}
th,td{text-align:start;padding:3px 14px 3px 0;vertical-align:baseline;font-weight:400}
thead th,tbody th{font-weight:600}
.chip{display:inline-block;inline-size:12px;block-size:12px;border-radius:3px;margin-inline-end:6px;vertical-align:-1px;border:1px solid color-mix(in srgb,var(--text,#212320) 30%,transparent)}
.phone{box-sizing:border-box;inline-size:390px;max-inline-size:100%;padding:0 16px 16px;background:var(--bg);color:var(--text);border:1px solid color-mix(in srgb,var(--text) 25%,transparent);border-radius:12px}
.phone p{margin:0}
.bar{display:flex;justify-content:space-between;padding-block-start:10px}
.small{font-size:12px;padding-block-start:0}
.title{font-size:22px;font-weight:700;margin-block:18px 6px!important}
.word-row{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
.kicker{font-weight:700}
.word{font-size:34px;font-weight:700;line-height:1.2}
.ask{font-size:17px;margin-block:8px 10px!important}
.quiet,.again{display:inline-block;padding:9px 16px;border:2px solid var(--turtle-line);border-radius:999px;font-weight:700}
.tiles{display:grid;gap:8px;margin-block-start:12px}
.tiles span{padding:11px 12px;border:2px solid var(--turtle-line);border-radius:8px}
.stage{display:flex;justify-content:center;margin-block:6px 10px}
.done{font-size:18px;font-weight:700;margin-block-end:12px!important}
${css}
</style>
<header>
<h1>Ta tortue, deuxième génération — planche de validation (images fixes)</h1>
<p>Elle surfe, devient un flamant dont le joueur choisit la couleur, s’envole, puis vole sous une tortue d’étoiles — et s’appelle « ta tortue » d’un bout à l’autre. Cette planche montre le dessin à l’arrêt ; le mouvement (les quatre évolutions, les figures) vient sur la planche suivante. <strong>Rien de ceci n’est en ligne.</strong> Dessin : <code>${MASCOT2_SVG_PATH}</code>, états et poses : <code>${MASCOT2_CSS_PATH}</code>.</p>
</header>
${body.join('\n')}
<footer>
<h2>Neuf contraintes, à cocher oui ou non</h2>
<ol>${CHECKS.map((check) => `<li>${check}</li>`).join('')}</ol>
<p>Et le critère éliminatoire de toujours : sobre et tenace — <strong>ni enfantine, ni moche</strong>.</p>
<p>Valider, une fois la palette choisie : <code>npx tsx scripts/mascot2-sheet.ts --validated AAAA-MM-JJ</code> (la date du jour) l’écrit dans <code>${MASCOT2_VALIDATION_PATH}</code>, avec l’empreinte de ce qui est montré ici — le dessin, sa feuille de style, ses couleurs. Une retouche de l’un des trois fait tomber la validation.</p>
<p>Empreinte : <code>${mascot2Fingerprint() ?? ''}</code></p>
</footer>
<template id="mascot">${svg}</template>
<script>${PLAYER}</script>
</html>
`;
}

/** What design/mascot/v2/validation.json holds: two dates of the editor, and what they are about. */
export interface Mascot2Validation {
  /** The day the editor validated the sheet. */
  validated_on: string | null;
  /** Fingerprint of the drawing, its stylesheet and its colours on that day. */
  drawing_sha256: string | null;
  /** The day "same character?" was asked to fresh readers, official images side by side. */
  same_character_asked_on: string | null;
  /** Fingerprint of the drawing the question was asked about. */
  same_character_sha256: string | null;
  /** What the readers answered, counted; null while the question has not been asked. */
  same_character_answers: { asked: number; same: number; not_same: number; unsure: number } | null;
  note_fr: string;
}

export function readValidation(): Mascot2Validation | null {
  if (!existsSync(MASCOT2_VALIDATION_PATH)) return null;
  return json(MASCOT2_VALIDATION_PATH) as Mascot2Validation;
}

if (process.argv[1] !== undefined && /mascot2-sheet\.ts$/.test(process.argv[1])) {
  const args = process.argv.slice(2);
  const page = sheet();
  if (args[0] === '--check') {
    if (!existsSync(MASCOT2_SHEET_PATH) || readFileSync(MASCOT2_SHEET_PATH, 'utf8') !== page) {
      console.error(
        `${MASCOT2_SHEET_PATH} is not what the drawing gives: run scripts/mascot2-sheet.ts`,
      );
      process.exitCode = 1;
    }
  } else if (args[0] === '--validated') {
    const today = new Date().toISOString().slice(0, 10);
    const current = readValidation();
    if (args[1] !== today) {
      console.error(`type today's date to validate the sheet: --validated ${today}`);
      process.exitCode = 1;
    } else if (readPalette().chosen === null) {
      console.error('the palette is not chosen: design/mascot/v2/palette.json, "chosen" (D17.4)');
      process.exitCode = 1;
    } else if (current === null || readFileSync(MASCOT2_SHEET_PATH, 'utf8') !== page) {
      console.error(
        `${MASCOT2_SHEET_PATH} is not the sheet of today's drawing: regenerate it, look again`,
      );
      process.exitCode = 1;
    } else {
      const next: Mascot2Validation = {
        ...current,
        validated_on: today,
        drawing_sha256: mascot2Fingerprint(),
      };
      writeFileSync(MASCOT2_VALIDATION_PATH, `${JSON.stringify(next, null, 2)}\n`);
      console.log(`validated on ${today}: ${MASCOT2_VALIDATION_PATH}`);
    }
  } else {
    writeFileSync(MASCOT2_SHEET_PATH, page);
    console.log(`written: ${MASCOT2_SHEET_PATH}`);
  }
}

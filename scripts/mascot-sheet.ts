/**
 * The sheet the editor validates the turtle on (lots K2 and K3; PLAN-JEU §4.5): one page, judged
 * in five minutes. Written from the drawing itself (design/mascot/tortue.svg), the stylesheet
 * that ships (src/styles/turtle.css) and the tokens — never from a copy.
 *
 *   npx tsx scripts/mascot-sheet.ts                      writes design/mascot/planche.html
 *   npx tsx scripts/mascot-sheet.ts --check              fails if the committed sheet is not what
 *                                                        the drawing gives today
 *   npx tsx scripts/mascot-sheet.ts --validated <today>  THE EDITOR'S GESTURE: dates the sheet in
 *                                                        design/mascot/validation.json, bound to
 *                                                        the fingerprint of what was looked at
 *
 * The page is self-contained and makes no request: it opens from the file system. Its one
 * script only writes attributes, from frames computed here by src/lib/turtle.ts — the movement
 * it shows is the stylesheet's, at real speed.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  STATE_ARCS,
  arcAttributes,
  evolution,
  framesDuration,
  turtleMarkup,
  type ArcProgress,
  type TurtleFrame,
  type TurtleLook,
  type TurtleState,
} from '../src/lib/turtle.js';
import {
  TOKEN_SETS,
  TURTLE_CSS_PATH,
  TURTLE_SVG_PATH,
  TURTLE_VALIDATION_PATH,
  turtleFingerprint,
} from './launch.js';

export const SHEET_PATH = 'design/mascot/planche.html';
const STATES: readonly TurtleState[] = [0, 1, 2, 3, 4];

interface Tokens {
  color: Record<string, { $value?: string } | undefined>;
  'color-role': Record<string, Record<string, string> | undefined>;
  motion?: { duration?: Record<string, string>; easing?: Record<string, string> };
}
const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

/** The roles a section of the sheet needs, for one theme of one token set, as declarations. */
function roles(tokens: Tokens, theme: 'light' | 'dark'): string {
  const resolve = (role: string): string => {
    const raw = tokens['color-role'][theme]?.[role] ?? '';
    const name = /^\{color\.([a-z0-9-]+)\}$/.exec(raw)?.[1];
    return name === undefined ? raw : (tokens.color[name]?.$value ?? raw);
  };
  return ['bg', 'text', 'turtle-line', 'turtle-shell', 'turtle-arc', 'turtle-eye', 'turtle-accent']
    .map((role) => `--${role}:${resolve(role)}`)
    .join(';');
}

/** Durations and curves of the tokens, as the custom properties the stylesheet reads. */
function motion(tokens: Tokens): string {
  const entries = (group: Record<string, string> | undefined, prefix: string): string[] =>
    Object.entries(group ?? {})
      .filter(([name, value]) => !name.startsWith('$') && typeof value === 'string')
      .map(([name, value]) => `--${prefix}-${name}:${value}`);
  return [
    ...entries(tokens.motion?.duration, 'duration'),
    ...entries(tokens.motion?.easing, 'easing'),
  ].join(';');
}

/** A frame as the page's script writes it: the two attributes of each arc already computed. */
interface PageFrame {
  at: number;
  state: number;
  pose: string;
  passage: boolean;
  arcs: [string, string][];
}
const pageFrame = (frame: TurtleFrame): PageFrame => ({
  at: frame.at,
  state: frame.state,
  pose: frame.pose,
  passage: frame.passage,
  arcs: frame.arcs.map((steps) => {
    const { dasharray, dashoffset } = arcAttributes(steps);
    return [dasharray, dashoffset];
  }),
});

/** The four passages, each from the least a state can have to the least of the next. */
export function passages(): TurtleFrame[][] {
  return STATES.slice(0, -1).map((state) => {
    const next = (state + 1) as TurtleState;
    return evolution({ state, arcs: STATE_ARCS[state] }, { state: next, arcs: STATE_ARCS[next] });
  });
}

const CHECKS = [
  'De profil, tournée vers la droite, jamais de face ni en miroir',
  'Plate : ni volume, ni ombre, ni dégradé',
  'Quadrupède, tête sortie, cou visible — rien d’un personnage debout',
  'Carapace sans quadrillage : des arcs continus, trois au plus',
  'Les violets de la charte seulement — ni le mauve et le prune de l’officielle, ni rose ; aucun accessoire, aucune pancarte, aucun chiffre',
  'Posée sur rien : elle ne pousse rien et n’avance le long de rien',
  'Les cinq états se distinguent à 72 px',
];

/** The script of the page: plays frames by writing attributes, and nothing else. */
const PLAYER = `(() => {
  const data = JSON.parse(document.getElementById('frames').textContent);
  const box = document.getElementById('gestes');
  const svg = box.querySelector('svg');
  const said = document.getElementById('dit');
  const less = document.getElementById('reduit');
  let look = data.start;
  let timers = [];
  const quiet = () => less.checked || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const write = (frame) => {
    look = frame;
    svg.setAttribute('data-state', String(frame.state));
    svg.setAttribute('data-pose', frame.pose);
    svg.toggleAttribute('data-passage', frame.passage);
    frame.arcs.forEach((pair, index) => {
      const arc = svg.querySelector('.t-arc-' + String(index + 1));
      arc.setAttribute('stroke-dasharray', pair[0]);
      arc.setAttribute('stroke-dashoffset', pair[1]);
    });
  };
  const play = (frames) => {
    timers.forEach(clearTimeout);
    timers = [];
    if (quiet()) return write(frames[frames.length - 1]);
    frames.forEach((frame) => timers.push(setTimeout(write, frame.at, frame)));
  };
  const pose = (name, sentence) => {
    if (quiet()) {
      said.textContent = data.said.still;
      return;
    }
    play([{ ...look, at: 0, pose: name, passage: false }]);
    said.textContent = sentence;
  };
  const on = (id, action) => document.getElementById(id).addEventListener('click', action);
  on('toucher', () => pose('up', data.said.up));
  on('indice', () => pose('look', data.said.look));
  on('suivant', () => {
    play([{ ...look, at: 0, pose: 'rest', passage: false }]);
    said.textContent = '';
  });
  on('evoluer', () => {
    const frames = data.passages[look.state];
    if (frames === undefined) {
      said.textContent = data.said.last;
      return;
    }
    play(frames);
    said.textContent = data.said.grown.replace('{n}', String(look.state + 1));
  });
  on('zero', () => {
    timers.forEach(clearTimeout);
    svg.removeAttribute('data-live');
    write(data.start);
    said.textContent = '';
    requestAnimationFrame(() => svg.setAttribute('data-live', ''));
  });
  less.addEventListener('change', () => box.classList.toggle('reduit', less.checked));
  svg.setAttribute('data-live', '');
})();`;

export function sheet(): string {
  const svg = readFileSync(TURTLE_SVG_PATH, 'utf8').trim();
  const css = readFileSync(TURTLE_CSS_PATH, 'utf8');
  const main = json(TOKEN_SETS[0]) as Tokens;
  const neutral = json(TOKEN_SETS[1]) as Tokens;
  const strings = json('design/strings.json') as Record<string, string>;
  const text = (key: string): string => {
    const value = strings[key];
    if (typeof value !== 'string') throw new Error(`design/strings.json has no ${key}`);
    return value;
  };

  const figure = (
    caption: string,
    size: number,
    options: Parameters<typeof turtleMarkup>[1],
  ): string =>
    `<figure><div style="--turtle-size:${String(size)}px">${turtleMarkup(svg, options)}</div><figcaption>${caption}</figcaption></figure>`;
  const row = (title: string, style: string, cells: string[], note = ''): string =>
    `<section style="${style}">${title === '' ? '' : `<h2>${title}</h2>`}${note === '' ? '' : `<p class="note">${note}</p>`}<div class="row">${cells.join('')}</div></section>`;
  const five = (size: number): string[] =>
    STATES.map((state) => figure(`état ${String(state)}`, size, { state }));

  const light = roles(main, 'light');
  const dark = roles(main, 'dark');
  const black =
    '--bg:#fff;--text:#000;--turtle-line:#000;--turtle-shell:#000;--turtle-arc:#000;--turtle-eye:#000;--turtle-accent:#000';

  const grown: [string, TurtleState, ArcProgress][] = [
    ['1<sup>er</sup> arc : 1 pas', 1, [1, 0, 0]],
    ['3 pas', 1, [3, 0, 0]],
    ['5 pas', 1, [5, 0, 0]],
    ['entier ; 2<sup>e</sup> : 1 pas', 2, [6, 1, 0]],
    ['2<sup>e</sup> : 4 pas', 2, [6, 4, 0]],
    ['entier ; 3<sup>e</sup> : 1 pas', 3, [6, 6, 1]],
    ['3<sup>e</sup> : 4 pas', 3, [6, 6, 4]],
    ['trois arcs entiers', 4, [6, 6, 6]],
  ];

  // The game block as the plan describes it, with the kit's own words — a mock: the real
  // screen is judged on the preview once the game is built (lot L).
  const screen = (style: string): string =>
    `<div class="phone" style="${style}"><p class="bar"><b>C’est écrit là</b><span>Sommaire</span></p><p class="bar small">Site non officiel.</p><p class="kicker">${text('game.kicker')}</p><p class="word">«&nbsp;un mot&nbsp;»</p><p class="ask">${text('game.question.part')}</p><div class="with"><span class="quiet">${text('game.dont_know')}</span><div style="--turtle-size:72px">${turtleMarkup(svg, { state: 2 })}</div></div><div class="tiles">${[1, 2, 3, 4, 5, 6].map((n) => `<span>Titre de la partie ${String(n)}</span>`).join('')}</div></div>`;

  const start: TurtleLook = { state: 0, arcs: STATE_ARCS[0], pose: 'rest', passage: false };
  const frames = passages();
  const data = {
    start: pageFrame({ ...start, at: 0 }),
    passages: frames.map((list) => list.map(pageFrame)),
    said: {
      up: text('turtle.raises_head'),
      look: text('turtle.hint.said').replace('{parts}', '1, 3 et 6'),
      still: 'Mouvement réduit : aucun geste ne démarre. Sa fiche s’ouvre quand même.',
      grown: 'Fin de manche : elle passe à l’état {n}.',
      last: 'Elle a tout trouvé : plus rien ne change.',
    },
  };
  const longest = Math.max(...frames.map(framesDuration));

  const body = [
    `<section style="${light}"><h2>Dans l’écran du jeu, à 390 px — maquette</h2><p class="note">Elle ne vit que dans le bloc du jeu, à 72 px ; jamais près du champ, d’une réponse ou d’une fiche. L’écran réel se juge sur l’aperçu.</p><div class="row top">${screen(light)}${screen(dark)}</div></section>`,
    row('Les cinq états : à 168 px (sa fiche), puis à 72 px (le jeu)', light, [
      ...five(168),
      ...five(72),
    ]),
    row('Sur fond sombre', dark, [...five(168), ...five(72)]),
    row(
      'Les arcs grandissent depuis le sommet, en six pas chacun',
      light,
      grown.map(([caption, state, arcs]) => figure(caption, 104, { state, arcs })),
      'Un trait continu : ce qui a grandi se voit, ce qui manque n’est dessiné nulle part.',
    ),
    row('Trois poses, et le seul accent', light, [
      figure('au repos', 168, { state: 3 }),
      figure('on la touche : tête levée', 168, { state: 3, pose: 'up' }),
      figure('un indice : elle regarde les tuiles', 168, { state: 3, pose: 'look' }),
      figure('un passage : l’accent', 168, { state: 4, passage: true }),
    ]),
    `<section id="gestes" style="${light}"><h2>Les gestes, à vitesse réelle</h2><p class="note">Elle ne bouge jamais seule : chaque mouvement répond à un geste. Une pose se garde jusqu’au geste suivant. Le passage le plus long dure ${String(longest)} ms.</p><div class="row top"><div style="--turtle-size:240px">${turtleMarkup(svg, { state: 0 })}</div><div class="buttons"><button type="button" id="toucher">La toucher</button><button type="button" id="indice">Un indice</button><button type="button" id="suivant">Mot suivant</button><button type="button" id="evoluer">Fin de manche : elle évolue</button><button type="button" id="zero">Repartir de l’état 0</button><label><input type="checkbox" id="reduit"> Mouvement réduit</label><p id="dit" role="status"></p></div></div></section>`,
    row('Silhouettes en noir — reconnaît-on une tortue ?', black, [
      ...STATES.map((state) => figure(`état ${String(state)}`, 72, { state })),
      figure('à 48 px', 48, { state: 4 }),
      figure('à 240 px', 240, { state: 4 }),
    ]),
    row(
      'Jeu de couleurs neutre (si la charte est retirée), clair puis sombre',
      roles(neutral, 'light'),
      five(72),
    ),
    row('', roles(neutral, 'dark'), five(72)),
  ];

  return `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>La tortue — planche de validation</title>
<style>
:root{${motion(main)}}
body{margin:0;font:14px/1.45 system-ui,sans-serif;background:#fff;color:#212320}
header,footer{padding:16px 20px;max-width:62rem}
h1{font-size:20px;margin:0 0 4px}
section{background:var(--bg);color:var(--text);padding:14px 20px 20px}
h2{font-size:13px;font-weight:600;margin:0 0 10px}
.note{margin:-6px 0 12px;font-size:12px;max-width:44rem}
.row{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end}
.row.top{align-items:flex-start}
figure{margin:0;text-align:center;font-size:12px}
li{margin:4px 0}
code{font-size:12px}
.phone{box-sizing:border-box;inline-size:390px;max-inline-size:100%;padding:0 16px 16px;background:var(--bg);color:var(--text);border:1px solid color-mix(in srgb,var(--text) 25%,transparent);border-radius:12px}
.phone p{margin:0}
.bar{display:flex;justify-content:space-between;padding-block-start:10px}
.small{font-size:12px;padding-block-start:0}
.kicker{font-weight:700;margin-block-start:22px!important}
.word{font-size:34px;font-weight:700;line-height:1.2}
.ask{font-size:17px;margin-block:6px 10px!important}
.with{display:flex;justify-content:space-between;align-items:flex-end;margin-block-end:12px}
.quiet{text-decoration:underline}
.tiles{display:grid;gap:8px}
.tiles span{padding:11px 12px;border:1px solid color-mix(in srgb,var(--text) 35%,transparent);border-radius:8px}
.buttons{display:grid;gap:8px;justify-items:start}
.buttons button{font:inherit;padding:8px 12px;min-block-size:44px}
#dit{min-block-size:1.5em;margin:0;font-weight:600}
.reduit .turtle *{transition:none!important}
${css}
</style>
<header>
<h1>La tortue — planche de validation</h1>
<p>Sans nom : l’interface dit « ta tortue ». Elle évolue par ce qu’on a découvert, jamais par un bon ou un mauvais choix ; elle ne recule pas et ne bouge jamais seule. Dessin : <code>${TURTLE_SVG_PATH}</code>, états et poses : <code>${TURTLE_CSS_PATH}</code>.</p>
</header>
${body.join('\n')}
<footer>
<h2>Sept contraintes, à cocher oui ou non</h2>
<ol>${CHECKS.map((check) => `<li>${check}</li>`).join('')}</ol>
<p>Et le critère éliminatoire de toujours : sobre et tenace — <strong>ni enfantine, ni moche</strong>.</p>
<p>Valider : <code>npx tsx scripts/mascot-sheet.ts --validated AAAA-MM-JJ</code> (la date du jour) l’écrit dans <code>${TURTLE_VALIDATION_PATH}</code>, avec l’empreinte de ce qui est montré ici — le dessin, sa feuille de style, ses couleurs. Une retouche de l’un des trois fait tomber la validation.</p>
<p>Empreinte : <code>${turtleFingerprint() ?? ''}</code></p>
</footer>
<script type="application/json" id="frames">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script>${PLAYER}</script>
</html>
`;
}

/** What design/mascot/validation.json holds: two dates of the editor, and what they are about. */
export interface TurtleValidation {
  /** The day the editor validated the sheet (lot K3). */
  validated_on: string | null;
  /** Fingerprint of the drawing, its stylesheet and its colours on that day. */
  drawing_sha256: string | null;
  /** The day "same character?" was asked to fresh readers, images side by side (D16.11). */
  same_character_asked_on: string | null;
  /** Fingerprint of the drawing the question was asked about. */
  same_character_sha256: string | null;
  /** What the readers answered, counted; null while the question has not been asked. */
  same_character_answers: { asked: number; same: number; not_same: number; unsure: number } | null;
  note_fr: string;
}

export function readValidation(): TurtleValidation | null {
  if (!existsSync(TURTLE_VALIDATION_PATH)) return null;
  return json(TURTLE_VALIDATION_PATH) as TurtleValidation;
}

if (process.argv[1] !== undefined && /mascot-sheet\.ts$/.test(process.argv[1])) {
  const args = process.argv.slice(2);
  const page = sheet();
  if (args[0] === '--check') {
    if (!existsSync(SHEET_PATH) || readFileSync(SHEET_PATH, 'utf8') !== page) {
      console.error(`${SHEET_PATH} is not what the drawing gives: run scripts/mascot-sheet.ts`);
      process.exitCode = 1;
    }
  } else if (args[0] === '--validated') {
    const today = new Date().toISOString().slice(0, 10);
    const current = readValidation();
    if (args[1] !== today) {
      console.error(`type today's date to validate the sheet: --validated ${today}`);
      process.exitCode = 1;
    } else if (current === null || readFileSync(SHEET_PATH, 'utf8') !== page) {
      console.error(`${SHEET_PATH} is not the sheet of today's drawing: regenerate it, look again`);
      process.exitCode = 1;
    } else {
      const next: TurtleValidation = {
        ...current,
        validated_on: today,
        drawing_sha256: turtleFingerprint(),
      };
      writeFileSync(TURTLE_VALIDATION_PATH, `${JSON.stringify(next, null, 2)}\n`);
      console.log(`validated on ${today}: ${TURTLE_VALIDATION_PATH}`);
    }
  } else {
    writeFileSync(SHEET_PATH, page);
    console.log(`written: ${SHEET_PATH}`);
  }
}

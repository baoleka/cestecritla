/**
 * The sheet the editor validates the second-generation mascot on (lots A1 and A2 of
 * docs/discovery/PLAN-TORTUE.md; D17.1 to D17.17): one page — her four evolutions, her figures
 * and the small move she makes for a word found, all played on a gesture; then, in still
 * images, her five states, her colours, her signs, her poses. Written from the drawing itself
 * (design/mascot/v2/mascot.svg), the stylesheet that will ship (src/styles/mascot2.css), the
 * choreography (src/lib/mascot2.ts), the tokens and the palettes — never from a copy.
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
 * copy — attributes only, each computed here, exactly what a page of the site may do. Nothing
 * on it moves before a button is pressed. Every number the page prints is computed here too —
 * weights, shapes, contrasts, durations — except what only a browser can measure (flashes,
 * frames, the true end of a movement), which scripts/mascot2-motion.ts measures on this very
 * page and writes to design/mascot/v2/motion.json.
 *
 * IN PREPARATION: the turtle that is online has her own sheet (scripts/mascot-sheet.ts,
 * design/mascot/planche.html), validated on 13 November 2026 and not touched.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import {
  BEAT_MAX_MS,
  EVOLUTIONS,
  EVOLUTION_MAX_MS,
  FINDS,
  GESTURE_MAX_MS,
  MAX_BOTH_BYTES,
  MAX_DRAWING_BYTES,
  MAX_SHAPES_IN_FILE,
  MAX_SHAPES_SEEN,
  MAX_STYLESHEET_BYTES,
  MOVING_LIMIT_MS,
  PASSAGES,
  SHAPES_SEEN,
  evolution,
  evolutionLasts,
  framesLast,
  lookOf,
  pulse,
  trick,
  type ArcProgress,
  type LookOptions,
  type MascotFrame,
  type MascotLook,
  type Passage,
  type Standing,
  type TurtleState,
} from '../src/lib/mascot2.js';
import { arcAttributes } from '../src/lib/turtle.js';
import { STRINGS_PATH, TOKEN_SETS } from './launch.js';
import {
  FLASHES_PER_SECOND_MAX,
  FLASH_AREA_PX,
  LINE_MIN,
  MASCOT2_CSS_PATH,
  MASCOT2_MOTION_PATH,
  MASCOT2_SHEET_PATH,
  MASCOT2_SVG_PATH,
  MASCOT2_VALIDATION_PATH,
  contrastRatio,
  mascot2Fingerprint,
  readMotion,
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
  motion?: { duration?: Record<string, string>; easing?: Record<string, string> };
}

/** How many times slower the sheet plays her when asked to: every duration of hers is a token. */
export const SLOW = 4;
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

/**
 * A look as the page's script reads it: every attribute it will write, already computed — and,
 * last, the beat of an evolution it belongs to, if any.
 */
const lookText = (look: MascotLook, phase: string | null = null): string =>
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
    phase ?? '',
  ].join('|');

/** Frames as the page's script reads them: when, then the look. */
const framesText = (frames: readonly MascotFrame[]): string =>
  frames.map((frame) => `${String(frame.at)}|${lookText(frame, frame.phase)}`).join(';');

/**
 * The script of the page. It puts a copy of the drawing in each figure and writes its look;
 * then, on a button and never before, it plays the frames of a clip — attributes only, on a
 * timer, as the game will. « Passer », reduced motion (the box on the page, or the setting of
 * the system): the last look at once, and nothing moves.
 */
const PLAYER = `(() => {
  const model = document.getElementById('mascot').content.firstElementChild;
  const write = (svg, text) => {
    const [state, pose, tint, sign, passage, a1, o1, a2, o2, a3, o3, phase] = text.split('|');
    svg.setAttribute('data-state', state);
    svg.setAttribute('data-pose', pose);
    svg.setAttribute('data-tint', tint);
    svg.setAttribute('data-sign', sign);
    svg.toggleAttribute('data-passage', passage === '1');
    const arcs = [a1, o1, a2, o2, a3, o3];
    for (const i of [0, 1, 2]) {
      for (const arc of svg.querySelectorAll('.m-arc-' + String(i + 1))) {
        arc.setAttribute('stroke-dasharray', arcs[2 * i]);
        arc.setAttribute('stroke-dashoffset', arcs[2 * i + 1]);
      }
    }
    if (phase) svg.setAttribute('data-phase', phase);
    else svg.removeAttribute('data-phase');
  };
  for (const box of document.querySelectorAll('[data-look]')) {
    const svg = model.cloneNode(true);
    write(svg, box.dataset.look);
    box.append(svg);
  }

  const less = document.getElementById('less');
  const slowly = document.getElementById('slowly');
  const system = window.matchMedia('(prefers-reduced-motion: reduce)');
  const timers = new Map();
  const frames = (box) =>
    box.dataset.frames.split(';').map((frame) => {
      const cut = frame.indexOf('|');
      return [Number(frame.slice(0, cut)), frame.slice(cut + 1)];
    });
  const hold = (svg) => {
    for (const timer of timers.get(svg) ?? []) window.clearTimeout(timer);
    timers.set(svg, []);
  };
  // A look given at once: nothing of it is played.
  const settle = (svg, text) => {
    hold(svg);
    svg.removeAttribute('data-live');
    write(svg, text);
  };
  const play = (box) => {
    const svg = box.querySelector('svg');
    const list = frames(box);
    if (less.checked || system.matches) return settle(svg, list[list.length - 1][1]);
    settle(svg, box.dataset.look);
    void svg.getBoundingClientRect();
    svg.setAttribute('data-live', '');
    const slow = Number(document.body.dataset.slow ?? '1');
    for (const [at, text] of list) {
      timers.get(svg).push(window.setTimeout(write, at * slow, svg, text));
    }
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-play], [data-skip], [data-back]');
    if (button === null) return;
    const name = button.dataset.play ?? button.dataset.skip ?? button.dataset.back;
    for (const box of document.querySelectorAll('[data-clip="' + name + '"]')) {
      const list = frames(box);
      if (button.dataset.play !== undefined) play(box);
      else if (button.dataset.skip !== undefined) settle(box.querySelector('svg'), list[list.length - 1][1]);
      else settle(box.querySelector('svg'), box.dataset.look);
    }
  });
  slowly.addEventListener('change', () => {
    if (slowly.checked) document.body.dataset.slow = '${String(SLOW)}';
    else document.body.removeAttribute('data-slow');
  });
})();`;

/** What she is just before each passage and just after, as the game will have her. */
const BEFORE: Readonly<Record<Passage, Standing>> = {
  '01': { state: 0, arcs: [0, 0, 0], tint: 0 },
  '12': { state: 1, arcs: [3, 0, 0], tint: 0 },
  '23': { state: 2, arcs: [6, 5, 0], tint: 3 },
  '34': { state: 3, arcs: [6, 6, 5], tint: 3 },
};
const AFTER: Readonly<Record<Passage, Standing>> = {
  '01': { state: 1, arcs: [3, 0, 0], tint: 0 },
  '12': { state: 2, arcs: [6, 1, 0], tint: 0 },
  '23': { state: 3, arcs: [6, 6, 1], tint: 3 },
  '34': { state: 4, arcs: [6, 6, 6], tint: 3 },
};

/** The four evolutions in words: a title, the sentence the editor kept for it (D17.23), and beat by beat. */
const PASSAGE_FR: Readonly<
  Record<Passage, { title: string; says: string; beats: Record<string, string> }>
> = {
  '01': {
    title: '0 → 1 — la vague arrive',
    says: 'Elle prend la vague.',
    beats: {
      in: 'ses trois trouvailles paraissent ; elle lève la tête',
      to: 'elles viennent à elle ; son premier arc paraît',
      wave: 'un trait s’écrit sous elle : une vague, encore basse',
      board: 'sa planche glisse sous ses pattes ; un petit saut',
      rise: 'la vague monte et se remplit ; elle se penche',
      foam: 'l’écume : une goutte, puis deux',
    },
  },
  '12': {
    title: '1 → 2 — la vague la redessine',
    says: 'Ta tortue est devenue un flamant.',
    beats: {
      in: 'ses trois trouvailles paraissent',
      to: 'elles viennent à elle ; elle se ramasse sur sa planche',
      cover: 'l’eau monte et se referme sur elle, à plat',
      under: 'un temps de calme — c’est là qu’elle change, sans rien qui clignote',
      neck: 'un trait sort de l’eau et monte : son cou, puis sa tête',
      shore: 'l’eau retombe ; son corps se découvre, ses pattes s’allongent',
      stand: 'elle replie une patte',
      rest: 'le rond dans l’eau prend la couleur d’accent',
    },
  },
  '23': {
    title: '2 → 3 — l’envol',
    says: 'Elle s’envole.',
    beats: {
      in: 'ses trois trouvailles paraissent',
      to: 'elles viennent à elle ; elle recule d’un pas et s’abaisse',
      run: 'elle court sur l’eau : trois pas, un rond à chaque pas',
      wings: 'ses ailes s’ouvrent',
      lift: 'elle décolle : pattes à l’arrière, cou tendu ; l’eau et son reflet paraissent',
      glide: 'deux battements plus lents ; son reflet prend la couleur d’accent',
    },
  },
  '34': {
    title: '3 → 4 — la tortue dans le ciel',
    says: 'Il y a une tortue dans le ciel.',
    beats: {
      in: 'ses trois trouvailles paraissent',
      to: 'elles viennent à elle',
      dusk: 'le ciel du soir paraît, en une seule fois ; elle descend un peu',
      'stars-1': 'trois étoiles, l’une après l’autre',
      'stars-2': 'deux autres : la carapace est là',
      'stars-3': 'les pattes, puis la tête',
      lines: 'un trait s’écrit d’étoile en étoile',
      pass: 'un battement d’ailes ; la dernière étoile prend la couleur d’accent',
    },
  },
};

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
  const her = (size: number, options: LookOptions, phase: string | null = null): string =>
    `<div class="m" style="--mascot-size:${String(size)}px" data-look="${lookText(lookOf(options), phase)}"></div>`;
  /** A place where she can be played: her first look, and the frames a button will give her. */
  const played = (
    clip: string,
    size: number,
    first: MascotLook,
    frames: readonly MascotFrame[],
  ): string =>
    `<div class="m" style="--mascot-size:${String(size)}px" data-clip="${clip}" data-look="${lookText(first)}" data-frames="${framesText(frames)}"></div>`;

  // --- her durations: the tokens of the site, and the same four times slower -------------------
  const timing = (factor: number): string =>
    [
      ...Object.entries(main.motion?.duration ?? {})
        .filter(([, value]) => /^\d+ms$/.test(value))
        .map(([name, value]) => `--duration-${name}:${String(parseInt(value, 10) * factor)}ms`),
      ...(factor === 1
        ? Object.entries(main.motion?.easing ?? {}).map(
            ([name, value]) => `--easing-${name}:${value}`,
          )
        : []),
    ].join(';');
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
  // Before the editor has chosen, every candidate is shown; after, his palette alone.
  const compared = palette.chosen === null ? names : [palette.chosen];
  const palettes = compared.map((name) => {
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
    `<tr><th>Sa feuille de style, gzip — états et mouvement</th><td>${octets(stylesheetBytes)}</td><td>plafond ${octets(MAX_STYLESHEET_BYTES)}</td></tr>`,
    `<tr><th>Les deux</th><td>${octets(drawingBytes + stylesheetBytes)}</td><td>plafond ${octets(MAX_BOTH_BYTES)} (${octets(6 * 1024)} pour la tortue en ligne)</td></tr>`,
    `<tr><th>Formes dans le fichier</th><td>${String(shapes)}</td><td>plafond ${String(MAX_SHAPES_IN_FILE)}</td></tr>`,
    ...STATES.map(
      (state) =>
        `<tr><th>Formes visibles — ${FORM_FR[state]}</th><td>${String(SHAPES_SEEN[state].length)}</td><td>plafond ${String(MAX_SHAPES_SEEN[state])}</td></tr>`,
    ),
  ];

  // --- her movement: the four evolutions, her figures, a word found, the end of a round --------
  const measured2 = readMotion();
  const fresh = measured2 !== null && measured2.drawing_sha256 === mascot2Fingerprint();
  const thousands = (n: number): string =>
    String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const evolutions = PASSAGES.map((passage) => {
    const words = PASSAGE_FR[passage];
    const frames = evolution(BEFORE[passage], AFTER[passage]);
    const first = lookOf(BEFORE[passage]);
    const beats = [...FINDS, ...EVOLUTIONS[passage]];
    const strip = frames.map((frame, index) => {
      const beat = beats[index];
      const caption =
        beat === undefined
          ? `<b>${thousands(frame.at)} ms</b><br>elle est arrivée`
          : `<b>${thousands(frame.at)} ms</b> · ${String(beat.lasts)} ms<br>${words.beats[beat.name] ?? ''}`;
      return `<figure>${her(118, frame, frame.phase)}<figcaption>${caption}</figcaption></figure>`;
    });
    return `<div class="evo"><h3>${words.title} · ${thousands(evolutionLasts(passage))} ms</h3><p class="says">Sa phrase, à la fin de ce passage : « ${words.says} »</p><div class="row"><div class="scene" style="${light}">${played(passage, 240, first, frames)}</div><div class="scene" style="${dark}">${played(passage, 240, first, frames)}</div><p class="keys"><button type="button" data-play="${passage}">Jouer</button> <button type="button" data-skip="${passage}">Passer</button> <button type="button" data-back="${passage}">Revenir au début</button></p></div><p class="note strip-note">Temps par temps — son état posé à la fin de chaque temps :</p><div class="row strip">${strip.join('')}</div></div>`;
  });

  const HELD: Readonly<Record<TurtleState, ArcProgress>> = {
    0: [0, 0, 0],
    1: [3, 0, 0],
    2: [6, 2, 0],
    3: [6, 6, 2],
    4: [6, 6, 6],
  };
  const held = (state: TurtleState): MascotLook =>
    lookOf({ state, arcs: HELD[state], tint: state >= 2 ? 3 : 0, sign: 0 });
  const gesture = (
    clip: string,
    caption: string,
    button: string,
    first: MascotLook,
    frames: readonly MascotFrame[],
  ): string =>
    `<figure>${played(clip, 170, first, frames)}<figcaption>${caption}<br><button type="button" data-play="${clip}">${button}</button></figcaption></figure>`;
  const TRICK_FR = [
    'elle lève la tête',
    'un virage sur sa vague',
    'elle bat des ailes, deux fois',
    'deux battements d’ailes',
    'sa constellation se récrit',
  ];
  const PULSE_FR = [
    'un petit bond, et elle hoche la tête',
    'un petit bond sur sa vague',
    'un petit bond, et elle plonge la tête',
    'un petit bond, et un battement d’ailes',
    'un petit bond, et une étoile bat, une fois',
  ];

  const tricks = STATES.map((state) =>
    gesture(
      `trick-${String(state)}`,
      TRICK_FR[state] ?? '',
      'La toucher',
      held(state),
      trick(held(state)),
    ),
  );
  const pulses = STATES.map((state) =>
    gesture(
      `pulse-${String(state)}`,
      PULSE_FR[state] ?? '',
      'Un mot trouvé',
      held(state),
      pulse(held(state)),
    ),
  );
  const ENDS: readonly [string, Standing, Standing][] = [
    [
      'la tortue qui surfe : son premier arc grandit',
      { state: 1, arcs: [3, 0, 0], tint: 0 },
      { state: 1, arcs: [5, 0, 0], tint: 0 },
    ],
    [
      'le flamant : son deuxième arc grandit',
      { state: 2, arcs: [6, 2, 0], tint: 3 },
      { state: 2, arcs: [6, 3, 0], tint: 3 },
    ],
    [
      'en vol : son troisième arc grandit',
      { state: 3, arcs: [6, 6, 2], tint: 3 },
      { state: 3, arcs: [6, 6, 3], tint: 3 },
    ],
  ];
  const ends = ENDS.map(([caption, from, to], index) =>
    gesture(`end-${String(index)}`, caption, 'Fin de manche', lookOf(from), evolution(from, to)),
  );

  // --- what her movement lasts, and what three browsers measured of it --------------------------
  const longest = (passage: Passage): number =>
    Math.max(...[...FINDS, ...EVOLUTIONS[passage]].map((beat) => beat.lasts));
  const engines = fresh ? Object.keys(measured2.browsers) : [];
  const flashCell = (passage: Passage): string => {
    const flashes = fresh ? measured2.clips[passage]?.flashes : undefined;
    if (flashes === undefined) return '<td>à mesurer</td><td>à mesurer</td>';
    return (['light', 'dark'] as const)
      .map((theme) => {
        const f = flashes[theme];
        return `<td><b>${String(f.flashes_per_second)}</b> par seconde ; ${thousands(f.area_px)} px² au plus changent de lumière deux fois dans la même seconde ; rouge saturé : <b>${String(f.red_flashes_per_second)}</b>, sur ${thousands(f.red_area_px)} px² ; la scène entière : ${String(f.scene_pairs)}</td>`;
      })
      .join('');
  };
  const movingRows = PASSAGES.map((passage) => {
    const clip = fresh ? measured2.clips[passage] : undefined;
    const ended =
      clip === undefined
        ? 'à mesurer'
        : engines.map((engine) => `${thousands(clip.moving_ms[engine] ?? 0)} ms`).join(' · ');
    const frames =
      clip?.frames === undefined
        ? 'à mesurer'
        : `95 % des images en ${fr(clip.frames.p95_ms, 1)} ms ou moins ; ${fr(clip.frames.over_20_pct, 1)} % au-delà de 20 ms ; ${String(clip.frames.over_50)} au-delà de 50 ms`;
    return `<tr><th>${PASSAGE_FR[passage].title}</th><td>${thousands(evolutionLasts(passage))} ms</td><td>${String(longest(passage))} ms</td><td>${ended}</td>${flashCell(passage)}<td>${clip === undefined ? 'à mesurer' : `${fr(clip.spill_px, 1)} px`}</td><td>${frames}</td></tr>`;
  });
  const gestureRows = (['trick', 'pulse', 'end'] as const).map((kind) => {
    const names = Object.keys(fresh ? measured2.clips : {}).filter((name) =>
      name.startsWith(`${kind}-`),
    );
    const worst = (engine: string): number =>
      Math.max(0, ...names.map((name) => measured2?.clips[name]?.moving_ms[engine] ?? 0));
    const label = {
      trick: 'Une figure (on la touche)',
      pulse: 'Un mot trouvé',
      end: 'Une fin de manche sans passage',
    }[kind];
    const data = {
      trick: Math.max(...STATES.map((state) => framesLast(trick(held(state))))),
      pulse: framesLast(pulse(held(0))),
      end: framesLast(evolution(BEFORE['12'], BEFORE['12'])),
    }[kind];
    return `<tr><th>${label}</th><td>${String(data)} ms</td><td>${names.length === 0 ? 'à mesurer' : engines.map((engine) => `${thousands(worst(engine))} ms`).join(' · ')}</td></tr>`;
  });
  const animated = [
    ...new Set(
      [...css.matchAll(/transition:([^;}]+)[;}]/g)].flatMap((m) =>
        (m[1] ?? '').split(',').map((part) => part.trim().split(/\s+/)[0] ?? ''),
      ),
    ),
  ].sort();
  const movement = `<section><h2>Ce que son mouvement dure, et ce que les navigateurs en ont mesuré</h2><p class="note">Les durées viennent de la chorégraphie elle-même (<code>src/lib/mascot2.ts</code>). Le reste est mesuré sur cette page${fresh ? `, le ${measured2.measured_on}, dans ${engines.map((engine) => measured2.browsers[engine] ?? engine).join(', ')}` : ' — <strong>à mesurer : <code>npx tsx scripts/mascot2-motion.ts --write</code></strong>'}. Un « éclair », au sens de la règle d’accessibilité (WCAG 2.3.1), est une paire de changements de lumière opposés d’au moins 10 %, sur une surface d’au moins ${thousands(FLASH_AREA_PX)} px² (un quart du champ de vision central) ; la règle en admet ${String(FLASHES_PER_SECOND_MAX)} par seconde. Chaque évolution est filmée image par image, en clair et en sombre, et chaque pixel est suivi : ce qui bouge — une aile, une vague — change bien de lumière là où il passe, mais sur une surface qui reste sous ce seuil.</p><table><thead><tr><th>Évolution</th><th>Durée (plafond ${thousands(EVOLUTION_MAX_MS)} ms ; jamais ${thousands(MOVING_LIMIT_MS)})</th><th>Son temps le plus long (plafond ${String(BEAT_MAX_MS)} ms)</th><th>Fin du dernier mouvement${engines.length === 0 ? '' : ` (${engines.join(' · ')})`}</th><th>Éclairs, thème clair</th><th>Éclairs, thème sombre</th><th>Sortie du cadre, au pire</th><th>Fluidité : processeur ralenti 4 fois, écran de téléphone, sa scène seule sur la page comme dans le jeu (Chromium)</th></tr></thead><tbody>${movingRows.join('')}</tbody></table><table class="after"><thead><tr><th>Geste</th><th>Durée (plafond ${String(GESTURE_MAX_MS)} ms)</th><th>Fin du dernier mouvement, au pire${engines.length === 0 ? '' : ` (${engines.join(' · ')})`}</th></tr></thead><tbody>${gestureRows.join('')}</tbody></table><p class="note after">Ce qui bouge : <code>${animated.join('</code>, <code>')}</code> — et rien d’autre. Aucune boucle : chaque animation se joue un nombre compté de fois. Rien ne démarre sans un geste. En mouvement réduit, rien ne bouge : la forme finale est posée d’un coup. Mesures : <code>${MASCOT2_MOTION_PATH}</code>.</p></section>`;

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
    `<section style="${light}"><h2>Ses quatre évolutions, à vitesse réelle</h2><p class="note">Chacune se joue une fois, quand on vient de la gagner, sur la scène de fin de manche (240 px) — jamais au chargement d’une page, jamais quand son état revient du téléphone. Rien ici ne bouge avant qu’on appuie sur « Jouer ». « Passer » pose la forme finale aussitôt, comme le feront dans le jeu le bouton, un appui sur la scène, la touche Échap ou n’importe quel bouton du jeu. Les deux scènes — fond clair, fond sombre — jouent ensemble. Les phrases sont celles que l’éditeur a retenues le 15 novembre 2026 (D17.23).</p><p class="controls"><label><input type="checkbox" id="less"> Mouvement réduit (ce que voit qui l’a demandé à son téléphone : la forme finale, d’un coup)</label><label><input type="checkbox" id="slowly"> Au ralenti, ${String(SLOW)} fois plus lent (pour regarder de près ; le jeu ne ralentit jamais)</label></p>${evolutions.join('')}</section>`,
    row(
      'Ses figures : on la touche',
      light,
      tricks,
      `Une figure par état, ${String(GESTURE_MAX_MS)} ms au plus, puis elle reprend sa pose. Dans le jeu, sa fiche s’ouvre ensuite.`,
    ),
    row(
      'À chaque mot trouvé : un petit mouvement, le même quel que soit le choix',
      light,
      pulses,
      'Elle ne dit jamais si le choix était le bon : un mot trouvé est un mot dont on a vu l’emplacement.',
    ),
    row(
      'À chaque fin de manche : les trois trouvailles viennent à elle, et son arc grandit',
      light,
      ends,
      'C’est aussi le premier temps de chaque évolution : il dit pourquoi elle change.',
    ),
    movement,
    `<section style="${light}"><h2>Dans le jeu, à 390 px — maquettes</h2><p class="note">À gauche, pendant qu’on joue : elle est à côté du mot, à 96 px (72 px aujourd’hui, dans un coin). À droite, à chaque fin de manche : elle prend une scène de 240 px, et c’est là que ses évolutions se joueront. Elle ne vit que dans le bloc du jeu. Les écrans réels se jugent sur l’aperçu.</p><div class="row top">${asking(light)}${ending(light)}${asking(dark)}${ending(dark)}</div></section>`,
    row('Les cinq états, à 240 px (la scène, sa fiche)', light, five(240)),
    row('À 96 px (à côté du mot), puis à 80 px (petits écrans)', light, [...five(96), ...five(80)]),
    row('Sur fond sombre', dark, five(240)),
    row('', dark, [...five(96), ...five(80)]),
    `<section style="${light}"><h2>${palette.chosen === null ? 'Sa couleur : deux palettes à départager' : 'Sa couleur : la palette retenue'}</h2><p class="note">Le flamant naît pâle ; le joueur lui donne une couleur parmi six, une par partie du livre, ou la laisse pâle. Chaque valeur est mesurée : notre trait posé sur la teinte doit faire ${String(LINE_MIN)}:1 au moins, et aucune teinte ne tombe dans le mauve, le prune ou le rose que le dessin refuse. La tortue, elle, garde ses violets.${palette.chosen === null ? '' : ' Les six vives de la charte ont été écartées : notre trait disparaît sur trois d’entre elles, en clair comme en sombre, et le vif rose est dans la zone refusée.'}</p></section>`,
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
      'Ses figures sont plus haut : elles se jouent.',
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
<title>Ta tortue, deuxième génération — planche de validation</title>
<style>
body{margin:0;font:14px/1.45 system-ui,sans-serif;background:#fff;color:#212320;${timing(1)}}
body[data-slow]{${timing(SLOW)}}
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
h3{font-size:15px;margin:22px 0 2px}
.says{margin:0 0 10px;font-size:13px}
.scene{background:var(--bg);color:var(--text);padding:10px 14px;border:1px solid color-mix(in srgb,var(--text) 25%,transparent);border-radius:12px}
.keys{margin:0;align-self:center}
button{font:inherit;font-weight:700;padding:8px 16px;margin:0 6px 6px 0;border:2px solid currentColor;border-radius:999px;background:none;color:inherit;cursor:pointer}
figcaption button{margin:6px 0 0;padding:5px 12px;font-size:12px}
.controls{margin:0 0 4px;font-size:13px}
.controls label{display:block;margin:4px 0}
.strip-note{margin:12px 0 6px}
.strip{gap:10px;align-items:flex-start}
.strip figure{inline-size:118px;font-size:11px;line-height:1.3}
.after{margin-block-start:14px}
td,th{max-inline-size:17rem}
${css}
</style>
<header>
<h1>Ta tortue, deuxième génération — planche de validation</h1>
<p>Elle surfe, devient un flamant dont le joueur choisit la couleur, s’envole, puis vole sous une tortue d’étoiles — et s’appelle « ta tortue » d’un bout à l’autre. D’abord le mouvement : ses quatre évolutions, ses figures, ce qu’elle fait à chaque mot trouvé. Ensuite le dessin à l’arrêt, tel qu’il a été regardé le 15 novembre 2026. <strong>Rien de ceci n’est en ligne.</strong> Dessin : <code>${MASCOT2_SVG_PATH}</code> ; états, poses et mouvement : <code>${MASCOT2_CSS_PATH}</code> ; chorégraphie : <code>src/lib/mascot2.ts</code>.</p>
</header>
${body.join('\n')}
<footer>
<h2>Neuf contraintes, à cocher oui ou non</h2>
<ol>${CHECKS.map((check) => `<li>${check}</li>`).join('')}</ol>
<p>Et le critère éliminatoire de toujours : sobre et tenace — <strong>ni enfantine, ni moche</strong>.</p>
<p>Valider, une fois la palette choisie : <code>npx tsx scripts/mascot2-sheet.ts --validated AAAA-MM-JJ</code> (la date du jour) l’écrit dans <code>${MASCOT2_VALIDATION_PATH}</code>, avec l’empreinte de ce qui est montré ici — le dessin, sa feuille de style, ses couleurs, les temps de ses évolutions. Une retouche de l’un des quatre fait tomber la validation.</p>
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

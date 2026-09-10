/**
 * Provisional design tokens for the T4 spike, copied from design/tokens.json v0 (D3.1, D3.4).
 * The app's real tokens are the source of truth; this file must not drift from them.
 */

export const color = {
  violet: '#4C0297',
  rouge: '#D1271C',
  creme: '#FFFCF4',
  charbon: '#212320',
  violet100: '#FDEDFF',
  violet200: '#E5CBFF',
  corail200: '#FFD2CF',
  vifViolet: '#7B13D6',
  vifRose: '#ED5FB1',
  vifVert: '#2E9959',
  vifBleu: '#3885F4',
  vifJaune: '#F9C900',
} as const;

/** part-color from tokens.json (HYPOTHÈSE to confirm at the canvas). */
export const partColor: Record<string, string> = {
  part1: color.vifViolet,
  part2: color.vifRose,
  part3: color.vifVert,
  part4: color.vifBleu,
};

/**
 * Text colour on a part band. Rule 2 (illustration-rules.md) and D3.4: Crème on
 * vif-violet (7.05:1), vif-vert (3.52) and vif-bleu (3.51) for titles >= 24 px;
 * vif-rose (2.98:1) never takes Crème, so the band text is Charbon there.
 */
export const onPartColor = (partId: string): string => (partId === 'part2' ? color.charbon : color.creme);

export const fontFamily = {
  ui: 'Public Sans',
  verbatim: 'Gowun Batang',
} as const;

/** Working title, replaced by the real wordmark after the T10 naming sprint. */
export const wordmark = 'AEC Discover';

/** design/strings.json attribution.card */
export const attributionCard = 'Texte : La France insoumise – L’Avenir en commun (CC BY-NC-SA 4.0)';

export type Ratio = 'og' | 'square' | 'story';

export interface Canvas {
  ratio: Ratio;
  width: number;
  height: number;
  /** Outer padding. */
  pad: number;
  /** Extra vertical inset for story UI overlays (Instagram/WhatsApp status chrome). */
  safeTop: number;
  safeBottom: number;
  /** Height of the "matter" zone (rule 1: ≈ 53 % of the height). */
  matterHeight: number;
  /** Base font sizes, scaled per ratio. */
  label: number;
  title: number;
  small: number;
  verbatimSteps: readonly [number, number, number];
  /** Minimum verbatim size before truncating. */
  verbatimMin: number;
}

export const canvases: Record<Ratio, Canvas> = {
  og: {
    ratio: 'og',
    width: 1200,
    height: 630,
    pad: 56,
    safeTop: 0,
    safeBottom: 0,
    matterHeight: 334,
    label: 20,
    title: 36,
    small: 18,
    verbatimSteps: [50, 42, 34],
    verbatimMin: 26,
  },
  square: {
    ratio: 'square',
    width: 1080,
    height: 1080,
    pad: 64,
    safeTop: 0,
    safeBottom: 0,
    matterHeight: 572,
    label: 22,
    title: 44,
    small: 20,
    verbatimSteps: [54, 46, 38],
    verbatimMin: 28,
  },
  story: {
    ratio: 'story',
    width: 1080,
    height: 1920,
    pad: 72,
    safeTop: 220,
    safeBottom: 220,
    matterHeight: 1018,
    label: 24,
    title: 52,
    small: 22,
    verbatimSteps: [66, 56, 46],
    verbatimMin: 32,
  },
};

export const parseRatio = (value: string | null): Ratio =>
  value === 'square' || value === 'story' ? value : 'og';

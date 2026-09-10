/**
 * Common poster frame (design/illustration-rules.md §1):
 *  - rule 1: matter on top (≈ 53 %), flat colour band below (≈ 47 %);
 *  - rule 2: one dominant colour per object (the part colour), Crème or Charbon text on it;
 *  - rule 3: band title in Public Sans 900 capitals;
 *  - rule 4: exactly one 3D block per card (solid offset shadow Violet 200) — the wordmark;
 *  - rule 6: signature band at the bottom of the flat zone: wordmark left, CC attribution right;
 *  - rule 7: never a logo, never a photo.
 */
import { box, h, text, type Child, type El, type Style } from '../el.ts';
import { attributionCard, canvases, color, fontFamily, onPartColor, partColor, wordmark, type Ratio } from '../theme.ts';

export interface FrameOptions {
  ratio: Ratio;
  partId: string;
  /** Content of the matter zone (Crème). */
  matter: Child[];
  /** Band title, rendered in capitals. */
  bandTitle: string;
  /** Optional extra line above the signature band (loi 77-808 for stat cards). */
  bandNote?: string;
  /** Optional override of the band background (progress card uses Violet). */
  bandColor?: string;
}

export const label = (ratio: Ratio, content: string, colour: string = color.violet): El =>
  text(
    {
      fontFamily: fontFamily.ui,
      fontWeight: 700,
      fontSize: canvases[ratio].label,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: colour,
      lineHeight: 1,
    },
    content,
  );

/** The one and only 3D block of the card: a Crème box with a solid Violet 200 offset shadow. */
const wordmarkBlock = (ratio: Ratio): El =>
  h(
    'div',
    {
      display: 'flex',
      backgroundColor: color.creme,
      color: color.violet,
      fontFamily: fontFamily.ui,
      fontWeight: 900,
      fontStyle: 'italic',
      fontSize: canvases[ratio].small + 6,
      letterSpacing: '-0.02em',
      textTransform: 'uppercase',
      padding: `${Math.round(canvases[ratio].small * 0.45)}px ${canvases[ratio].small}px`,
      boxShadow: `6px 6px 0 ${color.violet200}`,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    },
    wordmark,
  );

const signature = (ratio: Ratio, textColour: string): El =>
  box(
    { alignItems: 'center', justifyContent: 'space-between', width: '100%' },
    wordmarkBlock(ratio),
    text(
      {
        fontFamily: fontFamily.ui,
        fontWeight: 400,
        fontSize: canvases[ratio].small,
        color: textColour,
        textAlign: 'right',
        lineHeight: 1.2,
        marginLeft: 24,
        flexShrink: 1,
        maxWidth: Math.round(canvases[ratio].width * 0.62),
      },
      attributionCard,
    ),
  );

export const frame = (opts: FrameOptions): El => {
  const c = canvases[opts.ratio];
  const band = opts.bandColor ?? partColor[opts.partId] ?? color.violet;
  const onBand = opts.bandColor ? color.creme : onPartColor(opts.partId);
  const root: Style = {
    width: c.width,
    height: c.height,
    flexDirection: 'column',
    backgroundColor: color.creme,
    color: color.charbon,
    fontFamily: fontFamily.ui,
  };
  const matterStyle: Style = {
    height: c.matterHeight,
    flexDirection: 'column',
    paddingTop: c.safeTop + c.pad * 0.85,
    paddingRight: c.pad,
    paddingBottom: c.pad * 0.5,
    paddingLeft: c.pad,
    overflow: 'hidden',
  };
  const bandStyle: Style = {
    flexGrow: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: band,
    color: onBand,
    paddingTop: c.pad * 0.7,
    paddingRight: c.pad,
    paddingBottom: c.safeBottom + c.pad * 0.7,
    paddingLeft: c.pad,
    overflow: 'hidden',
  };
  const titleStyle: Style = {
    display: 'block',
    lineClamp: opts.ratio === 'og' ? 2 : 3,
    fontFamily: fontFamily.ui,
    fontWeight: 900,
    fontSize: c.title,
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
    textTransform: 'uppercase',
    color: onBand,
  };
  const bandChildren: Child[] = [h('div', titleStyle, opts.bandTitle)];
  if (opts.bandNote) {
    bandChildren.push(
      text(
        {
          fontFamily: fontFamily.ui,
          fontWeight: 400,
          fontSize: c.small,
          lineHeight: 1.3,
          color: onBand,
          marginTop: c.pad * 0.3,
          marginBottom: c.pad * 0.3,
        },
        opts.bandNote,
      ),
    );
  }
  bandChildren.push(signature(opts.ratio, onBand));
  return box(root, box(matterStyle, ...opts.matter), box(bandStyle, ...bandChildren));
};

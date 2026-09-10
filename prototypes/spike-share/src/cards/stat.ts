/** /og/a/<id>.png — an « À savoir » figure with its loi 77-808 line. */
import { box, text, type El } from '../el.ts';
import type { StatView } from '../data.ts';
import { canvases, color, fontFamily, partColor, type Ratio } from '../theme.ts';
import { frame, label } from './frame.ts';
import { fitVerbatim, verbatimBlock } from './verbatim.ts';

const STAT_LABEL = 'À savoir';

/** Percentages are printed the French way: "93,13 %". */
const formatPercent = (value: number): string => `${String(value).replace('.', ',')} %`;

/**
 * Loi 77-808 line, from design/strings.json statcard.legal.full / no_sponsor.
 * The book never gives the first-publication medium; sponsor is given on 3/48 cards.
 */
export const legalLine = (view: StatView): string => {
  const legal = view.card.legal_77_808;
  const chapter = view.chapter.title;
  if (!legal.organisme) return `Chiffre publié dans L’Avenir en commun 2025, ${chapter}.`;
  const dates = legal.dates ?? 'date non précisée';
  const sponsor = legal.commanditaire
    ? `Commanditaire : ${legal.commanditaire}.`
    : 'Commanditaire non précisé dans le livre.';
  return `Sondage ${legal.organisme}, ${dates}. ${sponsor} Publié dans L’Avenir en commun 2025, ${chapter}.`;
};

export const statCard = (view: StatView, ratio: Ratio): El => {
  const c = canvases[ratio];
  const bigSize = ratio === 'og' ? 96 : ratio === 'square' ? 128 : 160;
  const headline = view.card.headline_percentage;
  const reserved = c.label * 2 + bigSize * 1.05;
  const fitted = fitVerbatim(view.text, ratio, reserved, 260);
  const big = text(
    {
      fontFamily: fontFamily.ui,
      fontWeight: 900,
      fontSize: bigSize,
      lineHeight: 1,
      letterSpacing: '-0.03em',
      // D3.4: vif-rose never carries text on Crème (2.98:1); the big figure falls back to Violet there.
      color: view.partId === 'part2' ? color.violet : (partColor[view.partId] ?? color.violet),
      marginTop: Math.round(c.label * 0.6),
    },
    headline === null ? '—' : formatPercent(headline),
  );
  return frame({
    ratio,
    partId: view.partId,
    matter: [box({ alignItems: 'baseline' }, label(ratio, STAT_LABEL)), big, verbatimBlock(fitted, ratio, false)],
    bandTitle: view.section.title,
    bandNote: legalLine(view),
  });
};

/** /og/res/<ids>.png — « Mes 3 mesures »: up to three short verbatims. */
import { box, text, type El } from '../el.ts';
import type { MeasureView } from '../data.ts';
import { canvases, color, fontFamily, partColor, type Ratio } from '../theme.ts';
import { cutAtWord, frenchSpaces } from '../text.ts';
import { frame, label } from './frame.ts';

const TITLE = 'Mes 3 mesures';

export const resultCard = (views: MeasureView[], ratio: Ratio): El => {
  const c = canvases[ratio];
  const perItemChars = ratio === 'og' ? 110 : ratio === 'square' ? 150 : 190;
  const fontSize = ratio === 'og' ? 26 : ratio === 'square' ? 32 : 36;
  const items = views.map((view) =>
    box(
      {
        flexDirection: 'column',
        borderLeft: `6px solid ${partColor[view.partId] ?? color.violet}`,
        paddingLeft: 20,
        marginTop: Math.round(c.label * 0.7),
        overflow: 'hidden',
      },
      text(
        {
          fontFamily: fontFamily.ui,
          fontWeight: 700,
          fontSize: Math.round(c.label * 0.8),
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          // D3.4: the part colour lives on the rule only; labels on Crème stay Violet.
          color: color.violet,
          lineHeight: 1,
          marginBottom: 6,
        },
        view.chapter.title,
      ),
      text(
        { fontFamily: fontFamily.verbatim, fontWeight: 400, fontSize, lineHeight: 1.3, color: color.charbon },
        cutAtWord(frenchSpaces(view.text), perItemChars),
      ),
    ),
  );
  const first = views[0];
  return frame({
    ratio,
    partId: first?.partId ?? 'part1',
    bandColor: color.violet,
    matter: [label(ratio, 'Mon Avenir en commun'), ...items],
    bandTitle: TITLE,
  });
};

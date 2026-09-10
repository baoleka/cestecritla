/** /og/p/<n>-<total>.png — reading progress: flat bar in the four part colours, placeholder mascot. */
import { box, h, text, type El } from '../el.ts';
import type { Corpus } from '../data.ts';
import { canvases, color, fontFamily, partColor, type Ratio } from '../theme.ts';
import { frame, label } from './frame.ts';

export interface ProgressView {
  read: number;
  total: number;
}

const title = (read: number, total: number): string => `J’ai lu ${read} section${read > 1 ? 's' : ''} sur ${total}`;

export const progressCard = (view: ProgressView, corpus: Corpus, ratio: Ratio): El => {
  const c = canvases[ratio];
  const barHeight = ratio === 'og' ? 44 : 60;
  const barWidth = c.width - c.pad * 2;
  const ratioRead = view.total === 0 ? 0 : Math.min(1, view.read / view.total);
  // Segments proportional to the number of sections per part, in book order.
  const totalSections = corpus.sectionsPerPart.reduce((n, p) => n + p.count, 0);
  let cursor = 0;
  const segments: El[] = corpus.sectionsPerPart.map((part) => {
    const width = Math.round((part.count / totalSections) * barWidth);
    const start = cursor / barWidth;
    const end = (cursor + width) / barWidth;
    cursor += width;
    const colour = partColor[part.partId] ?? color.violet;
    const filled = Math.max(0, Math.min(1, (ratioRead - start) / (end - start)));
    return box(
      { width, height: barHeight, backgroundColor: color.violet100, position: 'relative' },
      box({ width: Math.round(width * filled), height: barHeight, backgroundColor: colour }),
    );
  });
  const bar = box({ width: barWidth, height: barHeight, marginTop: Math.round(c.label * 1.2), overflow: 'hidden' }, ...segments);
  const mascotSize = ratio === 'og' ? 96 : 140;
  // Placeholder circle where the original turtle (D0.12) will stand.
  const mascot = h('div', {
    display: 'flex',
    width: mascotSize,
    height: mascotSize,
    borderRadius: 999,
    backgroundColor: color.violet200,
    border: `6px solid ${color.violet}`,
  });
  const headline = text(
    {
      fontFamily: fontFamily.ui,
      fontWeight: 900,
      fontSize: ratio === 'og' ? 56 : ratio === 'square' ? 72 : 84,
      lineHeight: 1.02,
      letterSpacing: '-0.02em',
      color: color.violet,
      textTransform: 'uppercase',
      marginTop: Math.round(c.label * 0.8),
      flexShrink: 1,
    },
    title(view.read, view.total),
  );
  const percent = Math.round(ratioRead * 100);
  return frame({
    ratio,
    partId: 'part1',
    bandColor: color.violet,
    matter: [
      label(ratio, 'Ta lecture'),
      box({ alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }, headline, box({ marginLeft: 24 }, mascot)),
      bar,
    ],
    bandTitle: `${percent} % de L’Avenir en commun 2025`,
    bandNote: 'Quatre couleurs, quatre parties du livre. La progression reste sur ton téléphone.',
  });
};

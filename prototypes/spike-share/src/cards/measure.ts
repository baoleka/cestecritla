/** /og/m/<id>.png — a measure, verbatim, in its chapter and section. */
import type { El } from '../el.ts';
import type { MeasureView } from '../data.ts';
import { canvases, type Ratio } from '../theme.ts';
import { frame, label } from './frame.ts';
import { fitVerbatim, verbatimBlock } from './verbatim.ts';

export const measureCard = (view: MeasureView, ratio: Ratio): El => {
  const c = canvases[ratio];
  const fitted = fitVerbatim(view.text, ratio, c.label * 2);
  return frame({
    ratio,
    partId: view.partId,
    matter: [label(ratio, view.chapter.title), verbatimBlock(fitted, ratio, view.kind === 'key_measure')],
    bandTitle: view.section.title,
  });
};

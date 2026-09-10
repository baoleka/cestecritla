/** /og/r/<id>.png — riposte: an objection (placeholder) answered by the verbatim. */
import { box, text, type El } from '../el.ts';
import type { MeasureView } from '../data.ts';
import { canvases, color, fontFamily, type Ratio } from '../theme.ts';
import { frame, label } from './frame.ts';
import { fitVerbatim, verbatimBlock } from './verbatim.ts';

/** Placeholder until the riposte dataset exists (T8): never a real quote. */
const OBJECTION_PLACEHOLDER = 'Objection : « … »';
const ANSWER_LABEL = 'Ce que dit le programme :';

export const riposteCard = (view: MeasureView, ratio: Ratio): El => {
  const c = canvases[ratio];
  const objectionSize = Math.round(c.title * 0.8);
  const reserved = c.label * 2 + objectionSize * 1.3 + c.label * 2.2;
  const fitted = fitVerbatim(view.text, ratio, reserved, 280);
  const objection = text(
    {
      fontFamily: fontFamily.ui,
      fontWeight: 900,
      fontStyle: 'italic',
      fontSize: objectionSize,
      lineHeight: 1.1,
      color: color.rouge,
      marginTop: Math.round(c.label * 0.6),
    },
    OBJECTION_PLACEHOLDER,
  );
  return frame({
    ratio,
    partId: view.partId,
    matter: [
      label(ratio, 'Mode riposte'),
      objection,
      box({ marginTop: Math.round(c.label * 1.1) }, label(ratio, ANSWER_LABEL, color.charbon)),
      verbatimBlock(fitted, ratio, false),
    ],
    bandTitle: view.section.title,
  });
};

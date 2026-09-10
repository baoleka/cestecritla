/** Shared verbatim block (D3.2: Gowun Batang, Violet left rule, never italic). */
import { box, text, type El } from '../el.ts';
import { canvases, color, fontFamily, type Ratio } from '../theme.ts';
import { fitText, frenchSpaces, type Fitted } from '../text.ts';

export const READ_MORE = 'Lire la suite';

/** Available height for the verbatim inside the matter zone after the label. */
export const matterBox = (ratio: Ratio, reservedHeight: number): { width: number; height: number } => {
  const c = canvases[ratio];
  return {
    width: c.width - c.pad * 2 - 30, // 30 = left rule + its padding
    height: c.matterHeight - c.safeTop - c.pad * 0.85 - c.pad * 0.5 - reservedHeight,
  };
};

export const fitVerbatim = (source: string, ratio: Ratio, reservedHeight: number, maxChars?: number): Fitted => {
  const c = canvases[ratio];
  const boxSize = matterBox(ratio, reservedHeight);
  const options = {
    width: boxSize.width,
    height: boxSize.height,
    steps: c.verbatimSteps,
    min: c.verbatimMin,
    lineHeight: 1.35,
    avgCharEm: 0.52,
    ...(maxChars === undefined ? {} : { maxChars }),
  };
  return fitText(frenchSpaces(source), options);
};

export const verbatimBlock = (fitted: Fitted, ratio: Ratio, bold: boolean): El => {
  const c = canvases[ratio];
  const children: El[] = [
    text(
      {
        fontFamily: fontFamily.verbatim,
        fontWeight: bold ? 700 : 400,
        fontSize: fitted.fontSize,
        lineHeight: 1.35,
        color: color.charbon,
      },
      fitted.text,
    ),
  ];
  if (fitted.truncated) {
    children.push(
      text(
        {
          fontFamily: fontFamily.ui,
          fontWeight: 700,
          fontSize: c.small,
          color: color.violet,
          marginTop: 10,
          lineHeight: 1,
        },
        `${READ_MORE} →`,
      ),
    );
  }
  return box(
    {
      flexDirection: 'column',
      borderLeft: `6px solid ${color.violet}`,
      paddingLeft: 24,
      marginTop: Math.round(c.label * 0.9),
      flexGrow: 1,
      overflow: 'hidden',
    },
    ...children,
  );
};

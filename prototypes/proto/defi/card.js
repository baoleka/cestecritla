/**
 * Share card of F1 (07-mecaniques.md §9.1 screen 4): 1080 × 1920 drawn client-side in a canvas,
 * from the day's draw only. Composition = illustration-rules.md rule 1 (matter 53 % on top: the
 * verbatims in Gowun Batang on Violet 100 over Crème; aplat 47 % below: Violet with Crème text), rule 3
 * (title in capitals, 900 italic, staggered lines), rule 4 (the title is the only 3D block),
 * rule 6 (signature band = last 12 %: wordmark + attribution in two lines, §7.11 rule 3).
 * Fixed light palette: the image is rendered once, never themed. No StatCard, no « N/5 » (D5.8).
 */

const W = 1080;
const H = 1920;
const PAD = 72;
const MATTER_H = Math.round(H * 0.53);
const TITLE_TOP = Math.round(H * 0.485);
const SIGN_H = Math.round(H * 0.12);

const C = Object.freeze({
  creme: '#FFFCF4',
  violet100: '#FDEDFF',
  violet200: '#E5CBFF',
  violet: '#4C0297',
  charbon: '#212320',
  rouge: '#D1271C',
});
const UI = '"Public Sans", system-ui, sans-serif';
const VERBATIM = '"Gowun Batang", "Iowan Old Style", Georgia, serif';
const MAX_VERBATIMS = 3;

/** Word wrap on the canvas measure; keeps U+00A0 groups together. */
function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function setFont(ctx, { size, weight = 400, italic = false, family = UI, spacing = 0 }) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
}

/** Wordmark box « C'EST ÉCRIT LÀ » (D10.2): Violet text, « LÀ » in Rouge; returns its width. */
function wordmark(ctx, x, y, { onAplat = false } = {}) {
  const size = 30;
  setFont(ctx, { size, weight: 900, italic: true, spacing: 1.8 });
  const a = 'C’EST ÉCRIT ';
  const b = 'LÀ';
  const wA = ctx.measureText(a).width;
  const wB = ctx.measureText(b).width;
  const padX = 22;
  const boxW = Math.round(wA + wB + padX * 2);
  const boxH = 62;
  ctx.fillStyle = C.creme;
  ctx.fillRect(x, y, boxW, boxH);
  ctx.lineWidth = 3;
  ctx.strokeStyle = onAplat ? C.creme : C.violet;
  ctx.strokeRect(x + 1.5, y + 1.5, boxW - 3, boxH - 3);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.violet;
  ctx.fillText(a, x + padX, y + boxH / 2 + 2);
  ctx.fillStyle = C.rouge;
  ctx.fillText(b, x + padX + wA, y + boxH / 2 + 2);
  ctx.textBaseline = 'alphabetic';
  return boxW;
}

/** Title lines in Violet blocks with Crème text and one solid Violet 200 shadow for the whole group (rule 4). */
function title(ctx, lines, top) {
  const size = 96;
  const padX = 30;
  const padTop = 16;
  const padBottom = 14;
  const gap = 18;
  const stagger = 42;
  const shadow = 18;
  setFont(ctx, { size, weight: 900, italic: true, spacing: -2 });
  const boxes = lines.map((text, i) => {
    const w = Math.round(ctx.measureText(text).width) + padX * 2;
    return {
      text,
      x: PAD + i * stagger,
      y: top + i * (size + padTop + padBottom + gap),
      w,
      h: size + padTop + padBottom,
    };
  });
  ctx.fillStyle = C.violet200;
  for (const b of boxes) ctx.fillRect(b.x + shadow, b.y + shadow, b.w, b.h);
  for (const b of boxes) {
    ctx.fillStyle = C.violet;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = C.creme;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(b.text, b.x + padX, b.y + padTop + size * 0.78);
  }
  const last = boxes.at(-1);
  return last.y + last.h + shadow;
}

/** Layout of the verbatim blocks at a given font size; returns the blocks and the total height. */
function layoutVerbatims(ctx, verbatims, size, maxWidth) {
  const labelH = 30;
  const locH = 34;
  const padY = 16;
  const gap = 24;
  const lh = Math.round(size * 1.35);
  let total = 0;
  const blocks = verbatims.map((v) => {
    setFont(ctx, { size, family: VERBATIM });
    const lines = wrap(ctx, v.text, maxWidth);
    const h = padY + labelH + lines.length * lh + 8 + locH + padY;
    total += h + gap;
    return { ...v, lines, h, lh };
  });
  return { blocks, total: total - gap, gap, labelH, locH, padY };
}

function drawVerbatims(ctx, verbatims, top, bottom) {
  const x = PAD;
  const width = W - PAD * 2;
  const rule = 10;
  const innerPad = 28;
  const maxWidth = width - rule - innerPad * 2;
  let size = 50;
  let layout = layoutVerbatims(ctx, verbatims, size, maxWidth);
  while (layout.total > bottom - top && size > 26) {
    size -= 2;
    layout = layoutVerbatims(ctx, verbatims, size, maxWidth);
  }
  let y = top;
  for (const b of layout.blocks) {
    // Verbatim block on Violet 100 with a left rule, as in the app (D3.2).
    ctx.fillStyle = C.violet100;
    ctx.fillRect(x, y, width, b.h);
    ctx.fillStyle = C.violet;
    ctx.fillRect(x, y, rule, b.h);
    const tx = x + rule + innerPad;
    let ty = y + layout.padY;
    setFont(ctx, { size: 22, weight: 700, spacing: 2.2 });
    ctx.fillStyle = C.violet;
    ctx.textBaseline = 'top';
    ctx.fillText('TEXTE DU PROGRAMME', tx, ty);
    ty += layout.labelH;
    setFont(ctx, { size, family: VERBATIM });
    ctx.fillStyle = C.charbon;
    for (const line of b.lines) {
      ctx.fillText(line, tx, ty);
      ty += b.lh;
    }
    ty += 8;
    setFont(ctx, { size: 26, weight: 700 });
    ctx.fillStyle = C.violet;
    ctx.fillText(wrap(ctx, b.loc, maxWidth)[0], tx, ty);
    ctx.textBaseline = 'alphabetic';
    y += b.h + layout.gap;
  }
  return y;
}

/** Chapter list without the texts (curiosity gap, §9.1: the OG-like variant when nothing was discovered). */
function drawChapterLines(ctx, lines, top) {
  let y = top;
  setFont(ctx, { size: 34, weight: 700 });
  ctx.textBaseline = 'top';
  for (const text of lines) {
    ctx.fillStyle = C.violet;
    ctx.fillRect(PAD, y + 12, 14, 14);
    ctx.fillStyle = C.charbon;
    const l = wrap(ctx, text, W - PAD * 2 - 40);
    ctx.fillText(l[0], PAD + 40, y);
    y += 62;
  }
  ctx.textBaseline = 'alphabetic';
  return y;
}

/** 18 chapters in book order, 9 × 2, lit cells filled Crème, the others outlined. */
function mosaic(ctx, lit, x, y) {
  const cell = 44;
  const gap = 12;
  for (let i = 0; i < 18; i += 1) {
    const cx = x + (i % 9) * (cell + gap);
    const cy = y + Math.floor(i / 9) * (cell + gap);
    if (lit.has(i + 1)) {
      ctx.fillStyle = C.creme;
      ctx.fillRect(cx, cy, cell, cell);
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.creme;
      ctx.strokeRect(cx + 1.5, cy + 1.5, cell - 3, cell - 3);
    }
  }
  return { w: 9 * cell + 8 * gap, h: 2 * cell + gap };
}

/**
 * @param canvas HTMLCanvasElement (1080 × 1920)
 * @param opts { dateLabel, kicker, titleLines, verbatims: [{ text, loc, chapter }], chapterLines, litChapters: Set<number>,
 *               moreLine, cta, ctaSub, url, attribution: [line1, line2] }
 */
export async function drawCard(canvas, opts) {
  await Promise.all([
    document.fonts.load(`italic 900 96px ${UI}`),
    document.fonts.load(`700 28px ${UI}`),
    document.fonts.load(`400 50px ${VERBATIM}`),
  ]);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';

  // Matter (53 %) on Crème, aplat (47 %) in Violet.
  ctx.fillStyle = C.creme;
  ctx.fillRect(0, 0, W, MATTER_H);
  ctx.fillStyle = C.violet;
  ctx.fillRect(0, MATTER_H, W, H - MATTER_H);

  // Kicker (two label lines).
  setFont(ctx, { size: 28, weight: 700, spacing: 2.8 });
  ctx.fillStyle = C.violet;
  ctx.textBaseline = 'top';
  ctx.fillText(opts.dateLabel.toUpperCase(), PAD, 78);
  ctx.fillText(opts.kicker.toUpperCase(), PAD, 122);
  ctx.textBaseline = 'alphabetic';

  // Verbatims (or the chapter lines), up to the title.
  const matterTop = 190;
  const matterBottom = TITLE_TOP - 36;
  if (opts.verbatims.length) {
    const shown = opts.verbatims.slice(0, MAX_VERBATIMS);
    const end = drawVerbatims(ctx, shown, matterTop, matterBottom - (opts.moreLine ? 44 : 0));
    if (opts.moreLine) {
      setFont(ctx, { size: 26, weight: 700 });
      ctx.fillStyle = C.violet;
      ctx.textBaseline = 'top';
      ctx.fillText(opts.moreLine, PAD, Math.min(end, matterBottom - 40));
      ctx.textBaseline = 'alphabetic';
    }
  } else drawChapterLines(ctx, opts.chapterLines, matterTop);

  // Title straddling the frontier (rule 1), the only 3D block of the card (rule 4).
  const titleEnd = title(
    ctx,
    opts.titleLines.map((l) => l.toUpperCase()),
    TITLE_TOP,
  );

  // Aplat: mosaic on the left, « Et toi ? » + « Lire le programme » + URL on the right.
  const rowY = titleEnd + 44;
  const m = mosaic(ctx, opts.litChapters, PAD, rowY);
  const rx = PAD + m.w + 48;
  ctx.fillStyle = C.creme;
  ctx.textBaseline = 'top';
  setFont(ctx, { size: 78, weight: 900, italic: true, spacing: -1.5 });
  ctx.fillText(opts.cta.toUpperCase(), rx, rowY - 10);
  setFont(ctx, { size: 30, weight: 700 });
  ctx.fillText(opts.ctaSub, rx, rowY + 92);
  setFont(ctx, { size: 28, weight: 400 });
  const urlLines = wrap(ctx, opts.url, W - PAD - rx);
  ctx.fillText(urlLines[0], rx, rowY + 138);
  ctx.textBaseline = 'alphabetic';

  // Signature band (rule 6): last 12 %, rule on top, wordmark left, attribution in two lines right.
  const signTop = H - SIGN_H;
  ctx.fillStyle = C.violet200;
  ctx.fillRect(PAD, signTop, W - PAD * 2, 2);
  const wmW = wordmark(ctx, PAD, signTop + Math.round((SIGN_H - 62) / 2), { onAplat: true });
  setFont(ctx, { size: 20, weight: 400 });
  ctx.fillStyle = C.creme;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const maxAttr = W - PAD * 2 - wmW - 32;
  const l1 = wrap(ctx, opts.attribution[0], maxAttr);
  const l2 = wrap(ctx, opts.attribution[1], maxAttr);
  const all = [...l1, ...l2];
  const lh = 30;
  let ay = signTop + SIGN_H / 2 - ((all.length - 1) * lh) / 2;
  for (const line of all) {
    ctx.fillText(line, W - PAD, ay);
    ay += lh;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  return canvas;
}

/** PNG blob of the drawn card. */
export const cardBlob = (canvas) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );

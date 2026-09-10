/**
 * Drop the GPOS (and kern) tables from a TrueType font.
 *
 * Why: satori ≤ 0.32 measures text per grapheme (no kerning) but draws whole words through
 * opentype.js with kerning applied, so every kerned pair (« ’A », « Te », « AV »…) leaves a
 * visible gap after the word in Public Sans. Serving satori a kerning-free copy makes the
 * measurement and the drawing agree. The originals in fonts/ are untouched; the copies go to
 * public/fonts/ (Static Assets) and are only used by the spike renderer.
 */

const DROPPED = new Set(['GPOS', 'kern']);

const checksum = (view: DataView, offset: number, length: number): number => {
  let sum = 0;
  const end = offset + length;
  for (let i = offset; i < end; i += 4) {
    let word = 0;
    for (let b = 0; b < 4; b += 1) {
      const idx = i + b;
      word = (word << 8) | (idx < end ? view.getUint8(idx) : 0);
    }
    sum = (sum + (word >>> 0)) >>> 0;
  }
  return sum;
};

interface TableRecord {
  tag: string;
  checksum: number;
  offset: number;
  length: number;
}

export const stripGpos = (input: Uint8Array): Uint8Array => {
  const src = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const numTables = src.getUint16(4);
  const records: TableRecord[] = [];
  for (let i = 0; i < numTables; i += 1) {
    const base = 12 + i * 16;
    const tag = String.fromCharCode(
      src.getUint8(base),
      src.getUint8(base + 1),
      src.getUint8(base + 2),
      src.getUint8(base + 3),
    );
    records.push({ tag, checksum: src.getUint32(base + 4), offset: src.getUint32(base + 8), length: src.getUint32(base + 12) });
  }
  const kept = records.filter((r) => !DROPPED.has(r.tag));
  if (kept.length === records.length) return input;

  const pad4 = (n: number): number => (n + 3) & ~3;
  const headerSize = 12 + kept.length * 16;
  const total = kept.reduce((n, r) => n + pad4(r.length), headerSize);
  const out = new Uint8Array(total);
  const dst = new DataView(out.buffer);
  out.set(input.subarray(0, 12));
  dst.setUint16(4, kept.length);
  // Binary-search fields for the new table count.
  let entrySelector = 0;
  while (1 << (entrySelector + 1) <= kept.length) entrySelector += 1;
  const searchRange = (1 << entrySelector) * 16;
  dst.setUint16(6, searchRange);
  dst.setUint16(8, entrySelector);
  dst.setUint16(10, kept.length * 16 - searchRange);

  let cursor = headerSize;
  let headOffset = -1;
  kept.forEach((r, i) => {
    const base = 12 + i * 16;
    for (let b = 0; b < 4; b += 1) dst.setUint8(base + b, r.tag.charCodeAt(b));
    dst.setUint32(base + 4, r.checksum);
    dst.setUint32(base + 8, cursor);
    dst.setUint32(base + 12, r.length);
    out.set(input.subarray(r.offset, r.offset + r.length), cursor);
    if (r.tag === 'head') headOffset = cursor;
    cursor += pad4(r.length);
  });
  if (headOffset >= 0) {
    dst.setUint32(headOffset + 8, 0); // checkSumAdjustment
    const adjustment = (0xb1b0afba - checksum(dst, 0, total)) >>> 0;
    dst.setUint32(headOffset + 8, adjustment);
  }
  return out;
};

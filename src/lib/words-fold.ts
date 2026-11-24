/**
 * One spelling for the filter of « Mots du programme », the same on both sides — what the page
 * writes of each word, and what is typed: no case, no accent, apostrophes alike, « œ » as « oe »
 * and « æ » as « ae », every space a space. The words keep their no-break spaces (« 3 % ») and
 * their ligatures (« bois d'œuvre »), a keyboard types neither: folded on one side only, the
 * filter found nothing (review of 24/11/2026, K4, S13, S22).
 */
export function foldName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/\s/g, ' ');
}

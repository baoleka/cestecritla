/**
 * The conditions every screen is audited under (WCAG 2.2 AA, design/perf-budget.md §2): a phone,
 * the reflow width, a very small window, the dark theme, three system font sizes, a page zoom,
 * and reduced motion. Shared by the audit of the pages (scripts/a11y.ts) and by the audit of
 * the screens a script has to reach first (scripts/e2e-game.ts).
 */
import type { BrowserContextOptions } from 'playwright';

export interface Condition {
  readonly label: string;
  readonly options: BrowserContextOptions;
  /** Applied before navigation, to emulate the system font size. */
  readonly rootFontPercent?: number;
}

export const CONDITIONS: readonly Condition[] = [
  {
    label: 'mobile 390px',
    options: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  },
  { label: 'reflow 320px', options: { viewport: { width: 320, height: 640 } } },
  { label: 'small 320x256', options: { viewport: { width: 320, height: 256 } } },
  { label: 'dark 390px', options: { viewport: { width: 390, height: 844 }, colorScheme: 'dark' } },
  { label: 'font 130%', options: { viewport: { width: 390, height: 844 } }, rootFontPercent: 130 },
  { label: 'font 150%', options: { viewport: { width: 390, height: 844 } }, rootFontPercent: 150 },
  { label: 'font 200%', options: { viewport: { width: 390, height: 844 } }, rootFontPercent: 200 },
  // 390 × 844 seen through a 150 % page zoom: every CSS pixel is one and a half device pixels.
  { label: 'zoom 150%', options: { viewport: { width: 260, height: 563 }, deviceScaleFactor: 3 } },
  {
    label: 'reduced motion',
    options: { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
  },
];

/**
 * Sets the root font size as soon as the root element exists — an init script runs before it
 * does. Written as a string: under tsx a function would be wrapped in a helper the page lacks.
 */
export function rootFontScript(percent: number): string {
  return `(() => {
    const apply = () => {
      if (document.documentElement === null) return false;
      document.documentElement.style.fontSize = '${String(percent)}%';
      return true;
    };
    if (apply()) return;
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document, { childList: true });
  })();`;
}

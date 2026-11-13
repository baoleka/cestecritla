/**
 * Accessibility and reflow gate (A1, A2, A3, D12.3).
 *
 * No such gate existed anywhere in the dossier — the panel's own finding. "Lighthouse
 * Accessibilité >= 95" was a criterion of the 14-27 September milestone and nothing replayed it
 * afterwards, so a regression introduced in October would have shipped.
 *
 * The conditions, chosen where the prototype actually failed:
 *   390 px      the reference viewport (arrival by WhatsApp link on a phone, D0.4)
 *   320 px      reflow (A1)
 *   320 × 256   the same width on a short screen: the sticky header must leave room to read
 *   dark        the complete substitution table, not just the violet accent (A3, §9)
 *   font 130 %, 150 %, 200 %
 *               the size of text chosen in the system or the browser, applied to the text
 *               alone (Firefox, desktop browsers): the root font size grows, the viewport does
 *               not. The measured overflow appeared from 130 % — the prototype's nav bar
 *               reached a scrollWidth of 404-464 px for a 390 px viewport (correction 11).
 *   zoom 150 %  the same setting as Chrome on Android M113+ applies it: a PAGE ZOOM, which
 *               leaves the text alone and shrinks the viewport — 390 px become 260.
 *
 * Learning note — a condition that is not applied is a green light for nothing. Until
 * 13/11/2026 the font conditions set the size in an init script as
 * `document.documentElement.style.fontSize = …`. An init script runs when the document is
 * created, before its root element exists: the line threw, nobody was listening, and the three
 * "font" conditions audited the page at 16 px. The size is now set as soon as the root element
 * appears, and every audit first CHECKS that the page really has the size it claims to test.
 *
 * Thresholds: zero serious/critical axe violation, and no horizontal scroll in any condition.
 * Lighthouse runs separately (npm run a11y:lighthouse) because it needs its own Chrome.
 *
 * Run: npm run build && npx tsx scripts/a11y.ts [baseUrl]
 */
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { CONDITIONS, rootFontScript } from './a11y-conditions.js';
import { readBuildMode } from './build-mode.js';

/** Pages that must pass in every condition. Grows as routes land. */
const APP_PATHS: readonly string[] = [
  '/',
  // A search already run: results are part of the page a reader actually sees.
  '/#q=retraite',
  // The whole table of contents: the longest page, and the one a reader without script uses.
  '/sommaire/',
  '/sommaire/#q=retraite',
  '/s/p1c1-s01/',
  // The Europe chapter: sections with no key measure, the longest lists of numbers.
  '/s/p6c1-s02/',
  '/s/p4c2-s02/',
  // Bridges for the addresses of the 2025 edition.
  '/m/c12-s01-k01/',
  '/s/c1-s02/',
  '/a/c13-s02-a01/',
  '/r/',
  '/r/retraites/',
  '/r/rip-01/',
  '/mot/',
  '/mot/regle-verte/',
  '/exactitude/',
  '/methodologie/',
  '/licence/',
  '/confidentialite/',
  '/a-propos/',
  '/mentions-legales/',
  '/j/',
  '/k/',
  '/carte/',
  '/404.html',
];

/** The holding build (D15.4) is the page the apex serves: it is audited like any other. */
const HOLDING_PATHS: readonly string[] = ['/', '/404.html'];

export const AUDITED_PATHS: readonly string[] =
  readBuildMode() === 'holding' ? HOLDING_PATHS : APP_PATHS;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/** Serves ./dist the way Static Assets does: directory URLs resolve to index.html. */
function serveDist(port: number): Promise<Server> {
  const server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0] ?? '/';
    const rel = normalize(url.endsWith('/') ? `${url}index.html` : url).replace(
      /^(\.\.[/\\])+/,
      '',
    );
    try {
      const body = readFileSync(join('dist', rel));
      res.writeHead(200, { 'content-type': MIME[extname(rel)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve(server);
    });
  });
}

interface Finding {
  condition: string;
  path: string;
  violations: number;
  serious: string[];
  overflow: string | null;
}

async function audit(browser: Browser, base: string): Promise<Finding[]> {
  const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
  const findings: Finding[] = [];

  for (const condition of CONDITIONS) {
    // bypassCSP because axe is injected inline, which our own CSP correctly refuses — the
    // policy is enforced, and that is the point of shipping no 'unsafe-inline'.
    const context = await browser.newContext({ ...condition.options, bypassCSP: true });
    const percent = condition.rootFontPercent ?? 100;
    if (percent !== 100) await context.addInitScript(rootFontScript(percent));
    const page = await context.newPage();

    for (const path of AUDITED_PATHS) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      // The condition must be real before anything is concluded from it.
      const rootPx = await page.evaluate<number>(
        'parseFloat(getComputedStyle(document.documentElement).fontSize)',
      );
      if (Math.abs(rootPx - (16 * percent) / 100) > 0.5) {
        throw new Error(
          `${condition.label} ${path}: the root font size is ${String(rootPx)} px, not ${String((16 * percent) / 100)}`,
        );
      }
      await page.addScriptTag({ content: axe });
      const result: { violations: { id: string; impact: string | null }[] } = await page.evaluate(
        'window.axe.run(document, { resultTypes: ["violations"] })',
      );
      const box: { sw: number; cw: number } = await page.evaluate(
        '({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })',
      );

      findings.push({
        condition: condition.label,
        path,
        violations: result.violations.length,
        serious: result.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}(${String(v.impact)})`),
        overflow: box.sw > box.cw ? `${String(box.sw)} > ${String(box.cw)}` : null,
      });
    }
    await context.close();
  }
  return findings;
}

const port = 8790;
const server = await serveDist(port);
const browser = await chromium.launch();
try {
  const findings = await audit(browser, `http://localhost:${String(port)}`);
  let failed = 0;
  for (const f of findings) {
    const bad = f.serious.length > 0 || f.overflow !== null;
    if (bad) failed += 1;
    console.log(
      `${bad ? '✖' : '✔'} ${f.condition.padEnd(15)} ${f.path.padEnd(16)} ` +
        `axe ${String(f.violations).padStart(2)} · serious ${String(f.serious.length)} ` +
        `${f.serious.join(',')} · overflow ${f.overflow ?? 'none'}`,
    );
  }
  const conditions = CONDITIONS.length;
  console.log(
    `\n${String(findings.length)} checks (${String(AUDITED_PATHS.length)} pages × ${String(conditions)} conditions), ${String(failed)} failing`,
  );
  if (failed > 0) process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}

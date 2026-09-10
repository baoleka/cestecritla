/**
 * Variant 1b "react-ssg": prerender the page at build time (react-dom/server) so that the text is
 * in the HTML like Astro's, then hydrate on the client. Produces dist-ssg/ from dist/ (same hashed
 * assets, index.html with the rendered markup). Run after `npm run build`.
 */
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const distSsr = resolve(root, 'dist-ssr');
const distSsg = resolve(root, 'dist-ssg');

await build({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  logLevel: 'warn',
  build: { ssr: 'src/entry-server.tsx', outDir: distSsr, emptyOutDir: true },
});
const mod = (await import(pathToFileURL(resolve(distSsr, 'entry-server.js')).href)) as {
  render: () => string;
};
const markup = mod.render();

rmSync(distSsg, { recursive: true, force: true });
cpSync(dist, distSsg, { recursive: true });
const htmlPath = resolve(distSsg, 'index.html');
const html = readFileSync(htmlPath, 'utf8');
if (!html.includes('<div id="root"></div>'))
  throw new Error('empty #root not found in dist/index.html');
writeFileSync(
  htmlPath,
  html
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
    .replace(
      'variante React 19 + Vite 6 + Tailwind v4.',
      'variante React 19 + Vite 6 + Tailwind v4, prérendue.',
    ),
);
rmSync(distSsr, { recursive: true, force: true });
console.log(`dist-ssg/index.html: ${String(markup.length)} B of prerendered markup`);

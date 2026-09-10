/**
 * Share pages: minimal HTML with exactly one og:image, rendered by the Worker because
 * Static Assets cannot emit per-URL Open Graph tags.
 */
import { color } from './theme.ts';

export interface SharePage {
  /** og:title */
  title: string;
  /** og:description, ≤ 200 chars, verbatim up to the cut. */
  description: string;
  /** Absolute URL of the og-ratio PNG. */
  imageUrl: string;
  /** Absolute URL of this page. */
  pageUrl: string;
  /** Official section URL (rel=canonical for verbatim pages). */
  canonicalUrl?: string;
  /** Body: verbatim paragraphs (already escaped by the caller) */
  bodyHtml: string;
  /** Small kicker above the body. */
  kicker: string;
  /** Link to the square/story variants for the user to save. */
  imageVariants: { label: string; url: string }[];
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ATTRIBUTION = 'Texte du programme : La France insoumise – L’Avenir en commun. Licence CC BY-NC-SA 4.0.';

export const renderSharePage = (page: SharePage): string => {
  const canonical = page.canonicalUrl ? `<link rel="canonical" href="${escapeHtml(page.canonicalUrl)}">` : '';
  const official = page.canonicalUrl
    ? `<p><a class="btn" href="${escapeHtml(page.canonicalUrl)}">Voir sur melenchon2027.fr</a></p>`
    : '';
  const variants = page.imageVariants
    .map((v) => `<a href="${escapeHtml(v.url)}">${escapeHtml(v.label)}</a>`)
    .join(' · ');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta property="og:type" content="article">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="AEC Discover (spike)">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="${escapeHtml(page.pageUrl)}">
<meta property="og:image" content="${escapeHtml(page.imageUrl)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(page.description)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(page.title)}">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
<meta name="twitter:image" content="${escapeHtml(page.imageUrl)}">
${canonical}
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: ${color.creme}; color: ${color.charbon}; font: 16px/1.55 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  main { max-width: 640px; margin: 0 auto; padding: 24px 20px 48px; }
  .kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${color.violet}; }
  h1 { font-size: 22px; line-height: 1.1; margin: 8px 0 16px; color: ${color.violet}; }
  blockquote { margin: 0; padding: 12px 16px; border-left: 4px solid ${color.violet}; background: ${color.violet100}; font-family: 'Iowan Old Style', Georgia, serif; font-size: 18px; line-height: 1.6; }
  blockquote p { margin: 0 0 12px; } blockquote p:last-child { margin-bottom: 0; }
  .btn { display: inline-block; margin-top: 16px; padding: 12px 18px; background: ${color.rouge}; color: ${color.creme}; text-decoration: none; font-weight: 700; border-radius: 8px; }
  img { max-width: 100%; height: auto; border: 1px solid ${color.violet200}; margin-top: 24px; }
  footer { margin-top: 32px; font-size: 14px; color: ${color.charbon}; }
  footer a { color: ${color.violet}; }
</style>
</head>
<body>
<main>
  <p class="kicker">${escapeHtml(page.kicker)}</p>
  <h1>${escapeHtml(page.title)}</h1>
  <blockquote>${page.bodyHtml}</blockquote>
  ${official}
  <img src="${escapeHtml(page.imageUrl)}" width="1200" height="630" alt="${escapeHtml(page.description)}">
  <p>Autres formats : ${variants}</p>
  <footer>
    <p>${ATTRIBUTION} <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr">Licence</a></p>
    <p>Projet militant indépendant, fait pour donner envie de lire le programme. Spike T4 — <a href="/">tous les exemples</a> · <a href="/diag">/diag</a></p>
  </footer>
</main>
</body>
</html>
`;
};

export const renderErrorPage = (status: number, message: string): string => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${status}</title>
<style>body{margin:0;background:${color.creme};color:${color.charbon};font:16px/1.55 system-ui,sans-serif}main{max-width:640px;margin:0 auto;padding:48px 20px}h1{color:${color.violet}}a{color:${color.violet}}</style></head>
<body><main><h1>${status === 404 ? 'Cette page n’existe pas.' : escapeHtml(message)}</h1><p>${status === 404 ? 'Le programme, lui, est entier : <a href="/">retour aux exemples</a>.' : escapeHtml(message)}</p></main></body></html>
`;

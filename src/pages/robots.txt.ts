/**
 * robots.txt of the app. Everything may be read: the pages that must stay out of indexes — the
 * bridges of the 2025 edition, the reserved routes — say so themselves, with a robots meta tag,
 * which is the only way a page already linked from elsewhere can ask not to be listed.
 *
 * An endpoint rather than a file in public/: the holding site shares public/ and has no sitemap.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });

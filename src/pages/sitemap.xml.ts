/**
 * The pages worth finding by a search: the home page, the 111 pointer pages, the answers, the
 * concept cards, and the pages that say who we are and how this is made.
 *
 * Not listed, because they carry `noindex`: the 974 bridges of the 2025 edition, the moved
 * `/r/rip-NN/` addresses and the reserved routes.
 */
import type { APIRoute } from 'astro';
import { cards, ripostes } from '../lib/editorial.ts';
import { manifest, sections } from '../lib/edition.ts';

const INSTITUTIONAL = [
  '/exactitude/',
  '/methodologie/',
  '/licence/',
  '/confidentialite/',
  '/a-propos/',
  '/mentions-legales/',
];

export const GET: APIRoute = ({ site }) => {
  const paths = [
    '/',
    ...sections().map((s) => `/s/${s.id}/`),
    '/r/',
    ...ripostes().map((r) => `/r/${r.slug}/`),
    '/mot/',
    ...cards().map((c) => `/mot/${c.id}/`),
    ...INSTITUTIONAL,
  ];
  // The day the book was read: the only date these pages can honestly claim.
  const lastmod = manifest().meta.crawled_at.slice(0, 10);
  const urls = paths
    .map((path) => `<url><loc>${new URL(path, site).href}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`,
    { headers: { 'content-type': 'application/xml; charset=utf-8' } },
  );
};

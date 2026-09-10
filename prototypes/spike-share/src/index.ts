/**
 * aec-spike-share — T4 spike Worker.
 *
 * Routes handled here (assets.run_worker_first):
 *   /og/m/<id>.png, /og/a/<id>.png, /og/r/<id>.png, /og/p/<n>-<total>.png, /og/res/<ids>.png  (?r=og|square|story)
 *   /m/<id>, /a/<id>, /r/<id>, /p/<n>-<total>, /res/<ids>                                     share pages (HTML + OG)
 *   /api/health                                                                                JSON
 * Everything else (/, /diag, /fonts/*, /data/*) is served by Static Assets.
 */
import { getMeasure, getStat, loadCorpus, type Corpus, type MeasureView } from './data.ts';
import { measureCard } from './cards/measure.ts';
import { statCard } from './cards/stat.ts';
import { riposteCard } from './cards/riposte.ts';
import { progressCard } from './cards/progress.ts';
import { resultCard } from './cards/result.ts';
import { renderPng } from './render.ts';
import { escapeHtml, renderErrorPage, renderSharePage } from './pages.ts';
import { describe } from './text.ts';
import { canvases, parseRatio, type Ratio } from './theme.ts';

/** D1.1 id scheme, restricted to what a card can address: key measure, measure, sub-measure, chiffre. */
const ID_RE = /^c\d{1,2}-s\d{2}-(k|m|a)\d{2}(\.s\d)?$/;
const PROGRESS_RE = /^(\d{1,3})-(\d{1,3})$/;
const MAX_RESULT_IDS = 3;

const PNG_CACHE_CONTROL = 'public, max-age=86400';
const HTML_CACHE_CONTROL = 'public, max-age=3600';

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type CardKind = 'm' | 'a' | 'r' | 'p' | 'res';

interface ParsedRoute {
  kind: CardKind;
  key: string;
}

const isCardKind = (value: string): value is CardKind =>
  value === 'm' || value === 'a' || value === 'r' || value === 'p' || value === 'res';

/** Validates the key for a kind; throws 400 on malformed input. */
const validateKey = (kind: CardKind, key: string): void => {
  switch (kind) {
    case 'm':
    case 'r':
      if (!ID_RE.test(key) || key.includes('-a')) throw new HttpError(400, 'identifiant de mesure invalide');
      return;
    case 'a':
      if (!ID_RE.test(key) || !key.includes('-a')) throw new HttpError(400, 'identifiant de chiffre invalide');
      return;
    case 'p': {
      const m = PROGRESS_RE.exec(key);
      if (!m) throw new HttpError(400, 'progression invalide (attendu n-total)');
      const read = Number(m[1]);
      const total = Number(m[2]);
      if (total < 1 || read > total) throw new HttpError(400, 'progression invalide (n ≤ total, total ≥ 1)');
      return;
    }
    case 'res': {
      const ids = key.split(',');
      if (ids.length < 1 || ids.length > MAX_RESULT_IDS) throw new HttpError(400, `1 à ${MAX_RESULT_IDS} identifiants`);
      for (const id of ids) {
        if (!ID_RE.test(id) || id.includes('-a')) throw new HttpError(400, `identifiant invalide : ${id}`);
      }
      return;
    }
  }
};

const parseRoute = (pathname: string): { route: ParsedRoute; isImage: boolean } | undefined => {
  const image = /^\/og\/(m|a|r|p|res)\/([^/]+)\.png$/.exec(pathname);
  if (image && image[1] !== undefined && image[2] !== undefined && isCardKind(image[1])) {
    return { route: { kind: image[1], key: image[2] }, isImage: true };
  }
  const page = /^\/(m|a|r|p|res)\/([^/]+)\/?$/.exec(pathname);
  if (page && page[1] !== undefined && page[2] !== undefined && isCardKind(page[1])) {
    return { route: { kind: page[1], key: page[2] }, isImage: false };
  }
  return undefined;
};

const requireMeasure = (corpus: Corpus, id: string): MeasureView => {
  const view = getMeasure(corpus, id);
  if (!view) throw new HttpError(404, `mesure inconnue : ${id}`);
  return view;
};

interface CardData {
  element: ReturnType<typeof measureCard>;
  title: string;
  description: string;
  canonicalUrl?: string;
  bodyHtml: string;
  kicker: string;
}

const buildCard = (corpus: Corpus, route: ParsedRoute, ratio: Ratio): CardData => {
  switch (route.kind) {
    case 'm': {
      const view = requireMeasure(corpus, route.key);
      return {
        element: measureCard(view, ratio),
        title: view.section.title,
        description: describe(view.text),
        canonicalUrl: view.section.url,
        bodyHtml: `<p>${escapeHtml(view.text)}</p>`,
        kicker: `${view.chapter.title} · ${view.kind === 'key_measure' ? 'Mesure clé' : 'Mesure'}`,
      };
    }
    case 'r': {
      const view = requireMeasure(corpus, route.key);
      return {
        element: riposteCard(view, ratio),
        title: view.section.title,
        description: describe(view.text),
        canonicalUrl: view.section.url,
        bodyHtml: `<p><strong>Objection : « … »</strong></p><p>Ce que dit le programme : ${escapeHtml(view.text)}</p>`,
        kicker: `Mode riposte · ${view.chapter.title}`,
      };
    }
    case 'a': {
      const view = getStat(corpus, route.key);
      if (!view) throw new HttpError(404, `chiffre inconnu : ${route.key}`);
      return {
        element: statCard(view, ratio),
        title: view.section.title,
        description: describe(view.text),
        canonicalUrl: view.section.url,
        bodyHtml: `<p>${escapeHtml(view.text)}</p>`,
        kicker: `À savoir · ${view.chapter.title}`,
      };
    }
    case 'p': {
      const m = PROGRESS_RE.exec(route.key);
      const read = Number(m?.[1] ?? 0);
      const total = Number(m?.[2] ?? corpus.sections.length);
      // The card states "sur N" as a fact about the book: N must be the real section count.
      if (total !== corpus.sections.length) {
        throw new HttpError(400, `progression invalide (total attendu : ${corpus.sections.length})`);
      }
      const title = `J’ai lu ${read} section${read > 1 ? 's' : ''} sur ${total}`;
      return {
        element: progressCard({ read, total }, corpus, ratio),
        title,
        description: `${title} de L’Avenir en commun 2025. La progression reste sur ton téléphone.`,
        bodyHtml: `<p>${escapeHtml(title)} de L’Avenir en commun 2025.</p>`,
        kicker: 'Ta lecture',
      };
    }
    case 'res': {
      const views = route.key.split(',').map((id) => requireMeasure(corpus, id));
      const first = views[0];
      return {
        element: resultCard(views, ratio),
        title: 'Mes 3 mesures',
        description: describe(views.map((v) => v.text).join(' — ')),
        ...(first ? { canonicalUrl: first.section.url } : {}),
        bodyHtml: views.map((v) => `<p>${escapeHtml(v.text)}</p>`).join(''),
        kicker: 'Mon Avenir en commun',
      };
    }
  }
};

/**
 * Security headers for every HTML response generated here (share pages, error pages).
 * Static assets (/ and /diag) get theirs from public/_headers, which does not apply to
 * Worker responses. The pages carry only an inline <style>, an <img> from this origin and links.
 */
const CSP_HTML =
  "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const htmlHeaders = (cacheControl: string): Record<string, string> => ({
  'content-type': 'text/html; charset=utf-8',
  'cache-control': cacheControl,
  'content-security-policy': CSP_HTML,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  // Throwaway workers.dev domain: keep it out of search indexes (link previews are unaffected).
  'x-robots-tag': 'noindex',
});

const jsonResponse = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', ...extraHeaders },
  });

const errorResponse = (status: number, message: string, wantsHtml: boolean): Response =>
  wantsHtml
    ? new Response(renderErrorPage(status, message), { status, headers: htmlHeaders('no-store') })
    : jsonResponse({ error: message }, status, { 'cache-control': 'no-store' });

const handleImage = async (
  env: Env,
  corpus: Corpus,
  route: ParsedRoute,
  url: URL,
  method: string,
): Promise<Response> => {
  const ratio = parseRatio(url.searchParams.get('r'));
  const canvas = canvases[ratio];
  const card = buildCard(corpus, route, ratio);
  const baseHeaders: Record<string, string> = {
    'content-type': 'image/png',
    'cache-control': PNG_CACHE_CONTROL,
    'x-aec-ratio': ratio,
    'x-content-type-options': 'nosniff',
  };
  // HEAD (some preview crawlers probe with it) must not spend ~150-300 ms of CPU on a render
  // whose body is discarded anyway: answer with the headers only, once the id is known to exist.
  if (method === 'HEAD') return new Response(null, { headers: baseHeaders });
  const rendered = await renderPng(env.ASSETS, card.element, canvas.width, canvas.height);
  const t = rendered.timings;
  return new Response(rendered.png, {
    headers: {
      ...baseHeaders,
      'content-length': String(rendered.png.byteLength),
      // Wall-clock inside a Worker only advances on I/O, so satori/resvg phases read ~0 ms here;
      // the external curl timings and the invocation CPU time are the real measurements.
      'server-timing': `init;dur=${t.init}, satori;dur=${t.satori}, resvg;dur=${t.resvg}`,
      'x-aec-svg-bytes': String(t.svgBytes),
    },
  });
};

const handlePage = (corpus: Corpus, route: ParsedRoute, url: URL): Response => {
  const card = buildCard(corpus, route, 'og');
  const origin = url.origin;
  const imagePath = `/og/${route.kind}/${route.key}.png`;
  const html = renderSharePage({
    title: card.title,
    description: card.description,
    imageUrl: `${origin}${imagePath}?r=og`,
    pageUrl: `${origin}/${route.kind}/${route.key}`,
    ...(card.canonicalUrl ? { canonicalUrl: card.canonicalUrl } : {}),
    bodyHtml: card.bodyHtml,
    kicker: card.kicker,
    imageVariants: [
      { label: 'Carré 1080×1080', url: `${imagePath}?r=square` },
      { label: 'Story 1080×1920', url: `${imagePath}?r=story` },
    ],
  });
  return new Response(html, { headers: htmlHeaders(HTML_CACHE_CONTROL) });
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    // workers.dev also answers plain HTTP: og:image / og:url are built from the request origin
    // and must be https, so send any http:// link to its https twin before anything else.
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonResponse({ error: 'méthode non autorisée' }, 405, { allow: 'GET, HEAD' });
    }
    if (url.pathname === '/api/health') {
      return jsonResponse({ ok: true, worker: 'aec-spike-share' });
    }
    const parsed = parseRoute(url.pathname);
    // Image routes answer JSON errors (a crawler never shows them); everything else gets HTML.
    const wantsHtml = !(parsed?.isImage ?? false);
    try {
      if (!parsed) {
        // Not a card route: let Static Assets answer (index, /diag, fonts, data) or 404.
        const asset = await env.ASSETS.fetch(request);
        return asset.status === 404 ? errorResponse(404, 'page inconnue', true) : asset;
      }
      validateKey(parsed.route.kind, parsed.route.key);
      const corpus = await loadCorpus(env.ASSETS);
      return parsed.isImage
        ? await handleImage(env, corpus, parsed.route, url, request.method)
        : handlePage(corpus, parsed.route, url);
    } catch (err: unknown) {
      if (err instanceof HttpError) return errorResponse(err.status, err.message, wantsHtml);
      console.error(
        JSON.stringify({
          level: 'error',
          path: url.pathname,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        }),
      );
      return errorResponse(500, 'Quelque chose a coincé de notre côté. Réessaie dans un instant.', wantsHtml);
    }
  },
} satisfies ExportedHandler<Env>;

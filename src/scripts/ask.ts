/**
 * « Demander au programme » — the one gesture that sends anything (D16.8), and what it sends
 * is not the question (D16.22).
 *
 * What happens, in order, when the button is pressed:
 *   1. electoral silence is checked here first — a frozen page sends nothing;
 *   2. an objection one of the fifteen re-read answers is about is recognised on the phone, and
 *      shown: nothing leaves;
 *   3. the page searches, as it does while one types, and keeps what it found: the measures,
 *      best first, and the words of the book the search matched. With nothing found, nothing
 *      is sent;
 *   4. those identifiers and those words go to /api/ask — the sentence that was typed stays in
 *      the field — and the page waits, eight seconds at most, under the local results that are
 *      already there;
 *   5. whatever comes back, or does not, becomes a page (src/lib/ask-view.ts).
 *
 * Before that gesture, nothing typed is sent anywhere: the search is local. At that gesture,
 * still nothing typed is sent. No third party is ever loaded: there is no bot check (D16.23).
 *
 * Everything shown is built with `createElement` and `textContent`: a sentence of the model is
 * text, never markup. The question is never displayed again: it stays in the field.
 */
import {
  MAX_QUESTION_CHARS,
  parseAskResponse,
  type AskRequest,
  type AskResponse,
} from '../lib/ask-contract.ts';
import type { Asked } from '../lib/ask-local.ts';
import { reviewedFor, type ReviewedEntry } from '../lib/ask-reviewed.ts';
import { viewOf, type AskView } from '../lib/ask-view.ts';
import { formatReopenTimeFr, type effectiveDate } from '../lib/silence.ts';
import { silenceReading } from './silence-now.ts';
import { enhanceOfficialLinks } from './deep-links.ts';
import { el, findForAsk, findSections, loadEngine, measureLink, type Engine } from './engine.ts';

interface Config {
  mode: 'answer' | 'select';
  corpus: string;
  entries: (ReviewedEntry & { theme: string })[];
  strings: {
    waiting: string;
    answerTitle: string;
    selectTitle: string;
    reviewedTitle: string;
    noneTitle: string;
    noneLead: string;
    silence: string;
    where: string;
    notice: string;
    noticeSelect: string;
    method: string;
  };
}

/** How long the page waits for an answer before showing its own results. */
const ANSWER_TIMEOUT_MS = 8_000;
/** What the page shows by itself: the best measure of each of its three best sections. */
const LOCAL_SECTIONS = 3;

const form = document.querySelector<HTMLFormElement>('#search');
const input = document.querySelector<HTMLInputElement>('#q');
const button = document.querySelector<HTMLButtonElement>('#ask');
const again = document.querySelector<HTMLButtonElement>('#ask-again');
const status = document.querySelector<HTMLElement>('#ask-status');
const answer = document.querySelector<HTMLElement>('#answer');
const title = document.querySelector<HTMLElement>('#answer-title');
const body = document.querySelector<HTMLElement>('#answer-body');
const notice = document.querySelector<HTMLElement>('#answer-notice');
const configNode = document.querySelector('#ask-config');

if (form && input && button && again && status && answer && title && body && notice && configNode) {
  const config = JSON.parse(configNode.textContent) as Config;
  const { strings } = config;

  // --- electoral silence: decided here before anything is sent, and closed when in doubt.
  // The hour of our server is read once and then ages with this device's clock
  // (src/scripts/silence-now.ts). Learning note — found on 13/11/2026: the first version kept
  // the server's hour as read at arrival and compared it with « now » at each question. Five
  // minutes after arriving, the two no longer agreed, the clock was judged wrong, and the page
  // answered every question with its own selection, never asking the model — in silence.
  const silence = silenceReading();
  const flagsRead = silence.refresh();
  const silenceNow = (): ReturnType<typeof effectiveDate> => silence.now();

  // --- showing
  const engine = (): Promise<Engine> =>
    loadEngine(form.dataset.index ?? '', form.dataset.meta ?? '');

  const sources = (found: Engine, ids: readonly string[]): HTMLElement => {
    // One link per line: on a phone two titles side by side would break in the middle of one.
    const line = el('p', `${strings.where} :`, 'sources');
    for (const id of ids) {
      const section = found.meta.sections[id.replace(/-[kmp]\d{2}(?:\.s\d+)?$/, '')];
      const label = found.meta.items[id]?.[0];
      if (section === undefined || label === undefined) continue;
      const link = measureLink(found.meta, id, `${section[0]}, ${label.toLowerCase()}`);
      if (link === null) continue;
      link.dataset.programme = 'title';
      line.append(link);
    }
    return line;
  };

  const show = (view: AskView, found: Engine | null): void => {
    body.replaceChildren();
    notice.replaceChildren();
    answer.dataset.kind = view.kind;
    // A mark a machine can read on what a model wrote (AI Act, art. 50 § 2): on the block that
    // holds its sentences, and only on it.
    if (view.kind === 'answer') answer.dataset.generatedBy = 'ai';
    else delete answer.dataset.generatedBy;
    const say = (heading: string, ...children: (HTMLElement | null)[]): void => {
      title.textContent = heading;
      for (const child of children) if (child !== null) body.append(child);
    };
    const aiNotice = (text: string): void => {
      const method = el('a', strings.method);
      method.href = '/exactitude/';
      notice.append(text, ' ', method);
    };
    switch (view.kind) {
      case 'answer':
        say(strings.answerTitle);
        for (const sentence of view.sentences) {
          const block = el('div', undefined, 'answer-sentence');
          block.append(el('p', sentence.text));
          if (found !== null) block.append(sources(found, sentence.ids));
          body.append(block);
        }
        aiNotice(strings.notice);
        break;
      case 'select':
        say(strings.selectTitle, found === null ? null : sources(found, view.ids));
        // The page's own choice involved no model: it says so by saying nothing of one.
        // What is shown decides the notice, not the mode: three links the model CHOSE are not
        // sentences it wrote, even on a site whose model also writes (AI Act, art. 50).
        if (!view.local) aiNotice(strings.noticeSelect);
        break;
      case 'reviewed': {
        const entry = config.entries.find((e) => e.slug === view.slug);
        const link = el('a', entry?.objection ?? '');
        link.href = `/r/${view.slug}/`;
        const line = el('p');
        line.append(link);
        say(strings.reviewedTitle, line);
        break;
      }
      case 'none':
        say(strings.noneTitle, el('p', strings.noneLead));
        break;
      case 'silence':
        say(strings.silence.replace('{reopenTime}', formatReopenTimeFr(new Date(view.reopen))));
        break;
    }
    enhanceOfficialLinks(body);
    answer.hidden = false;
    status.textContent = '';
    title.focus();
  };

  /** Sends what the search found — identifiers and words of the book — and nothing typed. */
  const post = async (asked: Asked): Promise<AskResponse | null> => {
    const request: AskRequest = { corpus: config.corpus, ids: asked.ids, terms: asked.terms };
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!response.ok) return null;
      return parseAskResponse(await response.json());
    } catch {
      return null;
    }
  };

  let asking = false;
  const ask = async (): Promise<void> => {
    const question = input.value.trim().slice(0, MAX_QUESTION_CHARS);
    if (asking || question.replace(/\s+/g, '').length < 2) return;
    asking = true;
    button.disabled = true;
    answer.hidden = true;
    status.textContent = strings.waiting;
    try {
      await flagsRead;
      const frozen = silenceNow();
      if (frozen.silence) {
        // Frozen with no hour to announce: the page keeps to what it found by itself.
        const found = await engine().catch(() => null);
        // …and an hour is only announced on a clock our server does not contradict.
        const believed = frozen.clockTrusted || frozen.driftMs === null;
        const view: AskView =
          frozen.reopenUtc === null || !believed || frozen.override !== 'auto'
            ? viewOf(null, context(found, question))
            : { kind: 'silence', reopen: frozen.reopenUtc.toISOString() };
        show(view, found);
        return;
      }
      const slug = reviewedFor(question, config.entries);
      if (slug !== null) {
        show({ kind: 'reviewed', slug }, null);
        return;
      }
      // The page's own search decides what is asked: with nothing found, nothing leaves.
      const found = await engine().catch(() => null);
      const asked = found === null ? null : findForAsk(found, question);
      const response = asked === null || asked.ids.length === 0 ? null : await post(asked);
      show(viewOf(response, context(found, question)), found);
    } finally {
      asking = false;
      button.disabled = false;
    }
  };

  /** What the page can name, and what it shows by itself: the best measure of its best sections. */
  const context = (found: Engine | null, question: string): Parameters<typeof viewOf>[1] => ({
    corpus: config.corpus,
    knows: (id) => found !== null && id in found.meta.items,
    localIds:
      found === null
        ? []
        : findSections(found, question, LOCAL_SECTIONS).flatMap((section) =>
            section.items.slice(0, 1),
          ),
  });

  // In its place since the first paint, inert until now (src/components/Search.astro).
  button.disabled = false;
  button.addEventListener('click', () => void ask());
  again.addEventListener('click', () => {
    answer.hidden = true;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });
}

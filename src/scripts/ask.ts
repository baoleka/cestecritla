/**
 * « Demander au programme » — the one gesture that sends a question (D16.8).
 *
 * What happens, in order, when the button is pressed:
 *   1. electoral silence is checked here first — a frozen page sends nothing;
 *   2. an objection one of the fifteen re-read answers is about is recognised on the phone, and
 *      shown: nothing leaves;
 *   3. otherwise the question goes to /api/ask with a Turnstile token, and the page waits —
 *      eight seconds at most — under the local results that are already there;
 *   4. whatever comes back, or does not, becomes a page (src/lib/ask-view.ts).
 *
 * Before that gesture, nothing typed is sent anywhere: the search is local. The only thing this
 * script fetches earlier is Turnstile's own script, at the first focus of the field — it takes
 * six to fourteen seconds to mint a token on a phone (D9.13), and a question should not wait
 * for it. That request carries no word of the question.
 *
 * Everything shown is built with `createElement` and `textContent`: a sentence of the model is
 * text, never markup. The question is never displayed again: it stays in the field.
 */
import { MAX_QUESTION_CHARS, parseAskResponse, type AskResponse } from '../lib/ask-contract.ts';
import { reviewedFor, type ReviewedEntry } from '../lib/ask-reviewed.ts';
import { viewOf, type AskView } from '../lib/ask-view.ts';
import { formatReopenTimeFr, type effectiveDate } from '../lib/silence.ts';
import { silenceReading } from './silence-now.ts';
import { enhanceOfficialLinks } from './deep-links.ts';
import { el, findSections, loadEngine, measureLink, type Engine } from './engine.ts';

interface Config {
  mode: 'answer' | 'select';
  corpus: string;
  sitekey: string;
  entries: (ReviewedEntry & { theme: string })[];
  strings: {
    waiting: string;
    answerTitle: string;
    selectTitle: string;
    reviewedTitle: string;
    noneTitle: string;
    noneLead: string;
    offTopic: string;
    silence: string;
    where: string;
    notice: string;
    noticeSelect: string;
    method: string;
  };
}

interface Turnstile {
  render: (container: HTMLElement, options: Record<string, unknown>) => string | undefined;
  reset: (widgetId?: string) => void;
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** How long the page waits for an answer, and for a token, before showing its own results. */
const ANSWER_TIMEOUT_MS = 8_000;
const TOKEN_TIMEOUT_MS = 10_000;
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
const holder = document.querySelector<HTMLElement>('#turnstile');
const configNode = document.querySelector('#ask-config');

if (
  form &&
  input &&
  button &&
  again &&
  status &&
  answer &&
  title &&
  body &&
  notice &&
  holder &&
  configNode
) {
  const config = JSON.parse(configNode.textContent) as Config;
  const { strings } = config;

  // --- Turnstile: asked for at the first focus, so that a token is ready at the gesture
  let turnstile: Turnstile | undefined;
  let widget: string | undefined;
  let token: string | null = null;
  let waiters: ((value: string | null) => void)[] = [];
  const deliver = (value: string | null): void => {
    token = value;
    if (value === null) return;
    for (const resolve of waiters) resolve(value);
    waiters = [];
  };
  const startTurnstile = (): void => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.addEventListener('load', () => {
      turnstile = (window as unknown as { turnstile?: Turnstile }).turnstile;
      widget = turnstile?.render(holder, {
        sitekey: config.sitekey,
        action: 'ask',
        // Nothing is drawn unless the visitor has to do something: the widget is invisible.
        appearance: 'interaction-only',
        language: 'fr',
        theme: 'auto',
        callback: (value: string) => {
          deliver(value);
        },
        'expired-callback': () => {
          deliver(null);
        },
        'error-callback': () => {
          deliver(null);
          return true;
        },
      });
    });
    document.head.append(script);
  };
  /** A token, now or within the deadline; null when Turnstile gives none. */
  const takeToken = (): Promise<string | null> => {
    needTurnstile();
    if (token !== null) {
      const ready = token;
      token = null;
      return Promise.resolve(ready);
    }
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        waiters = waiters.filter((w) => w !== taken);
        resolve(null);
      }, TOKEN_TIMEOUT_MS);
      const taken = (value: string | null): void => {
        window.clearTimeout(timer);
        token = null;
        resolve(value);
      };
      waiters.push(taken);
    });
  };
  /** A token is good for one question: the next one needs a new one. */
  const renewToken = (): void => {
    token = null;
    turnstile?.reset(widget);
  };
  /**
   * Turnstile arrives with the first « Demander », never before (D7.6, D16.8). It used to come
   * at the first focus of the field — but this field is also the local search: a visitor who
   * only searches asked nothing of an AI, and the page tells them nothing is sent. Their
   * browser must not load a third party's script, run its challenge and keep its storage for
   * that (found by the hostile reading of 13/11/2026). The first question waits for the script;
   * the page's own results are already on screen.
   */
  let turnstileAsked = false;
  const needTurnstile = (): void => {
    if (turnstileAsked) return;
    turnstileAsked = true;
    startTurnstile();
  };

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
      case 'off_topic':
        say(strings.offTopic);
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

  const post = async (question: string, given: string): Promise<AskResponse | null> => {
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: question, token: given, corpus: config.corpus }),
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
      const [found, given] = await Promise.all([engine().catch(() => null), takeToken()]);
      const response = given === null ? null : await post(question, given);
      renewToken();
      show(viewOf(response, context(found, question)), found);
    } finally {
      asking = false;
      button.disabled = false;
    }
  };

  const context = (found: Engine | null, question: string): Parameters<typeof viewOf>[1] => ({
    corpus: config.corpus,
    knows: (id) => found !== null && id in found.meta.items,
    hasAnswer: (slug) => config.entries.some((e) => e.slug === slug),
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

/**
 * C'est écrit là — motion of the clickable prototypes (design/motion-spec.md; P6, P7 of design/perf-budget.md).
 *
 * Self-initialising ES module: a page only needs shared/motion.css, this script, and the hooks below.
 * Nothing here stores, sends or measures anything about the visitor (D0.22).
 *
 * Hooks (data-motion attributes, the only coupling with the modules):
 *   data-motion="reveal"     the element rises into place once, when it enters the viewport by scrolling
 *                            (240 ms, translateY + opacity, ease enter); a block already visible when it
 *                            is inserted is shown at once (LCP); static under prefers-reduced-motion.
 *   data-motion="crossfade"  on a link: the navigation cross-fades old -> new page through the
 *                            cross-document View Transitions API (200 ms) when the browser has it;
 *                            instant otherwise, instant under reduced motion.
 *   data-motion="content"    on a container filled by script after load. Until the container has
 *                            children rendered (data-ready, set here), an arriving cross-fade is skipped
 *                            (nothing to capture yet) and the content fades in instead (200 ms, opacity).
 *   data-motion="press"      on a button or link: scale(0.96) under the finger for >= 120 ms, back with
 *                            ease enter; keyboard (Space / Enter) gets the same feedback; opacity only
 *                            under reduced motion. « Passer » is a tap, never a swipe (D5.9).
 *
 * Rules: transform and opacity only; nothing above 320 ms; no will-change (one-shot transitions
 * promote their own layer); the hidden initial states exist only while <html class="m-motion">.
 */

const root = document.documentElement;
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => REDUCE.matches;

/** Durations read from the tokens (tokens.css), so the script and the stylesheet never disagree. */
function tokenMs(name, fallback) {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return fallback;
  return raw.endsWith('ms') ? n : n * 1000;
}

const syncPreference = () => root.classList.toggle('m-motion', !REDUCE.matches);
syncPreference();
REDUCE.addEventListener('change', syncPreference);

/* ------------------------------------------------------------------ */
/* 1. Reveal de citation                                                */
/* ------------------------------------------------------------------ */

const REVEAL_THRESHOLD = 0.15;
const revealed = new WeakSet();
const io =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            reveal(entry.target);
          }
        },
        { threshold: REVEAL_THRESHOLD },
      )
    : null;

function reveal(node) {
  if (revealed.has(node)) return;
  revealed.add(node);
  io?.unobserve(node);
  node.classList.add('m-in');
}

/** Inside the viewport right now (any part of the box). */
const inViewport = (node) => {
  const r = node.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};

/**
 * Watch a [data-motion="reveal"] element. A block already inside the viewport when it is inserted is
 * shown at once, without transition: animating it would delay the page's LCP by the whole reveal
 * (measured +250 ms at CPU x4 on /concept/, motion-spec.md §2.1). The reveal plays for blocks that
 * enter the viewport later, by scrolling. Immediate as well without IntersectionObserver or motion.
 */
export function watchReveal(node) {
  if (revealed.has(node) || node.classList.contains('m-in')) return;
  if (!io || REDUCE.matches || inViewport(node)) {
    node.classList.add('m-instant');
    reveal(node);
    requestAnimationFrame(() => requestAnimationFrame(() => node.classList.remove('m-instant')));
    return;
  }
  io.observe(node);
}

/* ------------------------------------------------------------------ */
/* 2. Concept -> section: cross-document View Transition                 */
/* ------------------------------------------------------------------ */

let crossfadePending = false;
let pendingTimer = 0;

document.addEventListener('click', (ev) => {
  const link =
    ev.target instanceof Element ? ev.target.closest('a[data-motion="crossfade"]') : null;
  if (!link || ev.defaultPrevented || ev.button !== 0) return;
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return; // new tab: no transition
  crossfadePending = true;
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    crossfadePending = false;
  }, 2000); // the navigation did not happen (prevented, cancelled)
});

/** Skip a transition quietly: a skipped transition rejects its `ready` promise (AbortError). */
function skip(vt) {
  vt.skipTransition();
  vt.ready.catch(() => {});
}

// Outgoing page: only a tagged link may cross-fade; anything else (back, chips, Suivant) is instant.
addEventListener('pageswap', (ev) => {
  const vt = ev.viewTransition;
  if (!vt) return;
  if (!crossfadePending || REDUCE.matches) skip(vt);
  crossfadePending = false;
});

/** Containers rendered by script: ready once their children changed after load (or when marked in HTML). */
const contentPending = () => document.querySelector('[data-motion="content"]:not([data-ready])');

// Incoming page: the transition captures the first frame of this document. With script-rendered
// content (the prototype) that frame is the « Chargement… » shell, so the cross-fade gives way to a
// fade-in of the content (m-arriving). T7 pre-renders the HTML: data-ready is then present at load
// and the cross-document cross-fade plays as designed.
addEventListener('pagereveal', (ev) => {
  const vt = ev.viewTransition;
  if (!vt) return;
  if (REDUCE.matches) {
    skip(vt);
    return;
  }
  if (contentPending()) {
    skip(vt);
    root.classList.add('m-arriving');
    return;
  }
  root.classList.add('m-crossfading');
  vt.ready.catch(() => {});
  vt.finished.finally(() => root.classList.remove('m-crossfading'));
});

function markReady(container) {
  if (container.hasAttribute('data-ready')) return;
  container.setAttribute('data-ready', '');
  // The fade-in is a one-shot: drop the class once the opacity transition is over (or at once).
  const done = () => root.classList.remove('m-arriving');
  if (!root.classList.contains('m-arriving')) return;
  const ms = tokenMs('--d-base', 200);
  if (ms === 0) done();
  else setTimeout(done, ms + 50);
}

/* ------------------------------------------------------------------ */
/* 3. « Passer » : tap feedback                                          */
/* ------------------------------------------------------------------ */

const PRESS_SELECTOR = '[data-motion="press"]';
const pressedAt = new WeakMap();

function pressStart(node) {
  if (node.matches(':disabled, [aria-disabled="true"]')) return;
  pressedAt.set(node, performance.now());
  node.classList.add('m-pressed');
}

/** Release after at least one full « fast » duration, so a quick tap still shows the whole press. */
function pressEnd(node) {
  const at = pressedAt.get(node);
  if (at == null) return;
  pressedAt.delete(node);
  const hold = tokenMs('--d-fast', 120);
  const remaining = Math.max(0, hold - (performance.now() - at));
  const release = () => node.classList.remove('m-pressed');
  if (remaining === 0) release();
  else setTimeout(release, remaining);
}

const pressTarget = (ev) =>
  ev.target instanceof Element ? ev.target.closest(PRESS_SELECTOR) : null;

document.addEventListener(
  'pointerdown',
  (ev) => {
    if (ev.button !== 0) return;
    const node = pressTarget(ev);
    if (!node) return;
    pressStart(node);
    const end = () => {
      pressEnd(node);
      for (const type of ['pointerup', 'pointercancel']) removeEventListener(type, end, true);
    };
    for (const type of ['pointerup', 'pointercancel']) addEventListener(type, end, true);
  },
  { passive: true },
);

document.addEventListener('keydown', (ev) => {
  if (ev.repeat || (ev.key !== ' ' && ev.key !== 'Enter')) return;
  const node = pressTarget(ev);
  if (node) pressStart(node);
});
document.addEventListener('keyup', (ev) => {
  if (ev.key !== ' ' && ev.key !== 'Enter') return;
  const node = pressTarget(ev);
  if (node) pressEnd(node);
});
// Focus lost mid-press (Enter on a link navigates, Tab away): never leave a button shrunk.
document.addEventListener('focusout', (ev) => {
  const node = ev.target instanceof Element ? ev.target.closest(PRESS_SELECTOR) : null;
  if (node) pressEnd(node);
});

/* ------------------------------------------------------------------ */
/* Wiring: existing hooks now, later ones through a MutationObserver      */
/* ------------------------------------------------------------------ */

function wire(scope) {
  if (!(scope instanceof Element)) return;
  const nodes = scope.matches('[data-motion]') ? [scope] : [];
  nodes.push(...scope.querySelectorAll('[data-motion]'));
  for (const node of nodes) {
    const kind = node.getAttribute('data-motion');
    if (kind === 'reveal') watchReveal(node);
    else if (kind === 'content') watchContent(node);
  }
}

const watchedContent = new WeakSet();
function watchContent(container) {
  if (watchedContent.has(container)) return;
  watchedContent.add(container);
  // Children rendered by the module (replaceChildren) -> the container is ready.
  new MutationObserver(() => markReady(container)).observe(container, { childList: true });
}

function start() {
  wire(document.body);
  new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) wire(n);
  }).observe(document.body, { childList: true, subtree: true });
}

if (document.body) start();
else document.addEventListener('DOMContentLoaded', start, { once: true });

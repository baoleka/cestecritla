// @ts-check
// Lab page script: explicit Turnstile rendering, evidence collection in window.__lab, fetch-based submit.
// No inline script anywhere (CSP without 'unsafe-inline'); this file is allowed by script-src 'self' (static)
// or by the per-request nonce (/nonce variant).

/**
 * @typedef {{ type: string, at: number, detail?: string }} LabEvent
 * @typedef {{
 *   variant: string,
 *   scriptLoadedAt: number | null,
 *   renderedAt: number | null,
 *   token: string | null,
 *   tokenAt: number | null,
 *   widgetId: string | null,
 *   events: LabEvent[],
 *   cspViolations: string[],
 *   verifyResult: unknown,
 *   replayResult: unknown,
 * }} LabState
 */

/** @type {LabState} */
const lab = {
  variant: document.documentElement.getAttribute('data-lab-variant') ?? 'unknown',
  scriptLoadedAt: null,
  renderedAt: null,
  token: null,
  tokenAt: null,
  widgetId: null,
  events: [],
  cspViolations: [],
  verifyResult: null,
  replayResult: null,
};
/** @type {Window & { __lab?: LabState, onTurnstileLoad?: () => void }} */
const labWindow = window;
labWindow.__lab = lab;

const SITEKEY = '0x4AAAAAAEt3fczgKFO-ViPf';
const ACTION = 'lab-verify';

const statusEl = /** @type {HTMLElement} */ (document.getElementById('status'));
const resultEl = /** @type {HTMLPreElement} */ (document.getElementById('result'));
const tokenField = /** @type {HTMLInputElement} */ (document.getElementById('token-field'));
const submitButton = /** @type {HTMLButtonElement} */ (document.getElementById('submit-button'));
const form = /** @type {HTMLFormElement} */ (document.getElementById('verify-form'));
const variantEl = /** @type {HTMLElement} */ (document.getElementById('variant'));
variantEl.textContent = lab.variant;

/** @param {string} type @param {string} [detail] */
function record(type, detail) {
  lab.events.push(
    detail === undefined
      ? { type, at: performance.now() }
      : { type, at: performance.now(), detail },
  );
}

/** @param {string} text */
function setStatus(text) {
  statusEl.textContent = text;
}

document.addEventListener('securitypolicyviolation', (event) => {
  const line = `${event.violatedDirective} blocked ${event.blockedURI} (${event.sourceFile ?? 'inline'}:${event.lineNumber})`;
  lab.cspViolations.push(line);
  record('csp-violation', line);
});

// Called by api.js (?onload=onTurnstileLoad&render=explicit).
labWindow.onTurnstileLoad = () => {
  lab.scriptLoadedAt = performance.now();
  record('script-loaded');
  setStatus('Script chargé, rendu du widget…');
  const widgetId = turnstile.render('#cf-turnstile', {
    sitekey: SITEKEY,
    action: ACTION,
    // Invisible widget type is set on the widget itself (dashboard); interaction-only keeps the
    // container empty unless the visitor must interact.
    appearance: 'interaction-only',
    language: 'fr',
    theme: 'auto',
    callback: (token) => {
      lab.token = token;
      lab.tokenAt = performance.now();
      tokenField.value = token;
      submitButton.disabled = false;
      record('token', `length=${token.length}`);
      setStatus(`Jeton obtenu en ${Math.round(lab.tokenAt)} ms depuis le début de la navigation.`);
    },
    'error-callback': (code) => {
      record('error', String(code));
      setStatus(`Erreur Turnstile ${String(code)}.`);
      return true; // handled: no console error from api.js
    },
    'expired-callback': () => {
      record('expired');
      submitButton.disabled = true;
      setStatus('Jeton expiré (300 s).');
    },
    'timeout-callback': () => {
      record('timeout');
      setStatus('Défi expiré sans interaction.');
    },
    'before-interactive-callback': () => record('before-interactive'),
    'after-interactive-callback': () => record('after-interactive'),
    'unsupported-callback': () => {
      record('unsupported');
      setStatus('Navigateur non pris en charge par Turnstile.');
    },
  });
  lab.widgetId = widgetId ?? null;
  lab.renderedAt = performance.now();
  record('rendered', lab.widgetId ?? 'null');
};

/**
 * @param {string} token
 * @returns {Promise<unknown>}
 */
async function verify(token) {
  const response = await fetch('/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 'cf-turnstile-response': token }),
  });
  return response.json();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (lab.token === null) return;
  const token = lab.token;
  submitButton.disabled = true;
  setStatus('Vérification côté serveur…');
  verify(token)
    .then(async (result) => {
      lab.verifyResult = result;
      resultEl.hidden = false;
      resultEl.textContent = JSON.stringify(result, null, 2);
      record('verified');
      // Tokens are single-use: replaying the same token must be refused by siteverify.
      lab.replayResult = await verify(token);
      record('replayed');
      setStatus('Réponse reçue (voir ci-dessous). Rejeu du même jeton tenté.');
    })
    .catch((error) => {
      record('verify-error', error instanceof Error ? error.message : 'unknown');
      setStatus('Échec de la vérification.');
    })
    .finally(() => {
      // Page stays active: reset the widget so a retry gets a fresh token.
      if (lab.widgetId !== null) turnstile.reset(lab.widgetId);
      lab.token = null;
      tokenField.value = '';
    });
});

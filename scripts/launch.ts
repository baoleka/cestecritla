/**
 * Launch day, as data and a rule rather than as a habit (D15.5, lot F2).
 *
 * Until now "the apex serves the holding page until launch day" was a constant in the deploy
 * script: launching meant editing code, in a hurry, on the one day when everything else also
 * wants attention. The decision is now a file the editor fills in — data/launch.json — and the
 * conditions it has to meet are written here, tested, and listed by name when one is missing.
 *
 * What must be true before the app replaces the holding page:
 *   - the editor says so (`apex: "app"`);
 *   - the citation policy has been validated on the measured numbers (D15.7);
 *   - the LCEN declaration to the host is archived (P0.5) — the legal notice says the host
 *     holds the editor's identity, and that sentence must be true the day it is published;
 *   - the contact address answers (P0.8) — four pages print it;
 *   - none of our own texts is still waiting to be re-read (D0.27).
 *
 * The same file is the withdrawal gesture of runbook sheet 9 (D14.10): back to "holding",
 * build the holding site, deploy.
 */
import { existsSync, readFileSync } from 'node:fs';
import { citationPolicyValidated } from './build-mode.js';

export const LAUNCH_PATH = 'data/launch.json';

export interface LaunchFile {
  apex: 'holding' | 'app';
  /** The date decided for the launch (D15.5). Informative: the gate does not read the clock. */
  planned_on: string;
  /** Date the LCEN declaration was sent to the host and its acknowledgement archived (P0.5). */
  lcen_declared_on: string | null;
  /** Date a test message to the contact address was received (P0.8). */
  contact_mailbox_ready_on: string | null;
  note_fr: string;
}

export interface LaunchInputs {
  launch: LaunchFile;
  policyValidated: boolean;
  /** Editorial entries whose review is still pending, as `riposte:rip-01`, `mot:ecocide`. */
  pendingReviews: readonly string[];
}

const isDate = (value: string | null): boolean =>
  value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Why the app may not replace the holding page yet — empty when it may. */
export function launchBlockers(inputs: LaunchInputs): string[] {
  const out: string[] = [];
  if (inputs.launch.apex !== 'app') {
    out.push(
      `the launch has not been decided: ${LAUNCH_PATH} says the apex serves the holding page (D15.5)`,
    );
  }
  if (!inputs.policyValidated) {
    out.push('the citation policy has not been validated (D15.7): data/2026/exposure-policy.json');
  }
  if (!isDate(inputs.launch.lcen_declared_on)) {
    out.push('the LCEN declaration to the host is not recorded (P0.5): lcen_declared_on');
  }
  if (!isDate(inputs.launch.contact_mailbox_ready_on)) {
    out.push('the contact address has not been tested (P0.8): contact_mailbox_ready_on');
  }
  if (inputs.pendingReviews.length > 0) {
    out.push(
      `${String(inputs.pendingReviews.length)} of our own texts have not been re-read (D0.27): ` +
        `${inputs.pendingReviews.slice(0, 6).join(', ')}${inputs.pendingReviews.length > 6 ? ', …' : ''}`,
    );
  }
  return out;
}

interface Reviewed {
  entries: { id: string; review: { status: string } }[];
}

export function pendingReviews(): string[] {
  const out: string[] = [];
  for (const [path, prefix] of [
    ['data/2026/riposte.json', 'riposte'],
    ['data/2026/glossary.json', 'mot'],
  ] as const) {
    if (!existsSync(path)) continue;
    const file = JSON.parse(readFileSync(path, 'utf8')) as Reviewed;
    for (const entry of file.entries) {
      if (entry.review.status !== 'reviewed') out.push(`${prefix}:${entry.id}`);
    }
  }
  return out;
}

export function readLaunchInputs(): LaunchInputs {
  return {
    launch: JSON.parse(readFileSync(LAUNCH_PATH, 'utf8')) as LaunchFile,
    policyValidated: citationPolicyValidated(),
    pendingReviews: pendingReviews(),
  };
}

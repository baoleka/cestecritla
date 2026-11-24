-- The private base of « Demander » (D16.6): the text of the 2026 edition, where only the Worker
-- read it — withdrawn on 15 November 2026 (`--withdraw-text`), no line of it since — and, since
-- the plan of 14 November 2026 (PLAN-CHAT §3), the sentences written ahead about it, one per
-- measure, written and checked by an AI, the session, read by no person one by one (D16.57 to
-- D16.59). Cloudflare D1 (SQLite), free plan.
-- Filled from the editor's machine by scripts/seed-ask-2026.ts, with the editor's accord each
-- time; emptied when the site is withdrawn.
--
-- The text of the book is never served: an answer of the Worker is sentences of ours and
-- identifiers (src/lib/ask-contract.ts). The sentences of `gists` are ours, and they are what a
-- route may hand out — once their own switch is open. And nothing a visitor does is ever
-- written here: no question, no answer, no date, no counter. The Worker only reads.
--
-- Since D16.22 the Worker reads measures by their identifier and searches nothing: the page
-- searches, on the phone, and names what it found. The full-text index this file used to
-- declare is gone with the search — one derived copy of the text less at Cloudflare.

-- What the base is, and the two switches the editor keeps. Each deposit owns its keys and
-- touches no other: seeding the text leaves the sentences as they are, and the reverse.
--   corpus_version  the state of the book it holds; the Worker answers "local" when it is not
--                   the one the site was built from
--   propositions    how many rows it should hold
--   ask             'open' or 'stopped' — the switch of the written answers of `/api/ask`,
--                   closed since D16.33; it stops no model of the chat. Its row left the base
--                   with the text on 15/11/2026: `--switch … --what ask` now changes nothing,
--                   and the tool says so (scripts/seed-ask-2026.ts; runbook sheet 8)
--   gists           'open' or 'stopped' — the switch of the sentences written ahead, separate
--                   from `ask`: either can be cut without the other
--   gists_corpus    the state of the book those sentences were read against
--   gists_count     how many rows `gists` should hold
--   gists_sha256    the fingerprint of the set, so that what was deposited can be told from
--                   what was read (scripts/seed-ask-2026.ts, `gistsFingerprint`)
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) WITHOUT ROWID;

-- One row per proposition: key measure, measure, sub-measure. Never the prose around them.
CREATE TABLE IF NOT EXISTS propositions (
  id TEXT PRIMARY KEY,          -- "p3c1-s07-m06", "p4c2-s02-m02.s3"
  section_id TEXT NOT NULL,     -- "p3c1-s07"
  kind TEXT NOT NULL,           -- key_measure | measure | sub_measure
  ord INTEGER NOT NULL,         -- reading order in the book
  text TEXT NOT NULL,           -- the proposition, word for word
  lead TEXT NOT NULL            -- for a sub-measure, the measure it details; '' otherwise
) WITHOUT ROWID;

-- One row per measure that has a sentence of ours, checked against its measure and kept — never
-- a word of the book. A measure with no row keeps its link alone: that is a verdict, not a gap.
CREATE TABLE IF NOT EXISTS gists (
  id TEXT PRIMARY KEY,          -- the measure the sentence is about
  text TEXT NOT NULL,           -- one sentence, in our words, 300 characters at most
  measure_sha256 TEXT NOT NULL, -- the fingerprint of the measure it was read against
  read_on TEXT NOT NULL         -- the day it was read against its measure (D16.57), YYYY-MM-DD
) WITHOUT ROWID;

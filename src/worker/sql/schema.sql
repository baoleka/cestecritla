-- The private base of « Demander » (D16.6): the text of the 2026 edition, where only the Worker
-- reads it. Cloudflare D1 (SQLite), free plan. Filled from the editor's machine by
-- scripts/seed-ask-2026.ts, with the editor's accord each time; emptied when the site is withdrawn.
--
-- Nothing here is ever served: /api/ask answers with sentences of ours and identifiers
-- (src/lib/ask-contract.ts). And nothing a visitor does is ever written here: no question, no
-- answer, no date, no counter. The Worker only reads.
--
-- Since D16.22 the Worker reads measures by their identifier and searches nothing: the page
-- searches, on the phone, and names what it found. The full-text index this file used to
-- declare is gone with the search — one derived copy of the text less at Cloudflare.

-- What the base is, and the one switch the editor keeps:
--   corpus_version  the state of the book it holds; the Worker answers "local" when it is not
--                   the one the site was built from
--   propositions    how many rows it should hold
--   ask             'open' or 'stopped' — read at every request, so that written answers can
--                   be cut within the minute, with no deployment (runbook: « arrêt »)
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

-- Lab d1-fts5 (T7): retrieval index + hashed Q/R cache. Free plan D1 (5 M reads / 100 000 writes per day).
-- Text: La France insoumise – L'Avenir en commun 2025, CC BY-NC-SA 4.0.

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,          -- "c12"
  part_id TEXT NOT NULL,        -- "part3"
  number INTEGER NOT NULL,
  title TEXT NOT NULL           -- "Chapitre 12 : Planification écologique"
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,          -- "c12-s01"
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL
);

-- One row per retrieval unit: key_measure / measure / sub_measure (837) + intro_paragraph /
-- part_paragraph (31, section_id and chapter_id NULL), same units as variant A (eval/retrieval-core.ts).
CREATE TABLE IF NOT EXISTS propositions (
  id TEXT PRIMARY KEY,          -- "c12-s01-k01"
  section_id TEXT REFERENCES sections(id),
  chapter_id TEXT REFERENCES chapters(id),
  kind TEXT NOT NULL,
  text TEXT NOT NULL,           -- verbatim (a measure_split paragraph merged, D1.8)
  prefix TEXT NOT NULL          -- non-displayed context: chapter title + section title + chapeau first sentence (+ heading)
);

-- Standalone FTS5 table (its own copy of text/prefix, ~400 KB): a contentless or external-content
-- table would need a stable INTEGER rowid on propositions, which a TEXT PRIMARY KEY does not promise.
-- bm25(propositions_fts, 1.0, 0.6) reproduces variant A's field boosts (text 1 / prefix 0.6).
CREATE VIRTUAL TABLE IF NOT EXISTS propositions_fts USING fts5(
  text,
  prefix,
  id UNINDEXED,
  section_id UNINDEXED,
  chapter_id UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Q/R cache (D0.22): the key is SHA-256 of the sorted, stemmed query terms — never the raw
-- question, never an IP, never a timestamp finer than the row's own TTL bookkeeping.
CREATE TABLE IF NOT EXISTS q_cache (
  qhash TEXT PRIMARY KEY,       -- sha256 hex of cacheKeyMaterial(question)
  ids TEXT NOT NULL,            -- JSON array of proposition ids (the answer = ids, never prose)
  corpus_version TEXT NOT NULL, -- invalidation on re-crawl (D1.3)
  created_at INTEGER NOT NULL,  -- unix seconds, floored to 00:00 UTC (D0.22: never a timestamp finer than the day)
  expires_at INTEGER NOT NULL   -- created_at + TTL (7 days in the lab)
);
CREATE INDEX IF NOT EXISTS q_cache_expires ON q_cache (expires_at);

-- Vocabulary view (row mode): number of distinct terms and per-term document counts, for /stats.
CREATE VIRTUAL TABLE IF NOT EXISTS propositions_fts_v USING fts5vocab('propositions_fts', 'row');

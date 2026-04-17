-- Layer 1: raw data parsed from morphology / uthmani / sahih
CREATE TABLE IF NOT EXISTS verses (
  ref TEXT PRIMARY KEY,           -- e.g. "2:255"
  surah INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  arabic TEXT NOT NULL,           -- Uthmani text including inline waqf marks
  UNIQUE(surah, verse)
);

CREATE TABLE IF NOT EXISTS translations (
  ref TEXT PRIMARY KEY,
  english TEXT NOT NULL,
  FOREIGN KEY (ref) REFERENCES verses(ref)
);

CREATE TABLE IF NOT EXISTS morphology (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surah INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  word INTEGER NOT NULL,
  segment INTEGER NOT NULL,
  arabic TEXT NOT NULL,
  pos TEXT NOT NULL,              -- P, N, V
  features TEXT NOT NULL,         -- raw "P|PREF|LEM:ب" etc.
  root TEXT,                      -- extracted from "ROOT:xxx"
  lemma TEXT,                     -- extracted from "LEM:xxx"
  UNIQUE(surah, verse, word, segment)
);
CREATE INDEX IF NOT EXISTS idx_morphology_root ON morphology(root);
CREATE INDEX IF NOT EXISTS idx_morphology_lemma ON morphology(lemma);
CREATE INDEX IF NOT EXISTS idx_morphology_verse ON morphology(surah, verse);

-- Step 2: waqf-delimited sentences
CREATE TABLE IF NOT EXISTS sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_ref TEXT NOT NULL,        -- "2:255"
  start_word INTEGER NOT NULL,    -- 1-based inclusive
  end_word INTEGER NOT NULL,      -- inclusive
  arabic TEXT NOT NULL,           -- fragment text (no waqf marks in content)
  word_count INTEGER NOT NULL,
  FOREIGN KEY (verse_ref) REFERENCES verses(ref),
  UNIQUE(verse_ref, start_word)
);
CREATE INDEX IF NOT EXISTS idx_sentences_verse ON sentences(verse_ref);

-- Step 3: sentence ↔ (root, lemma) many-to-many
CREATE TABLE IF NOT EXISTS sentence_forms (
  sentence_id INTEGER NOT NULL,
  root TEXT NOT NULL,
  lemma TEXT NOT NULL,
  PRIMARY KEY (sentence_id, root, lemma),
  FOREIGN KEY (sentence_id) REFERENCES sentences(id)
);
CREATE INDEX IF NOT EXISTS idx_sentence_forms_root ON sentence_forms(root);
CREATE INDEX IF NOT EXISTS idx_sentence_forms_lemma ON sentence_forms(lemma);

-- Step 4: Phase A1 universal scores (pre-normalization raw values)
CREATE TABLE IF NOT EXISTS sentence_scores_a1 (
  sentence_id INTEGER PRIMARY KEY,
  d1_raw REAL NOT NULL,           -- Σ(lemma_freq) / word_count
  d2_raw REAL NOT NULL,           -- Σ(unique content-lemma freq) / total_segments * 100
  d3 REAL NOT NULL,               -- piecewise on word_count (see SCORING.md)
  FOREIGN KEY (sentence_id) REFERENCES sentences(id)
);

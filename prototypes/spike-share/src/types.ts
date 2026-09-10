/** Runtime data shapes shared by the build script (scripts/build-data.ts) and the Worker. */

export interface SlimSubMeasure {
  kind: 'sub_measure';
  id: string;
  text: string;
}

export interface SlimItem {
  kind: 'paragraph' | 'key_measure' | 'measure';
  id: string;
  text: string;
  subMeasures?: SlimSubMeasure[];
}

export interface SlimChiffre {
  id: string;
  text: string;
}

export interface SlimSection {
  id: string;
  chapterId: string;
  title: string;
  url: string;
  items: SlimItem[];
  chiffres: SlimChiffre[];
}

export interface SlimChapter {
  id: string;
  number: number;
  title: string;
  partId: string;
}

export interface SlimCorpus {
  meta: { corpus_version: string; official_count: number };
  chapters: SlimChapter[];
  sections: SlimSection[];
}

/** Subset of data/stat-cards.json used by the stat card. */
export interface StatCard {
  id: string;
  section_id: string;
  chapter_id: string;
  chapter_title: string;
  section_title: string;
  text: string;
  headline_percentage: number | null;
  institute: string | null;
  survey_date_text: string | null;
  legal_77_808: {
    organisme: string | null;
    dates: string | null;
    commanditaire: string | null;
    media_premiere_diffusion: string | null;
    missing: string[];
  };
}

export interface StatCards {
  meta: { corpus_version: string; count: number };
  cards: StatCard[];
}

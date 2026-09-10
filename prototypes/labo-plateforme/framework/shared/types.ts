/** Runtime data shapes shared by the build script, the search module and both apps (D1.6 projection). */

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

/** What the page renders at build time: one section and its chapter (section.json). */
export interface PageData {
  meta: SlimCorpus['meta'];
  chapter: SlimChapter;
  section: SlimSection;
}

/** One search hit as displayed by both apps. */
export interface SearchHit {
  id: string;
  kind: 'paragraph' | 'key_measure' | 'measure' | 'sub_measure' | 'chiffre';
  text: string;
  sectionId: string;
  sectionTitle: string;
  chapterTitle: string;
  url: string;
  score: number;
}

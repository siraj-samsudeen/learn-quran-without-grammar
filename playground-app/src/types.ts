// Types derived from lesson-01.yaml structure

export interface BilingualText {
  en: string;
  ta: string;
}

export interface VocabItem {
  arabic: string;
  transliteration: string;
  en: string;
  ta: string;
  ta_transliteration: string;
}

export interface ArabicSource {
  surah?: number;
  ayah?: number;
  start?: number;
  end?: number;
  use_arabic_tts?: boolean;
}

export interface Card {
  id: string;
  role: "anchor" | "learn" | "practice";
  root?: string;
  form: string;
  ref: string;
  reciter?: string;
  arabic_source: ArabicSource;
  arabic_source_full?: ArabicSource;
  arabic_text: string;
  en: string;
  ta: string;
  hook?: BilingualText;
}

export interface RootSection {
  id: string;
  root_letters: string;
  root_name: string;
  root_transliteration: string;
  meaning: string;
  explanation: BilingualText;
  vocabulary: VocabItem[];
  cards: Card[];
}

export interface QuizItem {
  arabic_context: string;
  highlighted_word: string;
  answer_en: string;
  answer_ta: string;
}

export interface Lesson {
  lesson_id: string;
  title: string;
  slug: string;
  description: string;
  intro: BilingualText;
  preview: BilingualText;
  anchor: {
    arabic: string;
    en: string;
    ta: string;
    context: BilingualText;
    audio: string;
  };
  roots: RootSection[];
  practice: {
    intro: BilingualText;
    cards: Card[];
  };
  quiz: {
    intro: BilingualText;
    items: QuizItem[];
  };
  closing: BilingualText;
  next_lesson: BilingualText;
}

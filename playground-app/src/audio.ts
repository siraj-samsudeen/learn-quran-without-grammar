/**
 * Audio architecture:
 *
 *   Arabic recitation → EveryAyah CDN (free, per-ayah, runtime)
 *   Translation TTS   → pre-built edge-tts MP3s (hosted on GitHub)
 *
 * The app plays them in sequence: Arabic → 2s pause → Translation.
 * No build-time stitching. The app orchestrates the sequence.
 */

import { Audio } from "expo-av";

// EveryAyah CDN base
const EVERYAYAH_BASE = "https://everyayah.com/data";

// TTS files base (for now, local assets served by Expo; in production, GitHub)
// We'll use a relative path that works with Expo's asset system
const TTS_BASE =
  "https://siraj-samsudeen.github.io/learn-quran-without-grammar/assets/audio/lessons";

// Reciter name mapping (our YAML names → EveryAyah folder names)
const RECITER_MAP: Record<string, string> = {
  Hani_Rifai_192kbps: "Hani_Rifai_192kbps",
  "Abu_Bakr_Ash-Shaatree_128kbps": "Abu_Bakr_Ash-Shaatree_128kbps",
  Hudhaify_128kbps: "Hudhaify_128kbps",
  Husary_128kbps: "Husary_128kbps",
  Alafasy_128kbps: "Alafasy_128kbps",
  Abdul_Basit_Mujawwad_128kbps: "Abdul_Basit_Mujawwad_128kbps",
  Abdul_Basit_Murattal_192kbps: "Abdul_Basit_Murattal_192kbps",
  Ghamadi_40kbps: "Ghamadi_40kbps",
  MaherAlMuaiqly128kbps: "MaherAlMuaiqly128kbps",
  "Yasser_Ad-Dussary_128kbps": "Yasser_Ad-Dussary_128kbps",
  "Abdurrahmaan_As-Sudais_192kbps": "Abdurrahmaan_As-Sudais_192kbps",
};

/**
 * Get Arabic recitation URL from EveryAyah CDN.
 */
export function getArabicAudioUrl(
  surah: number,
  ayah: number,
  reciter: string = "Alafasy_128kbps"
): string {
  const folder = RECITER_MAP[reciter] || reciter;
  const s = String(surah).padStart(3, "0");
  const a = String(ayah).padStart(3, "0");
  return `${EVERYAYAH_BASE}/${folder}/${s}${a}.mp3`;
}

/**
 * Get translation TTS URL.
 * For now uses the pre-built combined pair from GitHub Pages.
 * TODO: switch to translation-only TTS files once hosted.
 */
export function getTtsAudioUrl(
  lessonId: string,
  cardId: string,
  lang: "en" | "ta"
): string {
  // Use the existing combined pair MP3s as fallback
  // (they have Arabic + TTS together)
  // Once we host TTS-only files, this becomes:
  //   return `${TTS_HOST}/${lessonId}/${cardId}-${lang}.mp3`
  const suffix = lang === "ta" ? "-ta" : "";
  return `${TTS_BASE}/${lessonId}/${cardId}${suffix}.mp3`;
}

// ─── Sequenced audio player ───
// Plays: Arabic audio → pause → Translation TTS

export interface CardAudioSource {
  arabicUrl: string | null; // null for teaching phrases
  ttsUrl: string; // translation TTS (fallback: combined pair)
  useCombinedFallback: boolean; // if true, ttsUrl has Arabic+TTS combined
}

/**
 * Build audio sources for a card.
 */
export function getCardAudioSources(
  card: {
    id: string;
    arabic_source: { surah?: number; ayah?: number; use_arabic_tts?: boolean };
    reciter?: string;
  },
  lessonId: string,
  lang: "en" | "ta"
): CardAudioSource {
  const hasQuranAudio =
    !card.arabic_source.use_arabic_tts &&
    card.arabic_source.surah &&
    card.arabic_source.ayah;

  if (hasQuranAudio) {
    return {
      arabicUrl: getArabicAudioUrl(
        card.arabic_source.surah!,
        card.arabic_source.ayah!,
        card.reciter || "Alafasy_128kbps"
      ),
      ttsUrl: getTtsAudioUrl(lessonId, card.id, lang),
      useCombinedFallback: true, // TODO: set to false once TTS-only files are hosted
    };
  } else {
    // Teaching phrase — use combined pair (has Arabic TTS + translation TTS)
    return {
      arabicUrl: null,
      ttsUrl: getTtsAudioUrl(lessonId, card.id, lang),
      useCombinedFallback: true,
    };
  }
}

/**
 * Play a card's audio in sequence: Arabic → pause → Translation.
 * Returns a promise that resolves when all audio finishes.
 * Calls onCancel check between steps so we can abort.
 */
export async function playCardSequence(
  sources: CardAudioSource,
  isCancelled: () => boolean
): Promise<void> {
  if (sources.useCombinedFallback) {
    // For now, play the combined pair MP3 (Arabic + TTS together)
    if (sources.arabicUrl && !sources.useCombinedFallback) {
      // Future: play Arabic separately, then TTS separately
      await playSound(sources.arabicUrl);
      if (isCancelled()) return;
      await pause(2000);
      if (isCancelled()) return;
      await playSound(sources.ttsUrl);
    } else {
      // Combined pair — just play it
      await playSound(sources.ttsUrl);
    }
  }
}

/**
 * Play a single audio URL and wait for it to finish.
 */
export async function playSound(url: string): Promise<void> {
  const { sound } = await Audio.Sound.createAsync(
    { uri: url },
    { shouldPlay: true }
  );
  return new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        resolve();
      }
    });
  });
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

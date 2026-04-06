import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import {
  type Lesson,
  type Card,
  type BilingualText,
  type VocabItem,
  type QuizItem,
} from "./types";
import { getCardAudioSources, playCardSequence, playSound, type CardAudioSource } from "./audio";

type Lang = "en" | "ta";

// ─── Collect all cards from lesson structure ───
function getAllCards(lesson: Lesson): Card[] {
  const cards: Card[] = [];
  for (const root of lesson.roots) {
    cards.push(...root.cards);
  }
  cards.push(...lesson.practice.cards);
  return cards;
}

// ─── Simple markdown bold rendering ───
function T({ text, lang }: { text: BilingualText; lang: Lang }) {
  const content = text[lang] || text.en;
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={styles.prose}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <Text key={i} style={styles.bold}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        )
      )}
    </Text>
  );
}

function Arabic({ children, size = 28 }: { children: string; size?: number }) {
  return <Text style={[styles.arabic, { fontSize: size }]}>{children}</Text>;
}

// ─── Audio player hook ───
function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setPlayingId(null);
    setLoading(false);
  }, []);

  const play = useCallback(
    async (url: string, id: string) => {
      await stop();
      setLoading(true);
      setPlayingId(id);
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        setLoading(false);
        return new Promise<void>((resolve) => {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              setPlayingId(null);
              resolve();
            }
          });
        });
      } catch (e) {
        console.warn("Audio error:", e);
        setPlayingId(null);
        setLoading(false);
      }
    },
    [stop]
  );

  return { play, stop, playingId, loading };
}

// ─── Card Component ───
function CardView({
  card,
  lang,
  lessonId,
  audioPlayer,
  cardNumber,
}: {
  card: Card;
  lang: Lang;
  lessonId: string;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
  cardNumber: number;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const sources = getCardAudioSources(card, lessonId, lang);
  const isPlaying = audioPlayer.playingId === card.id;
  const isLoading = audioPlayer.loading && isPlaying;
  const translation = lang === "ta" ? card.ta : card.en;
  const hook = card.hook;

  const hasArabicCdn = sources.arabicUrl != null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardBadge,
            card.role === "anchor" && styles.cardBadgeAnchor,
          ]}
        >
          <Text style={styles.cardBadgeText}>
            {card.role === "anchor" ? "⭐" : cardNumber}
          </Text>
        </View>
        <Text style={styles.cardForm}>{card.form}</Text>
        {card.ref !== "teaching-phrase" && (
          <Text style={styles.cardRef}>({card.ref})</Text>
        )}
      </View>

      {/* Arabic text */}
      <Arabic>{card.arabic_text}</Arabic>

      {/* Audio buttons row */}
      <View style={styles.audioRow}>
        {/* Play Arabic only (from CDN) */}
        {hasArabicCdn && (
          <TouchableOpacity
            style={[styles.playBtn, isPlaying && audioPlayer.playingId === `arabic-${card.id}` && styles.playBtnActive]}
            onPress={() => {
              audioPlayer.stop();
              audioPlayer.play(sources.arabicUrl!, `arabic-${card.id}`);
            }}
          >
            <Text style={styles.playBtnText}>▶ Arabic</Text>
          </TouchableOpacity>
        )}

        {/* Play full sequence: Arabic → pause → Translation */}
        <TouchableOpacity
          style={[styles.playBtn, styles.playBtnFull, isPlaying && styles.playBtnActive]}
          onPress={() => {
            if (isPlaying) {
              audioPlayer.stop();
            } else {
              setShowTranslation(true);
              // Play combined pair (Arabic + Translation together)
              audioPlayer.play(sources.ttsUrl, card.id);
            }
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.playBtnText}>
              {isPlaying ? "⏸ Stop" : hasArabicCdn ? "▶ Arabic + Translation" : "▶ Play"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Audio source indicator */}
      {hasArabicCdn && (
        <Text style={styles.audioSource}>
          Arabic: {card.reciter?.replace(/_/g, ' ').replace(/\d+kbps/, '')} via EveryAyah CDN
        </Text>
      )}

      {/* Translation (tap to reveal) */}
      <TouchableOpacity
        style={styles.translationArea}
        onPress={() => setShowTranslation(!showTranslation)}
      >
        {showTranslation ? (
          <Text style={styles.translationText}>"{translation}"</Text>
        ) : (
          <Text style={styles.tapReveal}>Tap to reveal translation</Text>
        )}
      </TouchableOpacity>

      {/* Hook */}
      {hook && showTranslation && (
        <Text style={styles.hookText}>
          {lang === "ta" ? hook.ta : hook.en}
        </Text>
      )}
    </View>
  );
}

// ─── Sequential Player ───
function SequentialPlayer({
  cards,
  lang,
  lessonId,
}: {
  cards: Card[];
  lang: Lang;
  lessonId: string;
}) {
  const audioPlayer = useAudioPlayer();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"sequential" | "shuffle">("sequential");
  const playOrderRef = useRef<number[]>([]);
  const isRunningRef = useRef(false);

  // Build play order
  const buildOrder = useCallback(
    (m: "sequential" | "shuffle") => {
      const indices = cards.map((_, i) => i);
      if (m === "shuffle") {
        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
      }
      return indices;
    },
    [cards]
  );

  const playAll = useCallback(async () => {
    const order = buildOrder(mode);
    playOrderRef.current = order;
    setIsRunning(true);
    isRunningRef.current = true;

    for (let i = 0; i < order.length; i++) {
      if (!isRunningRef.current) break;
      const cardIndex = order[i];
      const card = cards[cardIndex];
      setCurrentIndex(cardIndex);
      const sources = getCardAudioSources(card, lessonId, lang);

      // Play Arabic from CDN first (if available)
      if (sources.arabicUrl && !sources.useCombinedFallback) {
        audioPlayer.play(sources.arabicUrl, `seq-arabic-${card.id}`);
        await playSound(sources.arabicUrl);
        if (!isRunningRef.current) break;
        await new Promise((r) => setTimeout(r, 2000)); // pause
        if (!isRunningRef.current) break;
        await playSound(sources.ttsUrl);
      } else {
        // Combined pair (Arabic + TTS together)
        await audioPlayer.play(sources.ttsUrl, `seq-${card.id}`);
      }

      // Gap between cards
      if (isRunningRef.current) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    setIsRunning(false);
    isRunningRef.current = false;
    setCurrentIndex(-1);
  }, [cards, lang, lessonId, mode, audioPlayer, buildOrder]);

  const stopAll = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    setCurrentIndex(-1);
    audioPlayer.stop();
  }, [audioPlayer]);

  const currentCard = currentIndex >= 0 ? cards[currentIndex] : null;

  return (
    <View style={styles.playerBox}>
      <Text style={styles.playerTitle}>
        {lang === "ta" ? "தொடர் இயக்கி" : "Lesson Player"}
      </Text>
      <Text style={styles.playerSubtitle}>
        Plays all {cards.length} phrases — Arabic + {lang === "ta" ? "Tamil" : "English"} translation
      </Text>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "sequential" && styles.modeBtnActive]}
          onPress={() => setMode("sequential")}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === "sequential" && styles.modeBtnTextActive,
            ]}
          >
            In Order
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "shuffle" && styles.modeBtnActive]}
          onPress={() => setMode("shuffle")}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === "shuffle" && styles.modeBtnTextActive,
            ]}
          >
            Shuffled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Now playing */}
      {currentCard && (
        <View style={styles.nowPlaying}>
          <Text style={styles.nowPlayingLabel}>Now playing:</Text>
          <Text style={styles.nowPlayingArabic}>{currentCard.arabic_text}</Text>
          <Text style={styles.nowPlayingTranslation}>
            {lang === "ta" ? currentCard.ta : currentCard.en}
          </Text>
          <Text style={styles.nowPlayingProgress}>
            {playOrderRef.current.indexOf(currentIndex) + 1} / {cards.length}
          </Text>
        </View>
      )}

      {/* Controls */}
      <TouchableOpacity
        style={[styles.playerBtn, isRunning && styles.playerBtnStop]}
        onPress={isRunning ? stopAll : playAll}
      >
        <Text style={styles.playerBtnText}>
          {isRunning ? "⏹ Stop" : "▶ Play All"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Vocabulary Table ───
function VocabTable({ items, lang }: { items: VocabItem[]; lang: Lang }) {
  return (
    <View style={styles.vocabTable}>
      <View style={[styles.vocabRow, styles.vocabHeaderRow]}>
        <Text style={[styles.vocabArabic, styles.vocabHeaderText]}>
          {lang === "ta" ? "அரபி" : "Arabic"}
        </Text>
        <Text style={[styles.vocabMeaning, styles.vocabHeaderText]}>
          {lang === "ta" ? "பொருள்" : "Meaning"}
        </Text>
        <Text style={[styles.vocabTranslit, styles.vocabHeaderText]}>
          {lang === "ta" ? "தமிழ்" : "Transliteration"}
        </Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.vocabRow}>
          <Text style={styles.vocabArabic}>{item.arabic}</Text>
          <Text style={styles.vocabMeaning}>
            {lang === "ta" ? item.ta : item.en}
          </Text>
          <Text style={styles.vocabTranslit}>
            {lang === "ta" ? item.ta_transliteration : item.transliteration}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Quiz Item ───
function QuizItemView({ item, lang }: { item: QuizItem; lang: Lang }) {
  const [revealed, setRevealed] = useState(false);
  const parts = item.arabic_context.split(/(\*\*[^*]+\*\*)/g);

  return (
    <View style={styles.quizItem}>
      <Text style={styles.quizArabic}>
        {parts.map((p, i) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <Text key={i} style={styles.quizHighlight}>
              {p.slice(2, -2)}
            </Text>
          ) : (
            <Text key={i}>{p}</Text>
          )
        )}
      </Text>
      <TouchableOpacity onPress={() => setRevealed(!revealed)}>
        {revealed ? (
          <Text style={styles.quizAnswer}>
            {lang === "ta" ? item.answer_ta : item.answer_en}
          </Text>
        ) : (
          <Text style={styles.quizTap}>
            {item.highlighted_word} → tap to reveal
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{children}</Text>
    </View>
  );
}

// ─── Main Lesson Screen ───
export default function LessonScreen({ lesson }: { lesson: Lesson }) {
  const [lang, setLang] = useState<Lang>("en");
  const audioPlayer = useAudioPlayer();
  const allCards = getAllCards(lesson);
  let cardCounter = 0;

  // Set up audio mode
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch(console.warn);
  }, []);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {lesson.title}
        </Text>
        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
            onPress={() => setLang("en")}
          >
            <Text
              style={[
                styles.langBtnText,
                lang === "en" && styles.langBtnTextActive,
              ]}
            >
              EN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === "ta" && styles.langBtnActive]}
            onPress={() => setLang("ta")}
          >
            <Text
              style={[
                styles.langBtnText,
                lang === "ta" && styles.langBtnTextActive,
              ]}
            >
              தமிழ்
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Intro */}
        <T text={lesson.intro} lang={lang} />
        <View style={styles.previewBox}>
          <T text={lesson.preview} lang={lang} />
        </View>

        {/* Anchor */}
        <SectionHeader>Anchor</SectionHeader>
        <View style={styles.anchorBox}>
          <Arabic size={36}>{lesson.anchor.arabic}</Arabic>
          <Text style={styles.anchorTranslation}>
            {lang === "ta" ? lesson.anchor.ta : lesson.anchor.en}
          </Text>
        </View>
        <T text={lesson.anchor.context} lang={lang} />

        {/* Root sections */}
        {lesson.roots.map((root) => (
          <View key={root.id}>
            <SectionHeader>
              {`Root: ${root.root_name} (${root.meaning})`}
            </SectionHeader>
            <T text={root.explanation} lang={lang} />
            <VocabTable items={root.vocabulary} lang={lang} />
            {root.cards.map((card) => {
              cardCounter++;
              return (
                <CardView
                  key={card.id}
                  card={card}
                  lang={lang}
                  lessonId={lesson.lesson_id}
                  audioPlayer={audioPlayer}
                  cardNumber={cardCounter}
                />
              );
            })}
          </View>
        ))}

        {/* Practice */}
        <SectionHeader>
          {lang === "ta"
            ? "பயிற்சி — வேர்ச்சொற்களைக் கண்டுபிடிக்க முடியுமா?"
            : "Practice — Can You Spot the Roots?"}
        </SectionHeader>
        <T text={lesson.practice.intro} lang={lang} />
        {lesson.practice.cards.map((card) => {
          cardCounter++;
          return (
            <CardView
              key={card.id}
              card={card}
              lang={lang}
              lessonId={lesson.lesson_id}
              audioPlayer={audioPlayer}
              cardNumber={cardCounter}
            />
          );
        })}

        {/* Sequential Player */}
        <SectionHeader>
          {lang === "ta" ? "மறுபார்வை" : "Review"}
        </SectionHeader>
        <SequentialPlayer
          cards={allCards}
          lang={lang}
          lessonId={lesson.lesson_id}
        />

        {/* Quiz */}
        <SectionHeader>
          {lang === "ta" ? "விரைவுச் சோதனை" : "Quick Check"}
        </SectionHeader>
        <T text={lesson.quiz.intro} lang={lang} />
        {lesson.quiz.items.map((item, i) => (
          <QuizItemView key={i} item={item} lang={lang} />
        ))}

        {/* Closing */}
        <SectionHeader>
          {lang === "ta" ? "முடிவுரை" : "Closing"}
        </SectionHeader>
        <T text={lesson.closing} lang={lang} />

        {/* Next lesson */}
        <View style={styles.nextBox}>
          <Text style={styles.nextTitle}>
            {lang === "ta" ? "அடுத்தது என்ன?" : "What's Next?"}
          </Text>
          <T text={lesson.next_lesson} lang={lang} />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 12 : 54,
    paddingBottom: 12,
    backgroundColor: "#1a1a2e",
  },
  topBarTitle: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 },
  langToggle: { flexDirection: "row", gap: 4 },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#2a2a4e",
  },
  langBtnActive: { backgroundColor: "#fff" },
  langBtnText: { color: "#999", fontSize: 13, fontWeight: "600" },
  langBtnTextActive: { color: "#1a1a2e" },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    maxWidth: 640,
    alignSelf: "center",
    width: "100%",
  },
  prose: { fontSize: 15, lineHeight: 24, color: "#334155", marginBottom: 12 },
  bold: { fontWeight: "700" },
  arabic: {
    fontSize: 28,
    lineHeight: 48,
    textAlign: "right",
    writingDirection: "rtl",
    color: "#1a1a2e",
    fontFamily:
      Platform.OS === "web"
        ? "'Amiri', 'Traditional Arabic', serif"
        : undefined,
    marginVertical: 8,
  },
  previewBox: {
    backgroundColor: "#f0f9ff",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  sectionHeaderText: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  anchorBox: {
    backgroundColor: "#fef3c7",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  anchorTranslation: {
    fontSize: 16,
    color: "#92400e",
    fontStyle: "italic",
    marginTop: 4,
  },
  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      web: { boxShadow: "0 1px 3px rgba(0,0,0,0.08)" } as any,
      default: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  cardBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadgeAnchor: { backgroundColor: "#fef3c7" },
  cardBadgeText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  cardForm: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily:
      Platform.OS === "web" ? "'Amiri', serif" : undefined,
  },
  cardRef: { fontSize: 12, color: "#94a3b8" },
  audioRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
    flexWrap: "wrap",
  },
  playBtn: {
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playBtnFull: { backgroundColor: "#166534" },
  playBtnActive: { backgroundColor: "#dc2626" },
  playBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  audioSource: {
    fontSize: 10,
    color: "#94a3b8",
    fontStyle: "italic",
    marginBottom: 4,
  },
  translationArea: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  translationText: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 22,
    fontStyle: "italic",
  },
  tapReveal: { fontSize: 14, color: "#94a3b8", textAlign: "center" },
  hookText: {
    fontSize: 13,
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#cbd5e1",
  },
  // Vocab
  vocabTable: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    overflow: "hidden",
  },
  vocabRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    alignItems: "center",
  },
  vocabHeaderRow: { backgroundColor: "#f8fafc" },
  vocabHeaderText: { fontWeight: "700", fontSize: 12, color: "#64748b" },
  vocabArabic: {
    fontSize: 20,
    flex: 1,
    textAlign: "right",
    color: "#1a1a2e",
    fontFamily:
      Platform.OS === "web" ? "'Amiri', serif" : undefined,
  },
  vocabMeaning: { fontSize: 14, flex: 1, color: "#334155", paddingLeft: 12 },
  vocabTranslit: {
    fontSize: 12,
    color: "#94a3b8",
    flex: 1,
    paddingLeft: 8,
    fontStyle: "italic",
  },
  // Quiz
  quizItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  quizArabic: {
    fontSize: 20,
    textAlign: "right",
    writingDirection: "rtl",
    color: "#1a1a2e",
    fontFamily:
      Platform.OS === "web" ? "'Amiri', serif" : undefined,
    marginBottom: 8,
  },
  quizHighlight: { color: "#2563eb", fontWeight: "700" },
  quizTap: { fontSize: 14, color: "#3b82f6", textAlign: "center" },
  quizAnswer: {
    fontSize: 16,
    color: "#16a34a",
    fontWeight: "600",
    textAlign: "center",
  },
  // Next
  nextBox: {
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  nextTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 8,
  },
  // Player
  playerBox: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  playerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  playerSubtitle: { fontSize: 13, color: "#94a3b8", marginBottom: 16 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2a2a4e",
  },
  modeBtnActive: { backgroundColor: "#3b82f6" },
  modeBtnText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
  modeBtnTextActive: { color: "#fff" },
  nowPlaying: {
    backgroundColor: "#2a2a4e",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  nowPlayingLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 4 },
  nowPlayingArabic: {
    fontSize: 22,
    color: "#fff",
    textAlign: "center",
    fontFamily:
      Platform.OS === "web" ? "'Amiri', serif" : undefined,
    marginBottom: 4,
  },
  nowPlayingTranslation: {
    fontSize: 14,
    color: "#cbd5e1",
    fontStyle: "italic",
    textAlign: "center",
  },
  nowPlayingProgress: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
  },
  playerBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  playerBtnStop: { backgroundColor: "#dc2626" },
  playerBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

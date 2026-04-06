import { useOfflineSync, type SyncStatus } from "./useOfflineSync";

// Simulated cards from Lesson 1
const LESSON_ID = "lesson-01";
const CARDS = [
  { id: "lesson-01-phrase-01", arabic: "إِلَٰه", meaning: "god" },
  { id: "lesson-01-phrase-02", arabic: "آلِهَة", meaning: "gods" },
  { id: "lesson-01-phrase-03", arabic: "اللَّهُمَّ", meaning: "O Allah" },
  { id: "lesson-01-phrase-04", arabic: "كَبِير", meaning: "great, big" },
  { id: "lesson-01-phrase-05", arabic: "أَكْبَرُ", meaning: "greater, greatest" },
  { id: "lesson-01-phrase-06", arabic: "كُبْرَى", meaning: "greatest (fem)" },
  { id: "lesson-01-phrase-07", arabic: "كَبُرَ", meaning: "was great" },
  { id: "lesson-01-phrase-08", arabic: "اسْتَكْبَرَ", meaning: "was arrogant" },
];

const RATINGS = [
  { value: 1, label: "Again", color: "#ef4444" },
  { value: 2, label: "Hard", color: "#f97316" },
  { value: 3, label: "Good", color: "#22c55e" },
  { value: 4, label: "Easy", color: "#3b82f6" },
];

export default function App() {
  const {
    cardStates,
    recordReview,
    syncStatus,
    syncStats,
    isOnline,
    manualSync,
  } = useOfflineSync(LESSON_ID);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      {/* Header with sync status */}
      <div style={{
        position: "sticky", top: 0, background: "#1a1a2e", color: "white",
        padding: "12px 16px", borderRadius: 8, marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        zIndex: 10,
      }}>
        <div>
          <strong>Offline Sync Test</strong>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            Lesson 1 — Allāhu Akbar
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <StatusBadge status={syncStatus} isOnline={isOnline} />
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
            {syncStats.unsynced > 0
              ? `${syncStats.unsynced} pending sync`
              : "all synced"}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8,
        padding: 12, marginBottom: 16, fontSize: 13, lineHeight: 1.5,
      }}>
        <strong>🧪 Test Instructions:</strong>
        <ol style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
          <li>Click rating buttons to "study" cards (writes locally first)</li>
          <li>Open DevTools → Network → toggle "Offline" to simulate no connection</li>
          <li>Study more cards while "offline" — they save to IndexedDB</li>
          <li>Toggle back to online — watch pending reviews sync to Convex</li>
          <li>Check Convex dashboard to verify data arrived</li>
        </ol>
      </div>

      {/* Sync controls */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 16, alignItems: "center",
      }}>
        <button
          onClick={manualSync}
          disabled={!isOnline || syncStatus === "syncing"}
          style={{
            padding: "8px 16px", borderRadius: 6, border: "none",
            background: isOnline ? "#3b82f6" : "#94a3b8", color: "white",
            cursor: isOnline ? "pointer" : "not-allowed", fontSize: 13,
          }}
        >
          {syncStatus === "syncing" ? "⏳ Syncing..." : "🔄 Sync Now"}
        </button>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Total local reviews: {syncStats.totalLocal} | 
          Unsynced: {syncStats.unsynced}
          {syncStats.lastSyncAt && (
            <> | Last sync: {new Date(syncStats.lastSyncAt).toLocaleTimeString()}</>
          )}
        </span>
      </div>

      {/* Card list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CARDS.map((card) => {
          const state = cardStates.find((s) => s.cardId === card.id);
          return (
            <CardRow
              key={card.id}
              card={card}
              totalReviews={state?.totalReviews ?? 0}
              lastRating={state?.lastRating}
              lastReviewedAt={state?.lastReviewedAt}
              onRate={(rating) => recordReview(card.id, rating)}
            />
          );
        })}
      </div>

      {/* Debug: raw local state */}
      <details style={{ marginTop: 24, fontSize: 12 }}>
        <summary style={{ cursor: "pointer", color: "#64748b" }}>
          🔍 Debug: Local IndexedDB State
        </summary>
        <pre style={{
          background: "#f1f5f9", padding: 12, borderRadius: 6,
          overflow: "auto", maxHeight: 300, marginTop: 8,
        }}>
          {JSON.stringify(cardStates, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function StatusBadge({ status, isOnline }: { status: SyncStatus; isOnline: boolean }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    online: { bg: "#22c55e", text: "white", label: "● Online" },
    offline: { bg: "#ef4444", text: "white", label: "● Offline" },
    syncing: { bg: "#f59e0b", text: "black", label: "⏳ Syncing" },
    error: { bg: "#ef4444", text: "white", label: "⚠ Sync Error" },
  };
  const c = config[isOnline ? status : "offline"];
  return (
    <span style={{
      background: c.bg, color: c.text, padding: "2px 8px",
      borderRadius: 12, fontSize: 12, fontWeight: 600,
    }}>
      {c.label}
    </span>
  );
}

function CardRow({
  card,
  totalReviews,
  lastRating,
  lastReviewedAt,
  onRate,
}: {
  card: { id: string; arabic: string; meaning: string };
  totalReviews: number;
  lastRating?: number;
  lastReviewedAt?: number;
  onRate: (rating: number) => void;
}) {
  return (
    <div style={{
      border: "1px solid #e2e8f0", borderRadius: 8, padding: 12,
      background: totalReviews > 0 ? "#f0fdf4" : "white",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontFamily: "'Amiri', serif", direction: "rtl" }}>
            {card.arabic}
          </div>
          <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>
            {card.meaning}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#94a3b8" }}>
          {totalReviews > 0 && (
            <>
              <div>Reviews: <strong style={{ color: "#334155" }}>{totalReviews}</strong></div>
              <div>Last: {lastRating && RATINGS.find(r => r.value === lastRating)?.label}</div>
              <div>{lastReviewedAt && new Date(lastReviewedAt).toLocaleTimeString()}</div>
            </>
          )}
          {totalReviews === 0 && <div style={{ color: "#cbd5e1" }}>Not studied</div>}
        </div>
      </div>
      
      {/* Rating buttons */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {RATINGS.map((r) => (
          <button
            key={r.value}
            onClick={() => onRate(r.value)}
            style={{
              flex: 1, padding: "6px 4px", borderRadius: 6,
              border: `2px solid ${r.color}`,
              background: lastRating === r.value ? r.color : "white",
              color: lastRating === r.value ? "white" : r.color,
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

# From Lesson Markdown to Cross-Platform App: Step-by-Step

## What We Have Today

```
lesson-01-allahu-akbar.md          → Jekyll renders to HTML page
  └── lesson-cards.js              → transforms H3 groups into styled cards (DOM heuristics)
  └── shuffle-player.js            → reads manifest.json, plays shuffled audio
  └── translation-toggle.js        → hide/reveal translations
  └── language-toggle.js           → EN ↔ Tamil switch

manifest.json                      → 12 sentence objects (id, arabic, english, tamil, audio files)
lesson-01.yaml                     → source-of-truth (adds reciter, arabic_source, build info)
```

**Key problem:** The markdown and the manifest are two disconnected worlds.
- The **markdown** has everything: prose, root explanations, hooks, tables, quiz, structure
- The **manifest** has only the 12 sentence pairs (no hooks, no prose, no quiz)
- The **verse cards** in the DOM have NO data-id — they aren't linked to manifest sentences

---

## The 12 Reviewable Cards

From `manifest.json`, these are the atomic study units:

| # | ID | Role | Root | Form | Ref |
|---|---|---|---|---|---|
| 1 | `anchor-ilah` | anchor | إِلَٰه | إِلَٰه | 59:22 |
| 2 | `learn-ilah-01` | learn | إِلَٰه | آلِهَة | 6:74 |
| 3 | `learn-ilah-02` | learn | إِلَٰه | اللَّهُمَّ | 3:26 |
| 4 | `anchor-kabura` | anchor | كَبُرَ | كَبِير + أَكْبَر | teaching |
| 5 | `learn-kabura-01` | learn | كَبُرَ | كُبْرَى | 79:20 |
| 6 | `learn-kabura-02` | learn | كَبُرَ | كَبُرَ | 61:3 |
| 7 | `learn-kabura-03` | learn | كَبُرَ | اسْتَكْبَرَ | 2:34 |
| 8 | `practice-01` | practice | كَبُرَ | أَكْبَرُ | 29:45 |
| 9 | `practice-02` | practice | كَبُرَ | كَبُرَ | 18:5 |
| 10 | `practice-03` | practice | كَبُرَ | كَبِير | 21:63 |
| 11 | `practice-04` | practice | إِلَٰه | إِلَٰه (×3) | 2:163 |
| 12 | `practice-05` | practice | كَبُرَ | اسْتَكْبَرَ | 41:15 |

Each card has: `arabic_text`, `english`, `tamil`, `file` (EN audio), `file_tamil` (TA audio).

---

## What Needs to Change: 6 Steps

### Step 1: Add `data-card-id` to Verse Cards (Browser)

**Why:** The browser cards currently have no link to the manifest. We need IDs so we can track which card the user studied.

**Where:** `assets/js/lesson-cards.js`

**How:** When `lesson-cards.js` builds each `.verse-card`, extract the card number and match it to the manifest order, OR parse the audio `src` attribute to extract the sentence ID.

The audio `src` already contains the filename:
```html
<audio src="/assets/audio/lessons/lesson-01/anchor-ilah.mp3">
```
From this we can extract `anchor-ilah` → that's our `data-card-id`.

**Change:**
```javascript
// In lesson-cards.js, when building the card:
const audioEl = refP?.querySelector('audio');
const audioSrc = audioEl?.getAttribute('src') || '';
const filename = audioSrc.split('/').pop()?.replace('.mp3', '').replace('-ta', '') || '';
card.setAttribute('data-card-id', filename);
```

---

### Step 2: Add Study Tracking to the Browser (Web)

**Why:** Currently, clicking through cards leaves no trace. We need to record when a card is studied.

**Where:** New file `assets/js/study-tracker.js`

**What it does:**
1. Loads the Convex SDK (lightweight, via CDN or npm)
2. Uses the same `offlineStore.ts` pattern (IndexedDB for local, sync to Convex)
3. Attaches event listeners to verse cards:
   - When audio is played → record "studied" event
   - When translation is revealed → record "attempted recall"
   - (Future) SRS rating buttons added to each card

**Minimal first version:** Just track "audio played" per card. No rating buttons yet.

```javascript
// When any audio in a verse-card plays:
document.addEventListener('play', (e) => {
  const card = e.target.closest('.verse-card');
  if (card) {
    const cardId = card.getAttribute('data-card-id');
    recordReview(cardId, lessonId, 3); // default "Good" rating
  }
}, true);
```

**Data stored locally:**
```
IndexedDB: lqwg-offline
  → reviews: { id, cardId, lessonId, rating, reviewedAt, deviceId, synced }
  → cardState: { cardId, lessonId, totalReviews, lastReviewedAt }
```

**Visual feedback on cards:**
- Badge showing review count (e.g., "×3")
- Green tint on studied cards
- Last studied time

---

### Step 3: Add Convex SDK to the Jekyll Site

**Why:** The browser needs to sync with Convex (same backend the mobile app uses).

**Where:** `_layouts/lesson.html` or a new script loaded on lesson pages.

**Options:**
- **Option A (simplest):** Use `convex/browser` (the lightweight HTTP client). No WebSocket needed for the browser — just push reviews and pull state on page load.
- **Option B (real-time):** Use the full `ConvexReactClient` — but this requires React, which the Jekyll site doesn't have.

**Recommended: Option A.** The Jekyll site uses vanilla JS. We use `ConvexHttpClient`:

```javascript
import { ConvexHttpClient } from "convex/browser";
const client = new ConvexHttpClient(CONVEX_URL);

// Push reviews
await client.mutation(api.cardReviews.bulkSyncReviews, { reviews: [...] });

// Pull state
const states = await client.query(api.cardReviews.getAllCardStates, {});
```

**Note:** Since Jekyll is static HTML (no bundler), we'd either:
- Add a small build step (esbuild/Vite) for just the tracking JS
- OR use the Convex CDN bundle (if available)
- OR use raw `fetch()` against Convex HTTP API endpoints

---

### Step 4: Build the Expo/React Native App

**Why:** This is the primary mobile experience.

**Content source:** The app reads `manifest.json` directly (bundled or downloaded).

**Screens:**

```
App
├── Home (list of lessons, progress overview)
├── Lesson Screen (lesson-01)
│   ├── Intro section (prose — from enriched manifest or separate JSON)
│   ├── Card Stack (12 cards, scrollable)
│   │   └── Each card shows: Arabic, audio play, translation (tap to reveal), rating buttons
│   ├── Review Section (shuffled playback — same as shuffle-player.js logic)
│   └── Quiz Section
├── Review Session (SRS — cards due today across all lessons)
└── Settings (language, sync status)
```

**For each card in the Lesson Screen:**
```
┌─────────────────────────────┐
│  ⭐ 1 · إِلَٰه              │  ← card number + form
│                             │
│  هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ │  ← arabic_text (RTL)
│  إِلَّا هُوَ                  │
│                             │
│  ▶ [play audio]             │  ← plays anchor-ilah.mp3
│                             │
│  [tap to reveal]            │  ← shows english or tamil
│  "He is Allah — there is    │
│   no god but He"            │
│                             │
│  (Al-Ḥashr 59:22)          │  ← ref
│                             │
│  [Again] [Hard] [Good] [Easy] │  ← SRS rating (records review)
└─────────────────────────────┘
```

**Local storage:** `expo-sqlite` (replaces IndexedDB, same schema).
**Cloud sync:** Same Convex backend, same `useOfflineSync` hook logic.

---

### Step 5: Enrich the Content Model

**Why:** The manifest is missing content the app needs (hooks, prose, quiz).

**Two approaches:**

**A. Enrich `manifest.json` (minimal, do this first):**

Add to each sentence:
```json
{
  "id": "learn-ilah-01",
  "hook_en": "Ibrāhīm's challenge to his own father — one of the bravest questions in the Qur'an.",
  "hook_ta": "இப்ராஹீம் தன் சொந்தத் தந்தைக்கே சவால் விடுகிறார்...",
  ...existing fields...
}
```

Add a lesson-level `sections` array:
```json
{
  "sections": [
    { "type": "root", "id": "root-ilah", "title": "إِلَٰه (god)", "cards": ["anchor-ilah", "learn-ilah-01", "learn-ilah-02"] },
    { "type": "root", "id": "root-kabur", "title": "كَبُرَ (greatness)", "cards": ["anchor-kabura", "learn-kabura-01", "learn-kabura-02", "learn-kabura-03"] },
    { "type": "practice", "id": "practice", "title": "Practice", "cards": ["practice-01", "practice-02", "practice-03", "practice-04", "practice-05"] }
  ]
}
```

**B. Create `lesson-content.json` (full, do this later):**

A complete structured document with everything: prose blocks, root tables, quiz items, sections. The markdown becomes a generated output from this, not the source.

---

### Step 6: User Identity (for Cross-Device Sync)

**Why:** For Convex to sync data between a phone and a browser, it needs to know they're the same user.

**Options (simplest first):**

1. **Device-linked only (no auth):** Each device has its own data. No cross-device sync. Users can export/import JSON. *Simplest but defeats the purpose.*

2. **Anonymous ID with pairing code:** User gets a 6-digit code on their phone. Enter it on the browser to link. Stored in Convex. *Simple but fragile.*

3. **Convex Auth (email/OTP):** User signs in with email on both devices. Convex knows the user. Reviews are tied to `userId`. *Recommended.*

4. **Clerk / Auth0:** Full OAuth with Google/Apple sign-in. *Most polished but most setup.*

**Recommended for MVP:** Convex Auth with email magic link. Minimal friction, works everywhere, no password.

---

## Summary: What Changes Where

| Layer | What Changes | Effort |
|-------|-------------|--------|
| **manifest.json** | Add `hook_en`, `hook_ta`, `sections` | Small |
| **lesson-cards.js** | Add `data-card-id` from audio src | Small |
| **New: study-tracker.js** | IndexedDB store + Convex sync for browser | Medium |
| **lesson.html layout** | Load study-tracker.js + Convex SDK | Small |
| **Convex backend** | Already built (playground/) — move to production | Small |
| **New: Expo app** | Lesson screen, card renderer, audio player, SQLite store, Convex sync | Large |
| **New: Auth** | Convex Auth for cross-device identity | Medium |

## Recommended Order

```
Phase 1: Browser tracking (no auth, device-local only)
  → Add data-card-id to cards
  → Add study-tracker.js with IndexedDB
  → Visual feedback on studied cards
  → Test: study cards, close browser, reopen → state persists

Phase 2: Convex cloud sync (still no auth)
  → Connect study-tracker.js to Convex (anonymous, device-id based)
  → Add Convex HTTP client to Jekyll site
  → Test: study on browser → see data in Convex dashboard

Phase 3: Expo mobile app (MVP)
  → Scaffold Expo app with expo-router
  → Render lesson cards from manifest.json
  → expo-sqlite local store + Convex sync
  → Audio playback with expo-av
  → Test: study on phone → data syncs to Convex

Phase 4: Cross-device sync
  → Add Convex Auth (email magic link)
  → Tie reviews to userId
  → Test: study on phone → open browser → see same progress

Phase 5: SRS scheduling
  → Add ts-fsrs to local store
  → Rating buttons on cards
  → "Review due today" screen
  → Scheduled review intervals
```

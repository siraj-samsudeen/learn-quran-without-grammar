# System v2: Real Backend Architecture

> **Status**: Draft — research complete, ready for review.
>
> **Last updated**: 2026-04-12
>
> **Principle**: Move from file-based build-time workflows to a dynamic backend. Teacher authors in a dashboard, students consume in an app. The only build-time artifacts are TTS audio files.

---

## 1. Why Move Off Files?

The current system works but creates friction at every step:

| Pain point | Current workflow | v2 workflow |
|------------|-----------------|-------------|
| **Root inventory** | Run Python script → get JSON → copy to docs/roots/ → git commit | Click "New root" in dashboard → system builds inventory → saved to DB |
| **Verse scoring** | LLM pass writes to JSON → teacher reviews in picker HTML → edits JSON | LLM scores in background → teacher reviews in dashboard → click to approve |
| **Lesson authoring** | Edit YAML + Markdown + JSON → run validators → git push → wait for deploy | Fill in forms in dashboard → real-time validation → publish instantly |
| **Audio** | Edit YAML → run build script → download from CDN + generate TTS → copy MP3s → git push | Qur'anic audio streams from CDN at runtime. TTS generated on teacher's machine, uploaded via dashboard. |
| **Student experience** | Static page, same for everyone | Dynamic, personalized per student profile |
| **Multi-device** | Desktop only (needs terminal + git) | Dashboard works on phone too |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TEACHER DASHBOARD (Web)                    │
│                                                              │
│  Root Explorer → Verse Scorer → Lesson Builder → Audio Mgmt  │
│                                                              │
│  Reads/writes InstantDB directly (reactive, real-time)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  InstantDB   │
                    │              │
                    │  roots       │
                    │  forms       │
                    │  verses      │
                    │  scores      │
                    │  lessons     │
                    │  phrases     │
                    │  students    │
                    │  preferences │
                    │  srs_state   │
                    └──────┬──────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    STUDENT APP (Expo/Web)                     │
│                                                              │
│  Lesson View → Phrase Customization → SRS Review → Listening │
│                                                              │
│  Reads lessons + phrases from InstantDB (reactive)           │
│  Qur'anic audio: streamed from EveryAyah CDN                │
│  TTS audio: fetched from file storage (pre-generated)        │
│  Writes: student profile, customizations, SRS state          │
└──────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │ Cloudflare  │  (TTS MP3s only)
                    │ R2          │  Zero egress, S3-compatible
                    │ Free: 10GB  │  Upload via boto3 from Python
                    └─────────────┘

                    ┌─────────────┐
                    │ EveryAyah   │  (Qur'anic recitation CDN)
                    │ CDN         │  Streamed at runtime
                    └─────────────┘
```

### No serverless functions

The teacher continues using local tools (Python scripts) for:
- TTS audio generation (`build-lesson-audio.py` adapted to upload results)
- Root inventory building (`build-root-inventory.py` adapted to write to InstantDB)
- Validation (`validate-lesson-consistency.py` adapted to read from InstantDB)

These tools run on the teacher's machine, same as today. The difference: they read/write InstantDB instead of local JSON/YAML files.

---

## 3. InstantDB Schema

### Content layer (teacher-authored)

```
roots
  id
  root_arabic         "إِلَٰه"
  root_transliteration "ilah"
  three_letter        "أ ل ه"
  three_letter_en     "alif lam ha"
  corpus_key          "Alh"
  total_occurrences   2851
  introduced_in_lesson_id -> lessons
  created_at

forms
  id
  root_id -> roots
  form_arabic         "إِلَٰه"
  form_transliteration "ilah"
  category            "Noun"
  gloss               "god, deity"
  count               89
  dominance_pct       3.1
  taught_in_lesson_id -> lessons
  taught_role         "anchor" | "learning" | null
  notes

verses
  id
  ref                 "59:22"
  surah_number        59
  ayah_number         22
  arabic_full         "هُوَ ٱللَّهُ ٱلَّذِى..."
  arabic_fragment     null (or trimmed text)
  translation_en      "He is Allah..."
  translation_ta      "அவன் அல்லாஹ்..."
  word_count          8
  surah_name          "Al-Hashr"
  juz                 28
  verified            true

verse_scores
  id
  verse_id -> verses
  root_id -> roots
  -- Tier 1 (deterministic)
  length              2
  form_freq           8
  form_dominance      0
  -- Tier 1-late
  curriculum          0
  -- Tier 2 (LLM)
  story_score         3
  story_reason        "Direct theological statement..."
  familiarity_score   7
  familiarity_reason  "Al-Hashr — well-known declaration"
  teaching_fit_score  8
  teaching_fit_reason "ilah is central..."
  -- Tier 3 (teacher)
  fragment            true
  starred             false
  -- Computed
  base_score          28
  final_score         19.6

lessons
  id
  slug                "lesson-01-allahu-akbar"
  title               "Allahu Akbar"
  lesson_number       1
  anchor_phrase_text   "اللهُ أَكْبَرُ"
  status              "draft" | "published"
  hook_en             "What does Allahu Akbar really mean?..."
  hook_ta             "அல்லாஹு அக்பர் என்றால்..."
  closing_en          "This lesson moved through..."
  closing_ta          "..."
  created_at
  published_at

lesson_phrases
  id
  lesson_id -> lessons
  verse_id -> verses
  root_id -> roots
  position            1-15
  role                "anchor" | "learning" | "recall"
  -- Audio
  reciter             "Hani_Rifai_192kbps"
  audio_start_sec     null (full ayah) or float
  audio_end_sec       null (full ayah) or float
  -- Content
  hook_en             "Ibrahim confronted his father..."
  hook_ta             "இப்ராஹீம் தன் தந்தையிடம்..."
  -- TTS (URLs to pre-generated files)
  tts_url_en          "https://storage.../lesson-01/anchor-ilah.mp3"
  tts_url_ta          "https://storage.../lesson-01/anchor-ilah-ta.mp3"
  -- Customization
  locked              true (anchor) | false (learning)

lesson_root_sections
  id
  lesson_id -> lessons
  root_id -> roots
  position            1 or 2 (which root comes first)
  curiosity_gap_en    "The same three letters that..."
  curiosity_gap_ta    "..."
  root_explanation_en "Every time you hear Allah..."
  root_explanation_ta "..."
```

### Student layer

```
students
  id
  name
  email
  created_at

student_memorized
  id
  student_id -> students
  surah_number        114
  verse_start         null (whole surah)
  verse_end           null (whole surah)
  added_at

student_affinity
  id
  student_id -> students
  surah_number        36
  verse_start         null
  verse_end           null
  added_at

student_lesson_state
  id
  student_id -> students
  lesson_id -> lessons
  -- Customizations
  swaps               [{position: 3, original_verse_id: "...", replacement_verse_id: "..."}]
  custom_order        ["verse-id-1", "verse-id-2", ...]  (null = teacher default)
  -- Progress
  started_at
  completed_at

student_phrase_state
  id
  student_id -> students
  lesson_phrase_id -> lesson_phrases
  -- Flags
  flag                "hard" | "favorite" | "mastered" | null
  -- SRS (FSRS fields)
  stability           float
  difficulty          float
  due                 timestamp
  reps                int
  lapses              int
  srs_state           "new" | "learning" | "review" | "relearning"
  last_review_at
```

---

## 4. Teacher's New Workflow (Step by Step)

### Phase 1: Root inventory (replaces `build-root-inventory.py` → JSON)

1. Teacher opens dashboard → "New Root"
2. Enters: root arabic, transliteration, corpus key
3. Clicks "Build" → local tool runs `build-root-inventory.py` but writes to InstantDB instead of JSON
4. Dashboard shows all forms + verses with word counts, translations
5. Teacher reviews, edits translations if needed

### Phase 2: Scoring (replaces LLM pass on JSON → edit JSON)

1. Teacher clicks "Score verses" on a root
2. LLM scoring pass runs (can be local Claude call or API)
3. Scores appear in dashboard with reasons — teacher can see and override
4. Teacher stars favorites, marks fragments
5. Final scores computed automatically, verses ranked

### Phase 3: Lesson building (replaces YAML + Markdown editing)

1. Teacher clicks "New Lesson"
2. Selects roots (from scored inventory)
3. System auto-assigns: anchor (shortest, highest score), learning (next 9 by score, sorted short→long)
4. Teacher reviews assignments in dashboard, can swap/reorder
5. Writes hooks, explanations, curiosity gaps in form fields (rich text, EN + Tamil)
6. Real-time preview shows the lesson as students will see it

### Phase 4: Audio (replaces `build-lesson-audio.py` → copy MP3s)

1. For each phrase, teacher selects reciter from dropdown
2. Qur'anic audio: system shows preview player (streams from EveryAyah CDN) — teacher confirms it sounds right
3. TTS: teacher clicks "Generate TTS" → local tool runs edge-tts → uploads MP3 to file storage → URL saved to `lesson_phrases.tts_url_en/ta`
4. No more YAML audio definitions, no more copying MP3s into assets/

### Phase 5: Publish

1. Teacher clicks "Publish" → lesson status changes to "published"
2. Students see it immediately (InstantDB reactive query)
3. No git push, no deploy wait, no Jekyll build

---

## 5. Student Preference Scoring (Runtime)

When a student opens a lesson:

```
teacher_score = lesson_phrases.final_score (pre-computed, in DB)
student_boost = max(memorized_boost, affinity_boost)

memorized_boost = +4 if verse.surah_number in student's memorized surahs
                     or verse.ref in student's memorized verse ranges
affinity_boost  = +2 if verse.surah_number in student's affinity surahs
                     or verse.ref in student's affinity verse ranges

student_score = teacher_score + student_boost
```

- **Non-stacking**: if both memorized and affinity match, only +4 (memorized)
- **Applied to overflow verses** when student browses alternatives for a swappable phrase
- **Teacher-assigned phrases show by default** — personalization is opt-in

---

## 6. What Stays on the Teacher's Local Machine

| Tool | Stays local | Why |
|------|-------------|-----|
| `build-root-inventory.py` | Yes — adapted to write to InstantDB | Reads local morphology data files (GPL, can't host), writes to DB |
| TTS generation (edge-tts) | Yes — runs locally, uploads result | edge-tts is a local Python tool, no cloud equivalent at this cost |
| `validate-lesson-consistency.py` | Yes — adapted to read from InstantDB | Runs locally, validates content in DB |
| `auto-timestamps.py` | Yes — adapted to save results to DB | Calls QF API, writes timestamps to lesson_phrases |

These tools get a thin adapter: instead of `json.dump(data, open('file.json'))` they do `instantdb.transact(tx.verses.update(...))`. The core logic stays the same.

---

## 7. Migration Path (Incremental, Teacher-Pain-First)

Priority order based on what causes the most friction for the teacher today:

### Stage 1: Root inventory + scoring in InstantDB
**Pain solved**: No more JSON file juggling for root inventories. No more copy-paste between picker HTML and JSON files. Score once, see everywhere.

- Migrate `docs/roots/*.json` data into InstantDB tables (roots, forms, verses, verse_scores)
- Adapt `build-root-inventory.py` to write to InstantDB
- Build minimal dashboard: browse roots → see forms → see scored verses
- Teacher can score, star, and review entirely in the dashboard

### Stage 2: Lesson building in InstantDB
**Pain solved**: No more YAML + Markdown + JSON triple-editing. No more git push to publish.

- Migrate lesson data into lessons + lesson_phrases tables
- Build lesson builder in dashboard: select root → auto-assign roles → write hooks → preview
- Publish button makes lessons visible to students

### Stage 3: Audio management in dashboard
**Pain solved**: No more YAML audio definitions. No more copying MP3s. Reciter selection is a dropdown.

- Qur'anic audio streams from CDN (just store reciter + ref in DB)
- TTS: local tool generates, dashboard has "Upload TTS" or drag-drop
- Audio preview in dashboard

### Stage 4: Student app reads from InstantDB
**Pain solved**: Students get a real app instead of a static page.

- Student app reads lessons + phrases from InstantDB (reactive)
- Qur'anic audio streamed from EveryAyah CDN
- TTS audio fetched from file storage URLs

### Stage 5: Student preferences + personalization
**Pain solved**: Students can customize their experience.

- Student profile (memorized, affinity) stored in InstantDB
- Runtime scoring: student_score = teacher_score + preference_boost
- Phrase swapping from overflow pool
- SRS integration

---

## 8. Cost Estimate

| Service | Tier | Cost |
|---------|------|------|
| **InstantDB** | Free: 1 GB DB, unlimited API requests, 1 team member | $0 |
| **Cloudflare R2** | Free: 10 GB storage, zero egress, 10M reads/mo | $0 |
| **EveryAyah CDN** | Free (community resource) | $0 |
| **Vercel** | Free: dashboard hosting | $0 |
| **Total during development** | | **$0/month** |
| **If InstantDB free tier exceeded** | Pro tier: 10 GB, daily backups | $30/month |

At our scale (~10 roots, ~2000 verses, ~1000 MP3s at ~100MB total), we stay comfortably in free tiers. The jump to $30/month would only happen with significant growth or if we store MP3s in InstantDB (don't — use R2).

---

## 9. Technology Choices (Research-Informed)

### InstantDB (first preference) — CONFIRMED VIABLE

**Strengths for our use case:**
- **Reactive queries**: all queries are live subscriptions — perfect for teacher dashboard and student app
- **Relational model**: roots → forms → verses → scores maps naturally to InstantDB's typed Links (1:1, 1:many, many:many)
- **React SDK**: mature, primary SDK. `useQuery()` returns live data, `transact()` for atomic writes
- **React Native / Expo**: officially supported via `@instantdb/react-native`. Featured on Expo blog.
- **Offline-first**: core design principle. Data persists in IndexedDB (web) / AsyncStorage (RN). Queries work offline, writes queue and sync on reconnect.
- **Free tier**: 1 GB DB, unlimited API requests, no row/connection limits
- **Open source**: Apache-2.0, self-hostable via Docker + PostgreSQL

**Risks and mitigations:**
- **No Python SDK**: use the Admin HTTP API (`POST /admin/query`, `POST /admin/transact`). Simple JSON over HTTP — easy to wrap in a thin Python helper (~50 lines).
- **Custom OAuth (QF PKCE)**: not natively supported. Pattern: handle OAuth flow in app → call Admin API to create InstantDB token → use token client-side. Requires a small bridge (could be a Cloudflare Worker or even a local script).
- **File storage exists but eats into 1 GB quota**: don't store MP3s in InstantDB. Use Cloudflare R2.
- **No one-click data export**: query all data out via Admin API. Write a `dump-to-json.py` script as insurance.
- **Small team, limited funding** (~$500K seed, YC S22): mitigated by Apache-2.0 license + self-hosting option. Worst case: we run our own instance on Postgres.
- **v1.0 maturity**: 4 years of development, ~10K GitHub stars, but early-stage. Plan a contingency.

**Fallback: Convex** — more mature ($53.5M funding, larger community), has an actual Python client (`pip install convex`), explicit PKCE support, better file storage (1 GB separate from DB). But: **no native offline support** (server-first architecture). For a student app used on phones with spotty connectivity, this is a significant gap. Would need Replicache or similar, adding major complexity.

### Teacher Dashboard
- **Framework**: React + InstantDB React SDK (Vite or Next.js)
- **Hosting**: Vercel free tier
- **InstantDB React integration**: mature, well-documented, primary SDK

### Student App
- **Framework**: Expo / React Native + `@instantdb/react-native`
- **Offline**: built-in via AsyncStorage persistence
- **Audio**: Qur'anic from EveryAyah CDN, TTS from Cloudflare R2

### TTS Audio Storage: Cloudflare R2 — CONFIRMED BEST OPTION

| Evaluated | Verdict |
|-----------|---------|
| **Cloudflare R2** | **Winner.** Free: 10 GB, zero egress forever, CDN-backed, boto3 upload from Python. |
| Backblaze B2 + CF | Works but requires wiring two services. R2 is simpler. |
| GitHub Releases | Explicitly warns against CDN use. Risk of throttling. |
| Vercel Blob | 1 GB cap, egress charges, no Python SDK. |
| InstantDB storage | Eats into 1 GB DB quota. Not designed for this. |
| Railway | $5/mo base cost. Pointless when R2 is free. |

Upload integration: add `--upload` flag to `build-lesson-audio.py` → boto3 pushes MP3s to R2 → URL saved to `lesson_phrases.tts_url_en/ta` in InstantDB.

### Python Tools → InstantDB Adapter

No Python SDK exists. Use the Admin HTTP API:

```python
# Thin wrapper (~50 lines)
import requests

class InstantDB:
    def __init__(self, app_id, admin_token):
        self.base = "https://api.instantdb.com"
        self.headers = {
            "Authorization": f"Bearer {admin_token}",
            "App-Id": app_id,
            "Content-Type": "application/json"
        }

    def query(self, q):
        r = requests.post(f"{self.base}/admin/query",
                         json={"query": q}, headers=self.headers)
        return r.json()

    def transact(self, steps):
        r = requests.post(f"{self.base}/admin/transact",
                         json={"steps": steps}, headers=self.headers)
        return r.json()
```

This replaces `json.load(open('file.json'))` / `json.dump(data, open('file.json'))` in existing tools.

---

## 10. Research Findings (Consolidated)

### 10a. InstantDB — Detailed Assessment

| Capability | Status | Details |
|-----------|--------|---------|
| **Free tier** | 1 GB DB, unlimited requests | No row/connection/bandwidth limits. Only constraint is storage. |
| **React SDK** | Mature, primary SDK | `useQuery()` (reactive), `transact()` (atomic writes), TypeScript types from schema |
| **React Native** | Officially supported | `@instantdb/react-native` package. Works with Expo Go. AsyncStorage or MMKV for persistence. |
| **Python access** | HTTP API only | `POST /admin/query`, `POST /admin/transact`. Admin token auth. Bypasses permission rules. |
| **Schema** | Relational with typed Links | Namespaces (tables) + Attributes (columns) + Links (foreign keys). Supports 1:1, 1:many, many:many. |
| **Auth** | Built-in + custom | Google, Apple, GitHub OAuth built-in. Custom auth via Admin SDK `createToken()`. No native PKCE for external providers. |
| **File storage** | Exists, limited | Upload via SDK or Admin API. Files stored in S3, served via S3 URLs (not CDN). Counts against 1 GB quota. |
| **Offline** | Core feature | IndexedDB (web), AsyncStorage (RN). Queries work offline. Writes queue + sync. CRDT conflict resolution. |
| **Data export** | No built-in tool | Must query all data via Admin API. No dashboard export. Write your own dump script. |
| **Maturity** | Early but real | 4 years dev, ~10K stars, YC S22. Apache-2.0. Small team (~4 founders), ~$500K seed funding. |

### 10b. InstantDB vs Convex — Key Differences

| Dimension | InstantDB | Convex |
|-----------|-----------|--------|
| **Offline** | Built-in, core feature | No native offline. Need Replicache. |
| **Relations** | First-class Links | Document references, manual resolution |
| **Python** | HTTP API (no SDK) | Official Python client (alpha, v0.7) |
| **Custom OAuth** | Admin SDK bridge | Explicit PKCE support |
| **File storage** | Shares DB quota | Separate 1 GB quota |
| **Funding** | ~$500K seed | $53.5M total |
| **Open source** | Apache-2.0, 4+ years | Open-sourced Feb 2025 |
| **Pricing jump** | Free → $30/mo | Free → pay-as-you-go |

**Decision: InstantDB** — offline-first is the decisive advantage for a mobile student app. The Python SDK gap is easily bridged with HTTP calls. The funding risk is mitigated by the Apache-2.0 license.

### 10c. TTS Storage — Cloudflare R2

- **Our scale**: ~1000 MP3 files, ~100-200 MB total
- **R2 free tier**: 10 GB storage, 10M reads/mo, zero egress
- **Upload**: boto3 from Python (S3-compatible), ~10 lines of code
- **Serving**: CDN-backed globally via Cloudflare network
- **Cost**: $0.00 at our scale (would remain free at 10x)

### 10d. Migration Strategy

**Approach: JSON stays as source-of-truth during migration. InstantDB becomes primary after Stage 1 is validated.**

1. Write a one-time `migrate-to-instantdb.py` script that reads all `docs/roots/*.json` and writes to InstantDB
2. Keep JSON files in git as backup/export format during transition
3. Adapt `build-root-inventory.py` to write to InstantDB (add `--backend instantdb` flag, keep `--backend json` as default)
4. Once the dashboard works and the teacher is comfortable, switch the default
5. JSON files become the "dump" format (generated from DB), not the source

**Arabic/Unicode**: no gotchas. InstantDB uses Postgres underneath, which handles UTF-8 natively. RTL is a display concern, not a storage concern. No normalization issues with Qur'anic text.

---

## 11. Resolved & Remaining Questions

| # | Question | Status | Answer |
|---|----------|--------|--------|
| 1 | InstantDB free tier limits? | **Resolved** | 1 GB DB, unlimited requests/connections. No row limits. |
| 2 | File/blob storage? | **Resolved** | Exists but shares 1 GB quota. Use Cloudflare R2 instead. |
| 3 | React Native SDK? | **Resolved** | Yes — `@instantdb/react-native`, officially supported, Expo compatible. |
| 4 | Auth + QF OAuth? | **Resolved** | Custom auth via Admin SDK bridge. Handle PKCE yourself, then create InstantDB token. |
| 5 | Python write access? | **Resolved** | Admin HTTP API. No SDK needed — simple JSON over HTTP. |
| 6 | Data export / vendor lock-in? | **Partially resolved** | No built-in export. Query API works. Apache-2.0 + self-hosting is the safety net. Write a dump script early. |
| 7 | EveryAyah CDN reliability? | **Open** | Needs real-world testing under load. Consider QF Audio API as fallback. |
| 8 | InstantDB permission rules for multi-role? | **Open** | Need to verify: can we restrict students to read-only on lesson data while allowing writes to their own profile? |
| 9 | InstantDB transaction limits? | **Open** | How many operations per `transact()` call? Relevant for bulk import of ~200 verses per root. |

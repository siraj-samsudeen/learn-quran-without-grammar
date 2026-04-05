# ADR-008: Companion App Architecture — Expo/React Native + SQLite Offline-First

| Field | Value |
|-------|-------|
| **Status** | Proposed |
| **Date** | July 2025 |
| **Decision** | Build companion app with Expo (React Native), `expo-sqlite`, `ts-fsrs`, offline-first, zero backend |
| **Deciders** | Siraj Samsudeen (course creator) |

---

## Context

The "Learn Qur'an Without Grammar" course currently exists as a static website (Jekyll + GitHub Pages). The website works but has fundamental limitations for the envisioned learning experience:

1. **No reliable offline audio** — Service Worker cache limits (~50-100MB) are too small for 50+ lessons (~500MB audio)
2. **No background audio playback** — Browser audio stops when tab switches or screen locks. Students can't listen while walking/driving
3. **No spaced repetition** — The website has no state; review scheduling requires persistent local storage
4. **No on-device TTS** — Multi-language translations (Tamil, Urdu) need native TTS engines for fallback
5. **No push notifications** — Daily review reminders need native notification support

The existing architecture roadmap (ARCHITECTURE.md) planned Phase 2 (PWA) and Phase 3 (Native App). This ADR proposes **skipping PWA and going directly to native**.

---

## Decision

Build the companion app using **Expo (React Native)** with the following architecture:

| Component | Choice |
|-----------|--------|
| Framework | Expo SDK 52+ (managed workflow) |
| Language | TypeScript |
| Database | `expo-sqlite` (native SQLite, WAL mode) |
| SRS Algorithm | `ts-fsrs` v5.0 (FSRS, MIT license) |
| Audio Playback | `react-native-track-player` v4.x (background, lock screen controls) |
| TTS (runtime) | `react-native-tts` (on-device, fallback) |
| TTS (build-time) | `edge-tts` (Python, pre-generates MP3s) |
| Qur'anic Audio | EveryAyah CDN (downloaded at build-time, bundled/cached) |
| Navigation | React Navigation v7 |
| OTA Updates | `expo-updates` (new lessons without app store review) |
| Build/Deploy | EAS Build + EAS Submit |
| Backend | **None** — zero server cost |

### Offline-First Principle

The app works identically with zero internet connectivity. Network is needed only for:
- Initial app install (App Store / Play Store)
- Downloading new lesson packs (after Lesson 1, which ships pre-bundled)
- Optional data export/sharing

---

## Options Considered

### Option 1: Progressive Web App (PWA)

| Pros | Cons |
|------|------|
| ✅ Simple deployment (just deploy website) | ❌ Audio cache limited to ~50-100MB |
| ✅ No app store friction | ❌ No background audio (tab must stay open) |
| ✅ Single codebase with existing site | ❌ Web Speech API unreliable for Tamil/Urdu TTS |
| ✅ Instant updates | ❌ No push notifications on iOS Safari |
| | ❌ SQLite via WASM is experimental |
| | ❌ No filesystem access for large audio storage |

**Rejected.** Three critical features (offline audio storage, background playback, on-device TTS) cannot be done well in a PWA.

### Option 2: React Native (bare, no Expo)

| Pros | Cons |
|------|------|
| ✅ Full native control | ❌ Must configure Xcode + Android Studio |
| ✅ Any native module | ❌ No OTA updates (without custom solution) |
| ✅ Smaller binary possible | ❌ More complex build pipeline |
| | ❌ Harder for a solo developer to maintain |

**Rejected.** Expo provides everything we need with significantly less configuration and maintenance burden. The managed workflow + EAS Build + OTA updates are essential for a solo developer.

### Option 3: Expo/React Native (selected) ✅

| Pros | Cons |
|------|------|
| ✅ `expo-sqlite` — battle-tested, synchronous API | ⚠️ Cannot use Expo Go (need dev build for track-player) |
| ✅ `expo-updates` — OTA lesson updates | ⚠️ EAS Build has free tier limits (30 builds/month) |
| ✅ `expo-file-system` — full filesystem for audio | ⚠️ Binary larger than bare RN (~25-35MB) |
| ✅ Managed workflow — minimal native config | |
| ✅ `react-native-track-player` works via config plugin | |
| ✅ Cross-platform (iOS + Android) from single codebase | |
| ✅ TypeScript-native (matches `ts-fsrs`) | |
| ✅ Large ecosystem, active maintenance | |

### Option 4: Flutter

| Pros | Cons |
|------|------|
| ✅ Excellent performance | ❌ Dart, not TypeScript (ts-fsrs would need porting) |
| ✅ Rich widget library | ❌ Smaller ecosystem for our specific packages |
| ✅ Cross-platform | ❌ Team has no Flutter experience |

**Rejected.** TypeScript ecosystem alignment with `ts-fsrs` and the React Native audio/TTS libraries is decisive.

### Option 5: Native (Swift + Kotlin)

| Pros | Cons |
|------|------|
| ✅ Best performance, smallest binary | ❌ Two codebases to maintain |
| ✅ Best platform integration | ❌ Solo developer — 2x work |
| | ❌ ts-fsrs is TypeScript — would need porting |

**Rejected.** A solo developer cannot maintain two native codebases. Cross-platform is essential.

---

## Consequences

### Positive

1. **True offline-first** — SQLite + filesystem means the app works without internet
2. **Background audio** — `react-native-track-player` enables listening while driving/walking
3. **FSRS integration** — `ts-fsrs` runs natively in the JS runtime with SQLite persistence
4. **Multi-language TTS** — On-device TTS for English, Tamil, Urdu via native engines
5. **OTA lesson updates** — New lessons deployed via `expo-updates` without app store review
6. **Zero server cost** — No backend, no database server, no API costs
7. **Content portability** — Lesson content in JSON/YAML, same format as the website's YAML definitions
8. **Open platform potential** — Other teachers can create course packages that the app can load

### Negative

1. **Requires Expo development build** — Cannot test in Expo Go (due to `react-native-track-player`)
2. **App store costs** — Apple Developer ($99/yr) + Google Play ($25 one-time)
3. **Build complexity** — EAS Build adds a CI/CD step not needed for the website
4. **No web access** — Unlike a PWA, the app is not accessible via URL (website continues to serve that role)
5. **Content pipeline extension** — Existing `build-lesson-audio.py` needs extension for multi-language TTS + lesson packaging

### Risks

| Risk | Mitigation |
|------|------------|
| `react-native-track-player` abandonment | Large community (6K+ stars), multiple forks available |
| `ts-fsrs` breaking changes | Pin version, FSRS algorithm is stable (adopted by Anki) |
| Expo SDK breaking changes | Follow Expo upgrade guides, LTS support |
| Apple App Store rejection | Content is educational, no controversial material |
| Storage limits on older devices | Show storage warnings, allow per-lesson deletion |

---

## Related Documents

| Document | Location |
|----------|----------|
| Research Synthesis | `docs/app/RESEARCH-SYNTHESIS.md` |
| Full Requirements | `docs/app/APP-REQUIREMENTS.md` |
| Glossika Deep Dive | `docs/app/research-glossika.md` |
| Audio Methods Research | `docs/app/research-audio-methods.md` |
| Expo/SQLite Architecture | `docs/app/research-expo-offline.md` |
| Open Platform Design | `docs/app/research-platform-design.md` |

---

## Relationship to Existing Architecture

This ADR **extends, not replaces**, the current architecture:

- **Website continues** — Jekyll + GitHub Pages remains the primary content delivery for web users
- **Content shared** — Lesson YAML definitions are the single source of truth for both website and app
- **Audio pipeline shared** — `build-lesson-audio.py` extended to produce app-compatible bundles
- **App is additive** — Students who prefer the website keep using it; the app adds SRS, offline, background audio
- **Phase 2 (PWA) from ARCHITECTURE.md is superseded** by this ADR — we go directly to native

---

*This ADR is in "Proposed" status pending review. It will move to "Accepted" when the decision to build the app is confirmed.*

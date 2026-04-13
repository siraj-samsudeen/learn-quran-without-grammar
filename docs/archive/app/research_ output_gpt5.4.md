# Research Output — GPT-5.4

> **Status:** Draft research memo
> **Date:** July 2025
> **Purpose:** Extend the existing synthesis with focused research on the unresolved decisions implied by `APP-REQUIREMENTS.md`

---

## Executive Summary

The existing research already supports the core architecture: Expo/React Native, SQLite, FSRS, prebuilt translation audio, and real reciter audio for Qur'anic Arabic. The remaining work was to test whether the rest of the requirements are also realistic without quietly introducing a backend-first product.

The result is mostly positive, with one important correction:

1. **MVP is technically viable as a native offline-first app** using Expo modules for SQLite, file storage, localization, notifications, and updates.
2. **Background audio remains the strongest reason not to build this as a PWA.** The web platform does have offline and background primitives, but they are constrained and inconsistent for the amount of audio and background playback this app needs.
3. **Daily reminders can be local notifications in MVP.** No push server is required for simple reminder use cases.
4. **RTL, multilingual UI, and accessibility are viable in React Native**, but they need explicit implementation discipline. They should not be postponed mentally as "just i18n."
5. **Teacher analytics and class features are not truly compatible with the stated "zero server" model unless the product accepts export/import workflows or very lightweight optional sync infrastructure.** This is the main strategic tension in the requirements.
6. **Expo Updates should not be treated as the lesson-pack delivery system by itself.** It is suitable for app code and bundled asset updates, but lesson-pack versioning and on-demand downloads still need an explicit content-pack strategy.

### Bottom Line

The strongest MVP remains:

- Expo/React Native app
- `expo-sqlite` for SRS and app state
- `expo-file-system` for lesson/audio packs
- prebuilt translation MP3s, with native TTS only as fallback
- local notifications only
- no teacher sync in MVP
- design the content format for future openness, but do **not** build the open platform surface yet

---

## What This Research Added

The prior synthesis covered four areas well:

- client-side TTS
- SRS / FSRS
- PWA vs native
- competitive landscape

This memo extends that work in the areas the requirements document still leaves operationally unresolved:

1. Native storage and lesson-pack delivery
2. Reminder notifications without a backend
3. Accessibility and RTL requirements
4. Update/versioning strategy for lesson content
5. Teacher analytics vs privacy vs no-server constraints
6. Packaging strategy for the later open-platform vision

---

## 1. Native Storage, SQLite, and Offline Viability

### Findings

Expo's current SQLite module remains a strong fit for this product.

- `expo-sqlite` persists the database across app restarts.
- Expo documents native support on Android and iOS, with web support explicitly marked alpha.
- Expo's config plugin also exposes optional advanced features such as FTS and SQLCipher, which is useful if lesson search or stronger at-rest protection ever becomes necessary.

For this app, SQLite is enough for:

- card scheduling state
- review log history
- lesson metadata
- download state
- settings
- future root/phrase indexing

The filesystem side is also supported directly by Expo.

- `expo-file-system` gives access to local files/directories and supports network downloads.
- This is exactly the primitive needed for per-lesson pack download, persistence, deletion, and export/import.

### Product Implication

The requirements doc is credible when it says:

- lesson text in SQLite
- audio in the filesystem
- full offline use after content download

That architecture is aligned with the current Expo stack. No backend is needed for MVP persistence.

### Recommendation

Use this split from day one:

- SQLite: metadata and review state
- filesystem: lesson pack payloads and exported backups

Do not store large audio blobs inside SQLite.

---

## 2. Notifications: MVP Does Not Need Push

### Findings

Expo's notifications module supports scheduled notifications and repeating notifications locally on device.

- Expo documents one-off scheduling and repeating schedules.
- Push notification setup is heavier and requires credentials and proper builds.
- Local notifications remain available even where push workflows are more constrained during development.

### Product Implication

Requirement `1.11 Daily reminder notification` should be implemented as a **local scheduled notification**, not as a push feature.

That preserves the stated architecture principles:

- no server
- no auth
- no analytics SDK
- works offline

### Recommendation

For MVP:

- support one daily reminder time
- support enable/disable
- support simple message rotation from local strings

Do not frame reminders as "push notifications" in the product plan unless there is an actual remote-notification use case later.

---

## 3. PWA Limits Are Still Real for This Use Case

### Findings

MDN's PWA guidance confirms that offline and background behavior on the web depends on service workers and related APIs. Those technologies are real, but they do not remove the practical limitations that matter here:

- offline data is mediated through browser caching/storage models, not app-owned filesystem primitives
- background behavior is tied to browser/platform restrictions
- web speech is available, but voice availability and behavior depend heavily on browser and OS implementation

MDN also documents `SpeechSynthesis` as widely available, which is important because it means a web fallback is possible. But the key issue is not raw availability. The issue is **predictability** for:

- Tamil and Urdu voice presence
- background playback continuity
- large lesson-audio storage
- lock-screen/media-control behavior

### Product Implication

The older synthesis remains correct: the web can mimic parts of this product, but not the full experience the requirements describe.

The specific features that remain materially weaker on PWA are:

- large durable offline audio collections
- reliable background playback for listen mode
- consistent device-native TTS behavior across languages
- export/import and file management workflows

### Recommendation

If a web companion exists later, define it as one of these only:

- marketing + onboarding surface
- lesson browser / lightweight study surface
- accountless read-only or limited-practice companion

Do not design the main product architecture around eventual web parity.

---

## 4. Accessibility and RTL Are Feasible, But Need First-Class Scope

### Findings

Expo localization support is solid and explicitly intended to be used with i18n libraries such as `react-i18next`. React Native accessibility APIs also provide the necessary platform hooks for VoiceOver and TalkBack, including:

- `accessible`
- `accessibilityLabel`
- `accessibilityHint`
- `accessibilityRole`
- `accessibilityLanguage` on iOS
- `accessibilityLiveRegion` on Android

This matters more here than in a typical consumer app because the product mixes:

- Arabic display
- Urdu display
- English/Tamil UI strings
- audio-first interaction
- review buttons whose meaning must be obvious to screen-reader users

### Risks

The requirements treat accessibility as Phase 3-level surface area, but some parts are actually MVP architecture concerns:

- screen-reader labels for audio controls
- language tagging where assistive tech needs correct pronunciation
- text scaling behavior
- RTL layout correctness for Arabic and Urdu
- correct reading order when Arabic and translated text appear together

If these are delayed too far, retrofitting becomes expensive.

### Recommendation

Treat the following as MVP-ready implementation constraints even if full accessibility polish lands later:

- app string localization architecture from the start
- RTL-aware layout primitives from the start
- accessible labels/roles for playback and review controls
- font scaling and larger text sanity checks

Full screen-reader QA can still be phased, but the UI architecture should not assume LTR-only, sighted-only use.

---

## 5. Lesson Packs, OTA Updates, and Versioning

### Findings

Expo Updates is explicitly designed for remote updates to app code and configured assets. It is not, by itself, a complete domain model for course-content lifecycle management.

That matters because the requirements include all of the following at once:

- bundle Lesson 1 in the app
- download later lessons on demand
- potentially update lessons later
- possibly add content via OTA
- eventually support third-party courses

These needs are broader than "ship new JavaScript bundle."

### Tension in Current Requirements

The requirements mention both:

- `expo-updates` for deploying new lessons without store review
- downloadable lesson packs with manifest-based structure

Those are related but not identical mechanisms.

`expo-updates` is useful for:

- app code changes
- built-in content/assets that travel with an app update channel

Lesson-pack delivery still needs its own rules for:

- manifest version
- pack checksum
- partial download recovery
- installed version vs available version
- migration when phrase text/audio changes after users already have SRS history

### Recommendation

Keep these concerns separate.

For MVP:

- bundle Lesson 1 in the binary
- host Lessons 2+ as downloadable lesson packs
- track pack version in SQLite
- only use app updates for app code and bundled starter assets

For Phase 2:

- add a pack manifest registry format
- support explicit "update lesson" logic
- define content migration rules before allowing phrase edits in shipped lessons

This is the cleanest path to the later open-platform requirement.

---

## 6. Teacher Features Conflict with "Zero Server" More Than the Doc Admits

### Findings

The privacy direction is coherent:

- no data leaves device without explicit consent
- teacher sees aggregate stats
- app works without a server

The class-management requirements, however, imply workflows that are awkward or incomplete without shared infrastructure:

- class creation
- join by code
- aggregate dashboard
- assignment deadlines
- struggling alerts

Those features require some combination of:

- identity or pseudonymous membership
- data submission endpoint
- shared roster state
- aggregation logic
- revocation / leave-class behavior

That is server behavior, even if minimal and privacy-preserving.

### Product Implication

There are only three honest models here:

1. **No server at all**
   Teacher features are export/import only.

2. **Minimal optional sync service**
   Students opt in; class join and aggregate dashboards are supported.

3. **Full teacher platform**
   Real classes, assignments, and dashboards with proper backend responsibilities.

The requirements currently blend model 1 language with model 2-3 features.

### Recommendation

Tighten scope language:

- MVP: no teacher features beyond JSON export/import
- Phase 2: optional lightweight sync service for class aggregation only
- do not promise class codes and dashboards without admitting that a small backend exists

This is the single biggest strategic cleanup needed in the requirements.

---

## 7. Open Platform Vision Is Good, But the Packaging Boundary Must Be Strict

### Findings

The requirements already move in the right direction by describing lesson packs and a future course package format. That is important because the app can only become a true platform if course data is clearly separated from app logic.

The strongest version of that strategy is:

- app is a player/runtime
- course is installable content
- SRS state is local per installed course
- course package is validated before install

### Additional Packaging Constraints Needed

The conceptual schema is not enough on its own. Before Phase 3, the package spec will also need:

- schema versioning rules
- course-level unique IDs
- phrase-level stable IDs that survive translation/audio updates
- integrity metadata such as hashes
- reciter attribution/license metadata
- per-language completeness flags
- compatibility declaration with minimum app version

### Recommendation

Design the stable identifiers early, even if the open platform UI comes much later.

Specifically:

- each course needs a globally stable `course_id`
- each lesson needs a stable `lesson_id`
- each phrase/card needs a stable `phrase_id`

Do not use only lesson index + phrase index if content may ever be rearranged or imported from third parties.

---

## 8. Updated Recommendations by Phase

### MVP

- Native app only: Expo/React Native
- SQLite + filesystem split
- English only
- Lesson 1 bundled, later lessons downloadable
- Learn / Review / Listen modes
- FSRS with simple user-tunable limits only if needed
- local scheduled reminders only
- JSON export of progress
- no teacher sync, no class codes

### Phase 2

- Tamil and Urdu text/audio
- explicit RTL QA pass
- lesson-pack update/version management
- targeted review filters and bookmarks
- optional minimal sync service only if teacher analytics remains a priority

### Phase 3

- documented package spec
- course validation/install flow
- multi-course support
- CLI/course-builder tooling
- catalogue/distribution model

---

## Key Decisions That Now Look Settled

These look sufficiently researched to stop debating unless new constraints appear:

- Native, not PWA, for the real product
- SQLite for SRS and app metadata
- filesystem for audio and exports
- FSRS as the scheduler
- real reciter audio for Qur'anic Arabic only
- prebuilt translation MP3s as primary, on-device TTS as fallback
- local notifications for reminders in MVP

---

## Open Questions That Still Need Human/Product Decisions

These are not blocked by technology anymore; they are scope or pedagogy choices:

1. Should review be audio-only first, or show Arabic text by default after audio?
2. How many lessons are needed for launch credibility?
3. Is English-only MVP acceptable, or is Tamil required for first meaningful adoption?
4. Is the team willing to accept a small optional backend for Phase 2 teacher features?
5. Are lesson packs immutable once released, or can phrase text/audio be revised in place?
6. Is the open-platform goal a real near-term strategy, or just a design principle for data format decisions now?

---

## Recommended Corrections to the Requirements Doc

If the requirements are revised, these changes would make them more internally consistent:

1. Replace "push notification" wording in MVP with "local scheduled reminder notification."
2. Separate `expo-updates` from lesson-pack distribution/versioning.
3. Clarify that teacher dashboards and class codes require optional server infrastructure in Phase 2.
4. Move baseline accessibility/RTL architecture expectations earlier than Phase 3.
5. Add stable course/lesson/phrase identifiers to the content-package design.

---

## Sources Consulted

- Expo SQLite docs: `https://docs.expo.dev/versions/latest/sdk/sqlite/`
- Expo FileSystem docs: `https://docs.expo.dev/versions/latest/sdk/filesystem/`
- Expo Notifications docs: `https://docs.expo.dev/versions/latest/sdk/notifications/`
- Expo Localization docs: `https://docs.expo.dev/versions/latest/sdk/localization/`
- Expo Updates docs: `https://docs.expo.dev/versions/latest/sdk/updates/`
- React Native accessibility docs: `https://reactnative.dev/docs/accessibility`
- MDN PWA offline/background guide: `https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation`
- MDN SpeechSynthesis docs: `https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis`
- `react-native-tts` repository: `https://github.com/ak1394/react-native-tts`
- `ts-fsrs` repository: `https://github.com/open-spaced-repetition/ts-fsrs`

---

## Final Assessment

The app described in `APP-REQUIREMENTS.md` is buildable with current tooling, and the core technical bets are sound. The main risk is not whether Expo, SQLite, FSRS, or offline audio can work. They can.

The main risk is requirements drift: promising a no-server, privacy-maximal, offline-first app while also promising collaborative teacher workflows that naturally want shared infrastructure.

If that contradiction is handled explicitly, the roadmap becomes much cleaner:

- MVP: strong offline self-study product
- Phase 2: multilingual and selective optional sync
- Phase 3: open platform and creator tooling

That sequencing is technically credible and strategically defensible.

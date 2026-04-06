# ADR-012: Proceed with Building Now — Don't Wait for Full API Access

**Status:** Accepted  
**Date:** 2025-07-06  
**Context:** We received Quran Foundation API credentials. Testing revealed different capabilities across environments. Should we start building immediately or wait for full User API access on production?

---

## What We Have

### Two Environments, Different Capabilities

| | **Production** | **Prelive (Test)** |
|---|---|---|
| **Content APIs** (verses, audio, translations, search) | ✅ Full Quran — all 114 surahs | ⚠️ Only Surahs 1–2 |
| **User APIs** (bookmarks, streaks, goals, notes) | ❌ Not enabled | ✅ All features enabled |
| **Auth for Content** | `client_credentials` grant (server-to-server) | `client_credentials` grant |
| **Auth for User** | Not available | OAuth2 Authorization Code + PKCE (user login required) |
| **API base URL** | `apis.quran.foundation/content/api/v4/` | `apis-prelive.quran.foundation/content/api/v4/` |
| **User API URL** | — | `apis-prelive.quran.foundation/auth/v1/` |

### What Was Verified (2025-07-06)

| Test | Result |
|------|--------|
| Production: get content token via `client_credentials` | ✅ Token returned, expires in 3600s |
| Production: fetch verse 59:22 word-by-word (Lesson 1 anchor) | ✅ Full word data with translations + transliteration |
| Production: fetch verse 1:1 word-by-word | ✅ Works |
| Prelive: get content token | ✅ Token returned |
| Prelive: fetch verse 1:1 | ✅ Works |
| Prelive: fetch verse 59:22 (Lesson 1 anchor) | ❌ "Ayah not found" — limited data |
| Prelive: fetch verse 112:1, 87:1 | ❌ Not found — only Surahs 1–2 available |
| Old unauthenticated `api.quran.com/api/v4/` | ✅ Still works, full Quran (no auth needed) |
| Word-by-word audio CDN (`audio.qurancdn.com`) | ✅ Works, no auth needed |
| EveryAyah CDN (full ayah audio per reciter) | ✅ Works, no auth needed (already used in app) |

### The Mismatch

The environment that has **all User API features** (prelive) only has **Surahs 1–2** of content. Our Lesson 1 uses verses from surahs 59, 87, 112, and others — none available on prelive. We cannot test a full end-to-end flow (study Lesson 1 content → track via User APIs) in a single environment today.

---

## Decision

**Proceed with building now. Do not wait.**

### Rationale

Our phased roadmap (from PLATFORM-PRD.md) is specifically designed so that early phases have **zero dependency on external APIs**:

| Phase | What It Needs | API Dependency | Status |
|---|---|---|---|
| **Phase 0**: Lesson 1 in new app | Lesson JSON + EveryAyah audio + TTS files | ❌ None — all bundled/CDN | **Can start now** |
| **Phase 1**: Active Review + SRS | FSRS engine + SQLite on-device | ❌ None — purely local | **Can start now** |
| **Phase 2**: Background Listening | Audio player + shuffle logic | ❌ None — purely local | **Can start now** |
| **Phase 3**: Root Explorer | Root JSONs + QF Verses API (word-by-word) | ✅ Production Content API works | **Can start now** |
| **Phase 4**: QF User API integration | OAuth2 PKCE + User APIs | ⚠️ Needs prelive (limited data) | **Can start later** |

Phases 0–3 cover the core product: lesson rendering, SRS, audio immersion, and root exploration. All of this works today. Phase 4 (User API integration) is the cloud sync layer — important for the hackathon demo, but not needed for the core learning experience.

### What We Build With, Per Phase

**Phases 0–2 (no API needed):**
- Arabic audio: EveryAyah CDN (already working, no auth)
- Lesson content: bundled JSON (converted from existing YAML)
- Translation TTS: pre-built MP3s (existing pipeline)
- SRS state: local SQLite (expo-sqlite)
- All rendering, playback, and review logic is on-device

**Phase 3 (Production Content API):**
- Word-by-word verse data: `apis.quran.foundation/content/api/v4/verses/by_key/{key}?words=true`
- Translations: same API with `?translations={id}`
- Search: `api.quran.com/api/v4/search` (still works unauthenticated)
- Root data: our existing `docs/roots/*.json` files (incremental, per ADR-010)

**Phase 4 (Prelive User APIs — workaround needed):**
- Option A: Test User APIs with Surah 1–2 content only (Al-Fatihah and Al-Baqarah). Build the integration with these, then switch to production content when User APIs become available there.
- Option B: Email `Hackathon@quran.com` asking: (a) when will User APIs be available on production? (b) can more surahs be added to prelive?
- Option C: Build the offline sync queue now (write to local SQLite), add the QF API flush layer later. The UX is the same — user doesn't see the difference.

### Recommended: Option C for Phase 4

Build the sync queue pattern (SQLite → pending writes → flush when online) with the **QF API calls stubbed**. The app works fully offline with local state. When User APIs become available on production (or prelive gets more data), we flip the stub to real API calls. Zero wasted work — the local-first pattern is identical either way.

---

## What to Clarify with Quran Foundation

Send an email to `Hackathon@quran.com` asking:

1. **When will User APIs (bookmarks, streaks, goals, notes) be available on the production environment?** Currently production only has Content APIs enabled.
2. **Can more surah data be added to the prelive environment?** Currently only Surahs 1–2 are available, which limits testing for apps that use other surahs.
3. **Is our client configured as confidential or public?** This affects whether we can do PKCE token exchange directly in the mobile app or need a backend proxy.
4. **Does `type=LESSON` in Activity Days auto-generate Streaks?** The Streaks API only documents `type=QURAN` filtering.
5. **Can the Notes API body contain arbitrary JSON?** We plan to store structured learning metadata as JSON in the note body.

---

## Consequences

### Positive
- No idle time — building starts immediately
- Phases 0–2 are the core product; testing with real students happens sooner
- Local-first architecture means the app is useful even without any cloud APIs
- When full API access arrives, the integration layer slots in cleanly

### Negative
- Cannot do end-to-end testing of User APIs with real Lesson 1 content until environment mismatch is resolved
- May discover User API quirks late (Phase 4) that could affect earlier design choices

### Risks Accepted
- The sync queue pattern (Option C) may need adjustment once we see actual User API responses. Mitigation: the queue is a thin layer over SQLite writes — easy to modify.
- The prelive data limitation may persist. Mitigation: the app is valuable without cloud sync; User APIs are an enhancement, not a prerequisite.

---

## Related

- `docs/app/PLATFORM-PRD.md` — Phased roadmap (Phases 0–6)
- `docs/app/research-hackathon-apis.md` — Full API research and gap analysis
- `.env` — API credentials (gitignored)

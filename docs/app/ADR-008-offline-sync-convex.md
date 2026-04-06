# ADR-008: Offline-First Sync with Convex

**Status:** Proven via prototype  
**Date:** 2025-07-03  
**Context:** Can we use Convex as the cloud backend for an offline-first mobile app?

---

## Decision

**Yes — Convex works as the cloud sync backend using a "local-first, cloud-sync" pattern.**

Convex does NOT have native offline-first support. However, by adding a local persistence layer (IndexedDB on web, `expo-sqlite` on React Native), we achieve full offline-first behavior:

- All writes go to the local store FIRST (instant, works offline)
- A sync queue tracks unsynced reviews
- When online, the queue flushes to Convex via a bulk mutation
- On app open / reconnect, server state merges into local
- Convex's real-time subscriptions keep the UI updated across devices

## What Was Tested (playground/)

| Test | Result |
|------|--------|
| Online write → Convex | ✅ Instant, data appears in dashboard |
| Local-first write (UI speed) | ✅ Instant, no spinners |
| Offline write (DevTools offline) | ✅ Writes to IndexedDB, UI updates |
| Reconnect → auto-sync | ✅ Pending reviews flush to Convex |
| Cross-tab sync | ✅ Data appears in second tab via Convex subscription |
| Convex dashboard verification | ✅ Both `cardReviews` and `cardState` tables populated |

## Architecture Pattern

```
┌─────────────────────────────────┐
│         App (Web or Native)      │
│                                  │
│  ┌────────────┐  ┌────────────┐ │
│  │ UI (React) │→ │ Local Store │ │  ← All reads/writes go here FIRST
│  └────────────┘  │ IndexedDB  │ │    (web: IndexedDB, native: SQLite)
│                  │ or SQLite  │ │
│                  └─────┬──────┘ │
│                        │        │
│                  ┌─────▼──────┐ │
│                  │ Sync Queue │ │  ← Tracks what hasn't been pushed
│                  └─────┬──────┘ │
│                        │        │
│                  ┌─────▼──────┐ │
│                  │ Convex SDK │ │  ← Pushes when online, subscribes
│                  └─────┬──────┘ │     for server-side changes
└────────────────────────┼────────┘
                         │
                   ┌─────▼──────┐
                   │   Convex   │
                   │   Cloud    │  ← Source of truth for cross-device
                   │            │    sync. Real-time subscriptions.
                   └────────────┘
```

## Why Not CRDTs?

For single-user SRS data, CRDTs are overkill. The conflict scenario is:
- User studies on phone (offline) → queues 5 reviews
- User studies on desktop (online) → writes directly to Convex
- Phone comes online → pushes its 5 reviews

Resolution: **append-only reviews + last-write-wins for aggregated state** is sufficient.
Review events are immutable (append-only log), so no conflict is possible.
Card state (total reviews, last rating) uses "server has more reviews → server wins."

## Alternatives Evaluated

| Option | Verdict |
|--------|---------|
| **Convex + local store (this approach)** | ✅ Chosen. Convex familiar, pattern proven, no paid sync service. |
| `@trestleinc/replicate` | Too young (~10 months), Svelte-focused, uses op-sqlite not expo-sqlite. Adds Yjs CRDTs which are unnecessary for our append-only data. |
| PowerSync + Supabase | Good product but adds paid dependency and complex setup. Overkill for our simple data model. |
| InstantDB | Partial offline (cache only, no offline writes). |
| Pure local SQLite (no cloud) | Works but no cross-device sync. |

## For React Native

Replace `IndexedDB` → `expo-sqlite`. The sync hook (`useOfflineSync.ts`) and Convex functions (`cardReviews.ts`) stay identical. The only change is the storage adapter.

## Files

- `playground/convex/schema.ts` — Convex schema (cardReviews + cardState tables)
- `playground/convex/cardReviews.ts` — Convex mutations/queries (record, bulkSync, get)
- `playground/src/offlineStore.ts` — Local IndexedDB persistence layer
- `playground/src/useOfflineSync.ts` — React hook bridging local ↔ Convex
- `playground/src/App.tsx` — Test UI with 8 cards from Lesson 1

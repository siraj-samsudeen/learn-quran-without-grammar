/**
 * Offline-first local store using IndexedDB.
 * 
 * Pattern:
 * 1. All writes go to IndexedDB FIRST (instant, works offline)
 * 2. A sync queue tracks what needs to be pushed to Convex
 * 3. When online, the queue flushes to Convex via bulkSyncReviews
 * 4. On app open, we pull latest state from Convex to merge
 * 
 * For React Native, replace IndexedDB with expo-sqlite — same pattern.
 */

const DB_NAME = "lqwg-offline";
const DB_VERSION = 1;

export interface LocalReview {
  id: string;           // UUID
  cardId: string;
  lessonId: string;
  rating: number;       // 1-4
  reviewedAt: number;   // timestamp
  deviceId: string;
  synced: boolean;      // has this been pushed to Convex?
}

export interface LocalCardState {
  cardId: string;
  lessonId: string;
  totalReviews: number;
  lastReviewedAt: number;
  lastRating: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for individual review events
      if (!db.objectStoreNames.contains("reviews")) {
        const reviewStore = db.createObjectStore("reviews", { keyPath: "id" });
        reviewStore.createIndex("by_card", "cardId", { unique: false });
        reviewStore.createIndex("by_synced", "synced", { unique: false });
        reviewStore.createIndex("by_lesson", "lessonId", { unique: false });
      }
      
      // Store for aggregated card state
      if (!db.objectStoreNames.contains("cardState")) {
        const stateStore = db.createObjectStore("cardState", { keyPath: "cardId" });
        stateStore.createIndex("by_lesson", "lessonId", { unique: false });
      }

      // Store for sync metadata
      if (!db.objectStoreNames.contains("syncMeta")) {
        db.createObjectStore("syncMeta", { keyPath: "key" });
      }
    };
  });
}

// Generate a simple device ID (persisted in localStorage)
export function getDeviceId(): string {
  let id = localStorage.getItem("lqwg-device-id");
  if (!id) {
    id = "web-" + crypto.randomUUID().slice(0, 8);
    localStorage.setItem("lqwg-device-id", id);
  }
  return id;
}

// ============ WRITE (always local first) ============

export async function recordReviewLocally(
  cardId: string,
  lessonId: string,
  rating: number
): Promise<LocalReview> {
  const db = await openDB();
  
  const review: LocalReview = {
    id: crypto.randomUUID(),
    cardId,
    lessonId,
    rating,
    reviewedAt: Date.now(),
    deviceId: getDeviceId(),
    synced: false,
  };

  // Write review event
  const tx = db.transaction(["reviews", "cardState"], "readwrite");
  tx.objectStore("reviews").put(review);

  // Update aggregated state
  const stateStore = tx.objectStore("cardState");
  const existing = await idbGet<LocalCardState>(stateStore, cardId);
  
  if (existing) {
    stateStore.put({
      ...existing,
      totalReviews: existing.totalReviews + 1,
      lastReviewedAt: review.reviewedAt,
      lastRating: rating,
    });
  } else {
    stateStore.put({
      cardId,
      lessonId,
      totalReviews: 1,
      lastReviewedAt: review.reviewedAt,
      lastRating: rating,
    });
  }

  await idbTxComplete(tx);
  db.close();
  
  return review;
}

// ============ READ (always from local) ============

export async function getLocalCardStates(lessonId?: string): Promise<LocalCardState[]> {
  const db = await openDB();
  const tx = db.transaction("cardState", "readonly");
  const store = tx.objectStore("cardState");
  
  let results: LocalCardState[];
  if (lessonId) {
    results = await idbGetAll<LocalCardState>(store.index("by_lesson"), IDBKeyRange.only(lessonId));
  } else {
    results = await idbGetAll<LocalCardState>(store);
  }
  
  db.close();
  return results;
}

export async function getUnsyncedReviews(): Promise<LocalReview[]> {
  const db = await openDB();
  const tx = db.transaction("reviews", "readonly");
  const store = tx.objectStore("reviews");
  const index = store.index("by_synced");
  const results = await idbGetAll<LocalReview>(index, IDBKeyRange.only(0));
  // IndexedDB stores booleans as 0/1 in indexes, but let's filter manually
  db.close();
  
  // Filter for unsynced (false)
  const allReviews = await getAllReviews();
  return allReviews.filter(r => !r.synced);
}

async function getAllReviews(): Promise<LocalReview[]> {
  const db = await openDB();
  const tx = db.transaction("reviews", "readonly");
  const results = await idbGetAll<LocalReview>(tx.objectStore("reviews"));
  db.close();
  return results;
}

// ============ SYNC ============

export async function markReviewsSynced(reviewIds: string[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("reviews", "readwrite");
  const store = tx.objectStore("reviews");
  
  for (const id of reviewIds) {
    const review = await idbGet<LocalReview>(store, id);
    if (review) {
      store.put({ ...review, synced: true });
    }
  }
  
  await idbTxComplete(tx);
  db.close();
}

// Merge server state into local (server wins for aggregate counts)
export async function mergeServerState(
  serverStates: Array<{ cardId: string; lessonId: string; totalReviews: number; lastReviewedAt: number; lastRating: number }>
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("cardState", "readwrite");
  const store = tx.objectStore("cardState");
  
  for (const server of serverStates) {
    const local = await idbGet<LocalCardState>(store, server.cardId);
    
    if (!local || server.totalReviews >= local.totalReviews) {
      // Server has more or equal reviews — take server state
      store.put({
        cardId: server.cardId,
        lessonId: server.lessonId,
        totalReviews: server.totalReviews,
        lastReviewedAt: server.lastReviewedAt,
        lastRating: server.lastRating,
      });
    }
    // If local has more reviews (queued offline), keep local state
    // The unsynced reviews will be pushed on next sync
  }
  
  await idbTxComplete(tx);
  db.close();
}

export async function getSyncStats(): Promise<{
  totalLocal: number;
  unsynced: number;
  lastSyncAt: number | null;
}> {
  const db = await openDB();
  
  const allReviews = await idbGetAll<LocalReview>(
    db.transaction("reviews", "readonly").objectStore("reviews")
  );
  
  const unsynced = allReviews.filter(r => !r.synced).length;
  
  // Get last sync time
  let lastSyncAt: number | null = null;
  try {
    const metaTx = db.transaction("syncMeta", "readonly");
    const meta = await idbGet<{ key: string; value: number }>(
      metaTx.objectStore("syncMeta"), "lastSyncAt"
    );
    lastSyncAt = meta?.value ?? null;
  } catch {
    // ignore
  }
  
  db.close();
  
  return { totalLocal: allReviews.length, unsynced, lastSyncAt };
}

export async function setLastSyncTime(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("syncMeta", "readwrite");
  tx.objectStore("syncMeta").put({ key: "lastSyncAt", value: Date.now() });
  await idbTxComplete(tx);
  db.close();
}

// ============ IndexedDB Helpers ============

function idbGet<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll<T>(source: IDBObjectStore | IDBIndex, range?: IDBKeyRange): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = source.getAll(range);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function idbTxComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * React hook that bridges local IndexedDB store with Convex cloud.
 * 
 * Flow:
 * 1. On mount: pull server state → merge into local
 * 2. On write: write local first → queue for sync
 * 3. Periodically / on reconnect: flush unsynced reviews to Convex
 * 4. All reads come from local state (instant, offline-capable)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  recordReviewLocally,
  getLocalCardStates,
  getUnsyncedReviews,
  markReviewsSynced,
  mergeServerState,
  getSyncStats,
  setLastSyncTime,
  type LocalCardState,
} from "./offlineStore";

export type SyncStatus = "online" | "offline" | "syncing" | "error";

export function useOfflineSync(lessonId: string) {
  const [cardStates, setCardStates] = useState<LocalCardState[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("online");
  const [syncStats, setSyncStats] = useState({ totalLocal: 0, unsynced: 0, lastSyncAt: null as number | null });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncInProgress = useRef(false);

  // Convex queries and mutations
  const serverStates = useQuery(api.cardReviews.getCardStates, { lessonId });
  const bulkSync = useMutation(api.cardReviews.bulkSyncReviews);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Refresh local state from IndexedDB
  const refreshLocalState = useCallback(async () => {
    const states = await getLocalCardStates(lessonId);
    setCardStates(states);
    const stats = await getSyncStats();
    setSyncStats(stats);
  }, [lessonId]);

  // Merge server state into local on first load / reconnect
  useEffect(() => {
    if (serverStates && serverStates.length > 0) {
      mergeServerState(
        serverStates.map((s) => ({
          cardId: s.cardId,
          lessonId: s.lessonId,
          totalReviews: s.totalReviews,
          lastReviewedAt: s.lastReviewedAt,
          lastRating: s.lastRating,
        }))
      ).then(() => refreshLocalState());
    }
  }, [serverStates, refreshLocalState]);

  // Load local state on mount
  useEffect(() => {
    refreshLocalState();
  }, [refreshLocalState]);

  // Flush unsynced reviews to Convex
  const flushToServer = useCallback(async () => {
    if (syncInProgress.current || !isOnline) return;
    
    syncInProgress.current = true;
    setSyncStatus("syncing");

    try {
      const unsynced = await getUnsyncedReviews();
      
      if (unsynced.length === 0) {
        setSyncStatus("online");
        syncInProgress.current = false;
        return;
      }

      console.log(`[Sync] Pushing ${unsynced.length} reviews to Convex...`);

      // Send to Convex
      await bulkSync({
        reviews: unsynced.map((r) => ({
          cardId: r.cardId,
          lessonId: r.lessonId,
          rating: r.rating,
          reviewedAt: r.reviewedAt,
          deviceId: r.deviceId,
        })),
      });

      // Mark as synced locally
      await markReviewsSynced(unsynced.map((r) => r.id));
      await setLastSyncTime();

      console.log(`[Sync] ✅ Synced ${unsynced.length} reviews`);
      setSyncStatus("online");
      await refreshLocalState();
    } catch (err) {
      console.error("[Sync] ❌ Failed:", err);
      setSyncStatus("error");
    } finally {
      syncInProgress.current = false;
    }
  }, [isOnline, bulkSync, refreshLocalState]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      flushToServer();
    } else {
      setSyncStatus("offline");
    }
  }, [isOnline, flushToServer]);

  // Periodic sync (every 10 seconds when online)
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(flushToServer, 10_000);
    return () => clearInterval(interval);
  }, [isOnline, flushToServer]);

  // Record a review (always writes locally first)
  const recordReview = useCallback(
    async (cardId: string, rating: number) => {
      console.log(`[Local] Recording review: ${cardId} rating=${rating}`);
      
      // Write to IndexedDB immediately (works offline!)
      await recordReviewLocally(cardId, lessonId, rating);
      
      // Refresh UI from local state
      await refreshLocalState();

      // Try to sync if online (non-blocking)
      if (isOnline) {
        flushToServer().catch(console.error);
      }
    },
    [lessonId, isOnline, refreshLocalState, flushToServer]
  );

  // Manual sync trigger
  const manualSync = useCallback(async () => {
    if (!isOnline) {
      console.log("[Sync] Cannot sync — offline");
      return;
    }
    await flushToServer();
  }, [isOnline, flushToServer]);

  return {
    cardStates,
    recordReview,
    syncStatus,
    syncStats,
    isOnline,
    manualSync,
  };
}

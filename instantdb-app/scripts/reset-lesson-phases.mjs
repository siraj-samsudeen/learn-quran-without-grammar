#!/usr/bin/env node
/**
 * One-off admin script: reset every lesson to phaseSelection="ready" and
 * wipe all selections. Preserves lesson UUIDs (so any downstream references
 * still resolve). Does NOT reseed verses/sentences/forms/scores — those are
 * expensive (5-10 min) and unchanged.
 *
 * Idempotent — safe to run more than once.
 *
 * Usage:
 *   node scripts/reset-lesson-phases.mjs
 *   INSTANT_APP_ADMIN_TOKEN=<token> node scripts/reset-lesson-phases.mjs   # override token
 */
import { init, tx } from "@instantdb/admin";

const APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233";
const ADMIN_TOKEN =
  process.env.INSTANT_APP_ADMIN_TOKEN || "5ca3a1a8-a25e-49e3-bf10-3bc6d70000db";

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const READY_STATE = {
  phaseSelection: "ready",
  phaseAnnotation: "blocked",
  phaseAudio: "blocked",
  phaseQA: "blocked",
  phasePublished: "blocked",
};

const { lessons, selections } = await db.query({ lessons: {}, selections: {} });
console.log(`Found ${lessons.length} lessons, ${selections.length} selections.`);

if (selections.length > 0) {
  await db.transact(selections.map((s) => tx.selections[s.id].delete()));
  console.log(`Deleted ${selections.length} selections.`);
}

await db.transact(
  lessons.map((l) =>
    tx.lessons[l.id].update({ ...READY_STATE, notes: "Restarting selection" }),
  ),
);
console.log(`Reset ${lessons.length} lessons to phaseSelection=ready.`);
console.log("Done.");

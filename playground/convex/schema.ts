import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Each time a user studies a card, we record a review event
  cardReviews: defineTable({
    cardId: v.string(),       // e.g., "lesson-01-phrase-03"
    lessonId: v.string(),     // e.g., "lesson-01"
    rating: v.number(),       // 1=Again, 2=Hard, 3=Good, 4=Easy
    reviewedAt: v.number(),   // timestamp ms
    deviceId: v.string(),     // identifies the device
    syncedAt: v.optional(v.number()), // when this was synced to cloud
  })
    .index("by_card", ["cardId"])
    .index("by_lesson", ["lessonId"])
    .index("by_device", ["deviceId"]),

  // Aggregated card state (latest SRS state per card per user)
  cardState: defineTable({
    cardId: v.string(),
    lessonId: v.string(),
    totalReviews: v.number(),
    lastReviewedAt: v.number(),
    lastRating: v.number(),
    // Future: FSRS fields (stability, difficulty, due, etc.)
  })
    .index("by_card", ["cardId"])
    .index("by_lesson", ["lessonId"]),
});

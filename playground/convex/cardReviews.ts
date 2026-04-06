import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Record a new card review
export const recordReview = mutation({
  args: {
    cardId: v.string(),
    lessonId: v.string(),
    rating: v.number(),
    reviewedAt: v.number(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert the review event
    await ctx.db.insert("cardReviews", {
      ...args,
      syncedAt: Date.now(),
    });

    // Update or create aggregated card state
    const existing = await ctx.db
      .query("cardState")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalReviews: existing.totalReviews + 1,
        lastReviewedAt: args.reviewedAt,
        lastRating: args.rating,
      });
    } else {
      await ctx.db.insert("cardState", {
        cardId: args.cardId,
        lessonId: args.lessonId,
        totalReviews: 1,
        lastReviewedAt: args.reviewedAt,
        lastRating: args.rating,
      });
    }
  },
});

// Bulk sync: accept multiple reviews at once (for offline queue flush)
export const bulkSyncReviews = mutation({
  args: {
    reviews: v.array(
      v.object({
        cardId: v.string(),
        lessonId: v.string(),
        rating: v.number(),
        reviewedAt: v.number(),
        deviceId: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const review of args.reviews) {
      // Insert review event
      await ctx.db.insert("cardReviews", {
        ...review,
        syncedAt: Date.now(),
      });

      // Update aggregated state
      const existing = await ctx.db
        .query("cardState")
        .withIndex("by_card", (q) => q.eq("cardId", review.cardId))
        .first();

      if (existing) {
        // Only update if this review is newer
        if (review.reviewedAt > existing.lastReviewedAt) {
          await ctx.db.patch(existing._id, {
            totalReviews: existing.totalReviews + 1,
            lastReviewedAt: review.reviewedAt,
            lastRating: review.rating,
          });
        } else {
          await ctx.db.patch(existing._id, {
            totalReviews: existing.totalReviews + 1,
          });
        }
      } else {
        await ctx.db.insert("cardState", {
          cardId: review.cardId,
          lessonId: review.lessonId,
          totalReviews: 1,
          lastReviewedAt: review.reviewedAt,
          lastRating: review.rating,
        });
      }
    }
    return { synced: args.reviews.length };
  },
});

// Get all card states for a lesson
export const getCardStates = query({
  args: {
    lessonId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cardState")
      .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
      .collect();
  },
});

// Get all card states (for full sync on app open)
export const getAllCardStates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cardState").collect();
  },
});

// Get review history for a specific card
export const getCardReviews = query({
  args: {
    cardId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cardReviews")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .order("desc")
      .take(50);
  },
});

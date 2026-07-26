import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "~/db";
import { courseReviews } from "~/db/schema";

// ─── Review Service ───
// Handles course star ratings (1-5, no written text). One row per (userId, courseId);
// resubmitting updates the existing row (upsert). Uses positional parameters (project convention).

export function getUserReviewForCourse(userId: number, courseId: number) {
  return db
    .select()
    .from(courseReviews)
    .where(
      and(eq(courseReviews.userId, userId), eq(courseReviews.courseId, courseId))
    )
    .get();
}

export function upsertCourseReview(
  userId: number,
  courseId: number,
  rating: number
) {
  const existing = getUserReviewForCourse(userId, courseId);

  if (existing) {
    return db
      .update(courseReviews)
      .set({ rating, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(courseReviews.userId, userId),
          eq(courseReviews.courseId, courseId)
        )
      )
      .returning()
      .get();
  }

  return db
    .insert(courseReviews)
    .values({ userId, courseId, rating })
    .returning()
    .get();
}

export function getCourseRatingSummary(courseId: number) {
  const result = db
    .select({
      average: sql<number>`avg(${courseReviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(courseReviews)
    .where(eq(courseReviews.courseId, courseId))
    .get();

  const count = result?.count ?? 0;
  const average = count > 0 ? Math.round((result?.average ?? 0) * 10) / 10 : 0;

  return { average, count };
}

export function getBatchCourseRatingSummaries(courseIds: number[]) {
  const summaries = new Map<number, { average: number; count: number }>();

  if (courseIds.length === 0) {
    return summaries;
  }

  const rows = db
    .select({
      courseId: courseReviews.courseId,
      average: sql<number>`avg(${courseReviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(courseReviews)
    .where(inArray(courseReviews.courseId, courseIds))
    .groupBy(courseReviews.courseId)
    .all();

  for (const row of rows) {
    summaries.set(row.courseId, {
      average: Math.round(row.average * 10) / 10,
      count: row.count,
    });
  }

  return summaries;
}

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

// Import after mock so the module picks up our test db
import {
  getUserReviewForCourse,
  upsertCourseReview,
  getCourseRatingSummary,
  getBatchCourseRatingSummaries,
} from "./reviewService";

describe("reviewService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("getUserReviewForCourse", () => {
    it("returns undefined when no review exists", () => {
      expect(
        getUserReviewForCourse(base.user.id, base.course.id)
      ).toBeUndefined();
    });
  });

  describe("upsertCourseReview", () => {
    it("creates a new review when none exists", () => {
      const review = upsertCourseReview(base.user.id, base.course.id, 4);
      expect(review.rating).toBe(4);
    });

    it("updates the existing review instead of creating a duplicate row", () => {
      upsertCourseReview(base.user.id, base.course.id, 3);
      upsertCourseReview(base.user.id, base.course.id, 5);

      const found = getUserReviewForCourse(base.user.id, base.course.id);
      expect(found!.rating).toBe(5);
      expect(getCourseRatingSummary(base.course.id).count).toBe(1);
    });

    it("enforces one row per (userId, courseId) at the DB level", () => {
      testDb
        .insert(schema.courseReviews)
        .values({ userId: base.user.id, courseId: base.course.id, rating: 2 })
        .run();

      expect(() =>
        testDb
          .insert(schema.courseReviews)
          .values({
            userId: base.user.id,
            courseId: base.course.id,
            rating: 3,
          })
          .run()
      ).toThrowError();
    });
  });

  describe("getCourseRatingSummary", () => {
    it("returns average 0 and count 0 with no reviews", () => {
      expect(getCourseRatingSummary(base.course.id)).toEqual({
        average: 0,
        count: 0,
      });
    });

    it("computes a rounded average across multiple users' ratings", () => {
      const student2 = testDb
        .insert(schema.users)
        .values({
          name: "S2",
          email: "s2@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();

      upsertCourseReview(base.user.id, base.course.id, 5);
      upsertCourseReview(student2.id, base.course.id, 4);

      expect(getCourseRatingSummary(base.course.id)).toEqual({
        average: 4.5,
        count: 2,
      });
    });
  });

  describe("getBatchCourseRatingSummaries", () => {
    it("batches ratings for multiple courses in one query", () => {
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Second",
          slug: "second",
          description: "d",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      upsertCourseReview(base.user.id, base.course.id, 3);
      upsertCourseReview(base.user.id, course2.id, 5);

      const map = getBatchCourseRatingSummaries([base.course.id, course2.id]);
      expect(map.get(base.course.id)).toEqual({ average: 3, count: 1 });
      expect(map.get(course2.id)).toEqual({ average: 5, count: 1 });
    });

    it("returns an empty map for an empty courseIds array", () => {
      expect(getBatchCourseRatingSummaries([]).size).toBe(0);
    });

    it("omits courses with zero reviews from the map", () => {
      const map = getBatchCourseRatingSummaries([base.course.id]);
      expect(map.has(base.course.id)).toBe(false);
    });
  });
});

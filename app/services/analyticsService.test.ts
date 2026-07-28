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
  getCourseRevenueSeries,
  getCourseTotalRevenue,
  getCourseCompletionRate,
  getCourseRatingMetrics,
  getCourseRevenueTrend,
  getPlatformAnalyticsSummary,
} from "./analyticsService";

const NOW = new Date("2026-07-26T12:00:00.000Z");

function daysAgoIso(days: number, from: Date = NOW): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe("analyticsService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("getCourseRevenueSeries", () => {
    it("zero-fills every day for a brand-new course with no purchases", () => {
      const series = getCourseRevenueSeries(base.course.id, "7d", NOW);
      expect(series).toHaveLength(7);
      expect(series.every((point) => point.revenueCents === 0)).toBe(true);
      expect(series[series.length - 1]!.date).toBe("2026-07-26");
      expect(series[0]!.date).toBe("2026-07-20");
    });

    it("aggregates same-day purchases and zero-fills the rest", () => {
      testDb
        .insert(schema.purchases)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 4999,
            country: "US",
            createdAt: daysAgoIso(1),
          },
          {
            userId: base.instructor.id,
            courseId: base.course.id,
            pricePaid: 2000,
            country: "GB",
            createdAt: daysAgoIso(1),
          },
        ])
        .run();

      const series = getCourseRevenueSeries(base.course.id, "7d", NOW);
      const yesterday = series.find((p) => p.date === "2026-07-25");
      expect(yesterday!.revenueCents).toBe(6999);

      const otherDays = series.filter((p) => p.date !== "2026-07-25");
      expect(otherDays.every((p) => p.revenueCents === 0)).toBe(true);
    });

    it("excludes purchases outside the requested range", () => {
      testDb
        .insert(schema.purchases)
        .values({
          userId: base.user.id,
          courseId: base.course.id,
          pricePaid: 9999,
          country: "US",
          createdAt: daysAgoIso(45),
        })
        .run();

      const series = getCourseRevenueSeries(base.course.id, "30d", NOW);
      expect(series.every((point) => point.revenueCents === 0)).toBe(true);
    });

    it("returns the correct number of days per range", () => {
      expect(getCourseRevenueSeries(base.course.id, "7d", NOW)).toHaveLength(7);
      expect(getCourseRevenueSeries(base.course.id, "30d", NOW)).toHaveLength(
        30
      );
      expect(getCourseRevenueSeries(base.course.id, "90d", NOW)).toHaveLength(
        90
      );
    });
  });

  describe("getCourseTotalRevenue", () => {
    it("returns 0 for a course with no purchases", () => {
      expect(getCourseTotalRevenue(base.course.id)).toBe(0);
    });

    it("sums all purchases regardless of date", () => {
      testDb
        .insert(schema.purchases)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 4999,
            country: "US",
            createdAt: daysAgoIso(1),
          },
          {
            userId: base.instructor.id,
            courseId: base.course.id,
            pricePaid: 2000,
            country: "GB",
            createdAt: daysAgoIso(200),
          },
        ])
        .run();

      expect(getCourseTotalRevenue(base.course.id)).toBe(6999);
    });
  });

  describe("getCourseCompletionRate", () => {
    it("does not divide by zero when the course has no enrollments", () => {
      expect(getCourseCompletionRate(base.course.id, 30, NOW)).toEqual({
        eligibleEnrollments: 0,
        completedEnrollments: 0,
        recentEnrollments: 0,
        completionRate: 0,
      });
    });

    it("excludes all-recent enrollments from the denominator instead of tanking the rate", () => {
      // Simulates a successful promotion: many brand-new, not-yet-finished enrollments.
      testDb
        .insert(schema.enrollments)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            enrolledAt: daysAgoIso(1),
            completedAt: null,
          },
          {
            userId: base.instructor.id,
            courseId: base.course.id,
            enrolledAt: daysAgoIso(2),
            completedAt: null,
          },
        ])
        .run();

      const result = getCourseCompletionRate(base.course.id, 30, NOW);
      expect(result.eligibleEnrollments).toBe(0);
      expect(result.recentEnrollments).toBe(2);
      expect(result.completionRate).toBe(0);
    });

    it("computes rate only from enrollments older than the cutoff window", () => {
      const student2 = testDb
        .insert(schema.users)
        .values({
          name: "S2",
          email: "s2@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();

      testDb
        .insert(schema.enrollments)
        .values([
          // Eligible: enrolled 60 days ago, completed.
          {
            userId: base.user.id,
            courseId: base.course.id,
            enrolledAt: daysAgoIso(60),
            completedAt: daysAgoIso(10),
          },
          // Eligible: enrolled 60 days ago, not completed.
          {
            userId: student2.id,
            courseId: base.course.id,
            enrolledAt: daysAgoIso(60),
            completedAt: null,
          },
          // Not eligible: enrolled 5 days ago (within cutoff window).
          {
            userId: base.instructor.id,
            courseId: base.course.id,
            enrolledAt: daysAgoIso(5),
            completedAt: null,
          },
        ])
        .run();

      const result = getCourseCompletionRate(base.course.id, 30, NOW);
      expect(result.eligibleEnrollments).toBe(2);
      expect(result.completedEnrollments).toBe(1);
      expect(result.recentEnrollments).toBe(1);
      expect(result.completionRate).toBe(0.5);
    });
  });

  describe("getCourseRevenueTrend", () => {
    it("returns null percentChange when the prior period has no revenue (no crash, no Infinity/NaN)", () => {
      testDb
        .insert(schema.purchases)
        .values({
          userId: base.user.id,
          courseId: base.course.id,
          pricePaid: 4999,
          country: "US",
          createdAt: daysAgoIso(5),
        })
        .run();

      const trend = getCourseRevenueTrend(base.course.id, NOW);
      expect(trend.recentRevenueCents).toBe(4999);
      expect(trend.priorRevenueCents).toBe(0);
      expect(trend.percentChange).toBeNull();
    });

    it("returns null percentChange for a course with no purchases at all", () => {
      const trend = getCourseRevenueTrend(base.course.id, NOW);
      expect(trend).toEqual({
        recentRevenueCents: 0,
        priorRevenueCents: 0,
        percentChange: null,
      });
    });

    it("computes a negative percentChange for a declining course", () => {
      testDb
        .insert(schema.purchases)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 10000,
            country: "US",
            createdAt: daysAgoIso(45),
          },
          {
            userId: base.instructor.id,
            courseId: base.course.id,
            pricePaid: 5000,
            country: "US",
            createdAt: daysAgoIso(5),
          },
        ])
        .run();

      const trend = getCourseRevenueTrend(base.course.id, NOW);
      expect(trend.recentRevenueCents).toBe(5000);
      expect(trend.priorRevenueCents).toBe(10000);
      expect(trend.percentChange).toBe(-0.5);
    });

    it("computes a positive percentChange for a growing course", () => {
      testDb
        .insert(schema.purchases)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 2000,
            country: "US",
            createdAt: daysAgoIso(45),
          },
          {
            userId: base.instructor.id,
            courseId: base.course.id,
            pricePaid: 6000,
            country: "US",
            createdAt: daysAgoIso(5),
          },
        ])
        .run();

      const trend = getCourseRevenueTrend(base.course.id, NOW);
      expect(trend.percentChange).toBe(2);
    });

    it("excludes purchases older than the prior 30-day window", () => {
      testDb
        .insert(schema.purchases)
        .values({
          userId: base.user.id,
          courseId: base.course.id,
          pricePaid: 9999,
          country: "US",
          createdAt: daysAgoIso(90),
        })
        .run();

      const trend = getCourseRevenueTrend(base.course.id, NOW);
      expect(trend).toEqual({
        recentRevenueCents: 0,
        priorRevenueCents: 0,
        percentChange: null,
      });
    });
  });

  describe("getPlatformAnalyticsSummary", () => {
    it("returns zeros and no top earner when the platform has no purchases or enrollments", () => {
      expect(getPlatformAnalyticsSummary("30d", NOW)).toEqual({
        totalRevenueCents: 0,
        totalEnrollments: 0,
        topEarningCourse: null,
      });
    });

    it("sums revenue and enrollments across courses from different instructors", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Instructor",
          email: "other-instructor@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: otherInstructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      testDb
        .insert(schema.purchases)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            pricePaid: 3000,
            country: "US",
            createdAt: daysAgoIso(1),
          },
          {
            userId: base.user.id,
            courseId: otherCourse.id,
            pricePaid: 5000,
            country: "US",
            createdAt: daysAgoIso(2),
          },
        ])
        .run();

      testDb
        .insert(schema.enrollments)
        .values([
          {
            userId: base.user.id,
            courseId: base.course.id,
            enrolledAt: daysAgoIso(1),
          },
          {
            userId: base.user.id,
            courseId: otherCourse.id,
            enrolledAt: daysAgoIso(2),
          },
        ])
        .run();

      const summary = getPlatformAnalyticsSummary("30d", NOW);
      expect(summary.totalRevenueCents).toBe(8000);
      expect(summary.totalEnrollments).toBe(2);
      expect(summary.topEarningCourse).toEqual({
        courseId: otherCourse.id,
        title: "Other Course",
        revenueCents: 5000,
      });
    });

    it("excludes purchases and enrollments older than the selected range", () => {
      testDb
        .insert(schema.purchases)
        .values({
          userId: base.user.id,
          courseId: base.course.id,
          pricePaid: 9999,
          country: "US",
          createdAt: daysAgoIso(45),
        })
        .run();

      testDb
        .insert(schema.enrollments)
        .values({
          userId: base.user.id,
          courseId: base.course.id,
          enrolledAt: daysAgoIso(45),
        })
        .run();

      const summary = getPlatformAnalyticsSummary("30d", NOW);
      expect(summary).toEqual({
        totalRevenueCents: 0,
        totalEnrollments: 0,
        topEarningCourse: null,
      });
    });

    it("includes all-time data for the 'all' range regardless of age", () => {
      testDb
        .insert(schema.purchases)
        .values({
          userId: base.user.id,
          courseId: base.course.id,
          pricePaid: 9999,
          country: "US",
          createdAt: daysAgoIso(900),
        })
        .run();

      const summary = getPlatformAnalyticsSummary("all", NOW);
      expect(summary.totalRevenueCents).toBe(9999);
      expect(summary.topEarningCourse).toEqual({
        courseId: base.course.id,
        title: "Test Course",
        revenueCents: 9999,
      });
    });
  });

  describe("getCourseRatingMetrics", () => {
    it("returns average 0 and count 0 with zero reviews", () => {
      expect(getCourseRatingMetrics(base.course.id)).toEqual({
        average: 0,
        count: 0,
      });
    });

    it("returns the average and count across reviews", () => {
      testDb
        .insert(schema.courseReviews)
        .values({ userId: base.user.id, courseId: base.course.id, rating: 4 })
        .run();

      expect(getCourseRatingMetrics(base.course.id)).toEqual({
        average: 4,
        count: 1,
      });
    });
  });
});

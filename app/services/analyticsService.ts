import { getPurchasesByCourse } from "./purchaseService";
import { getEnrollmentsByCourse } from "./enrollmentService";
import { getCourseRatingSummary } from "./reviewService";
import { getAllCourses } from "./courseService";

// ─── Analytics Service ───
// Pure aggregation functions backing the instructor analytics dashboard.
// Given rows in, correct aggregated numbers out — no chart/route dependencies.
// Uses positional parameters (project convention).

export type RevenueRange = "7d" | "30d" | "90d";

const RANGE_DAYS: Record<RevenueRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export interface RevenueDataPoint {
  date: string;
  revenueCents: number;
}

/**
 * Daily revenue series for a course over the given range, ending on `now`.
 * Days with no purchases are zero-filled so the series covers every day in
 * the range (an honest sparse chart, not an interpolated trend).
 */
export function getCourseRevenueSeries(
  courseId: number,
  range: RevenueRange,
  now: Date = new Date()
): RevenueDataPoint[] {
  const days = RANGE_DAYS[range];
  const purchases = getPurchasesByCourse(courseId);

  const revenueByDate = new Map<string, number>();
  for (const purchase of purchases) {
    const date = purchase.createdAt.slice(0, 10);
    revenueByDate.set(
      date,
      (revenueByDate.get(date) ?? 0) + purchase.pricePaid
    );
  }

  const series: RevenueDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    series.push({
      date: dateKey,
      revenueCents: revenueByDate.get(dateKey) ?? 0,
    });
  }

  return series;
}

/** Total revenue for a course across all purchases (no range filter). */
export function getCourseTotalRevenue(courseId: number): number {
  return getPurchasesByCourse(courseId).reduce(
    (sum, purchase) => sum + purchase.pricePaid,
    0
  );
}

export interface CompletionRateResult {
  eligibleEnrollments: number;
  completedEnrollments: number;
  recentEnrollments: number;
  completionRate: number;
}

/**
 * Completion rate using a recency-aware denominator: enrollments younger
 * than `minEnrollmentAgeDays` are excluded from both numerator and
 * denominator, so a recent promotion's new (not-yet-finished) students
 * can't manufacture a false decline.
 */
export function getCourseCompletionRate(
  courseId: number,
  minEnrollmentAgeDays: number = 30,
  now: Date = new Date()
): CompletionRateResult {
  const enrollments = getEnrollmentsByCourse(courseId);

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - minEnrollmentAgeDays);
  const cutoffIso = cutoff.toISOString();

  const eligible = enrollments.filter((e) => e.enrolledAt <= cutoffIso);
  const completed = eligible.filter((e) => e.completedAt !== null);

  return {
    eligibleEnrollments: eligible.length,
    completedEnrollments: completed.length,
    recentEnrollments: enrollments.length - eligible.length,
    completionRate:
      eligible.length > 0 ? completed.length / eligible.length : 0,
  };
}

export interface RevenueTrend {
  recentRevenueCents: number;
  priorRevenueCents: number;
  /** (recent - prior) / prior; negative means decline. Null when the prior period had no revenue to decline from. */
  percentChange: number | null;
}

/**
 * Compares a course's most recent 30 days of revenue against the prior 30-day
 * period, for ranking "which course most needs attention" (steepest decline first).
 */
export function getCourseRevenueTrend(
  courseId: number,
  now: Date = new Date()
): RevenueTrend {
  const purchases = getPurchasesByCourse(courseId);

  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const priorCutoff = new Date(now);
  priorCutoff.setDate(priorCutoff.getDate() - 60);

  const recentCutoffIso = recentCutoff.toISOString();
  const priorCutoffIso = priorCutoff.toISOString();
  const nowIso = now.toISOString();

  let recentRevenueCents = 0;
  let priorRevenueCents = 0;

  for (const purchase of purchases) {
    if (purchase.createdAt > recentCutoffIso && purchase.createdAt <= nowIso) {
      recentRevenueCents += purchase.pricePaid;
    } else if (
      purchase.createdAt > priorCutoffIso &&
      purchase.createdAt <= recentCutoffIso
    ) {
      priorRevenueCents += purchase.pricePaid;
    }
  }

  const percentChange =
    priorRevenueCents === 0
      ? null
      : (recentRevenueCents - priorRevenueCents) / priorRevenueCents;

  return { recentRevenueCents, priorRevenueCents, percentChange };
}

export interface RatingMetrics {
  average: number;
  count: number;
}

/** Average rating + review count for a course. */
export function getCourseRatingMetrics(courseId: number): RatingMetrics {
  return getCourseRatingSummary(courseId);
}

// ─── Platform-wide (admin) aggregation ───
// Same shape of queries as above, but summed across every course rather than
// one instructor's courses. Used by the admin analytics dashboard.

export type PlatformRange = "7d" | "30d" | "12m" | "all";

/** Start of the window for `range`, or null for "all" (no lower bound). */
function getPlatformRangeStart(range: PlatformRange, now: Date): Date | null {
  if (range === "all") return null;

  const start = new Date(now);
  if (range === "7d") start.setDate(start.getDate() - 7);
  else if (range === "30d") start.setDate(start.getDate() - 30);
  else if (range === "12m") start.setMonth(start.getMonth() - 12);

  return start;
}

function isWithinRange(
  dateIso: string,
  startIso: string | null,
  nowIso: string
): boolean {
  if (startIso === null) return dateIso <= nowIso;
  return dateIso > startIso && dateIso <= nowIso;
}

export interface TopEarningCourse {
  courseId: number;
  title: string;
  revenueCents: number;
}

export interface PlatformAnalyticsSummary {
  totalRevenueCents: number;
  totalEnrollments: number;
  topEarningCourse: TopEarningCourse | null;
}

/**
 * Platform-wide revenue, enrollments, and top earner for the given range.
 * Computed in a single pass over every course's purchases/enrollments so the
 * three numbers stay consistent with each other.
 */
export function getPlatformAnalyticsSummary(
  range: PlatformRange,
  now: Date = new Date()
): PlatformAnalyticsSummary {
  const startIso = getPlatformRangeStart(range, now)?.toISOString() ?? null;
  const nowIso = now.toISOString();

  let totalRevenueCents = 0;
  let totalEnrollments = 0;
  let topEarningCourse: TopEarningCourse | null = null;

  for (const course of getAllCourses()) {
    const revenueCents = getPurchasesByCourse(course.id)
      .filter((purchase) => isWithinRange(purchase.createdAt, startIso, nowIso))
      .reduce((sum, purchase) => sum + purchase.pricePaid, 0);

    totalRevenueCents += revenueCents;

    totalEnrollments += getEnrollmentsByCourse(course.id).filter((enrollment) =>
      isWithinRange(enrollment.enrolledAt, startIso, nowIso)
    ).length;

    if (
      revenueCents > 0 &&
      (!topEarningCourse || revenueCents > topEarningCourse.revenueCents)
    ) {
      topEarningCourse = {
        courseId: course.id,
        title: course.title,
        revenueCents,
      };
    }
  }

  return { totalRevenueCents, totalEnrollments, topEarningCourse };
}

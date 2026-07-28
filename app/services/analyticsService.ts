import { getPurchasesByCourse } from "./purchaseService";
import { getEnrollmentsByCourse } from "./enrollmentService";
import { getCourseRatingSummary } from "./reviewService";

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
    revenueByDate.set(date, (revenueByDate.get(date) ?? 0) + purchase.pricePaid);
  }

  const series: RevenueDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    series.push({ date: dateKey, revenueCents: revenueByDate.get(dateKey) ?? 0 });
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
    } else if (purchase.createdAt > priorCutoffIso && purchase.createdAt <= recentCutoffIso) {
      priorRevenueCents += purchase.pricePaid;
    }
  }

  const percentChange =
    priorRevenueCents === 0 ? null : (recentRevenueCents - priorRevenueCents) / priorRevenueCents;

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

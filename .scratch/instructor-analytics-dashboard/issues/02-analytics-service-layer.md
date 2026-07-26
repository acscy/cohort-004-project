# 02 — `analyticsService.ts`: revenue, completion, and rating aggregation functions

**What to build:** The pure data-shaping functions that back every KPI and chart in this feature, tested independently of any route or component — following the existing `purchaseService.ts` / `enrollmentService.ts` / `progressService.ts` pattern (plain functions, positional parameters, vitest tests asserting "given rows in, correct aggregated numbers out").

Functions needed:
- **Revenue by day/range** — aggregates `purchases` rows into a time series for a given course + range (7d/30d/90d).
- **Completion rate (recency-aware)** — computes `completed / enrolled` from `enrollments`, using a cohorting/minimum-window rule (e.g. excluding or separately bucketing students enrolled within the last 30 days) so a recent promotion's new-student influx doesn't manufacture a false decline.
- **Average rating** — aggregates `course_reviews` into average rating + review count per course (can likely reuse/extend `getCourseRatingSummary` from `reviewService.ts` rather than duplicating it).

No route or component depends on this yet — it should be fully verifiable via its own test suite.

**Blocked by:** None — can start immediately (independent of ticket 01)

**Status:** ready-for-agent

- [ ] `analyticsService.ts` exports a revenue-by-day/range function accepting a course + range (7d/30d/90d) and returning a time series
- [ ] `analyticsService.ts` exports a recency-aware completion-rate function that does not degrade when a course has a recent enrollment spike
- [ ] `analyticsService.ts` exports (or reuses) an average-rating + review-count function per course
- [ ] Tests cover: a brand-new course with zero/sparse purchase history, a course with all-recent enrollments (recency cutoff doesn't crash or divide by zero), and a course with zero reviews
- [ ] Tests follow the existing vitest style used in `purchaseService.test.ts` / `enrollmentService.test.ts` / `reviewService.test.ts`

# 05 — Multi-course small-multiples grid

**What to build:** On the same `/instructor/analytics` page (ticket 03), an instructor with more than one course sees, above the per-course charts, a single total-revenue summary number (the one intentional combined figure), and below it a grid of small per-course revenue charts (small multiples) — one compact chart per course — instead of a single combined line or an overlaid multi-line chart. An instructor with exactly one course continues to see ticket 03's simple single-chart view, not a grid-of-one.

**Sort order (confirmed, no longer open):** steepest recent revenue decline first. For each course, compare most-recent-30-days revenue against the prior 30-day period; sort descending by the size of the negative percentage change (biggest decline first). This needs a new comparison function in `analyticsService.ts` (e.g. something like `getCourseRevenueTrend`), tested the same way as ticket 02's functions — including the zero-prior-period case (new course, division by zero must not crash or produce `Infinity`/`NaN`).

This ticket explicitly reuses ticket 03's single-chart component per grid cell rather than building a second chart implementation.

This is a cuttable, lowest-priority slice: it's a bet on multi-course usage ahead of actual demand (0 multi-course instructors exist in this environment today per the spec). Cutting it does not block tickets 01–04 from shipping independently.

**Blocked by:** 03 (reuses its single-course chart component and lives on the same page)

**Status:** done

- [x] `analyticsService.ts` exports a tested revenue-trend/decline function per course (handles zero-prior-period without crashing or NaN/Infinity) — `getCourseRevenueTrend`, 5 tests
- [x] Total-revenue summary number displayed separately from and above the per-course charts, for multi-course instructors
- [x] Grid of small per-course revenue charts renders for instructors with >1 course, reusing ticket 03's chart component per cell (not a separate implementation) — `RevenueChart` with `compact`/`showRangeToggle={false}`
- [x] Grid is sorted by steepest recent revenue decline first (biggest negative 30d-over-30d change) — verified visually with temporary seed data: a declining course sorted before a course with no prior-period signal
- [x] Single-course instructors still see ticket 03's simple view, unchanged — verified visually before and after the multi-course test
- [x] Grid stays readable at a handful of courses and beyond (no overlapping/unreadable layout) — 2-column (sm) / 3-column (lg) responsive grid

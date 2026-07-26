# 05 — Multi-course small-multiples grid

**What to build:** An instructor with more than one course sees, above the per-course charts, a single total-revenue summary number (the one intentional combined figure), and below it a grid of small per-course revenue charts (small multiples) — one compact chart per course — instead of a single combined line or an overlaid multi-line chart. The grid is sorted by whichever course most needs attention (confirm the exact ranking rule — e.g. steepest recent decline, or lowest completion rate — before building the sort). An instructor with exactly one course continues to see ticket 03's simple single-chart view, not a grid-of-one.

This ticket explicitly reuses ticket 03's single-chart component per grid cell rather than building a second chart implementation.

This is a cuttable, lowest-priority slice: it's a bet on multi-course usage ahead of actual demand (0 multi-course instructors exist in this environment today per the spec). Cutting it does not block tickets 01–04 from shipping independently.

**Blocked by:** 03 (reuses its single-course chart component)

**Status:** ready-for-agent

- [ ] Total-revenue summary number displayed separately from and above the per-course charts, for multi-course instructors
- [ ] Grid of small per-course revenue charts renders for instructors with >1 course, reusing ticket 03's chart component per cell (not a separate implementation)
- [ ] Grid is sorted by an explicitly confirmed "needs attention" metric
- [ ] Single-course instructors still see ticket 03's simple view, unchanged
- [ ] Grid stays readable at a handful of courses and beyond (no overlapping/unreadable layout)

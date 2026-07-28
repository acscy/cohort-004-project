# 06 — Lesson drop-off funnel aggregation + chart

**What to build:** An instructor sees where in their course students tend to stop progressing — a per-lesson drop-off funnel — reflecting true stopping points rather than just the last lesson marked complete.

**Placement note:** unlike tickets 03–05 (which moved to the top-level `/instructor/analytics` page), this funnel is per-course by nature — it stays inside `instructor.$courseId.tsx` (e.g. its own tab or a section of the existing per-student view) rather than the cross-course page.

This requires new aggregation logic, not just a new chart, since neither existing data path currently supports "furthest lesson reached":
- `lesson_progress` has no `startedAt`, only a completion status — furthest-lesson-reached must be derived by joining completion status against lesson ordering.
- `video_watch_events` is timestamped and append-only (the right shape for a true stopping point) but nothing currently aggregates it into a funnel.

Pick one approach (or note why both are needed) and build a tested aggregation function producing per-lesson drop-off counts, following the same service-layer + test pattern as ticket 02, then a funnel chart using the same charting approach as ticket 03.

This ticket is secondary/deferred per the spec by default — it was drafted here at explicit request, but treat its priority as below tickets 01–05 unless told otherwise.

**Blocked by:** 01 (chart wrapper). Independent of tickets 02–05 (different metric, different data path).

**Status:** ready-for-agent

- [ ] A decision is made and documented on `lesson_progress`-derived vs `video_watch_events`-derived "furthest lesson reached" (or both, with rationale)
- [ ] New tested aggregation function producing per-lesson drop-off counts, following the existing service + vitest pattern
- [ ] Funnel/bar chart rendered using the ticket 01 chart wrapper, matching dashboard visual language (incl. dark mode)
- [ ] Reflects true stopping points, not merely "last lesson marked complete," per the spec's explicit concern
- [ ] Verified against a course with no watch/progress data (empty state, no crash)

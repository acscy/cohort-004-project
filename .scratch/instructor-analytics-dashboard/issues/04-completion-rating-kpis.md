# 04 — Completion-rate and rating KPI tiles

**What to build:** On the same `/instructor/analytics` page as ticket 03, an instructor sees two additional KPI tiles: completion rate and average rating (with review count). All three v1 KPIs (revenue, completion, rating) are now visible together for the single-course case, all backed by ticket 02's tested service functions.

The completion-rate tile must visibly reflect the recency-aware calculation — verify against a course with a recent enrollment spike that the number doesn't tank just because of new, not-yet-finished students.

**Blocked by:** 02 (completion-rate and rating functions), 03 (analytics section this slots into)

**Status:** ready-for-agent

- [ ] Completion-rate KPI tile added to the analytics section, backed by ticket 02's recency-aware function
- [ ] Average-rating KPI tile added, showing average rating and review count, backed by ticket 02's rating function
- [ ] Visually verified: a course with a recent enrollment spike does not show an artificially depressed completion rate
- [ ] Tiles match the dashboard's existing visual language (incl. dark mode)
- [ ] Zero-review course renders a sane empty/zero state rather than an error or NaN

# 03 — Single-course revenue chart with range toggle

**What to build:** A new top-level Analytics page at `/instructor/analytics` (sidebar item below "My Courses", added to `app/components/sidebar.tsx`), not a tab inside `instructor.$courseId.tsx`. An instructor with exactly one course opens this page (no per-course navigation required) and sees a revenue-over-time chart with a 7d/30d/90d range toggle. The chart matches the rest of the dashboard's visual language (spacing, card style, dark mode) — no bespoke styling — and renders honestly: a brand-new or low-activity course shows sparse/near-empty data as-is, with no interpolated or smoothed line implying a trend that isn't there.

**Revision note:** this was originally built as a tab inside `instructor.$courseId.tsx`. That shipped, but turned out not to be discoverable — instructors expected an Analytics entry point directly under "My Courses," not behind a specific course's edit screen. The course-editor tab should be removed once the top-level page replaces it (see ticket 04, which also moves).

This is the common case (single course) and is not gated behind or aware of the multi-course grid (ticket 05) — that's a separate, later slice.

**Blocked by:** 01 (chart wrapper must render safely under SSR), 02 (revenue-by-range function)

**Status:** ready-for-agent

- [ ] New route `instructor/analytics` (`app/routes/instructor.analytics.tsx`) added, linked from the sidebar directly below "My Courses"
- [ ] For a single-course instructor, the page renders a revenue chart using the shadcn chart wrapper from ticket 01, backed by ticket 02's revenue-by-range function
- [ ] 7d/30d/90d range toggle works and re-renders the chart with the correct data for each range
- [ ] Visual style (spacing, cards, dark mode) matches the rest of the instructor dashboard
- [ ] A sparse/new course renders its true (sparse) data without any fabricated trend line
- [ ] The old Analytics tab inside `instructor.$courseId.tsx` is removed (superseded by this page)
- [ ] Verified in both light and dark mode

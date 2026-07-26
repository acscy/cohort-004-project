# 03 — Single-course revenue chart with range toggle

**What to build:** An instructor with exactly one course can open their course editor (`instructor.$courseId.tsx`) and see, alongside the existing per-student progress/quiz view, a revenue-over-time chart with a 7d/30d/90d range toggle. The chart matches the rest of the dashboard's visual language (spacing, card style, dark mode) — no bespoke styling — and renders honestly: a brand-new or low-activity course shows sparse/near-empty data as-is, with no interpolated or smoothed line implying a trend that isn't there.

This is the common case (single course) and is not gated behind or aware of the multi-course grid (ticket 05) — that's a separate, later slice.

**Blocked by:** 01 (chart wrapper must render safely under SSR), 02 (revenue-by-range function)

**Status:** ready-for-agent

- [ ] New analytics section added to `instructor.$courseId.tsx`, visible alongside the existing per-student view
- [ ] Revenue chart renders using the shadcn chart wrapper from ticket 01, backed by ticket 02's revenue-by-range function
- [ ] 7d/30d/90d range toggle works and re-renders the chart with the correct data for each range
- [ ] Visual style (spacing, cards, dark mode) matches the rest of the instructor dashboard
- [ ] A sparse/new course renders its true (sparse) data without any fabricated trend line
- [ ] Verified in both light and dark mode

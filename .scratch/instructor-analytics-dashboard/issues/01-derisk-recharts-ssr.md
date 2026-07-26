# 01 — Prefactor: De-risk Recharts + shadcn chart wrapper under SSR

**What to build:** Confirm whether Recharts' `ResponsiveContainer` (which measures its container client-side) causes a 0-width flash on first paint under this app's React Router 7 SSR setup, and resolve it if it does — before any real chart depends on it.

Add `recharts` as a dependency and add shadcn's `chart` wrapper component (a copy-pasted component, not a separate package) into `app/components/ui/`. Build a throwaway chart on a scratch route to verify it renders correctly on first paint, in both light and dark mode. If a flash is found, resolve it here (e.g. `min-width`, skeleton, deferred mount) rather than leaving it for later tickets to trip over. Delete the scratch route/component once confirmed; keep the dependency and the wrapper.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `recharts` is added as a project dependency
- [ ] shadcn `chart` wrapper component is added to `app/components/ui/` and wired to the app's existing CSS theme tokens (light + dark)
- [ ] A throwaway chart has been verified to render with no 0-width flash on first paint under SSR, in both color modes
- [ ] Any flash found is resolved at this stage (documented fix, e.g. min-width/skeleton/deferred mount)
- [ ] Scratch route/component used for verification is deleted; only the dependency + wrapper remain

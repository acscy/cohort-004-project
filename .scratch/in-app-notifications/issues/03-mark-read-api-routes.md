# 03 — Mark-read API routes

**What to build:** The two mutation routes the notification dropdown will call via `useFetcher`, following the `api.video-tracking.ts` pattern (zod-validated body, `getCurrentUserId`, 401 when unauthenticated).

- `POST /api/notifications/mark-read` — body `{ notificationId: number }`. Requires an authenticated session; 401 otherwise. Only marks the notification read if it belongs to the current user (use `recipientUserId` to check, not just the raw id).
- `POST /api/notifications/mark-all-read` — no body needed. Requires an authenticated session; marks every notification for the current user as read.
- Register both in `app/routes.ts` next to the other `api/*` routes.

**Blocked by:** 01 — notifications schema + service

**Status:** ready-for-agent

- [ ] `routes/api.notifications.mark-read.ts` marks a single notification read, 401s when unauthenticated, and does not let a user mark another user's notification as read
- [ ] `routes/api.notifications.mark-all-read.ts` marks all of the current user's notifications read, 401s when unauthenticated
- [ ] Both routes registered in `app/routes.ts`

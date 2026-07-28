# 01 — `notifications` schema + `notificationService.ts`

**What to build:** The data layer that backs the whole feature, verifiable on its own before anything wires into it — following the existing `enrollmentService.ts` / `progressService.ts` pattern (plain functions, positional parameters, direct Drizzle queries, vitest tests).

- Add a `notifications` table to `app/db/schema.ts`: `id` (autoincrement PK), `recipientUserId` (FK → `users.id`), `type` (`text().$type<NotificationType>()`), `title`, `message`, `linkUrl`, `isRead` (`integer({ mode: "boolean" })`, default `false`), `createdAt` (ISO string, `$defaultFn`) — same shape as `enrollments`/`lessonProgress`.
- Add a `NotificationType` enum to `schema.ts` (same style as `UserRole`/`CourseStatus`) starting with `Enrollment = "enrollment"`.
- Generate the migration (`pnpm db:generate`).
- `notificationService.ts` exports:
  - `createNotification(recipientUserId, type, title, message, linkUrl)`
  - `getNotifications(userId, limit, offset)` — newest first
  - `getUnreadCount(userId)`
  - `markAsRead(notificationId)`
  - `markAllAsRead(userId)`

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `notifications` table and `NotificationType` enum added to `app/db/schema.ts`, migration generated
- [ ] `notificationService.ts` exports `createNotification`, `getNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`
- [ ] Tests cover: creating a notification with all fields, ordering/limit/offset on `getNotifications`, unread count, marking one notification read, marking all of a user's notifications read
- [ ] A test confirms notifications are user-scoped — user A cannot see or mark-read user B's notifications
- [ ] Tests follow the existing setup from `app/test/setup.ts` (mock `~/db`, seed in `beforeEach`), matching `enrollmentService.test.ts` style

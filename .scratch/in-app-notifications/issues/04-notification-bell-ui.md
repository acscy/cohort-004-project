# 04 — `NotificationBell` in the sidebar

**What to build:** The demoable end-to-end slice — an instructor can see, open, read, and clear their notifications from the sidebar, with no full-page reloads.

- `layout.app.tsx` loader: for instructor users, fetch `getUnreadCount` and the 5 most recent notifications (`getNotifications(userId, 5, 0)`); pass through to `Sidebar`, same shape as the existing `recentCourses`/`isTeamAdmin` props.
- New `NotificationBell` component, rendered in the sidebar header row next to the "Cadence" logo (`app/components/sidebar.tsx`, the `flex h-14 items-center border-b ... px-4` div), visible only when `currentUser.role === UserRole.Instructor`.
  - Bell icon (lucide `Bell`) with a red unread-count badge; badge hidden when count is 0.
  - Click opens a dropdown listing the 5 notifications: title, message, relative time, unread/read visually distinct.
  - Clicking a notification: `useFetcher` POST to `/api/notifications/mark-read`, then navigate to its `linkUrl`.
  - "Mark all as read" button: `useFetcher` POST to `/api/notifications/mark-all-read`.
  - Empty state: "No notifications" when the list is empty.

**Blocked by:** 01 (data layer), 02 (real notifications exist to show), 03 (mark-read routes to call)

**Status:** ready-for-agent

- [ ] `layout.app.tsx` loader supplies unread count + 5 most recent notifications for instructor users only
- [ ] `NotificationBell` renders in the sidebar header, instructor-only — students and admins never see it
- [ ] Unread badge shows the count and is hidden at 0
- [ ] Dropdown shows the 5 most recent notifications with a visible unread/read distinction
- [ ] Clicking a notification marks it read via fetcher (no full page reload) and navigates to its `linkUrl`
- [ ] "Mark all as read" clears all unread notifications and updates the badge without a full reload
- [ ] Empty state shows "No notifications"

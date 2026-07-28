# 02 — Enrolling a student notifies the instructor

**What to build:** The vertical slice that makes notifications real data, not just a schema — when `enrollUser()` in `enrollmentService.ts` succeeds, it creates a notification for the course's instructor.

- After the enrollment insert succeeds, look up the course (for `instructorId` and `title`) and the enrolling user (for `name`).
- Call `createNotification()` with: `recipientUserId` = course's `instructorId`, `type` = `NotificationType.Enrollment`, `title` = `"New Enrollment"`, `message` = `"{studentName} enrolled in {courseTitle}"`, `linkUrl` = `/instructor/{courseId}/students`.
- This only needs to fire on the success path — `enrollUser()` already throws before the insert if validation fails.

**Blocked by:** 01 — notifications schema + service

**Status:** ready-for-agent

- [ ] `enrollUser()` creates a notification for the course's instructor after a successful enrollment, with the exact `type`/`title`/`message`/`linkUrl` shape above
- [ ] `enrollmentService.test.ts` has a test: enrolling a student produces a notification for the instructor with the correct fields
- [ ] No notification is created when enrollment fails validation (duplicate enrollment, missing course)

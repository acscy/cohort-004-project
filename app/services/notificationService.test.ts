import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

// Import after mock so the module picks up our test db
import {
  createNotification,
  getNotifications,
  getNotificationById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "./notificationService";

describe("notificationService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("createNotification", () => {
    it("creates a notification with all fields", () => {
      const notification = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Jane Doe enrolled in Test Course",
        "/instructor/1/students"
      );

      expect(notification).toBeDefined();
      expect(notification.recipientUserId).toBe(base.instructor.id);
      expect(notification.type).toBe(schema.NotificationType.Enrollment);
      expect(notification.title).toBe("New Enrollment");
      expect(notification.message).toBe("Jane Doe enrolled in Test Course");
      expect(notification.linkUrl).toBe("/instructor/1/students");
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeDefined();
    });
  });

  describe("getNotifications", () => {
    it("returns notifications for a user, newest first", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "First",
        "First message",
        "/link-1"
      );
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "Second",
        "Second message",
        "/link-2"
      );

      const result = getNotifications(base.instructor.id, 10, 0);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Second");
      expect(result[1].title).toBe("First");
    });

    it("respects limit and offset", () => {
      for (let i = 0; i < 5; i++) {
        createNotification(
          base.instructor.id,
          schema.NotificationType.Enrollment,
          `Notification ${i}`,
          "message",
          "/link"
        );
      }

      const firstPage = getNotifications(base.instructor.id, 2, 0);
      expect(firstPage).toHaveLength(2);
      expect(firstPage[0].title).toBe("Notification 4");
      expect(firstPage[1].title).toBe("Notification 3");

      const secondPage = getNotifications(base.instructor.id, 2, 2);
      expect(secondPage).toHaveLength(2);
      expect(secondPage[0].title).toBe("Notification 2");
      expect(secondPage[1].title).toBe("Notification 1");
    });

    it("only returns notifications for the given user", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "For instructor",
        "message",
        "/link"
      );
      createNotification(
        base.user.id,
        schema.NotificationType.Enrollment,
        "For student",
        "message",
        "/link"
      );

      const result = getNotifications(base.instructor.id, 10, 0);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("For instructor");
    });

    it("returns empty array when user has no notifications", () => {
      expect(getNotifications(base.instructor.id, 10, 0)).toHaveLength(0);
    });
  });

  describe("getNotificationById", () => {
    it("returns the notification by id", () => {
      const created = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "First",
        "message",
        "/link"
      );

      const found = getNotificationById(created.id);
      expect(found?.id).toBe(created.id);
    });

    it("returns undefined for a non-existent id", () => {
      expect(getNotificationById(9999)).toBeUndefined();
    });
  });

  describe("getUnreadCount", () => {
    it("returns the count of unread notifications", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "First",
        "message",
        "/link"
      );
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "Second",
        "message",
        "/link"
      );

      expect(getUnreadCount(base.instructor.id)).toBe(2);
    });

    it("does not count read notifications", () => {
      const notification = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "First",
        "message",
        "/link"
      );
      markAsRead(notification.id);

      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });

    it("returns 0 when user has no notifications", () => {
      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });

    it("is scoped to the given user", () => {
      createNotification(
        base.user.id,
        schema.NotificationType.Enrollment,
        "For student",
        "message",
        "/link"
      );

      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });
  });

  describe("markAsRead", () => {
    it("marks a single notification as read", () => {
      const notification = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "First",
        "message",
        "/link"
      );

      const result = markAsRead(notification.id);
      expect(result.isRead).toBe(true);
    });

    it("does not affect other notifications", () => {
      const first = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "First",
        "message",
        "/link"
      );
      const second = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "Second",
        "message",
        "/link"
      );

      markAsRead(first.id);

      expect(getUnreadCount(base.instructor.id)).toBe(1);
      const notifications = getNotifications(base.instructor.id, 10, 0);
      const unread = notifications.find((n) => n.id === second.id);
      expect(unread?.isRead).toBe(false);
    });
  });

  describe("markAllAsRead", () => {
    it("marks all of a user's notifications as read", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "First",
        "message",
        "/link"
      );
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "Second",
        "message",
        "/link"
      );

      markAllAsRead(base.instructor.id);

      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });

    it("does not mark another user's notifications as read", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "For instructor",
        "message",
        "/link"
      );
      createNotification(
        base.user.id,
        schema.NotificationType.Enrollment,
        "For student",
        "message",
        "/link"
      );

      markAllAsRead(base.instructor.id);

      expect(getUnreadCount(base.user.id)).toBe(1);
    });
  });
});

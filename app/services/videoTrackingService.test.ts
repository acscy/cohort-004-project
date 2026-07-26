import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
  logWatchEvent,
  getWatchEvents,
  getLastWatchPosition,
  getWatchEventCount,
  getMaxWatchPosition,
  calculateWatchProgress,
  hasUserWatchedVideo,
  hasUserCompletedVideo,
  getUserWatchHistory,
  deleteWatchEvents,
} from "./videoTrackingService";

function createLessonFixture(opts: { courseId: number }) {
  const mod = testDb
    .insert(schema.modules)
    .values({ courseId: opts.courseId, title: "Module 1", position: 1 })
    .returning()
    .get();

  return testDb
    .insert(schema.lessons)
    .values({ moduleId: mod.id, title: "Lesson 1", position: 1 })
    .returning()
    .get();
}

describe("videoTrackingService", () => {
  let lessonId: number;

  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
    lessonId = createLessonFixture({ courseId: base.course.id }).id;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("logWatchEvent", () => {
    it("records a watch event", () => {
      const event = logWatchEvent(base.user.id, lessonId, "progress", 42);

      expect(event).toBeDefined();
      expect(event.userId).toBe(base.user.id);
      expect(event.lessonId).toBe(lessonId);
      expect(event.eventType).toBe("progress");
      expect(event.positionSeconds).toBe(42);
    });
  });

  describe("getWatchEvents", () => {
    it("returns events ordered by creation time", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
      logWatchEvent(base.user.id, lessonId, "progress", 10);
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 1));
      logWatchEvent(base.user.id, lessonId, "progress", 20);

      const events = getWatchEvents(base.user.id, lessonId);
      expect(events).toHaveLength(2);
      expect(events[0].positionSeconds).toBe(10);
      expect(events[1].positionSeconds).toBe(20);
    });

    it("returns an empty array when no events exist", () => {
      expect(getWatchEvents(base.user.id, lessonId)).toEqual([]);
    });
  });

  describe("getLastWatchPosition", () => {
    it("returns the position of the most recently logged event", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
      logWatchEvent(base.user.id, lessonId, "progress", 10);
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 1));
      logWatchEvent(base.user.id, lessonId, "progress", 30);

      expect(getLastWatchPosition(base.user.id, lessonId)).toBe(30);
    });

    it("returns 0 when there are no events", () => {
      expect(getLastWatchPosition(base.user.id, lessonId)).toBe(0);
    });
  });

  describe("getWatchEventCount", () => {
    it("counts events for a user/lesson pair", () => {
      logWatchEvent(base.user.id, lessonId, "progress", 10);
      logWatchEvent(base.user.id, lessonId, "progress", 20);

      expect(getWatchEventCount(base.user.id, lessonId)).toBe(2);
    });

    it("returns 0 when there are no events", () => {
      expect(getWatchEventCount(base.user.id, lessonId)).toBe(0);
    });
  });

  describe("getMaxWatchPosition", () => {
    it("returns the highest position reached, regardless of log order", () => {
      logWatchEvent(base.user.id, lessonId, "progress", 50);
      logWatchEvent(base.user.id, lessonId, "progress", 20);

      expect(getMaxWatchPosition(base.user.id, lessonId)).toBe(50);
    });

    it("returns 0 when there are no events", () => {
      expect(getMaxWatchPosition(base.user.id, lessonId)).toBe(0);
    });
  });

  describe("calculateWatchProgress", () => {
    it("calculates the percentage of the video watched", () => {
      logWatchEvent(base.user.id, lessonId, "progress", 30);

      expect(calculateWatchProgress(base.user.id, lessonId, 60)).toBe(50);
    });

    it("caps progress at 100", () => {
      logWatchEvent(base.user.id, lessonId, "progress", 120);

      expect(calculateWatchProgress(base.user.id, lessonId, 60)).toBe(100);
    });

    it("returns 0 when the video duration is 0", () => {
      expect(calculateWatchProgress(base.user.id, lessonId, 0)).toBe(0);
    });
  });

  describe("hasUserWatchedVideo", () => {
    it("returns true once an event has been logged", () => {
      logWatchEvent(base.user.id, lessonId, "progress", 5);
      expect(hasUserWatchedVideo(base.user.id, lessonId)).toBe(true);
    });

    it("returns false when no events exist", () => {
      expect(hasUserWatchedVideo(base.user.id, lessonId)).toBe(false);
    });
  });

  describe("hasUserCompletedVideo", () => {
    it("returns true when watch progress meets the completion threshold", () => {
      logWatchEvent(base.user.id, lessonId, "progress", 55);
      expect(hasUserCompletedVideo(base.user.id, lessonId, 60, 90)).toBe(true);
    });

    it("returns false when watch progress is below the completion threshold", () => {
      logWatchEvent(base.user.id, lessonId, "progress", 10);
      expect(hasUserCompletedVideo(base.user.id, lessonId, 60, 90)).toBe(
        false
      );
    });
  });

  describe("getUserWatchHistory", () => {
    it("aggregates watch stats per lesson", () => {
      logWatchEvent(base.user.id, lessonId, "progress", 10);
      logWatchEvent(base.user.id, lessonId, "progress", 20);

      const history = getUserWatchHistory(base.user.id);
      expect(history).toHaveLength(1);
      expect(history[0].lessonId).toBe(lessonId);
      expect(history[0].eventCount).toBe(2);
      expect(history[0].lastPosition).toBe(20);
    });

    it("returns an empty array when the user has no watch events", () => {
      expect(getUserWatchHistory(base.user.id)).toEqual([]);
    });
  });

  describe("deleteWatchEvents", () => {
    it("deletes all watch events for a user/lesson pair", () => {
      logWatchEvent(base.user.id, lessonId, "progress", 10);
      logWatchEvent(base.user.id, lessonId, "progress", 20);

      const deleted = deleteWatchEvents(base.user.id, lessonId);
      expect(deleted).toHaveLength(2);
      expect(getWatchEvents(base.user.id, lessonId)).toEqual([]);
    });
  });
});

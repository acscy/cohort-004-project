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
  toggleBookmark,
  isLessonBookmarked,
  getBookmarkedLessonIds,
} from "./bookmarkService";

function createModuleWithLessons(opts: {
  courseId: number;
  moduleTitle: string;
  position: number;
  lessonCount: number;
}) {
  const { courseId, moduleTitle, position, lessonCount } = opts;
  const mod = testDb
    .insert(schema.modules)
    .values({
      courseId,
      title: moduleTitle,
      position,
    })
    .returning()
    .get();

  const createdLessons = [];
  for (let i = 0; i < lessonCount; i++) {
    const lesson = testDb
      .insert(schema.lessons)
      .values({
        moduleId: mod.id,
        title: `Lesson ${i + 1}`,
        position: i + 1,
      })
      .returning()
      .get();
    createdLessons.push(lesson);
  }

  return { module: mod, lessons: createdLessons };
}

describe("bookmarkService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("toggleBookmark", () => {
    it("creates a bookmark when none exists", () => {
      const { lessons } = createModuleWithLessons({
        courseId: base.course.id,
        moduleTitle: "Module 1",
        position: 1,
        lessonCount: 1,
      });

      const result = toggleBookmark({
        userId: base.user.id,
        lessonId: lessons[0].id,
      });

      expect(result).toEqual({ bookmarked: true });
      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lessons[0].id })
      ).toBe(true);
    });

    it("removes the bookmark when one already exists", () => {
      const { lessons } = createModuleWithLessons({
        courseId: base.course.id,
        moduleTitle: "Module 1",
        position: 1,
        lessonCount: 1,
      });
      toggleBookmark({ userId: base.user.id, lessonId: lessons[0].id });

      const result = toggleBookmark({
        userId: base.user.id,
        lessonId: lessons[0].id,
      });

      expect(result).toEqual({ bookmarked: false });
      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lessons[0].id })
      ).toBe(false);
    });

    it("keeps bookmarks private per user", () => {
      const { lessons } = createModuleWithLessons({
        courseId: base.course.id,
        moduleTitle: "Module 1",
        position: 1,
        lessonCount: 1,
      });
      toggleBookmark({ userId: base.user.id, lessonId: lessons[0].id });

      expect(
        isLessonBookmarked({
          userId: base.instructor.id,
          lessonId: lessons[0].id,
        })
      ).toBe(false);
    });
  });

  describe("isLessonBookmarked", () => {
    it("returns false when the lesson has no bookmark", () => {
      const { lessons } = createModuleWithLessons({
        courseId: base.course.id,
        moduleTitle: "Module 1",
        position: 1,
        lessonCount: 1,
      });
      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lessons[0].id })
      ).toBe(false);
    });
  });

  describe("getBookmarkedLessonIds", () => {
    it("returns an empty list when nothing is bookmarked", () => {
      expect(
        getBookmarkedLessonIds({
          userId: base.user.id,
          courseId: base.course.id,
        })
      ).toEqual([]);
    });

    it("returns only bookmarked lesson ids scoped to the given course", () => {
      const { lessons } = createModuleWithLessons({
        courseId: base.course.id,
        moduleTitle: "Module 1",
        position: 1,
        lessonCount: 2,
      });

      const otherCategory = testDb
        .insert(schema.categories)
        .values({ name: "Design", slug: "design" })
        .returning()
        .get();
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: otherCategory.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();
      const { lessons: otherLessons } = createModuleWithLessons({
        courseId: otherCourse.id,
        moduleTitle: "Other Module",
        position: 1,
        lessonCount: 1,
      });

      toggleBookmark({ userId: base.user.id, lessonId: lessons[0].id });
      toggleBookmark({ userId: base.user.id, lessonId: otherLessons[0].id });

      expect(
        getBookmarkedLessonIds({
          userId: base.user.id,
          courseId: base.course.id,
        })
      ).toEqual([lessons[0].id]);
    });
  });
});

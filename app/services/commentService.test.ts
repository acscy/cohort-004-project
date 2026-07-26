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
  getCommentsForLesson,
  createComment,
  getCommentById,
  softDeleteComment,
} from "./commentService";

// Helper to create a module with a lesson in the test db
function createModuleWithLessons(
  courseId: number,
  moduleTitle: string,
  position: number,
  lessonCount: number
) {
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

describe("commentService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("getCommentsForLesson", () => {
    it("returns an empty list when there are no comments", () => {
      const { lessons } = createModuleWithLessons(base.course.id, "Module 1", 1, 1);
      expect(getCommentsForLesson(lessons[0].id)).toEqual([]);
    });

    it("returns comments oldest-first with author info", () => {
      const { lessons } = createModuleWithLessons(base.course.id, "Module 1", 1, 1);
      const lessonId = lessons[0].id;

      const first = createComment(lessonId, base.user.id, "First comment");
      const second = createComment(lessonId, base.instructor.id, "Second comment");

      const result = getCommentsForLesson(lessonId);

      expect(result.map((c) => c.id)).toEqual([first.id, second.id]);
      expect(result[0].authorName).toBe(base.user.name);
      expect(result[1].authorRole).toBe(schema.UserRole.Instructor);
    });

    it("excludes soft-deleted comments", () => {
      const { lessons } = createModuleWithLessons(base.course.id, "Module 1", 1, 1);
      const lessonId = lessons[0].id;

      const comment = createComment(lessonId, base.user.id, "Will be deleted");
      softDeleteComment(comment.id, base.instructor.id);

      expect(getCommentsForLesson(lessonId)).toEqual([]);
    });
  });

  describe("createComment", () => {
    it("creates a comment with a null parentCommentId by default", () => {
      const { lessons } = createModuleWithLessons(base.course.id, "Module 1", 1, 1);
      const comment = createComment(lessons[0].id, base.user.id, "Hello");

      expect(comment.body).toBe("Hello");
      expect(comment.parentCommentId).toBeNull();
      expect(comment.deletedAt).toBeNull();
    });
  });

  describe("softDeleteComment", () => {
    it("sets deletedAt/deletedBy but preserves the row for audit purposes", () => {
      const { lessons } = createModuleWithLessons(base.course.id, "Module 1", 1, 1);
      const lessonId = lessons[0].id;
      const comment = createComment(lessonId, base.user.id, "Delete me");

      softDeleteComment(comment.id, base.instructor.id);

      expect(getCommentsForLesson(lessonId)).toEqual([]);

      const stillExists = getCommentById(comment.id);
      expect(stillExists).toBeDefined();
      expect(stillExists!.deletedAt).not.toBeNull();
      expect(stillExists!.deletedBy).toBe(base.instructor.id);
    });
  });
});

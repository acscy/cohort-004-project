import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "~/db";
import { comments, users } from "~/db/schema";

// ─── Comment Service ───
// Handles lesson comments: flat list (oldest-first) in v1, with a nullable
// parentCommentId already in the schema for future threading. Soft-delete only
// (deletedAt/deletedBy) — permission checks happen at the route layer, not here.
// Uses positional parameters (project convention).

export function getCommentsForLesson(lessonId: number) {
  return db
    .select({
      id: comments.id,
      lessonId: comments.lessonId,
      userId: comments.userId,
      parentCommentId: comments.parentCommentId,
      body: comments.body,
      createdAt: comments.createdAt,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
      authorRole: users.role,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.lessonId, lessonId), isNull(comments.deletedAt)))
    .orderBy(asc(comments.createdAt))
    .all();
}

export function createComment(lessonId: number, userId: number, body: string) {
  return db
    .insert(comments)
    .values({ lessonId, userId, body })
    .returning()
    .get();
}

export function getCommentById(id: number) {
  return db.select().from(comments).where(eq(comments.id, id)).get();
}

export function softDeleteComment(commentId: number, deletedByUserId: number) {
  return db
    .update(comments)
    .set({ deletedAt: new Date().toISOString(), deletedBy: deletedByUserId })
    .where(eq(comments.id, commentId))
    .returning()
    .get();
}

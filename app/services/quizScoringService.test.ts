import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

// getQuizStats and getUserQuizHistory open their own raw better-sqlite3
// connection to the real data.db file instead of going through the mocked
// `~/db` module, so they can't be exercised here without touching real data.
import {
  getScore,
  calculateGrade,
  computeResult,
  renderQuizResults,
} from "./quizScoringService";

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

function createQuizFixture(opts: { lessonId: number }) {
  return testDb
    .insert(schema.quizzes)
    .values({ lessonId: opts.lessonId, title: "Quiz", passingScore: 0.7 })
    .returning()
    .get();
}

function createQuestionFixture(opts: { quizId: number; position: number }) {
  return testDb
    .insert(schema.quizQuestions)
    .values({
      quizId: opts.quizId,
      questionText: "Question",
      questionType: schema.QuestionType.MultipleChoice,
      position: opts.position,
    })
    .returning()
    .get();
}

function createOptionFixture(opts: { questionId: number; isCorrect: boolean }) {
  return testDb
    .insert(schema.quizOptions)
    .values({
      questionId: opts.questionId,
      optionText: opts.isCorrect ? "Correct" : "Incorrect",
      isCorrect: opts.isCorrect,
    })
    .returning()
    .get();
}

/** Builds a quiz with `count` multiple-choice questions, each with one correct option. */
function createGradedQuiz(opts: { lessonId: number; count: number }) {
  const quiz = createQuizFixture({ lessonId: opts.lessonId });
  const questions = [];
  for (let i = 0; i < opts.count; i++) {
    const question = createQuestionFixture({ quizId: quiz.id, position: i + 1 });
    const correctOption = createOptionFixture({
      questionId: question.id,
      isCorrect: true,
    });
    const incorrectOption = createOptionFixture({
      questionId: question.id,
      isCorrect: false,
    });
    questions.push({
      question,
      correctOptionId: correctOption.id,
      incorrectOptionId: incorrectOption.id,
    });
  }
  return { quiz, questions };
}

describe("quizScoringService", () => {
  let lessonId: number;

  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
    lessonId = createLessonFixture({ courseId: base.course.id }).id;
  });

  describe("calculateGrade", () => {
    it.each([
      [0.95, "A"],
      [0.85, "B"],
      [0.75, "C"],
      [0.65, "D"],
      [0.5, "F"],
    ])("scores %s as %s", (score, expected) => {
      expect(calculateGrade(score)).toBe(expected);
    });
  });

  describe("getScore", () => {
    it("returns a zero score when the quiz does not exist", () => {
      expect(getScore(9999, [])).toEqual({
        score: 0,
        passed: false,
        grade: "F",
      });
    });

    it("scores all-correct answers as a passing A", () => {
      const { quiz, questions } = createGradedQuiz({ lessonId, count: 2 });
      const answers = questions.map((q) => ({
        questionId: q.question.id,
        selectedOptionId: q.correctOptionId,
      }));

      const result = getScore(quiz.id, answers);
      expect(result.score).toBe(1);
      expect(result.passed).toBe(true);
      expect(result.grade).toBe("A");
    });

    it("scores a mix of correct and incorrect answers", () => {
      const { quiz, questions } = createGradedQuiz({ lessonId, count: 2 });
      const answers = [
        { questionId: questions[0].question.id, selectedOptionId: questions[0].correctOptionId },
        { questionId: questions[1].question.id, selectedOptionId: questions[1].incorrectOptionId },
      ];

      const result = getScore(quiz.id, answers);
      expect(result.score).toBe(0.5);
      expect(result.passed).toBe(false);
      expect(result.grade).toBe("F");
    });

    it("does not mark a score of exactly 0.7 as passed", () => {
      const { quiz, questions } = createGradedQuiz({ lessonId, count: 10 });
      const answers = questions.map((q, i) => ({
        questionId: q.question.id,
        selectedOptionId: i < 7 ? q.correctOptionId : q.incorrectOptionId,
      }));

      const result = getScore(quiz.id, answers);
      expect(result.score).toBeCloseTo(0.7);
      expect(result.passed).toBe(false);
    });
  });

  describe("computeResult", () => {
    it("returns null when the quiz does not exist", () => {
      expect(computeResult(base.user.id, 9999, {})).toBeNull();
    });

    it("scores answers and records the attempt and answers in the db", () => {
      const { quiz, questions } = createGradedQuiz({ lessonId, count: 2 });
      const selectedAnswers: Record<number, number> = {
        [questions[0].question.id]: questions[0].correctOptionId,
        [questions[1].question.id]: questions[1].incorrectOptionId,
      };

      const result = computeResult(base.user.id, quiz.id, selectedAnswers);

      expect(result).not.toBeNull();
      expect(result!.totalCorrect).toBe(1);
      expect(result!.totalQuestions).toBe(2);
      expect(result!.score).toBe(0.5);
      expect(result!.passed).toBe(false);
      expect(result!.questionResults).toHaveLength(2);

      const attempts = testDb
        .select()
        .from(schema.quizAttempts)
        .where(eq(schema.quizAttempts.id, result!.attemptId))
        .all();
      expect(attempts).toHaveLength(1);
      expect(attempts[0].userId).toBe(base.user.id);

      const answers = testDb
        .select()
        .from(schema.quizAnswers)
        .where(eq(schema.quizAnswers.attemptId, result!.attemptId))
        .all();
      expect(answers).toHaveLength(2);
    });

    it("marks passed true and grade A when every answer is correct", () => {
      const { quiz, questions } = createGradedQuiz({ lessonId, count: 2 });
      const selectedAnswers: Record<number, number> = {
        [questions[0].question.id]: questions[0].correctOptionId,
        [questions[1].question.id]: questions[1].correctOptionId,
      };

      const result = computeResult(base.user.id, quiz.id, selectedAnswers);
      expect(result!.score).toBe(1);
      expect(result!.passed).toBe(true);
      expect(result!.grade).toBe("A");
    });

    it("leaves correctOptionId null for unanswered questions and does not record an answer row", () => {
      const { quiz, questions } = createGradedQuiz({ lessonId, count: 1 });

      const result = computeResult(base.user.id, quiz.id, {});

      expect(result!.questionResults[0]).toEqual({
        questionId: questions[0].question.id,
        correct: false,
        selectedOptionId: null,
        correctOptionId: null,
      });

      const answers = testDb
        .select()
        .from(schema.quizAnswers)
        .where(eq(schema.quizAnswers.attemptId, result!.attemptId))
        .all();
      expect(answers).toHaveLength(0);
    });
  });

  describe("renderQuizResults", () => {
    it("computes percentage and grade from score/total", () => {
      const result = renderQuizResults(9, 10, true, false, false);
      expect(result.percentage).toBeCloseTo(0.9);
      expect(result.grade).toBe("A");
      expect(result.passed).toBe(true);
      expect(result.message).toBe("Congratulations! You passed!");
    });

    it("returns a failure message when not passed", () => {
      const result = renderQuizResults(3, 10, false, false, false);
      expect(result.passed).toBe(false);
      expect(result.message).toBe("Sorry, you did not pass. Try again!");
    });

    it("only includes showAnswers/showExplanations when truthy", () => {
      const withFlags = renderQuizResults(5, 10, true, true, true);
      expect(withFlags.showAnswers).toBe(true);
      expect(withFlags.showExplanations).toBe(true);

      const withoutFlags = renderQuizResults(5, 10, true, false, false);
      expect(withoutFlags.showAnswers).toBeUndefined();
      expect(withoutFlags.showExplanations).toBeUndefined();
    });

    it("returns 0 percentage when total is 0", () => {
      const result = renderQuizResults(0, 0, false, false, false);
      expect(result.percentage).toBe(0);
      expect(result.grade).toBe("F");
    });
  });
});

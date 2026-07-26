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
  getQuizById,
  getQuizByLessonId,
  getQuizWithQuestions,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuestionById,
  getQuestionsByQuiz,
  getQuestionCount,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  moveQuestionToPosition,
  reorderQuestions,
  getOptionById,
  getOptionsByQuestion,
  createOption,
  updateOption,
  deleteOption,
  getAttemptById,
  getAttemptsByUser,
  getAttemptCountForQuiz,
  getBestAttempt,
  getLatestAttempt,
  recordAttempt,
  recordAnswer,
  getAnswersByAttempt,
  getAttemptWithAnswers,
} from "./quizService";

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

describe("quizService", () => {
  let lessonId: number;

  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
    lessonId = createLessonFixture({ courseId: base.course.id }).id;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Quiz CRUD ───

  describe("createQuiz", () => {
    it("creates a quiz for a lesson", () => {
      const quiz = createQuiz(lessonId, "Quiz 1", 0.7);

      expect(quiz).toBeDefined();
      expect(quiz.lessonId).toBe(lessonId);
      expect(quiz.title).toBe("Quiz 1");
      expect(quiz.passingScore).toBe(0.7);
    });
  });

  describe("getQuizById", () => {
    it("returns a quiz by id", () => {
      const created = createQuiz(lessonId, "Quiz 1", 0.7);
      expect(getQuizById(created.id)?.title).toBe("Quiz 1");
    });

    it("returns undefined for a non-existent id", () => {
      expect(getQuizById(9999)).toBeUndefined();
    });
  });

  describe("getQuizByLessonId", () => {
    it("returns the quiz attached to a lesson", () => {
      createQuiz(lessonId, "Quiz 1", 0.7);
      expect(getQuizByLessonId(lessonId)?.title).toBe("Quiz 1");
    });

    it("returns undefined when the lesson has no quiz", () => {
      expect(getQuizByLessonId(lessonId)).toBeUndefined();
    });
  });

  describe("getQuizWithQuestions", () => {
    it("returns null for a non-existent quiz", () => {
      expect(getQuizWithQuestions(9999)).toBeNull();
    });

    it("returns a quiz with its questions and options nested", () => {
      const quiz = createQuiz(lessonId, "Quiz 1", 0.7);
      const question = createQuestion(
        quiz.id,
        "What is 2+2?",
        schema.QuestionType.MultipleChoice,
        null
      );
      createOption(question.id, "3", false);
      createOption(question.id, "4", true);

      const result = getQuizWithQuestions(quiz.id);
      expect(result!.questions).toHaveLength(1);
      expect(result!.questions[0].options).toHaveLength(2);
    });
  });

  describe("updateQuiz", () => {
    it("updates the title when provided", () => {
      const quiz = createQuiz(lessonId, "Old Title", 0.7);
      const updated = updateQuiz(quiz.id, "New Title", null);

      expect(updated!.title).toBe("New Title");
      expect(updated!.passingScore).toBe(0.7);
    });

    it("updates the passing score when provided", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const updated = updateQuiz(quiz.id, null, 0.9);

      expect(updated!.passingScore).toBe(0.9);
    });

    it("returns the quiz unchanged when both fields are null", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const result = updateQuiz(quiz.id, null, null);

      expect(result!.title).toBe("Quiz");
    });
  });

  describe("deleteQuiz", () => {
    it("cascades delete to questions, options, attempts, and answers", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        null
      );
      createOption(question.id, "A", true);
      const attempt = recordAttempt(base.user.id, quiz.id, 1, true);
      recordAnswer(attempt.id, question.id, 1);

      deleteQuiz(quiz.id);

      expect(getQuizById(quiz.id)).toBeUndefined();
      expect(getQuestionById(question.id)).toBeUndefined();
      expect(getAttemptById(attempt.id)).toBeUndefined();
    });
  });

  // ─── Question Management ───

  describe("createQuestion", () => {
    it("creates a question with an explicit position", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.TrueFalse,
        1
      );

      expect(question.quizId).toBe(quiz.id);
      expect(question.questionType).toBe(schema.QuestionType.TrueFalse);
      expect(question.position).toBe(1);
    });

    it("auto-calculates position when null", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      createQuestion(quiz.id, "Q1", schema.QuestionType.MultipleChoice, null);
      const q2 = createQuestion(
        quiz.id,
        "Q2",
        schema.QuestionType.MultipleChoice,
        null
      );

      expect(q2.position).toBe(2);
    });
  });

  describe("getQuestionsByQuiz", () => {
    it("returns questions ordered by position", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      createQuestion(quiz.id, "Third", schema.QuestionType.MultipleChoice, 3);
      createQuestion(quiz.id, "First", schema.QuestionType.MultipleChoice, 1);

      const questions = getQuestionsByQuiz(quiz.id);
      expect(questions[0].questionText).toBe("First");
      expect(questions[1].questionText).toBe("Third");
    });
  });

  describe("getQuestionCount", () => {
    it("counts questions for a quiz", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      createQuestion(quiz.id, "Q1", schema.QuestionType.MultipleChoice, 1);
      createQuestion(quiz.id, "Q2", schema.QuestionType.MultipleChoice, 2);

      expect(getQuestionCount(quiz.id)).toBe(2);
    });

    it("returns 0 for a quiz with no questions", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      expect(getQuestionCount(quiz.id)).toBe(0);
    });
  });

  describe("updateQuestion", () => {
    it("updates question text when provided", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Old",
        schema.QuestionType.MultipleChoice,
        1
      );

      const updated = updateQuestion(question.id, "New", null);
      expect(updated!.questionText).toBe("New");
      expect(updated!.questionType).toBe(schema.QuestionType.MultipleChoice);
    });

    it("updates question type when provided", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        1
      );

      const updated = updateQuestion(
        question.id,
        null,
        schema.QuestionType.TrueFalse
      );
      expect(updated!.questionType).toBe(schema.QuestionType.TrueFalse);
    });
  });

  describe("deleteQuestion", () => {
    it("deletes a question and its options", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        1
      );
      const option = createOption(question.id, "A", true);

      deleteQuestion(question.id);

      expect(getQuestionById(question.id)).toBeUndefined();
      expect(getOptionById(option.id)).toBeUndefined();
    });
  });

  // ─── Question Reordering ───

  describe("moveQuestionToPosition", () => {
    it("moves a question down and shifts the ones in between up", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const q1 = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        1
      );
      createQuestion(quiz.id, "Q2", schema.QuestionType.MultipleChoice, 2);
      createQuestion(quiz.id, "Q3", schema.QuestionType.MultipleChoice, 3);

      moveQuestionToPosition(q1.id, 3);

      const questions = getQuestionsByQuiz(quiz.id);
      expect(questions[0].questionText).toBe("Q2");
      expect(questions[1].questionText).toBe("Q3");
      expect(questions[2].questionText).toBe("Q1");
    });

    it("moves a question up and shifts the ones in between down", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      createQuestion(quiz.id, "Q1", schema.QuestionType.MultipleChoice, 1);
      createQuestion(quiz.id, "Q2", schema.QuestionType.MultipleChoice, 2);
      const q3 = createQuestion(
        quiz.id,
        "Q3",
        schema.QuestionType.MultipleChoice,
        3
      );

      moveQuestionToPosition(q3.id, 1);

      const questions = getQuestionsByQuiz(quiz.id);
      expect(questions[0].questionText).toBe("Q3");
      expect(questions[1].questionText).toBe("Q1");
      expect(questions[2].questionText).toBe("Q2");
    });

    it("returns null for a non-existent question", () => {
      expect(moveQuestionToPosition(9999, 1)).toBeNull();
    });
  });

  describe("reorderQuestions", () => {
    it("reorders questions according to the given id array", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const q1 = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        1
      );
      const q2 = createQuestion(
        quiz.id,
        "Q2",
        schema.QuestionType.MultipleChoice,
        2
      );

      const result = reorderQuestions(quiz.id, [q2.id, q1.id]);

      expect(result[0].questionText).toBe("Q2");
      expect(result[0].position).toBe(1);
      expect(result[1].questionText).toBe("Q1");
      expect(result[1].position).toBe(2);
    });
  });

  // ─── Option Management ───

  describe("createOption / getOptionsByQuestion", () => {
    it("creates options for a question", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        1
      );

      createOption(question.id, "A", false);
      createOption(question.id, "B", true);

      const options = getOptionsByQuestion(question.id);
      expect(options).toHaveLength(2);
      expect(options.find((o) => o.optionText === "B")!.isCorrect).toBe(true);
    });
  });

  describe("updateOption", () => {
    it("updates option text and correctness independently", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        1
      );
      const option = createOption(question.id, "Old", false);

      const updated = updateOption(option.id, "New", true);
      expect(updated!.optionText).toBe("New");
      expect(updated!.isCorrect).toBe(true);
    });
  });

  describe("deleteOption", () => {
    it("deletes an option", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        1
      );
      const option = createOption(question.id, "A", true);

      deleteOption(option.id);
      expect(getOptionById(option.id)).toBeUndefined();
    });
  });

  // ─── Attempt Recording ───

  describe("recordAttempt / getAttemptsByUser", () => {
    it("records an attempt scoped to a user and quiz", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      recordAttempt(base.user.id, quiz.id, 0.8, true);

      const attempts = getAttemptsByUser(base.user.id, quiz.id);
      expect(attempts).toHaveLength(1);
      expect(attempts[0].score).toBe(0.8);
      expect(attempts[0].passed).toBe(true);
    });
  });

  describe("getAttemptCountForQuiz", () => {
    it("counts attempts across all users", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      recordAttempt(base.user.id, quiz.id, 0.5, false);
      recordAttempt(base.instructor.id, quiz.id, 0.9, true);

      expect(getAttemptCountForQuiz(quiz.id)).toBe(2);
    });
  });

  describe("getBestAttempt", () => {
    it("returns the highest-scoring attempt", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      recordAttempt(base.user.id, quiz.id, 0.5, false);
      recordAttempt(base.user.id, quiz.id, 0.9, true);
      recordAttempt(base.user.id, quiz.id, 0.7, false);

      expect(getBestAttempt(base.user.id, quiz.id)?.score).toBe(0.9);
    });

    it("returns undefined when there are no attempts", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      expect(getBestAttempt(base.user.id, quiz.id)).toBeUndefined();
    });
  });

  describe("getLatestAttempt", () => {
    it("returns the most recently recorded attempt", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);

      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
      recordAttempt(base.user.id, quiz.id, 0.5, false);
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 1));
      const second = recordAttempt(base.user.id, quiz.id, 0.9, true);

      expect(getLatestAttempt(base.user.id, quiz.id)?.id).toBe(second.id);
    });
  });

  describe("recordAnswer / getAnswersByAttempt", () => {
    it("records answers tied to an attempt", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        1
      );
      const option = createOption(question.id, "A", true);
      const attempt = recordAttempt(base.user.id, quiz.id, 1, true);

      recordAnswer(attempt.id, question.id, option.id);

      const answers = getAnswersByAttempt(attempt.id);
      expect(answers).toHaveLength(1);
      expect(answers[0].selectedOptionId).toBe(option.id);
    });
  });

  describe("getAttemptWithAnswers", () => {
    it("returns an attempt with its answers nested", () => {
      const quiz = createQuiz(lessonId, "Quiz", 0.7);
      const question = createQuestion(
        quiz.id,
        "Q1",
        schema.QuestionType.MultipleChoice,
        1
      );
      const option = createOption(question.id, "A", true);
      const attempt = recordAttempt(base.user.id, quiz.id, 1, true);
      recordAnswer(attempt.id, question.id, option.id);

      const result = getAttemptWithAnswers(attempt.id);
      expect(result!.answers).toHaveLength(1);
    });

    it("returns null for a non-existent attempt", () => {
      expect(getAttemptWithAnswers(9999)).toBeNull();
    });
  });
});

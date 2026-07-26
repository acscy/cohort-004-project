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
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUsersByRole,
  createUser,
  updateUser,
  updateUserRole,
} from "./userService";

describe("userService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("createUser", () => {
    it("creates a user with the given fields", () => {
      const user = createUser(
        "Jane Doe",
        "jane@example.com",
        schema.UserRole.Student,
        "https://example.com/avatar.png"
      );

      expect(user).toBeDefined();
      expect(user.name).toBe("Jane Doe");
      expect(user.email).toBe("jane@example.com");
      expect(user.role).toBe(schema.UserRole.Student);
      expect(user.avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("allows a null avatar url", () => {
      const user = createUser(
        "No Avatar",
        "noavatar@example.com",
        schema.UserRole.Student,
        null
      );

      expect(user.avatarUrl).toBeNull();
    });
  });

  describe("getUserById", () => {
    it("returns a user by id", () => {
      expect(getUserById(base.user.id)?.email).toBe(base.user.email);
    });

    it("returns undefined for a non-existent id", () => {
      expect(getUserById(9999)).toBeUndefined();
    });
  });

  describe("getUserByEmail", () => {
    it("returns a user by email", () => {
      expect(getUserByEmail(base.user.email)?.id).toBe(base.user.id);
    });

    it("returns undefined for an unknown email", () => {
      expect(getUserByEmail("nobody@example.com")).toBeUndefined();
    });
  });

  describe("getAllUsers", () => {
    it("returns every user in the database", () => {
      const users = getAllUsers();
      expect(users).toHaveLength(2); // base.user + base.instructor
    });
  });

  describe("getUsersByRole", () => {
    it("returns only users with the given role", () => {
      const students = getUsersByRole(schema.UserRole.Student);
      expect(students).toHaveLength(1);
      expect(students[0].id).toBe(base.user.id);
    });

    it("returns an empty array when no users have the role", () => {
      expect(getUsersByRole(schema.UserRole.Admin)).toEqual([]);
    });
  });

  describe("updateUser", () => {
    it("updates name, email, and bio", () => {
      const updated = updateUser(
        base.user.id,
        "New Name",
        "new@example.com",
        "New bio"
      );

      expect(updated.name).toBe("New Name");
      expect(updated.email).toBe("new@example.com");
      expect(updated.bio).toBe("New bio");
    });

    it("can clear the bio by passing null", () => {
      updateUser(base.user.id, "Name", "email@example.com", "Some bio");
      const updated = updateUser(
        base.user.id,
        "Name",
        "email@example.com",
        null
      );

      expect(updated.bio).toBeNull();
    });
  });

  describe("updateUserRole", () => {
    it("updates only the role", () => {
      const updated = updateUserRole(base.user.id, schema.UserRole.Instructor);

      expect(updated.role).toBe(schema.UserRole.Instructor);
      expect(updated.name).toBe(base.user.name);
    });
  });
});

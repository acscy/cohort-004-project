---
name: do-work
description: Plan, implement, and land a piece of work — drives to a green typecheck/test loop before committing.
disable-model-invocation: true
---

# Do Work

Take a piece of work from plan to committed code in one pass, driven by a **green** typecheck/test loop.

## Process

### 1. Plan (optional)

Understand the task from the user's request and the current conversation. Explore the codebase to find the files and modules it touches. Load [coding-standards](../coding-standards/SKILL.md) for the areas you'll be editing.

If the task has not already been planned, create a plan for it.

Done when: you can list every file or module you expect to touch, and why.

### 2. Implement

Make the changes per the plan, following the loaded coding standards.

Done when: every file in the plan has been touched, and the diff matches what the plan described — no partial or stubbed-out pieces.

### 3. Drive the loop to green

Run `pnpm typecheck` and `pnpm test`. Either failing is **red** — read the failure, fix it, and rerun both together. A fix for one can break the other, so a single passing command is not enough to move on.

Done when: both commands exit clean in the same run — the loop is **green**.

### 4. Commit
Once typecheck and tests pass, commit the work.


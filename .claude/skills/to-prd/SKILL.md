---
name: to-prd
description: Turn the current conversation into a spec and save it as a file in the repo's prd/ folder — no interview, just synthesis of what you've already discussed.
disable-model-invocation: true
---

This skill produces a spec (you may know this document as a PRD) exactly like [to-spec](../to-spec/SKILL.md) does, but the destination differs: it is saved as a file in the repo instead of being published to the issue tracker. Do NOT interview the user — just synthesize what you already know.

## Process

1. Follow [to-spec](../to-spec/SKILL.md) steps 1 and 2 unchanged: explore the repo to understand its current state, then sketch the seams at which you're going to test the feature (existing seams preferred, highest seam possible, ideally one). Check the seams match the user's expectations before moving on.

2. Write the spec using [to-spec's template](../to-spec/SKILL.md#process). Create the `prd/` folder at the repo root if it doesn't already exist.

3. Save the spec as `prd/<kebab-case-feature-name>.md`. If a spec for the same feature already exists at that path, overwrite it rather than creating a duplicate. Do not publish to the issue tracker and do not apply any triage label — this skill's output lives in the repo, not the tracker.

Completion criterion: the file exists at `prd/<kebab-case-feature-name>.md` and contains every section of the template.

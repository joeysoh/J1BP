# Working preferences

## Bottom-up, compartmentalized changes

- Build and refactor bottom-up, in small reviewable chunks, each with a short description of what changed and why.
- For complex tasks, write a plan first, then execute step by step.
- Wait for review/reply after each step before proceeding — don't batch multiple steps into one turn.

## Project Planning
- Maintain `agent/design/target.md` — overall target end-state design, using mermaid diagrams.
- Maintain `agent/design/current.md` — current functioning state, using mermaid diagrams.
- If these files aren't there yet, create them

## Task tracking
- Tasks are tracked in agent/tasks
- At the start of any change to the code involving a multi-step task not already in agent/tasks, create a file at `agent/tasks/YYYY-MM-DD-short-slug.md`.
- Using this task file, before writing code, produce a plan that breaks the task into small, independently reviewable steps.
- Each step should state: what logic/functionality will change, which files are affected, and why.
- Each step must be executed in order, with those which later steps require as dependencies being executed first
- Note any assumptions or open questions before starting, rather than guessing mid-implementation.
- Include a before diagram and after diagram for each task: call graph for function changes, flow diagram for logic.

- Structure it as:

  ```markdown
  # <Task name>

  ## Assumptions and clarifications
  - assumed or clarified with developer
  - ...

  ## Plan

  - [ ] step 1: what change, which files, why, call graph for function changes, flow diagram for logic
  - [ ] step 2: ...

  ## Log

  (append a one-line entry per change: what changed, why, and any files touched)
  ```

- Check off steps as completed; don't delete or rewrite prior log entries.
- Keep the plan updated, if something needs to be changed again, add it as another step
- When the task is done, add a "## Result" section summarizing the outcome.
- Do not delete the file after completion — leave it as a record in `agent/tasks/`.

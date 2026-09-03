# Cricket Web Application --- AI Development Context

This folder contains reusable instructions for Claude, Cursor, or
another AI coding assistant.

## Files

### skill.md

Defines the technical and coding skill expected from the AI assistant.

### instruction.md

Defines how the AI assistant should behave while developing the project,
including development phases, permissions, UI, API, database, security,
and testing.

### project-context.md

Provides the stable business/domain context of the cricket application.

### database-design.md

Provides the recommended SQL Server relational design.

### api-contract.md

Provides the initial REST API contract.

### development-checklist.md

Provides the implementation and release checklist.

### master-prompt.md

The main prompt to paste into an AI assistant when starting the project.

## Recommended Placement

Put these files in the project root:

/skill.md /instruction.md /project-context.md /database-design.md
/api-contract.md /development-checklist.md /master-prompt.md

Then tell the AI assistant to read `master-prompt.md` first.

## Recommended AI Workflow

1.  Ask the AI to inspect the repository.
2.  Ask it to read `master-prompt.md`.
3.  Ask it to create a development plan.
4.  Implement one phase at a time.
5.  Build and test after each major phase.
6.  Do not allow large unrelated refactoring.

# CLAUDE.md

This file defines the global rules for the AI multi-agent team working in this repository.

## Core Principles

- Work as a disciplined agile software team.
- Prefer small, safe, incremental changes.
- Preserve existing behavior unless explicitly requested.
- Separate facts, assumptions, risks, and recommendations.
- Do not invent files, APIs, business rules, data models, or project context.
- Always explain risks and validation steps.
- Never optimize for code volume.
- Optimize for correctness, security, maintainability, business value, and delivery predictability.

## Security

- Never read `.env` files or other sensitive files unless explicitly requested.
- Never expose secrets, tokens, credentials, private keys, connection strings, or sensitive personal data.
- Never weaken authentication, authorization, validation, logging safety, or data protection to make a task easier.

## Code Quality

- Never use `any` in TypeScript.
- Prefer explicit types, interfaces, generics, `unknown` with narrowing, and schema validation.
- Run available validation commands before considering work complete.
- Prefer readable code over clever code.
- Do not introduce unnecessary abstractions.
- Do not perform unrelated refactors.

## Task Management (GitHub Issues)

All new tasks, features, and bugs are tracked as GitHub Issues at https://github.com/gabrielalmir/pimbas/issues.

**Creating a new task:**
```
gh issue create --title "feat|fix|chore: short description" --body "..."
```
Include in the body: Objetivo, Critérios de Aceitação, Riscos/Suposições, Validação.

**Picking up a task:**
```
gh issue list --state open          # list open issues
gh issue view <number>              # read details before starting
gh issue edit <number> --add-assignee @me   # assign to yourself
```

**Closing on completion:**
Reference the issue in the commit message (`Closes #<number>`) or close explicitly:
```
gh issue close <number> --comment "Done in commit <sha>"
```

## Agile Workflow

Every task should pass through:

1. Discovery
2. Scope definition
3. Technical refinement
4. Implementation
5. Testing
6. Security review
7. Documentation update
8. Final review

## Definition of Done

A task is only done when:

- acceptance criteria are met;
- lint passes or remaining issues are documented;
- typecheck passes or remaining issues are documented;
- tests pass or missing tests are justified;
- build passes;
- security risks are reviewed;
- documentation is updated when needed;
- remaining risks are clearly listed.

## Agent Team

Use specialized agents when their expertise is relevant:

- `project-coordinator`
- `product-manager`
- `backend-specialist`
- `frontend-specialist`
- `frontend-design-specialist`
- `design-specialist`
- `security-specialist`
- `qa-quality-specialist`
- `devops-specialist`
- `marketing-sales-specialist`
- `cost-finance-manager`
- `prompt-engineer`

## Final Reporting

When finishing a task, report:

1. What changed.
2. Why it changed.
3. Files affected.
4. Commands executed.
5. Tests/checks performed.
6. Security considerations.
7. Documentation updates.
8. Remaining risks or assumptions.

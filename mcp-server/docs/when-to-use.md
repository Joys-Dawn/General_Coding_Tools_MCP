# When to Use Which Skill or Subagent

Use this guide to choose the right skill or subagent for the user's request.

## By intent

| User intent | Use |
|-------------|-----|
| Something is broken, bug, not working, investigate failure | **systematic-debugging** (skill) |
| Plan or design a feature before coding | **feature-planning** (skill) |
| Security review, vulnerabilities, auth/payments/database | **security-audit** (skill) |
| Code quality, best practices, DRY/SOLID/anti-patterns | **best-practices-audit** (skill) |
| Correctness review, edge cases, logic bugs | **correctness-audit** (skill) |
| Deep research, literature review, investigate a topic | **deep-research** (subagent) |
| Update docs to match code, README, architecture | **update-docs** (subagent) |
| Verify completed work matches what was claimed | **verifier** (subagent) |

## Skills vs subagents

- **Skills** = step-by-step instructions the main agent follows (e.g. run a process, produce a report). Use `get_skill` or `apply_skill` (with the user's prompt as message_to_skill) and follow the skill in the current context.
- **Subagents** = separate agents run in another context; they return one result. Use when the task is noisy, context-heavy, or matches a subagent’s description (e.g. “use deep-research”, “run the verifier”).

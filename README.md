# General Coding Tools MCP

MCP server that exposes **skills** and **subagents** for general coding workflows. Add it in Cursor, Claude Desktop, or any MCP client to get structured guidance for debugging, audits, planning, testing, docs, research, and verification.

---

## Skills

Structured processes and checklists the model can follow when you ask for that kind of help.

| Skill | What it does |
|-------|----------------|
| **systematic-debugging** | Guides root-cause analysis: reproduce → isolate → hypothesize → verify → fix. Use when something is broken, a bug is reported, or you're investigating a failure. No random fixes; every step is evidence-based. |
| **correctness-audit** | Reviews code for correctness bugs, uncaught edge cases, and scalability issues (logic, null/async, types, resources, N+1, etc.). Use for code review or "audit this." For security use security-audit; for design/clean code use best-practices-audit. |
| **security-audit** | Audits against OWASP Top 10, API Security Top 10, CWE, GDPR, PCI-DSS. Use when hardening auth, payments, APIs, or doing a security review. Cites standards and gives concrete fixes. |
| **best-practices-audit** | Audits against DRY, SOLID, KISS, YAGNI, Clean Code, and similar. Use when you want to check standards, reduce anti-patterns, or improve maintainability. |
| **feature-planning** | Plans a feature before coding: context, requirements, design (behavior, data, API, state), implementation steps, and quality/risk. Use when you say "plan this feature" or "design this." |

Each skill can be read as a resource, fetched with the `get_skill` tool, or applied via the `apply_skill_*` prompts with your request.

---

## Subagents

Focused "agents" for specific tasks. Use their prompts or `get_subagent` to get their full instructions.

| Subagent | What it does |
|----------|----------------|
| **deep-research** | Deep research and literature review. Uses web/Exa and AlphaXiv (when available). Synthesizes answers with pros/cons and sources. Use for "research X," "literature review," or evidence-based comparisons. |
| **update-docs** | Keeps project documentation in sync with the code. Focus is full project docs (architecture, setup, deploy, contributing, README, docstrings), not just README. Use after code changes or when you ask to update docs. |
| **verifier** | Checks that completed work matches what was claimed. Verifies deliverables exist and work, and flags unstated changes. Use after the main agent says it's done, to validate before you ship. |

---

## How to use

**In Cursor:** Add the server in MCP settings (e.g. Cursor Settings → MCP). Example:

```json
{
  "mcpServers": {
    "general-coding-tools-mcp": {
      "command": "npx",
      "args": ["-y", "general-coding-tools-mcp"]
    }
  }
}
```

If you use a local clone instead of npm, point `command` to `node` and `args` to the path to `mcp-server/dist/index.js`.

**Tools:** `list_skills`, `list_subagents`, `get_skill`, `get_subagent` — use these to discover and load full skill/subagent content.

**Prompts:** `apply_skill_*` and `apply_subagent_*` — pass a `user_message` to get a prompt that includes the skill or subagent instructions plus your request.

**Resources:** URIs like `general-coding-tools-mcp://skill/systematic-debugging` and `general-coding-tools-mcp://subagent/deep-research` for direct reads.

---

## License

MIT.

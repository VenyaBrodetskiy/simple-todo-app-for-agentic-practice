# Exercise: Agent Skills

Skills are reusable instruction packages for coding agents. They use an open standard (`SKILL.md` format) — same frontmatter, same structure across Claude Code, Copilot, Codex CLI, and Cursor.

**Where each agent reads skills from:**

| Agent | Project skills folder |
|-------|----------------------|
| **Claude Code** | `.claude/skills/` |
| **Copilot** | `.github/skills/`, `.claude/skills/`, `.agents/skills/` |
| **Codex CLI** | `.agents/skills/` |
| **Cursor** | `.cursor/skills/`, `.agents/skills/` |

> There is no single folder that works everywhere. Copilot is the most flexible (reads 3 folders). Claude Code only reads its own.

---

## Warmup — See a Skill in Action

This repo already has a `webapp-testing` skill installed (check `.claude/skills/webapp-testing/`) from https://github.com/anthropics/skills. It includes scripts and examples — not just a prompt file.

Try it: ask your agent _"please test my webapp"_ and watch it auto-discover the skill.

---

## Part 1 — Create a Translation Skill (must)

The app has i18n set up with 4 languages, but French, Hebrew and Russian are only partially translated. Create a skill that completes them — or adds new ones.

### Create the skill

Add it manually or use your agent's built-in skill creator. Place it in the right folder (see table above).

```
.claude/skills/translate/
└── SKILL.md
```

```markdown
---
name: translate
description: ...
---

Your instructions here. Use $ARGUMENTS for the language name.
```

Figure out what the skill should do by exploring `frontend/src/locales/` and `frontend/src/i18n.ts`.

### Test it

**Manual invocation** — call it directly:
> `/translate Korean`

Verify a new locale file was created and the language appears in the switcher.

---

## Part 2 — Multi-Skill Workflow (optional, if time allows)

Skills become powerful when they chain together. Design a mini workflow — a set of skills that guide the agent through a structured development flow.

A simple example:
```
Feature idea → Spec document → Implementation plan → Code
```

Each skill produces a file the next skill consumes. You decide the steps.

### Your task

1. **Design your own workflow** — create 2 or more skills that chain together. 

Some ideas:
   - `spec` → `plan` → implement
   - `spec` → `test-first` → implement (TDD)
   - `analyze` → `refactor`

   The only requirement: each skill has a clear input and output, and they pass information via files.

2. **Use your workflow** to implement this feature:

   > **Task completion counter** — show "2 of 5 tasks done" somewhere on the page.

   Frontend-only: `isCompleted` already exists on tasks. No backend changes needed.

3. **Reflect**: Did the structured flow help? Was it overkill for this size of feature?

### Tips for designing skills

- Each skill should have a clear **input** and **output** — usually a file
- Use `$ARGUMENTS` for the first skill's input; subsequent skills read the previous skill's output file
- Keep each skill focused on one step
- **Controlling auto-invocation:**
  - _Claude Code_: `disable-model-invocation: true` in frontmatter removes the skill from the agent's context entirely — user-only
  - _Claude Code_: `user-invocable: false` does the inverse — agent can use it, but it won't appear in the `/` menu
  - _Copilot / Codex / Cursor_: no equivalent flag yet — rely on a vague `description` to reduce accidental triggering

---

## Reference: Skill file format

```
my-skill/
├── SKILL.md          # Required — frontmatter + instructions
├── template.md       # Optional — supporting files
└── scripts/          # Optional — helper scripts
```

```markdown
---
name: my-skill
description: When the agent should use this skill (be specific!)
---

Instructions for the agent. Use $ARGUMENTS for user input.
```

For the full cross-agent comparison of skills, commands, rules, and other customization concepts, see `AGENT_CUSTOMIZATION_GUIDE.md`.

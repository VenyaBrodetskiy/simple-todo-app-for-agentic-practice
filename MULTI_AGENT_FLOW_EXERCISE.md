# Exercise: Multi-Agent Feature Flow

You'll add a `priority` field (`low | medium | high`) to tasks — persisted in the backend, shown as a colored badge in the UI, used as a secondary sort key. You'll drive it through a coordinated workflow of built-in + custom sub-agents, with lifecycle hooks enforcing the boring stuff.

Works in **Claude Code** and **GitHub Copilot** (CLI and VS Code). Where they diverge, the step is split.

---

## Part 1 — Create four custom sub-agents

| Agent | Role | Model | Tools |
|-------|------|-------|-------|
| `frontend-dev` | React/TS half | sonnet | Read, Edit, Write, Glob, Grep, Bash |
| `backend-dev` | .NET half | sonnet | Read, Edit, Write, Glob, Grep, Bash |
| `manual-tester` | Drives the live app via chrome-devtools MCP | haiku | Read, Bash, `mcp__chrome-devtools__*` |
| `code-reviewer` | Read-only review of the diff | opus | Read, Grep, Glob, Bash |

Different models on purpose — feel the cost/quality trade-off.

### 1.1 Pick the folder

- **Claude Code:** `.claude/agents/<name>.md`
- **Copilot:** `.github/chatmodes/<name>.chatmode.md`

Same Markdown body in both; only the location differs.

### 1.2 Add `frontend-dev`

```markdown
---
name: frontend-dev
description: React + TypeScript developer. Owns frontend/src/. Reads PLAN.md, implements its frontend section, runs `npm run lint`. Stays out of backend/.
tools: Read, Edit, Write, Glob, Grep, Bash
model: sonnet
---

You implement the frontend half of the feature in PLAN.md.
- Never touch files under backend/.
- Use existing i18n keys (frontend/src/locales/). Add new keys for all 4 languages if needed.
- Run `npm run lint` before reporting done.
- Return one summary line + files changed.
```

### 1.3 Add `backend-dev`

```markdown
---
name: backend-dev
description: .NET 9 minimal-API developer. Owns backend/. Reads PLAN.md, implements its backend section, makes `dotnet build` and `dotnet test` pass.
tools: Read, Edit, Write, Glob, Grep, Bash
model: sonnet
---

You implement the backend half of the feature in PLAN.md.
- Never touch files under frontend/.
- Update tests under backend/SimpleTaskBackend.Tests/ to cover new behavior.
- `dotnet build` and `dotnet test` must pass.
- Return one summary line + files changed.
```

### 1.4 Add `manual-tester`

First install the chrome-devtools MCP:
- **Claude Code:** `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest`
- **Copilot:** add it to `.vscode/mcp.json` (see your Copilot MCP docs).

```markdown
---
name: manual-tester
description: Manual QA tester. Drives the running app via the chrome-devtools MCP.
tools: Read, Bash, mcp__chrome-devtools__*
model: haiku
---

Test the feature in a real browser.
1. Make sure backend (`dotnet run --project backend`) and frontend (`cd frontend && npm run dev`) are up.
2. Open http://localhost:5173.
3. One screenshot per scenario:
   - Create a task; set each priority; verify the colored badge.
   - Refresh; verify priority persists.
   - Sort by priority; verify order.
   - Mark a high-priority task done; verify the badge stays.
4. Return a markdown table: scenario | pass/fail | screenshot | notes.
```

### 1.5 Add `code-reviewer`

```markdown
---
name: code-reviewer
description: Senior reviewer. Read-only. Bugs, security, missing tests, accessibility, i18n gaps.
tools: Read, Grep, Glob, Bash
model: opus
---

Read the diff (`git diff main...HEAD`) and:
- Run `dotnet build` and `npm run lint`.
- Group findings: P0 (must fix), P1 (should fix), P2 (nit).
- One summary message. No edits.
```

---

## Part 2 — Add lifecycle hooks

Hooks **enforce** what prompts only suggest. Both Claude Code and Copilot have real lifecycle hooks today.

### 2.1 Claude Code — `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": ".claude/scripts/format.sh" }] }
    ],
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": ".claude/scripts/guard-bash.sh" }] }
    ],
    "SubagentStop": [
      { "hooks": [{ "type": "command", "command": ".claude/scripts/notify.sh" }] }
    ]
  }
}
```

### 2.2 Claude Code — write three scripts

> Prerequisite: `jq` (`brew install jq` / `apt install jq` / `choco install jq`). It parses the JSON the harness sends on stdin.

Create `.claude/scripts/` and `chmod +x` each file below.

**`.claude/scripts/format.sh`** — formats the file Claude just edited:

```bash
#!/usr/bin/env bash
file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0

case "$file" in
  *.ts|*.tsx|*.js|*.json|*.md)
    npx --yes prettier --write "$file" >/dev/null 2>&1
    echo "formatted $file with prettier"
    ;;
  *.cs)
    (cd backend && dotnet format --include "$file") >/dev/null 2>&1
    echo "formatted $file with dotnet format"
    ;;
esac
exit 0
```

**`.claude/scripts/guard-bash.sh`** — blocks dangerous bash before it runs:

```bash
#!/usr/bin/env bash
cmd=$(jq -r '.tool_input.command // empty')

case "$cmd" in
  *"rm -rf"*|*"sudo "*|*"git push --force"*|*"git push -f"*)
    echo "Blocked dangerous command: $cmd" >&2
    exit 2
    ;;
esac
exit 0
```

**`.claude/scripts/notify.sh`** — desktop ping when a sub-agent finishes:

```bash
#!/usr/bin/env bash
msg="Claude sub-agent finished"

if command -v terminal-notifier >/dev/null 2>&1; then
  terminal-notifier -title "Claude Code" -message "$msg"
elif command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"$msg\" with title \"Claude Code\""
elif command -v notify-send >/dev/null 2>&1; then
  notify-send "Claude Code" "$msg"
fi
exit 0
```

Don't forget: `chmod +x .claude/scripts/*.sh`.

### 2.3 Copilot CLI — `.github/hooks/format.json`

Auto-loaded from the working directory. Events use **lowerCamelCase**.

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": "npx prettier --write \"frontend/**/*.{ts,tsx,js,json,md}\" 2>/dev/null; (cd backend && dotnet format) 2>/dev/null; true",
        "powershell": "npx prettier --write \"frontend/**/*.{ts,tsx,js,json,md}\"; cd backend; dotnet format"
      }
    ]
  }
}
```

### 2.4 VS Code Copilot — `.github/hooks/format.json`

Auto-loaded from the workspace. Events use **PascalCase** (Preview feature).

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "npx prettier --write \"frontend/**/*.{ts,tsx,js,json,md}\" 2>/dev/null; (cd backend && dotnet format) 2>/dev/null; true"
      }
    ]
  }
}
```

For **agent-scoped hooks** (hooks declared inside a chat-mode `.md` frontmatter), enable in VS Code settings:

```json
{ "chat.useCustomAgentHooks": true }
```

Verify the hook fired: **Output** panel → **GitHub Copilot Chat Hooks**.

> If hooks never run, your org admin may have disabled the feature.

---

## Part 3 — Run the flow

### 3.1 Open a fresh session and paste the prompt below

> **Feature**: add a `priority` field (`low | medium | high`) to tasks — persisted in the backend, shown as a colored badge, used as a secondary sort key. All four languages need new i18n keys.
>
> Run this exact flow, **one phase at a time**:
>
> 1. **Explore** — use the built-in `Explore` sub-agent to map: where tasks are defined, how the frontend talks to the backend, where i18n keys live, where the task list is rendered.
> 2. **Plan** — use the built-in `Plan` sub-agent to produce a one-page plan. **Save it to `PLAN.md`.**
> 3. **Implement** — invoke `frontend-dev` and `backend-dev` **in parallel, in a single message**. Each reads `PLAN.md` and implements its half. Wait for both before moving on.
> 4. **Verify** — invoke `manual-tester` and `code-reviewer` **in parallel, in a single message**.
> 5. **Iterate** — for each P0/P1 finding, dispatch the relevant dev. Re-run the reviewer.

### 3.2 What to watch for

- **Parallelism (steps 3 & 4):** look for two sub-agent invocations in the **same** assistant message. If they run sequentially, push back: _"make both calls in a single message."_
- **Hooks firing:** every dev edit should trigger the formatter (Claude Code Output / Copilot Hooks output panel).
- **`PLAN.md` is the contract:** the two devs never share context — only the file. If they disagree on the API shape, the plan was too vague.
- **Reviewer is read-only.** If it tries to edit, your `tools:` list isn't being honored.

### 3.3 Copilot fall-back

Copilot chat modes can't be invoked in parallel today. Run steps 3 and 4 sequentially.

---

## Reflect

- Did **Explore → Plan → Implement → Verify** save time, or feel like overhead?
- Did parallel sub-agents finish faster, or did stitching results back together burn the savings?
- Which hook fired most often? Which would you keep?
- Did `PLAN.md` hold as a contract, or did the devs disagree?
- If you had to keep **one** custom sub-agent for daily work — which?

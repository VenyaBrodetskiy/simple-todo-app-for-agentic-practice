# Exercise: Multi-Agent Feature Flow

You'll add a `priority` field (`low | medium | high`) to tasks — persisted in the backend, shown as a colored badge in the UI, used as a secondary sort key. You'll drive it through a coordinated workflow of built-in + custom sub-agents, with lifecycle hooks enforcing the boring stuff, and per-phase commits so the git log tells the story.

Works in **Claude Code** and **GitHub Copilot** (CLI, VS Code, cloud agent). Where they diverge, the step is split. **Scripts below are written for Windows / PowerShell.**

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
- Before reporting done, stage your changes: `git add <your files>`. Do NOT commit — the orchestrator handles commits.
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
- Before reporting done, stage your changes: `git add <your files>`. Do NOT commit — the orchestrator handles commits.
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
1. Make sure backend (`dotnet run --project backend`) and frontend (`cd frontend; npm run dev`) are up.
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

### 1.6 Restart your session and verify the agents loaded

Agent files are read at session start. Restart before continuing.

**Claude Code:**

```text
/exit
claude
/agents
```

Under **Project agents** you should see all four with their model labels:

```text
Project agents (.claude\agents)
backend-dev    · sonnet
code-reviewer  · opus
frontend-dev   · sonnet
manual-tester  · haiku
```

**Copilot — VS Code:**

1. Command Palette (`Ctrl+Shift+P`) → **Developer: Reload Window**.
2. Open the Chat panel and click the **chat mode picker** (dropdown above the chat input). Your four modes from `.github\chatmodes\` should be listed.

**Copilot — CLI:**

```text
/exit          # or Ctrl+D
copilot
```

Then type `@` in the prompt — the agents from `.github\chatmodes\` should appear in the picker.

> If an agent is missing: check the file is in the right folder, the YAML frontmatter parses cleanly (no tabs, quotes around any descriptions with colons), and the filename ends in `.md` (Claude) or `.chatmode.md` (Copilot).

---

## Part 2 — Add lifecycle hooks

Hooks **enforce** what prompts only suggest. Both Claude Code and Copilot have real lifecycle hooks today. Scripts below are **PowerShell**; PowerShell 5.1 ships with Windows so no install needed.

> **Why each script appends to a log file:** parent and sub-agent contexts are isolated. When a sub-agent triggers a hook, the parent never sees it — only the sub-agent does, briefly, before its context is discarded. The shared `hooks.log` is your only ground truth for what actually fired across all contexts.

> If your `Get-ExecutionPolicy` returns `Restricted`, run once in an elevated PowerShell:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 2.1 Claude Code — `.claude\settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/scripts/format.ps1" }] }
    ],
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/scripts/guard-bash.ps1" }] }
    ],
    "SubagentStop": [
      { "hooks": [{ "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/scripts/notify.ps1" }] }
    ]
  }
}
```

### 2.2 Claude Code — write three PowerShell scripts

Create the folder `.claude\scripts\` and save each file below. All three append a line to `.claude\hooks.log` so you can inspect what fired afterwards.

**`.claude\scripts\format.ps1`** — formats the file Claude just edited:

```powershell
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$file = $payload.tool_input.file_path
if (-not $file) { exit 0 }

$ts = (Get-Date).ToString("HH:mm:ss")

if ($file -match '\.(ts|tsx|js|json|md)$') {
    npx --yes prettier --write $file *> $null
    Add-Content -Path ".claude\hooks.log" -Value "$ts [format]  $file -> prettier"
    Write-Output "formatted $file with prettier"
}
elseif ($file -match '\.cs$') {
    Push-Location backend
    dotnet format --include $file *> $null
    Pop-Location
    Add-Content -Path ".claude\hooks.log" -Value "$ts [format]  $file -> dotnet format"
    Write-Output "formatted $file with dotnet format"
}
exit 0
```

**`.claude\scripts\guard-bash.ps1`** — blocks dangerous bash before it runs:

```powershell
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$cmd = $payload.tool_input.command
$ts = (Get-Date).ToString("HH:mm:ss")

if ($cmd -match 'rm\s+-rf|sudo\s|git\s+push\s+(--force|-f)|Remove-Item.*-Recurse.*-Force') {
    Add-Content -Path ".claude\hooks.log" -Value "$ts [guard]   BLOCKED: $cmd"
    [Console]::Error.WriteLine("Blocked dangerous command: $cmd")
    exit 2
}
exit 0
```

**`.claude\scripts\notify.ps1`** — Windows toast when a sub-agent finishes:

```powershell
$msg = "Claude sub-agent finished"
$ts = (Get-Date).ToString("HH:mm:ss")

Add-Content -Path ".claude\hooks.log" -Value "$ts [notify]  sub-agent finished"

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $ni = New-Object System.Windows.Forms.NotifyIcon
    $ni.Icon = [System.Drawing.SystemIcons]::Information
    $ni.BalloonTipTitle = "Claude Code"
    $ni.BalloonTipText  = $msg
    $ni.Visible = $true
    $ni.ShowBalloonTip(3000)
    Start-Sleep -Milliseconds 1500
    $ni.Dispose()
} catch {
    Write-Host "[Claude Code] $msg"
}
exit 0
```

### 2.3 Copilot — `.github\hooks\hooks.json`

One file works for **Copilot CLI, VS Code Copilot, and the cloud agent**. Auto-loaded from `.github/hooks/*.json` in the repo (CLI: working directory; cloud agent: default branch). Available events (lowerCamelCase): `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `errorOccurred`. (No `stop` / `subagentStop` equivalent.)

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "powershell": ".github/hooks/scripts/format.ps1",
        "timeoutSec": 30
      }
    ],
    "preToolUse": [
      {
        "type": "command",
        "powershell": ".github/hooks/scripts/guard-tool.ps1",
        "timeoutSec": 10
      }
    ]
  }
}
```

### 2.4 Copilot — write two PowerShell scripts

Stdin sends JSON with top-level `toolName` and `toolInput` (camelCase — different from Claude Code's `tool_input.*`). Both scripts append to `.github\hooks\hooks.log`. Create `.github\hooks\scripts\` and save each file.

**`.github\hooks\scripts\format.ps1`** — formats the whole repo after every edit (coarse but bulletproof; the per-file `toolInput` shape varies by tool):

```powershell
$ts = (Get-Date).ToString("HH:mm:ss")
npx --yes prettier --write "frontend/**/*.{ts,tsx,js,json,md}" *> $null
Push-Location backend
dotnet format *> $null
Pop-Location
Add-Content -Path ".github\hooks\hooks.log" -Value "$ts [format]  repo formatted"
Write-Output "formatted repo"
exit 0
```

**`.github\hooks\scripts\guard-tool.ps1`** — blocks dangerous tool calls:

```powershell
$raw = [Console]::In.ReadToEnd()
$ts = (Get-Date).ToString("HH:mm:ss")
try {
    $payload = $raw | ConvertFrom-Json
    $combined = "$($payload.toolName) $($payload.toolInput | ConvertTo-Json -Compress)"
} catch {
    $combined = $raw
}

if ($combined -match 'rm\s+-rf|sudo\s|git\s+push\s+(--force|-f)|DROP\s+TABLE|Remove-Item.*-Recurse.*-Force') {
    Add-Content -Path ".github\hooks\hooks.log" -Value "$ts [guard]   BLOCKED: $combined"
    [Console]::Error.WriteLine("Blocked dangerous operation: $combined")
    exit 1
}
exit 0
```

### 2.5 Restart your session and verify the hooks loaded

Hook configs are read at session start. Restart before continuing.

**Claude Code:**

```text
/exit
claude
/hooks
```

You should see three event entries, each with `(1)` next to it (one hook configured per event):

```text
PostToolUse  (1)
  Edit|Write
    powershell -NoProfile -ExecutionPolicy Bypass -File .claude/scripts/format.ps1
PreToolUse   (1)
  Bash
    powershell -NoProfile -ExecutionPolicy Bypass -File .claude/scripts/guard-bash.ps1
SubagentStop (1)
  *
    powershell -NoProfile -ExecutionPolicy Bypass -File .claude/scripts/notify.ps1
```

**Copilot — VS Code:**

1. Command Palette (`Ctrl+Shift+P`) → **Developer: Reload Window**.
2. Open the **Output** panel → choose **GitHub Copilot Chat Hooks** from the channel dropdown. On startup you should see a line for each loaded hook (`postToolUse`, `preToolUse`).
3. Sanity test: ask Copilot to edit any file, then look for the format hook line in the same channel.

**Copilot — CLI:**

```text
/exit          # or Ctrl+D
copilot --verbose
```

The startup banner should list the loaded hook file (`.github/hooks/hooks.json`). Trigger any tool call and confirm the formatter runs.

> If hooks don't appear: check the JSON parses (`Get-Content .github\hooks\hooks.json | ConvertFrom-Json`), the script paths are relative to the repo root, and (Copilot only) your org admin hasn't disabled hooks.

---

## Part 3 — Run the flow

### 3.1 Open a fresh session and paste the prompt below

> **Feature**: add a `priority` field (`low | medium | high`) to tasks — persisted in the backend, shown as a colored badge, used as a secondary sort key. All four languages need new i18n keys.
>
> Before you start, clear the hooks log so this run is isolated:
> ```
> Remove-Item .claude\hooks.log -ErrorAction SilentlyContinue
> Remove-Item .github\hooks\hooks.log -ErrorAction SilentlyContinue
> ```
>
> Run this exact flow, **one phase at a time**. Commit at each phase boundary so the git log tells the story.
>
> 1. **Explore** — use the built-in `Explore` sub-agent to map: where tasks are defined, how the frontend talks to the backend, where i18n keys live, where the task list is rendered. (No commit.)
>
> 2. **Plan** — use the built-in `Plan` sub-agent to produce a one-page plan. **Save it to `PLAN.md`.** Then commit:
>    ```
>    git add PLAN.md
>    git commit -m "plan: priority field implementation plan"
>    ```
>
> 3. **Implement** — invoke `frontend-dev` and `backend-dev` **in parallel, in a single message**. Each reads `PLAN.md`, implements its half, and runs `git add <its files>` (no commit). Wait for both to return. Then make **two separate commits** to preserve authorship:
>    ```
>    git reset                                                  # unstage everything first
>    git add backend/
>    git commit -m "feat(backend): add priority field, endpoint, tests"
>    git add frontend/
>    git commit -m "feat(frontend): add priority badge, sort, i18n"
>    ```
>
> 4. **Verify** — invoke `manual-tester` and `code-reviewer` **in parallel, in a single message**. (No commit — output is in chat.)
>
> 5. **Iterate** — for each P0/P1 finding, dispatch the relevant dev (who runs `git add` again). Then commit each fix:
>    ```
>    git commit -m "fix(backend): <what changed>"
>    # or
>    git commit -m "fix(frontend): <what changed>"
>    ```
>    Re-run the reviewer when fixes land.
>
> 6. **Report what fired** — at the end, print the full hooks log so we can see what actually ran across every context (parent + sub-agents):
>    ```
>    Get-Content .claude\hooks.log         # Claude Code
>    Get-Content .github\hooks\hooks.log   # Copilot
>    ```
>    Summarize: how many `[format]` lines? How many `[notify]` (sub-agent finishes)? Any `[guard] BLOCKED`?

### 3.2 What to watch for

- **Parallelism (steps 3 & 4):** look for two sub-agent invocations in the **same** assistant message. If they run sequentially, push back: _"make both calls in a single message."_
- **Hooks firing:** each dev edit appends a `[format]` line to `hooks.log`. Each sub-agent finish appends `[notify]`. The parent agent's chat only shows hook fires for the parent's own edits — sub-agent fires are invisible there. The log is the truth.
- **`PLAN.md` is the contract:** the two devs never share context — only the file. If they disagree on the API shape, the plan was too vague.
- **Reviewer is read-only.** If it tries to edit, your `tools:` list isn't being honored.

---

## Reflect

- Did **Explore → Plan → Implement → Verify** save time, or feel like overhead?
- Did parallel sub-agents finish faster, or did stitching results back together burn the savings?
- Did `PLAN.md` hold as a contract, or did the devs disagree?
- If you had to keep **one** custom sub-agent for daily work — which?
- **Read the git log:**
  ```
  git log --oneline
  git show <hash> --stat       # for each commit
  ```
  Does the log read like the actual story of who built what? Did either dev stray into the other's lane (e.g. the backend commit touching `frontend/`)? If you came back to this branch in a week, would the log alone tell you what happened?
- **Read the hooks log** (`.claude\hooks.log` or `.github\hooks\hooks.log`):
  - How many `[format]` fires total? Compare with the number of files in `git diff main --stat` — do they roughly match (one fire per edit)?
  - How many `[notify]` fires? It should equal the number of sub-agent invocations (Explore + Plan + 2 devs + 2 verifiers + iteration re-runs).
  - Any `[guard] BLOCKED` entries? You're hoping for zero — that's the guard doing nothing, which is good.
  - The parent session only sees hook fires for the parent's own edits. The log is the only place sub-agent fires show up. Did the count surprise you?

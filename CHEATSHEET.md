# Issues Cheatsheet (facilitator only)

## Intentionally Added Bugs

### 1. Broken Mobile Layout (Layout / Viewport)
- **File**: `frontend/src/index.css` (mobile media query at bottom)
- **Problem**: `position: fixed` input at bottom with `width: 100vw` causes horizontal overflow. No `padding-bottom` on task list so last items are hidden behind the input. Title `h1` stays at `3.2em` -- way too large for mobile. Hardcoded dark background breaks light mode.
- **How to find**: Resize viewport to 375x667, take a screenshot.
- **Fix**: Use `width: 100%` instead of `100vw`, add `padding-bottom` to list section, reduce `h1` font-size, use CSS variable or `inherit` for background.

### 2. Intermittent Backend Delay (Network)
- **File**: `backend/Endpoints/TaskEndpoints.cs` (GET handler)
- **Problem**: 40% chance of a random 2-5 second `Task.Delay` on every GET `/api/tasks`.
- **How to find**: Watch network tab -- some GET requests take 2-5s while others are instant.
- **Fix**: Remove the `Random.Shared` / `Task.Delay` block.

### 3. Silent Console TypeError (JS Errors)
- **File**: `frontend/src/App.tsx`
- **Problem**: `PerformanceObserver` pushes to `window.__APP_METRICS` which is never initialized. Throws `TypeError: Cannot read properties of undefined (reading 'push')` on every resource load.
- **How to find**: Open console, filter by error level.
- **Fix**: Either add `window.__APP_METRICS = []` before the observer, or remove the observer entirely.

### 4. Event Listener Leak (Memory)
- **File**: `frontend/src/components/TaskItem.tsx`
- **Problem**: Each `TaskItem` adds a `window.addEventListener('scroll', ...)` in a `useEffect` but never returns a cleanup function. Listeners accumulate per task and are never removed.
- **How to find**: Inspect event listeners on `window`, or run a performance trace and notice excessive scroll handlers.
- **Fix**: Add `return () => window.removeEventListener('scroll', onScroll);` in the useEffect.

---

## Pre-existing Bugs (already in codebase)

### 5. Duplicate Task on Enter (Forms)
- **File**: `frontend/src/components/TaskInput.tsx`
- **Problem**: Two handlers fire on Enter: a `useEffect` keydown listener AND the `<form onSubmit>`. Both call `onAddTask`, creating duplicate tasks.
- **How to find**: Add a task by pressing Enter, watch network tab for two POST requests.
- **Fix**: Remove the manual keydown `useEffect` -- the form `onSubmit` already handles Enter.

### 6. Redundant Data Fetching (Network/Performance)
- **Files**: `frontend/src/services/api.ts`, `frontend/src/hooks/useTasks.ts`
- **Problem**: After creating/updating a task, the response is used to update local state, but then `api:data-changed` event also triggers a full `GET /api/tasks` re-fetch. Double work on every mutation.
- **How to find**: Watch network tab after adding a task -- POST is followed by an unnecessary GET.
- **Fix**: Either remove the `notifyDataChange` call (rely on local state updates) or remove the optimistic local update (rely on the re-fetch). Don't do both.

### 7. Missing Form Field Attributes (Accessibility)
- **File**: `frontend/src/components/TaskInput.tsx`
- **Problem**: The `<input>` has no `id` or `name` attribute, causing an accessibility warning.
- **How to find**: Console shows warning about form field missing id/name.
- **Fix**: Add `id="task-title"` and `name="title"` to the input element.

# Debug Exercise: Find & Fix Issues with DevTools MCP

This app has several hidden bugs. Use an AI agent with Chrome DevTools MCP to find and fix them.

## How to Start

1. Run the backend (`dotnet run` in `/backend`) and frontend (`npm run dev` in `/frontend`)
2. Open the app in the browser
3. Try to investigate issues/bugs by yourself. See how many issues you can spot on your own - then let the agent find the rest.
3. Ask the agent to investigate:

> Open http://localhost:5173 in the browser and investigate this web app for issues.
> Check the console for errors, inspect network requests for problems,
> test the layout at mobile viewport sizes (375x667), and look for
> performance or memory concerns. Report everything you find and then fix it.

## Hints (if the agent gets stuck)

| Category | Where to look |
|----------|--------------|
| JS Errors | Console tab -- filter by "error" level |
| Network | Network tab -- watch response times on GET `/api/tasks` |
| Layout | Resize viewport to 375x667, take a screenshot |
| Memory | Check for accumulating event listeners on `window` |

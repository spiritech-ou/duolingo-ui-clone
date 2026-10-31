# MCP server configs

Loaded by `work` through `--mcp-config`. They connect only when a session starts. No secrets are committed.

| File | Server | Roles that need it | Precondition |
|---|---|---|---|
| `playwright.json` | Playwright MCP | every role that checks UI in a browser (vite-react-developer, react-component-developer, react-feature-developer, e2e-tester) | `npx playwright install chromium`; the dev server running (`npm run dev:mocks`, port 5273) |
| `storybook.json` | Storybook MCP (`@storybook/addon-mcp`) | react-component-developer, react-feature-developer | `npm run storybook` running **before** the session starts (port 6006) |
| `penpot.json` | Penpot MCP | ui-designer, react-component-developer | Penpot MCP server running, file open in a focused browser tab, plugin connected |

## Unverified

- `storybook.json`: the JSON form is a translation of Claude Code's HTTP server format; Storybook documents only the CLI form.
- `penpot.json`: same, translated from the documented CLI form. Hosted Penpot needs a key in `mcp/.env` (gitignored); whether the client expands env variables inside a URL is unconfirmed.
- `playwright.json`: the exact flag combination (`--headless --viewport-size`) is untested; each flag is documented.

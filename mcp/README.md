# MCP server configs

Loaded by `work` through `--mcp-config`. They connect only when a session starts. No secrets are committed.

| File | Server | Roles that need it | Precondition |
|---|---|---|---|
| `playwright.json` | Playwright MCP | every role that checks UI in a browser (vite-react-developer, react-component-developer, react-feature-developer, e2e-tester) | `npx playwright install chromium`; the dev server running (`npm run dev:mocks`, port 5273) |
| `storybook.json` | Storybook MCP (`@storybook/addon-mcp`) | react-component-developer, react-feature-developer | `npm run storybook` running **before** the session starts (port 6006) |
| `penpot.json` | Penpot MCP | ui-designer, react-component-developer | Penpot MCP server running, file open in a focused browser tab, plugin connected |

## Playwright screenshots

`browser_take_screenshot` only writes inside the server's allowed roots, which are the directory the session was launched from plus the server's output directory. When a session is launched from another checkout (for example the agentic-team repository) a save into this repository fails with `File access denied: ... is outside allowed roots`. `playwright.json` therefore passes `--allow-unrestricted-file-access` in its `args` (applied; the viewport stays `1280x720`, tasks resize to 390 wide with `browser_resize`). Chosen over the alternatives: `--output-dir` would need an absolute, machine-specific path in a committed file and only moves the default output folder, and the launch directory differs per machine and per `work` session, so no committed relative setting can name this repository's `docs/verification/` reliably. The cost: the browser tool may then write anywhere the user can, so keep every `filename` inside `docs/verification/`. If you want a narrower setting locally, replace the flag with an uncommitted `--output-dir <abs path>`.

Kept screenshots go in `docs/verification/` and are named `pw-shot-<screen>-<width>-<theme>.png`, for example `pw-shot-login-1280-dark.png` (width in CSS pixels, theme `light` or `dark`). Always pass an absolute `filename` starting with this repository's path (a relative one resolves against the launch directory, which may be another checkout). `.gitignore` currently has no `pw-shot-` rule (it ignores only `.playwright-mcp/`, the server's session logs), so a scratch shot shows up in `git status` and must be deleted before reporting; a kept shot is committed like any other file.

## Unverified

- `playwright.json`: `--allow-unrestricted-file-access` is verified by behaviour only: in a session started with it, `browser_take_screenshot` with an absolute `filename` in `docs/verification/` succeeded and the file existed (a session without it was refused with `File access denied ... outside allowed roots`). The flag name was not checked against `npx @playwright/mcp@latest --help` (not readable in the sessions so far), and whether a narrower option works is untested. To re-verify: open `about:blank`, screenshot to `<repo>/docs/verification/pw-shot-throwaway-1280-light.png`, `ls` it, delete it.

- `storybook.json`: the JSON form is a translation of Claude Code's HTTP server format; Storybook documents only the CLI form.
- `penpot.json`: same, translated from the documented CLI form. Hosted Penpot needs a key in `mcp/.env` (gitignored); whether the client expands env variables inside a URL is unconfirmed.
- `playwright.json`: the exact flag combination (`--headless --viewport-size`) is untested; each flag is documented.

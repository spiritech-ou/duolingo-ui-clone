# GitHub Pages build verification (task 10)

Branch `claude/language-learning-prototype`, tasks 1 to 9 committed. This file holds the findings of the local run of the real Pages build at the sub path; task 11 completes it.

## What was run

- Build: `npm run build:pages` (`tsc --noEmit` then `vite build` with `VITE_USE_MOCKS=true BASE_PATH=/duolingo-ui-clone/`). Passed. One Rollup notice (`INEFFECTIVE_DYNAMIC_IMPORT`: `src/features/auth/index.ts` is imported both statically and dynamically by `src/router.tsx`); a warning, not a failure, not related to the base path.
- Serve: `npm run preview:pages` (`vite preview` on port 5274, `--strictPort`), started in the background and stopped afterwards (port 5274 refused connections again after the stop).
- Port check before starting: `curl` to `http://localhost:5274/duolingo-ui-clone/` gave "connection refused", so 5274 was free. After the start the response to `GET /duolingo-ui-clone/` was `200 text/html` with the title `Spiritech`, the `<link rel="icon" href="/duolingo-ui-clone/favicon.svg">` and every script and stylesheet under `/duolingo-ui-clone/assets/`: it is this app's Pages build, not a foreign process. (Port 5273, the foreign one from earlier tasks, was not used.)
- Browser: Playwright MCP, headless Chromium, 1280x720, dark theme (the app default). Stored state: the browser service worker registrations, `localStorage`, `sessionStorage` and Cache Storage for `localhost:5274` were cleared before the walk (one registration, from the first page load, was removed) and again at the end (0 registrations left, `localStorage` empty), then the browser was closed.
- No Playwright spec file, no application code and no config were changed. `git status` shows only the four screenshots and this file.

## Journey walked

Every address was read from the page URL reported after each navigation; all stayed under `/duolingo-ui-clone/`.

| Step | Action | Address after | Result |
|---|---|---|---|
| 1 | open `http://localhost:5274/duolingo-ui-clone/` signed out | `/duolingo-ui-clone/login` | pass: entry redirect, title "Log in \| Spiritech" |
| 2 | login: Email `pages@example.com`, Password 8 characters, press LOG IN | `/duolingo-ui-clone/onboarding/level` | pass: the mock answered `POST /api/auth/login` 200 |
| 3 | onboarding, level: "I can have basic conversations", Continue | `/duolingo-ui-clone/onboarding/start` | pass: heading changed to "Great, you can already chat a bit!" on choosing |
| 4 | onboarding, start: "Find my level", Continue | `/duolingo-ui-clone/learn` | pass: "We recommend starting at Unit 3 based on your answer." with "Got it"; "Lesson 9, Home, recommended, start" |
| 5 | learning path: open "Lesson 1, Drinks and bread" | `/duolingo-ui-clone/lesson/u1-l1` | pass: "NEW WORD / Which one of these is “tea”?" with three picture cards |
| 6 | lesson: answer the 10 exercises (tea, bread, water, milk, coffee, then the practice round of the same five) right, Check and Continue each time | `/duolingo-ui-clone/lesson/u1-l1` | pass: progress reached 9/10 before the last answer, hearts stayed "5 hearts left" |
| 7 | end screen | `/duolingo-ui-clone/lesson/u1-l1` | pass: "Perfect lesson!", XP +10, Accuracy 100%, Time 1:09 |
| 8 | Continue | `/duolingo-ui-clone/learn` | pass: "Lesson 1, Drinks and bread, completed", "5 hearts left" |
| 9 | reload `http://localhost:5274/duolingo-ui-clone/learn` (deep link) | `/duolingo-ui-clone/learn` | pass: the path rendered, session kept |

Which exercises the practice round asks (and in what order) is not the same as the first round's; the walk read the heading each time, so every answer was right.

## Console and network

- Console: 0 errors and 0 warnings during the whole walk (debug level read after login and again before the probes below). The MSW start-up logs show `Worker script URL: http://localhost:5274/duolingo-ui-clone/mockServiceWorker.js` and `Worker scope: http://localhost:5274/duolingo-ui-clone/`.
- Service worker: one registration, scope `http://localhost:5274/duolingo-ui-clone/`, script `/duolingo-ui-clone/mockServiceWorker.js`, state `activated`, and it controls the page.
- Network, all requests of the session (static included): every static request is under `/duolingo-ui-clone/` and returned 200: the entry HTML, the hashed chunks under `/duolingo-ui-clone/assets/`, the font, `/duolingo-ui-clone/favicon.svg`, `/duolingo-ui-clone/audio/manifest.json` and the clips `tea`, `bread`, `water`, `milk` and `coffee` `.mp3` under `/duolingo-ui-clone/audio/`, all 200 (the clips as `audio/mpeg`, 10 requests over the lesson).
- The only requests to a root path outside the base are the mock API calls `POST /api/auth/login`, `GET /api/course` and `GET /api/lessons/u1-l1`. They have no file on the server; the mock service worker answers them with 200 JSON. This is how the Pages build is meant to work (the API base is `/api`; the worker scope is the base, so the requests are intercepted at the page's origin). No request to `/audio/...`, `/favicon.svg` or `/mockServiceWorker.js` at the root was made by the app.
- Probe after the journey, with `fetch` from the page: `/duolingo-ui-clone/audio/tea.mp3` 200 `audio/mpeg`; `/duolingo-ui-clone/audio/manifest.json` 200 `application/json`; `/duolingo-ui-clone/favicon.svg` 200 `image/svg+xml`; `/duolingo-ui-clone/mockServiceWorker.js` 200 `text/javascript`; the same three files at the root (`/audio/tea.mp3`, `/favicon.svg`, `/mockServiceWorker.js`) all 404 `text/plain`, which is correct: nothing is served outside the base. These three 404s are the only console errors of the session and were caused by these probes (they came after the walk).
- Note: `vite preview` returns the HTML for an unknown path under the base (`/duolingo-ui-clone/nope-not-a-file` gave 200 `text/html`). That is the SPA fallback of the preview server; on GitHub Pages the `404.html` that the build writes (`dist/404.html`, same size as `index.html`) plays that role. The Pages behaviour itself (HTTP 404 status of `404.html`, deep link on the real host) cannot be checked locally; task 11 or the deployed run covers it.

## Screenshots (`docs/verification/`, 1280x720, dark)

- `pw-shot-pages-login-1280-dark.png`: login at `/duolingo-ui-clone/login`, after the entry redirect, before typing.
- `pw-shot-pages-learn-1280-dark.png`: the learning path at `/duolingo-ui-clone/learn` straight after onboarding (the page opens scrolled to the recommended Unit 3, so the top bar with the brand link is above the visible area).
- `pw-shot-pages-question-1280-dark.png`: first question of lesson `u1-l1`, "Which one of these is “tea”?", nothing selected.
- `pw-shot-pages-end-1280-dark.png`: "Perfect lesson!" end screen.

The learning path and question screenshots were opened and match the app's look in the earlier reports (dark theme, layout as before).

## Failures

None in the app or in the build.

## Observation, not an app defect (unverified cause)

During the first walk through onboarding the Playwright MCP browser delivered no pointer events to the page: clicks on the level card were reported as done, but no `pointerdown`, `click` or `change` reached a `window` capture listener, the radio stayed unchecked, and the same happened after a reload of the page and for a click on the heading. A programmatic `input.click()` selected the card normally (so the page handled input), and after closing the MCP browser and opening the app again the same click worked first time and the rest of the journey (including the real clicks on "Find my level" and the lesson cards) was unaffected. Login (a real click) worked before the glitch. It was not reproduced, so cause is unverified; most likely a stuck input state of the MCP browser session, not something in the Pages build (nothing base-path related changes pointer handling). If a later run sees onboarding cards that do not respond to a real click only on the Pages build, start from `src/features/onboarding` and the radio-card component under `src/components/ui`.

## Not covered here (for task 11 or later)

- The real host `https://spiritech-ou.github.io/duolingo-ui-clone/` (only the local preview was walked).
- Light theme, 390px width, and edge cases (invalid login, error and empty states): by the testing convention they belong to stories and unit tests, and the existing reports cover them on the dev server.
- Direct loads of a deep link other than `/learn` (for example `/lesson/u1-l1` from a cold start) through `404.html`; the preview server's own SPA fallback answers locally.

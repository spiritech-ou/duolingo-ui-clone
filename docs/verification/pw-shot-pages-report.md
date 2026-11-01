# GitHub Pages build verification (task 10)

Branch `claude/language-learning-prototype`, tasks 1 to 9 committed. This file holds the findings of the local run of the real Pages build at the sub path; task 11 completes it.

## What was run

- Build: `npm run build:pages` (`tsc --noEmit` then `vite build` with `VITE_USE_MOCKS=true BASE_PATH=/duolingo-ui-clone/`). Passed. One Rollup notice (`INEFFECTIVE_DYNAMIC_IMPORT`: `src/features/auth/index.ts` is imported both statically and dynamically by `src/router.tsx`); a warning, not a failure, not related to the base path.
- Serve: `npm run preview:pages` (`vite preview` on port 5274, `--strictPort`), started in the background and stopped afterwards (port 5274 refused connections again after the stop).
- Port check before starting: `curl` to `http://localhost:5274/duolingo-ui-clone/` gave "connection refused", so 5274 was free. After the start the response to `GET /duolingo-ui-clone/` was `200 text/html` with the title `Spiritech`, the `<link rel="icon" href="/duolingo-ui-clone/favicon.svg">` and every script and stylesheet under `/duolingo-ui-clone/assets/`: it is this app's Pages build, not a foreign process. (Port 5273, the foreign one from earlier tasks, was not used.)
- Browser: Playwright MCP, headless Chromium, 1280x720, dark theme (the app default). Stored state: the browser service worker registrations, `localStorage`, `sessionStorage` and Cache Storage for `localhost:5274` were cleared before the walk (one registration, from the first page load, was removed) and again at the end (0 registrations left, `localStorage` empty), then the browser was closed.
- No Playwright spec file, no application code and no config were changed. At task 10, `git status` showed only the four screenshots and this file.

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
| 9 | reload `http://localhost:5274/duolingo-ui-clone/learn` at the sub path (under the preview's own SPA fallback, so this is not a proof of the `404.html` mechanism; see task 11 below) | `/duolingo-ui-clone/learn` | pass: the path rendered, session kept |

Which exercises the practice round asks (and in what order) is not the same as the first round's; the walk read the heading each time, so every answer was right.

## Console and network

- Console: 0 errors and 0 warnings during the whole walk (debug level read after login and again before the probes below). The MSW start-up logs show `Worker script URL: http://localhost:5274/duolingo-ui-clone/mockServiceWorker.js` and `Worker scope: http://localhost:5274/duolingo-ui-clone/`.
- Service worker: one registration, scope `http://localhost:5274/duolingo-ui-clone/`, script `/duolingo-ui-clone/mockServiceWorker.js`, state `activated`, and it controls the page.
- Network, all requests of the session (static included): every static request is under `/duolingo-ui-clone/` and returned 200: the entry HTML, the hashed chunks under `/duolingo-ui-clone/assets/`, the font, `/duolingo-ui-clone/favicon.svg`, `/duolingo-ui-clone/audio/manifest.json` and the clips `tea`, `bread`, `water`, `milk` and `coffee` `.mp3` under `/duolingo-ui-clone/audio/`, all 200 (the clips as `audio/mpeg`, 10 requests over the lesson).
- The only requests to a root path outside the base are the mock API calls `POST /api/auth/login`, `GET /api/course` and `GET /api/lessons/u1-l1`. They have no file on the server; the mock service worker answers them with 200 JSON. This is how the Pages build is meant to work (the API base is `/api`; the worker scope is the base, so the requests are intercepted at the page's origin). No request to `/audio/...`, `/favicon.svg` or `/mockServiceWorker.js` at the root was made by the app.
- Probe after the journey, with `fetch` from the page: `/duolingo-ui-clone/audio/tea.mp3` 200 `audio/mpeg`; `/duolingo-ui-clone/audio/manifest.json` 200 `application/json`; `/duolingo-ui-clone/favicon.svg` 200 `image/svg+xml`; `/duolingo-ui-clone/mockServiceWorker.js` 200 `text/javascript`; the same three files at the root (`/audio/tea.mp3`, `/favicon.svg`, `/mockServiceWorker.js`) all 404 `text/plain`, which is correct: nothing is served outside the base. These three 404s are the only console errors of the session and were caused by these probes (they came after the walk).
- Note: `vite preview` returns the HTML for an unknown path under the base (`/duolingo-ui-clone/nope-not-a-file` gave 200 `text/html`). That is the SPA fallback of the preview server; on GitHub Pages the `404.html` that the build writes (`dist/404.html`, same size as `index.html`) plays that role. The Pages behaviour itself (HTTP 404 status of `404.html`, deep link on the real host) cannot be checked locally; task 11 section 3 could not prove it (not proven), and the deployed run remains.

## Screenshots (`docs/verification/`, 1280x720, dark)

- `pw-shot-pages-login-1280-dark.png`: login at `/duolingo-ui-clone/login`, after the entry redirect, before typing.
- `pw-shot-pages-learn-1280-dark.png`: the learning path at `/duolingo-ui-clone/learn` straight after onboarding (the page opens scrolled to Unit 3: the screenshot shows the hearts count, the Log out button, the Unit 3 header with its START bubble and lesson nodes; the banner with the brand link and the "Learning path" heading are scrolled out of view).
- `pw-shot-pages-question-1280-dark.png`: first question of lesson `u1-l1`, "Which one of these is “tea”?", nothing selected.
- `pw-shot-pages-end-1280-dark.png`: "Perfect lesson!" end screen.

## Failures

None in the app or in the build.

## Observation, not an app defect (unverified cause)

During the first walk through onboarding the Playwright MCP browser delivered no pointer events to the page: clicks on the level card were reported as done, but no `pointerdown`, `click` or `change` reached a `window` capture listener, the radio stayed unchecked, and the same happened after a reload of the page and for a click on the heading. A programmatic `input.click()` selected the card normally (so the page handled input), and after closing the MCP browser and opening the app again the same click worked first time and the rest of the journey (including the real clicks on "Find my level" and the lesson cards) was unaffected. Login (a real click) worked before the glitch. It was not reproduced, so cause is unverified; most likely a stuck input state of the MCP browser session, not something in the Pages build (nothing base-path related changes pointer handling). If a later run sees onboarding cards that do not respond to a real click only on the Pages build, start from `src/features/onboarding` and the radio-card component under `src/components/ui`.

## Task 11: service worker, audio and deep links at the sub path

Run on a fresh `npm run build:pages` (passed, same single `INEFFECTIVE_DYNAMIC_IMPORT` notice) and `npm run preview:pages` on 5274 (free before the start: `curl` refused; after the start `GET /duolingo-ui-clone/` was 200 `text/html`, title `Spiritech`, assets under `/duolingo-ui-clone/assets/`, so it was this app). Port 5273 (foreign server) was not touched. The browser's registrations, `localStorage`, `sessionStorage` and Cache Storage for `localhost:5274` were cleared before the walk (the one registration present came from the first page load of this run, no older one was left) and again at the end (0 registrations, empty storage); the browser was closed and the preview stopped (5274 refuses connections again). Signed in again through the real UI (login, onboarding "I can have basic conversations", "Find my level") to reach `/learn`.

### 1. Service worker

`navigator.serviceWorker.getRegistrations()` on `/duolingo-ui-clone/learn`:

- scope `http://localhost:5274/duolingo-ui-clone/` (as expected)
- script `http://localhost:5274/duolingo-ui-clone/mockServiceWorker.js` (as expected), state `activated`, and `navigator.serviceWorker.controller` is that same script, so the page is controlled.
- Mock answers the API: `fetch('/api/course')` from the page gave 200 `application/json` with the keys `id, title, fromLanguage, units`, and the same `GET /api/course` made the learning path render. The same `GET /api/course` sent straight to the preview server with `curl` (no service worker) gave 404 `text/plain`, so the 200 in the browser came from the mock worker, not from the server. The session's `/api/...` requests (`POST /api/auth/login`, `GET /api/course`, `GET /api/lessons/u1-l1`) were all 200.
- Screenshot: `pw-shot-pages-sw-learn-1280-dark.png` (the learning path, scrolled to Unit 3, rendered from mock data; this is the page where the check was run).

### 2. Audio at the sub path

During lesson `u1-l1` (opened by clicking "Lesson 1, Drinks and bread" at `/duolingo-ui-clone/lesson/u1-l1`):

| Request | Status | Content type | Result |
|---|---|---|---|
| `/duolingo-ui-clone/audio/manifest.json` | 200 | `application/json` | pass (also requested by the app itself on lesson start); JSON with `version, model, voiceId, generatedAt, clips`, 120 clips, first clip file `tea.mp3` |
| `/duolingo-ui-clone/audio/tea.mp3` (file named in the manifest) | 200 | `audio/mpeg` | pass, 16343 bytes |
| `/audio/manifest.json` (no base) | 404 | `text/plain` | pass: not the manifest (body starts "The server is configured with a public base URL of /duolingo..."), so nothing depends on the root path |
| `/audio/tea.mp3` (no base) | 404 | `text/plain` | pass, same reading |

The two root probes are the only console errors of this run (2 "Failed to load resource ... 404", both caused by the probes; 0 warnings; the app produced none).

### 3. Deep link refresh

- On the preview: a fresh document load of `/duolingo-ui-clone/learn` (signed in) rendered the learning path, title "Learn | Spiritech", 0 console errors and 0 warnings. A fresh document load of `/duolingo-ui-clone/lesson/u1-l1` rendered the first question, "Which one of these is “tea”?", with its three picture cards and Skip and Check, title "Lesson | Spiritech", 0 console errors and 0 warnings. Pass, under `vite preview`'s own SPA fallback. Screenshots: `pw-shot-pages-deeplink-learn-1280-dark.png` and `pw-shot-pages-deeplink-lesson-1280-dark.png`.
- Through the `404.html` mechanism the way GitHub Pages does it: **not proven**. The plan was a throwaway `node:http` server script outside the repository, serving `dist` at `/duolingo-ui-clone/` and answering non-file paths with `dist/404.html` and status 404. This session could not write a file outside the two working directories (the Write tool refused both `/tmp/...` and the harness temporary directory with "haven't granted it yet"; a `mkdir` in `/tmp` also needed approval), so no script could be created and nothing was run. Writing it inside either repository was ruled out (inside the app repository it must never be committed; inside the team repository only planner and orchestrator may write scratch). What is known instead: `cmp dist/index.html dist/404.html` printed nothing, so `404.html` is byte-identical to `index.html`; combined with the passing preview loads above, this argues, but does not prove, that the `404.html` fallback of Pages would boot the same app for `/learn` or `/lesson/u1-l1`. The HTTP 404 status of that first document request, the app still working on it, and whether a blank flash is visible right after the load (no screenshot of it exists) were not observed. They remain the stated downside of the `404.html` approach and stay for the deployed run on `https://spiritech-ou.github.io/duolingo-ui-clone/` or for a repeat of this task with a writable scratch directory.
- Second attempt (follow-up round): the scratch script was written this time, to `test-results/pages-mimic/server.mjs` (gitignored, so it does not appear in `git status`; `node:http`, `node:fs`, `node:path` only; serves `dist` at `/duolingo-ui-clone/`, answers every non-file path with `dist/404.html`, status 404, `text/html`; port from argument; path traversal guarded). `npm run build:pages` was re-run first and passed, and port 5275 was verified free (`curl` refused). Running it was refused: the shell tool required approval for `node test-results/pages-mimic/server.mjs 5275` ("This Bash command contains multiple operations. The following part requires approval"), and the session is unattended, so the server was never started and no browser step against it was done. No workaround was used. The check stays **not proven**; the command to prove it is `cd <app repo> && npm run build:pages` then `node test-results/pages-mimic/server.mjs 5275`, then open `http://localhost:5275/duolingo-ui-clone/learn` signed out and signed in and read the status of the first document request.

## Summary of every check

| Check | Result |
|---|---|
| Sub path journey (login, onboarding, learn, lesson, end screen, back to path), task 10 | pass |
| Service worker scope `http://localhost:5274/duolingo-ui-clone/` and script `.../duolingo-ui-clone/mockServiceWorker.js` | pass |
| `/api/...` answered by the mock (`/api/course` 200 in the browser, 404 straight from the server) | pass |
| Audio manifest at the sub path (200 `application/json`) | pass |
| Audio clip `tea.mp3` at the sub path (200 `audio/mpeg`) | pass |
| Audio manifest and clip without the base (404, not the manifest) | pass |
| Deep link `/learn` and `/lesson/u1-l1` reloaded on `vite preview` | pass (preview's own SPA fallback) |
| Deep link through `404.html` with HTTP 404 status and blank flash | not proven (mimic script written, but the shell refused to run `node` on it without approval) |
| `dist/404.html` equals `dist/index.html` | pass (`cmp`, byte-identical) |
| Console errors | pass: 0 from the app in both runs; the only errors are the 404s of the deliberate root probes |
| Requests to a root path outside the base | pass: only the mock `/api/...` calls (answered by the worker); every file request is under `/duolingo-ui-clone/`; the root file probes 404 |

## For unit tests, stories or the deployed run (not tested end to end)

- Light theme, 390px width, invalid login, error and empty states: by the testing convention they belong to stories and unit tests; the existing reports cover them on the dev server.
- The audio manifest URL is built from the Vite base through `src/lib/baseUrl.ts` (its comment says tests can stub `BASE_URL`); a unit test of that URL with a non-root base would pin it without a browser (not checked whether one exists).
- A copy of the preview's behaviour (HTTP status, flash) for unknown paths cannot be asserted in a unit test; it is a property of the host.

## Not run

- The `404.html` mechanism check (first document status 404, app working on it, blank flash): the mimic server script exists at `test-results/pages-mimic/server.mjs` (gitignored scratch, left in place) but the shell refused to run it unattended, so the check is not proven: it was not started and nothing was measured.
- The GitHub Pages deployment was not run and cannot be run from here: the real host `https://spiritech-ou.github.io/duolingo-ui-clone/` was never visited. Only the local preview of the build was walked.
- The Chromatic upload was not run (no token, no network job from this session).
- No Playwright spec file, application code or configuration was added or changed in this task.

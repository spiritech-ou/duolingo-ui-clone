# duolingo-ui-clone

- Live app (GitHub Pages, mock data): https://spiritech-ou.github.io/duolingo-ui-clone/
- Live Storybook (hosted by Chromatic, latest build of `main`): https://main--6ae65ce2595832ebd45ff702.chromatic.com/ . It asks for a Chromatic login until the project's access setting is changed to allow viewing without one.
- Chromatic project (builds and visual review): https://www.chromatic.com/builds?appId=6ae65ce2595832ebd45ff702

## Continuous integration

Workflow: `.github/workflows/ci.yml`. It runs on every push to `main` and on pull requests; a newer pull request run cancels the older one (runs on `main` are never cancelled, because they may be deploying).

| Job | When | What it does |
| --- | --- | --- |
| `check` | push and pull request | `npm ci`, installs Playwright Chromium, then `typecheck`, `lint`, `lint:styles`, `test`, `test:storybook`, `build`. Uploads `test-results` on failure. |
| `deploy` | push to `main`, after `check` passes | Calls `.github/workflows/deploy.yml`, which publishes the app to GitHub Pages (mock data, no backend), see below. Pull requests do not deploy. |
| `chromatic` | after `check` passes; pull requests from this repository and pushes to `main` | Visual review with Chromatic, and it publishes the Storybook. It also writes the Chromatic build URL and the hosted Storybook URL to the job summary when the Chromatic CLI reports them (otherwise the summary says they were not reported and points to the step log). Advisory: the job cannot turn the run red (`continue-on-error`). Skipped with a notice in the job summary when the `CHROMATIC_PROJECT_TOKEN` secret is missing. |

The Playwright E2E journeys (`npm run e2e`) are not part of CI yet.

## Deploying to GitHub Pages

Live URL: https://spiritech-ou.github.io/duolingo-ui-clone/

Workflow: `.github/workflows/deploy.yml`, a reusable workflow called by the `deploy` job of `ci.yml`, so it only runs after `check` passed.

### One-time setting

In the GitHub repository open Settings, Pages, and set Source to **GitHub Actions**. A human does this once; it is already done for this repository. Without it the deploy job fails.

### What the workflow does

On a push to `main`, after `check` passes:

1. Builds the app with `npm run build:pages`. The script sets `VITE_USE_MOCKS=true` and the base path `/duolingo-ui-clone/` (the project site is served under that sub path), and adds `404.html` (see deep links below).
2. Adds an empty `.nojekyll` file to `dist`, so Pages does not run Jekyll (which drops files and folders starting with an underscore).
3. Uploads `dist` as the Pages artifact and deploys it with `actions/deploy-pages`.

The deploy is never cancelled halfway by a newer run (concurrency group `pages`, `cancel-in-progress: false`). The `github-pages` environment shows the live URL on the run.

### Mock data, no backend

The deployed app has no backend. It runs on the MSW mock data (served by the browser from the base aware `mockServiceWorker.js`), so nothing entered in the deployed app persists server side and nobody should expect live data.

### Deep links

GitHub Pages has no rewrites. `build:pages` therefore emits `404.html` as a copy of `index.html`: a refresh on a deep link such as `/duolingo-ui-clone/learn` is answered with the app, and the router resolves the URL. Downside: that response carries HTTP status 404, and the page flashes blank for a moment before the app boots.

### No pull request previews

Pages has no native previews, so pull requests build (the `check` job) but do not deploy. Reviewers run the branch locally:

```sh
npm run build:pages
npm run preview:pages
```

`preview:pages` serves the same build at http://localhost:5274/duolingo-ui-clone/.

### Rolling back

Revert the commit on `main` and let the workflow redeploy.

## Storybook on Chromatic

Storybook is hosted by Chromatic, not on GitHub Pages. The Chromatic build URL and the Storybook URL are in the job summary of the `chromatic` job (when the Chromatic CLI reports them), and the Chromatic status check on the pull request links to the build. Storybook runs locally with `npm run storybook`.

### Enable Chromatic

1. Create a project at chromatic.com and link this repository.
2. Copy the project token (Chromatic project, Manage page) and add it in Settings, Secrets and variables, Actions, as a repository secret named `CHROMATIC_PROJECT_TOKEN`.
3. The next run executes the `chromatic` job. The `chromatic` npm package is not a dependency; the job runs the pinned Chromatic CLI with `npx`. Pull requests from forks do not run it (they get no secrets).

How review works:

- The accepted baseline lives on `main`. A pull request with visual changes shows a pending Chromatic check; open the build link from the check, accept or deny each change, and the check turns green.
- The Actions job itself stays green (`--exit-zero-on-changes`, plus `continue-on-error` because Chromatic can report component errors for stories that need the Vitest browser runner; the `check` job already runs every story there); the Chromatic status check carries the review state. Mark that check as required in the branch protection rules if you want merges blocked until the changes are accepted.
- Builds on `main` are auto accepted (`--auto-accept-changes main`) because the changes were reviewed on the pull request. Pull request builds are never auto accepted.
- Snapshots are billed per story. TurboSnap (`--only-changed`) is off; every build snapshots every story.

## Secrets and variables

| Name | Where | Purpose |
| --- | --- | --- |
| `CHROMATIC_PROJECT_TOKEN` | Repository secret (Settings, Secrets and variables, Actions) | The only secret. Chromatic project token for the `chromatic` job; without it the job skips with a notice. |

No deployment secret exists: Pages deploys with the workflow token, using the `pages: write` and `id-token: write` permissions of the Pages deploy job only. No repository variables are used.

## Estonian audio

The word clips are MP3 files in `public/audio/` (one per vocabulary word, about 2.4 MB in total) with a `manifest.json` that maps each Estonian word to its file. They are committed, so a fresh clone plays them without any key. The app plays a clip when the device has no Estonian voice. Every clip is flagged `needsReview` until an Estonian speaker has checked it.

Regenerating them (only needed if the vocabulary changes) uses the ElevenLabs API:

1. Copy `.elevenlabs.env.example` to `.elevenlabs.env` in the repository root (git ignored) and set `ELEVENLABS_API_KEY=` to your key.
2. Run `npm run audio:generate -- --voice <voiceId>`. The clips used so far were made with the ElevenLabs voice Alice (`Xb7hH8MSUJpSbSDYk0k2`) and the `eleven_v3` model. Add `--verify-only` to check the key and the model without generating anything.

The key is read only from `.elevenlabs.env` in the repository root, nowhere else.

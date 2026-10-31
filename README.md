# duolingo-ui-clone

## Continuous integration

Workflow: `.github/workflows/ci.yml`. It runs on every push to `main` and on pull requests; a newer pull request run cancels the older one (runs on `main` are never cancelled, because they may be deploying).

| Job | When | What it does |
| --- | --- | --- |
| `check` | push and pull request | `npm ci`, installs Playwright Chromium, then `typecheck`, `lint`, `lint:styles`, `test`, `test:storybook`, `build`. Uploads `test-results` on failure. |
| `deploy` | after `check` passes; pull requests from this repository and pushes to `main` | Calls `.github/workflows/deploy.yml`: Vercel preview or production, see below. Skipped with a notice in the job summary when the Vercel secrets are missing. |
| `storybook` | push to `main`, after `check` passes | `npm run build-storybook` and deploys `storybook-static` to GitHub Pages. |
| `chromatic` | after `check` passes; pull requests from this repository and pushes to `main` | Visual review with Chromatic. Skipped with a notice in the job summary (the job stays green) when the `CHROMATIC_PROJECT_TOKEN` secret is missing. |

The Playwright E2E journeys (`npm run e2e`) are not part of CI yet.

### Enable the Storybook deployment

1. In the GitHub repository open Settings, Pages, and set Source to GitHub Actions.
2. Push to `main`. The Storybook is published at `https://<org>.github.io/<repo>/` (the URL is also shown on the `github-pages` environment of the run).

### Enable Chromatic

1. Create a project at chromatic.com and link this repository.
2. Copy the project token and add it in Settings, Secrets and variables, Actions, as a repository secret named `CHROMATIC_PROJECT_TOKEN`.
3. The next run executes the `chromatic` job. The `chromatic` npm package is not needed; the official action brings it. Pull requests from forks do not run it (they get no secrets).

How review works:

- The accepted baseline lives on `main`. A pull request with visual changes shows a pending Chromatic check; open the build link from the check, accept or deny each change, and the check turns green.
- The Actions job itself stays green (`exitZeroOnChanges`); the Chromatic status check carries the review state. Mark that check as required in the branch protection rules if you want merges blocked until the changes are accepted.
- Builds on `main` are auto accepted (`autoAcceptChanges: main`) because the changes were reviewed on the pull request. Pull request builds are never auto accepted.
- Snapshots are billed per story. TurboSnap (`onlyChanged`) is off; every build snapshots every story.

## Deploying to Vercel

Workflow: `.github/workflows/deploy.yml` (a reusable workflow called by the `deploy` job of `ci.yml`, so it only runs after `check` passed). Configuration: `vercel.json` (Vite preset, SPA rewrite so deep links such as `/learn` and `/lesson/u1-l1` serve `index.html`, cache and security headers). The deployed app runs on mock data: there is no backend, so `VITE_USE_MOCKS=true` is set for every build (in `vercel.json` and in the workflow) and MSW answers the API calls in the browser from `mockServiceWorker.js`.

### One-time setup

1. Create a Vercel project for this repository (Vercel dashboard, Add New, Project, import the repo), or run `npx vercel link` locally. Linking writes `.vercel/project.json` with `orgId` and `projectId` (the folder is gitignored).
2. Optional: in the project settings set the framework preset to Vite. `vercel.json` already declares it.
3. Create a token in Vercel, Account Settings, Tokens.
4. In GitHub open Settings, Secrets and variables, Actions, and add three repository secrets: `VERCEL_TOKEN` (step 3), `VERCEL_ORG_ID` (`orgId`) and `VERCEL_PROJECT_ID` (`projectId`) from `.vercel/project.json`.
5. If the Vercel project is connected to the GitHub repository through Vercel's own git integration, disable it (project settings, Git, Disconnect) so the same commit is not deployed twice.

Until `VERCEL_TOKEN` exists the workflow skips with a notice and stays green.

### What each trigger does

| Trigger | Result |
| --- | --- |
| Pull request from this repository (not a fork) | Preview deployment, plus a sticky pull request comment with the URL. |
| Push to `main` | After `check` passes, a production deployment. It is never cancelled by a newer run. |
| Pull request from a fork | Nothing (forks get no secrets). |

Each run writes the URL to its job summary. The production URL is also the `production` environment URL of the run (repository Environments page and the deployments list). Steps: `vercel pull`, `vercel build`, `vercel deploy --prebuilt` with the Vercel CLI pinned to version 65.9.0. The token is only passed through the environment of those steps.

### Rolling back

Either run `npx vercel rollback` (rolls production back to the previous deployment, or pass a deployment URL), or in the Vercel dashboard open Deployments, pick an earlier production deployment and choose Promote to Production. Alternatively revert the commit on `main` and let the workflow redeploy.

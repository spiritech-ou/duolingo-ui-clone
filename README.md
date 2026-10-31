# duolingo-ui-clone

## Continuous integration

Workflow: `.github/workflows/ci.yml`. It runs on every push to `main` and on pull requests; a newer run on the same ref cancels the older one.

| Job | When | What it does |
| --- | --- | --- |
| `check` | push and pull request | `npm ci`, installs Playwright Chromium, then `typecheck`, `lint`, `lint:styles`, `test`, `test:storybook`, `build`. |
| `storybook` | push to `main`, after `check` passes | `npm run build-storybook` and deploys `storybook-static` to GitHub Pages. |
| `chromatic` | push and pull request | Visual review with Chromatic. Skipped (green) when the `CHROMATIC_PROJECT_TOKEN` secret is missing. |

The Playwright E2E journeys (`npm run e2e`) are not part of CI yet.

### Enable the Storybook deployment

1. In the GitHub repository open Settings, Pages, and set Source to GitHub Actions.
2. Push to `main`. The Storybook is published at `https://<org>.github.io/<repo>/` (the URL is also shown on the `github-pages` environment of the run).

### Enable Chromatic

1. Create a project at chromatic.com and link this repository.
2. Copy the project token and add it in Settings, Secrets and variables, Actions, as a repository secret named `CHROMATIC_PROJECT_TOKEN`.
3. The next run executes the `chromatic` job. The `chromatic` npm package is not needed; the official action brings it.

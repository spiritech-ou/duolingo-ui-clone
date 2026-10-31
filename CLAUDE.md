# duolingo-ui-clone

React + TypeScript + Vite app. Product brief: `docs/product/brief.md`; brand: `design/brand.md`.

Scripts (`npm run <script>`):
- `dev`, `dev:mocks` (mocks on, port 5273), `build`, `preview`
- `typecheck`, `lint`, `lint:styles`, `test` (unit), `test:storybook`, `e2e`
- `storybook`, `build-storybook`
- `check`: typecheck + lint + lint:styles + test + test:storybook

Layout: components in `src/components/ui/<Name>/`, features in `src/features/`, state in `src/store/`, data in `src/api/` and `src/mocks/`. Imports go downward only (enforced by ESLint). Env is read only in `src/config/env.ts`.

Roles and conventions come from the agentic team repository.

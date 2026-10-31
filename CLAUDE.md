# duolingo-ui-clone

React + TypeScript + Vite app. Product brief: `docs/product/brief.md`; brand: `design/brand.md`.

Scripts (`npm run <script>`):
- `dev`, `dev:mocks` (mocks on, port 5273), `build`, `preview`
- `typecheck`, `lint`, `lint:styles`, `test` (unit), `test:storybook`, `e2e`
- `storybook`, `build-storybook`
- `audio:generate -- --voice <voiceId>`: one-off Estonian clip generation into `public/audio` (ElevenLabs). Run once by the human or operator; NOT part of `check` or the build. The key is `ELEVENLABS_API_KEY` in `~/.elevenlabs.env`, never printed. Options: `--model <eleven_v3|eleven_v4>` (default `eleven_v3`), `--force`, `--dry-run` (lists words and files, no network, key file not read), `--limit <n>`, `--no-language-code` (omit `language_code` if the API rejects it), `--verify-only` (check the model can do Estonian TTS, no synthesis; run this first because the API details in `scripts/audio/elevenlabs.ts` are unverified)
- `check`: typecheck + lint + lint:styles + test + test:storybook

Layout: components in `src/components/ui/<Name>/`, features in `src/features/`, state in `src/store/`, data in `src/api/` and `src/mocks/`. Imports go downward only (enforced by ESLint). Env is read only in `src/config/env.ts`.

Roles and conventions come from the agentic team repository.

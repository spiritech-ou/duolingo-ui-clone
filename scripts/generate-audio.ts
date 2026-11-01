// One-off entry point: `npm run audio:generate -- --voice <voiceId> [options]`.
// Run by the human or operator once; not part of `npm run check` or the build.
import { fileURLToPath } from 'node:url';
import { VOCABULARY_ITEMS } from '../src/mocks/data/vocabulary.ts';
import { runCli } from './audio/cli.ts';
import { createNodeDeps } from './audio/nodeAdapters.ts';

const outDir = fileURLToPath(new URL('../public/audio', import.meta.url));

const code = await runCli(process.argv.slice(2), {
  items: VOCABULARY_ITEMS,
  outDir,
  env: process.env,
  deps: createNodeDeps((message) => console.log(message)),
});
process.exitCode = code;

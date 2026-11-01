import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { readApiKey } from './apiKey.ts';
import type { KeyEnvironment } from './apiKey.ts';
import { verifyModel } from './elevenlabs.ts';
import { AudioGenerationError } from './errors.ts';
import { clipFileName, generateAudio } from './generate.ts';
import type { AudioDeps, AudioItem, AudioModel } from './types.ts';

export const USAGE = `Usage: npm run audio:generate -- --voice <voiceId> [options]

One-off generation of the Estonian word clips into public/audio. The key is read
from ELEVENLABS_API_KEY in .env (see .env.example). Not part of npm run check or the build.

Options:
  --voice <voiceId>          ElevenLabs voice id (required, except with --verify-only)
  --model <eleven_v3|eleven_v4>  model to use (default eleven_v3)
  --force                    regenerate clips that already exist
  --dry-run                  list the words and files, no network call, key file not read
  --limit <n>                write at most n new clips (first trial run)
  --no-language-code         do not send language_code with the requests
  --verify-only              read the key, check the model can do Estonian TTS, synthesize nothing
  --help                     show this text`;

export interface CliOptions {
  readonly voiceId: string | undefined;
  readonly model: AudioModel;
  readonly force: boolean;
  readonly dryRun: boolean;
  readonly limit: number | undefined;
  readonly sendLanguageCode: boolean;
  readonly verifyOnly: boolean;
  readonly help: boolean;
}

export type ParseResult = { ok: true; options: CliOptions } | { ok: false; message: string };

const MODELS: readonly AudioModel[] = ['eleven_v3', 'eleven_v4'];

function isModel(value: string): value is AudioModel {
  return MODELS.some((model) => model === value);
}

/** Pure argument parsing; never reads the environment, the file system or the key. */
export function parseCliArgs(argv: readonly string[]): ParseResult {
  let values;
  try {
    ({ values } = parseArgs({
      args: [...argv],
      allowPositionals: false,
      strict: true,
      allowNegative: false,
      options: {
        voice: { type: 'string' },
        model: { type: 'string' },
        force: { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        limit: { type: 'string' },
        'no-language-code': { type: 'boolean' },
        'verify-only': { type: 'boolean' },
        help: { type: 'boolean' },
      },
    }));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Invalid arguments.' };
  }

  const model = values.model ?? 'eleven_v3';
  if (!isModel(model)) return { ok: false, message: `--model must be eleven_v3 or eleven_v4, got "${model}".` };

  let limit: number | undefined;
  if (values.limit !== undefined) {
    if (!/^[1-9][0-9]*$/.test(values.limit)) return { ok: false, message: '--limit must be a positive whole number.' };
    limit = Number(values.limit);
  }

  const voiceId = values.voice?.trim();
  const help = values.help === true;
  const verifyOnly = values['verify-only'] === true;
  const dryRun = values['dry-run'] === true;
  if (verifyOnly && dryRun) return { ok: false, message: '--verify-only and --dry-run cannot be combined.' };
  if (!help && !verifyOnly && (voiceId === undefined || voiceId === '')) {
    return { ok: false, message: '--voice <voiceId> is required.' };
  }

  return {
    ok: true,
    options: {
      voiceId: voiceId === '' ? undefined : voiceId,
      model,
      force: values.force === true,
      dryRun,
      limit,
      sendLanguageCode: values['no-language-code'] !== true,
      verifyOnly,
      help,
    },
  };
}

export interface CliContext {
  readonly items: readonly AudioItem[];
  readonly outDir: string;
  /** The environment holding ELEVENLABS_API_KEY, only read when the key is needed. */
  readonly env: KeyEnvironment;
  readonly deps: AudioDeps;
}

/** Runs the command and returns the process exit code. Prints through `deps.log` only. */
export async function runCli(argv: readonly string[], context: CliContext): Promise<number> {
  const { deps } = context;
  const parsed = parseCliArgs(argv);
  if (!parsed.ok) {
    deps.log(`Error: ${parsed.message}`);
    deps.log(USAGE);
    return 1;
  }
  const { options } = parsed;
  if (options.help) {
    deps.log(USAGE);
    return 0;
  }

  try {
    if (options.verifyOnly) {
      const apiKey = readApiKey(context.env);
      const verified = await verifyModel(deps, apiKey, options.model);
      deps.log(`Model ${verified.model} can do text-to-speech and lists Estonian (language id "${verified.languageCode}"). Nothing was synthesized.`);
      return 0;
    }

    const voiceId = options.voiceId ?? '';
    if (options.dryRun) {
      let planned = 0;
      let beyondLimit = 0;
      for (const item of context.items) {
        const file = join(context.outDir, clipFileName(item));
        const exists = await deps.fs.exists(file);
        const skip = exists && !options.force;
        if (!skip && options.limit !== undefined && planned >= options.limit) {
          beyondLimit += 1;
          continue;
        }
        if (skip) {
          deps.log(`Would skip ${item.estonian.normalize('NFC')} -> ${file} (exists)`);
        } else {
          planned += 1;
          deps.log(`Would write ${item.estonian.normalize('NFC')} -> ${file}`);
        }
      }
      if (beyondLimit > 0) deps.log(`${beyondLimit} further clip(s) not listed: beyond --limit.`);
      deps.log(`Dry run: ${planned} clip(s) would be written with model ${options.model}, voice ${voiceId}. No network call was made and the key file was not read.`);
      return 0;
    }

    const result = await generateAudio({
      items: context.items,
      model: options.model,
      voiceId,
      outDir: context.outDir,
      env: context.env,
      force: options.force,
      sendLanguageCode: options.sendLanguageCode,
      ...(options.limit === undefined ? {} : { limit: options.limit }),
      deps,
    });
    deps.log(`Done: ${result.generated} written, ${result.skipped} skipped. Manifest lists ${Object.keys(result.manifest.clips).length} clip(s), all marked needsReview.`);
    return 0;
  } catch (error) {
    // AudioGenerationError messages are already key-free; anything else is reduced to its message.
    const message = error instanceof AudioGenerationError ? error.message : 'Unexpected failure.';
    deps.log(`Error: ${message}`);
    return 1;
  }
}

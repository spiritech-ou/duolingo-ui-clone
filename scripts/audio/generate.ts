import { join } from 'node:path';
import { readApiKey } from './apiKey.ts';
import type { KeyEnvironment } from './apiKey.ts';
import { isPlainLanguageCode, synthesize, verifyModel } from './elevenlabs.ts';
import type { RetryPolicy } from './elevenlabs.ts';
import { AudioGenerationError, redact } from './errors.ts';
import type { AudioDeps, AudioItem, AudioModel, Manifest } from './types.ts';

export const MANIFEST_FILE = 'manifest.json';

export interface GenerateOptions {
  /** Items in dataset order (VOCABULARY_ITEMS). */
  readonly items: readonly AudioItem[];
  readonly model: AudioModel;
  readonly voiceId: string;
  /** Output folder, `public/audio` in the repository. */
  readonly outDir: string;
  /** The environment holding ELEVENLABS_API_KEY, passed by the caller at run time. */
  readonly env: KeyEnvironment;
  /** Regenerate clips that already exist. */
  readonly force?: boolean;
  readonly retry?: RetryPolicy;
  /** Per request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /**
   * Send `language_code` with each request (default true). It is sent only when the
   * models endpoint reports a plain two-letter code (`et`); otherwise it is omitted.
   */
  readonly sendLanguageCode?: boolean;
  /** Stop after this many newly written clips (skipped clips do not count); the manifest still covers every existing clip. */
  readonly limit?: number;
  readonly deps: AudioDeps;
}

export interface GenerateResult {
  readonly generated: number;
  readonly skipped: number;
  readonly manifest: Manifest;
}

export function clipFileName(item: AudioItem): string {
  return `${item.id}.mp3`;
}

/** Entries only for clips whose file exists, ordered like the dataset; every entry needsReview. */
async function buildManifest(options: GenerateOptions): Promise<Manifest> {
  const { deps } = options;
  const clips: Manifest['clips'] = {};
  for (const item of options.items) {
    const file = clipFileName(item);
    if (await deps.fs.exists(join(options.outDir, file))) {
      clips[item.estonian.normalize('NFC')] = { itemId: item.id, file, needsReview: true };
    }
  }
  return {
    version: 1,
    model: options.model,
    voiceId: options.voiceId,
    generatedAt: deps.clock.now().toISOString(),
    clips,
  };
}

export const TEMP_SUFFIX = '.part';

/** Writes to a temp name in the same folder, then renames, so the final name never holds a partial file. */
async function writeAtomic(deps: AudioDeps, path: string, data: string | Uint8Array): Promise<void> {
  const temp = `${path}${TEMP_SUFFIX}`;
  await deps.fs.writeFile(temp, data);
  await deps.fs.rename(temp, path);
}

async function writeManifest(options: GenerateOptions): Promise<Manifest> {
  const manifest = await buildManifest(options);
  await writeAtomic(options.deps, join(options.outDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function generateAudio(options: GenerateOptions): Promise<GenerateResult> {
  const { deps } = options;
  const apiKey = readApiKey(options.env);
  // From here on every message is redacted, whatever produced it.
  const safeDeps: AudioDeps = { ...deps, log: (message) => deps.log(redact(message, apiKey)) };
  const verified = await verifyModel(safeDeps, apiKey, options.model, options.timeoutMs);
  safeDeps.log(`Model ${verified.model} can do text-to-speech and lists Estonian (${verified.languageCode}).`);
  const languageCode =
    options.sendLanguageCode !== false && isPlainLanguageCode(verified.languageCode) ? verified.languageCode : undefined;
  if (languageCode === undefined) safeDeps.log('language_code will not be sent.');

  await deps.fs.mkdir(options.outDir);
  let generated = 0;
  let skipped = 0;
  try {
    for (const item of options.items) {
      if (options.limit !== undefined && generated >= options.limit) break;
      const path = join(options.outDir, clipFileName(item));
      if (options.force !== true && (await deps.fs.exists(path))) {
        skipped += 1;
        safeDeps.log(`Skip ${item.id}: clip exists.`);
        continue;
      }
      const bytes = await synthesize(safeDeps, apiKey, {
        voiceId: options.voiceId,
        model: verified.model,
        languageCode,
        text: item.estonian.normalize('NFC'),
        ...(options.retry === undefined ? {} : { retry: options.retry }),
        ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      });
      await writeAtomic(deps, path, bytes);
      generated += 1;
      safeDeps.log(`Wrote ${item.id}.mp3`);
    }
  } catch (error) {
    // A failed run still records the clips that exist, so it can resume.
    await writeManifest(options);
    if (error instanceof AudioGenerationError) throw error;
    throw new AudioGenerationError(
      `Generation stopped: ${error instanceof Error ? error.message : 'unknown error'}`,
      apiKey,
    );
  }
  const manifest = await writeManifest(options);
  return { generated, skipped, manifest };
}

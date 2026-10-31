import { z } from 'zod';
import { AudioGenerationError, redact } from './errors.ts';
import type { AudioDeps, AudioModel, HttpRequest, HttpResponse } from './types.ts';

// UNVERIFIED against the live API reference (the documentation could not be fetched
// when this was written). This is the single place that records what is assumed.
//
// CHECKLIST before the first real run, against the current ElevenLabs API reference:
//  1. GET /v1/models is the models endpoint and answers an array of models.
//  2. Each model has `model_id`, `can_do_text_to_speech` (boolean) and
//     `languages[{language_id, name}]`.
//  3. The key travels in the `xi-api-key` header (and nowhere else).
//  4. Text-to-speech is POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128
//     with body {text, model_id, language_code} and answers with mp3 bytes.
//  5. How eleven_v3 / eleven_v4 name Estonian (here matched by language id `et` or
//     `est`, or by the name "Estonian") and whether `language_code` accepts `et`.
//     The code is sent only when it looks like a two-letter ISO 639-1 code, and the
//     caller can omit it altogether (`sendLanguageCode: false`).
//  6. Rate limiting answers 429, with an optional Retry-After header in seconds.

export const API_BASE_URL = 'https://api.elevenlabs.io';
export const OUTPUT_FORMAT = 'mp3_44100_128';
export const KEY_HEADER = 'xi-api-key';
const ESTONIAN_IDS = ['et', 'est'];
const MAX_ERROR_BODY = 200;

const modelsSchema = z.array(
  z.object({
    model_id: z.string(),
    can_do_text_to_speech: z.boolean().nullish(),
    languages: z.array(z.object({ language_id: z.string(), name: z.string().nullish() })).nullish(),
  }),
);

export interface VerifiedModel {
  readonly model: AudioModel;
  /** The Estonian language id exactly as the models endpoint reports it. */
  readonly languageCode: string;
}

async function describeFailure(response: HttpResponse, apiKey: string): Promise<string> {
  let body = '';
  try {
    body = (await response.text()).slice(0, MAX_ERROR_BODY);
  } catch {
    body = '';
  }
  return redact(body, apiKey);
}

export const DEFAULT_TIMEOUT_MS = 60000;

/** A fetch bounded by a timeout; every failure becomes a key-free AudioGenerationError. */
async function send(
  deps: AudioDeps,
  apiKey: string,
  url: string,
  init: Omit<HttpRequest, 'signal'>,
  timeoutMs: number,
): Promise<HttpResponse> {
  const controller = new AbortController();
  let cancel = (): void => {};
  const timedOut = new Promise<never>((_resolve, reject) => {
    cancel = deps.clock.setTimer(() => {
      controller.abort();
      reject(new AudioGenerationError(`Request to ${url} timed out after ${timeoutMs} ms.`, apiKey));
    }, timeoutMs);
  });
  try {
    return await Promise.race([deps.fetch(url, { ...init, signal: controller.signal }), timedOut]);
  } catch (error) {
    if (error instanceof AudioGenerationError) throw error;
    // Keep only a redacted message: never the error object, which could hold the request.
    const reason = error instanceof Error ? error.message : 'unknown error';
    throw new AudioGenerationError(`Request to ${url} failed: ${reason}`, apiKey);
  } finally {
    cancel();
  }
}

/** True for a plain two-letter ISO 639-1 code such as `et`; anything else is not sent as `language_code`. */
export function isPlainLanguageCode(code: string): boolean {
  return /^[a-z]{2}$/.test(code);
}

export async function verifyModel(
  deps: AudioDeps,
  apiKey: string,
  model: AudioModel,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<VerifiedModel> {
  const response = await send(
    deps,
    apiKey,
    `${API_BASE_URL}/v1/models`,
    { method: 'GET', headers: { [KEY_HEADER]: apiKey, Accept: 'application/json' } },
    timeoutMs,
  );
  if (!response.ok) {
    const detail = await describeFailure(response, apiKey);
    throw new AudioGenerationError(`Models endpoint answered ${response.status}. ${detail}`.trim(), apiKey);
  }
  const parsed = modelsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AudioGenerationError('Models endpoint answered with an unexpected shape.', apiKey);
  }
  const found = parsed.data.find((entry) => entry.model_id === model);
  if (found === undefined) {
    throw new AudioGenerationError(`Model ${model} is not offered by the models endpoint.`, apiKey);
  }
  if (found.can_do_text_to_speech !== true) {
    throw new AudioGenerationError(`Model ${model} cannot do text-to-speech.`, apiKey);
  }
  const estonian = (found.languages ?? []).find(
    (language) =>
      ESTONIAN_IDS.includes(language.language_id.toLowerCase()) || language.name?.toLowerCase() === 'estonian',
  );
  if (estonian === undefined) {
    throw new AudioGenerationError(`Model ${model} does not list Estonian among its languages.`, apiKey);
  }
  return { model, languageCode: estonian.language_id };
}

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryPolicy = { maxRetries: 5, baseDelayMs: 1000, maxDelayMs: 30000 };

function retryDelay(response: HttpResponse, attempt: number, policy: RetryPolicy): number {
  const header = Number(response.headers.get('retry-after'));
  const requested = Number.isFinite(header) && header > 0 ? header * 1000 : policy.baseDelayMs * 2 ** attempt;
  return Math.min(requested, policy.maxDelayMs);
}

export interface SynthesizeOptions {
  readonly voiceId: string;
  readonly model: AudioModel;
  /** Sent as `language_code` when given; omitted from the request when undefined. */
  readonly languageCode?: string | undefined;
  readonly text: string;
  readonly retry?: RetryPolicy;
  readonly timeoutMs?: number;
}

/** Returns the mp3 bytes for exactly `text`. Retries politely on 429 with a bounded delay. */
export async function synthesize(deps: AudioDeps, apiKey: string, options: SynthesizeOptions): Promise<Uint8Array> {
  const policy = options.retry ?? DEFAULT_RETRY;
  const url = `${API_BASE_URL}/v1/text-to-speech/${encodeURIComponent(options.voiceId)}?output_format=${OUTPUT_FORMAT}`;
  const init = {
    method: 'POST' as const,
    headers: { [KEY_HEADER]: apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: options.text,
      model_id: options.model,
      ...(options.languageCode === undefined ? {} : { language_code: options.languageCode }),
    }),
  };
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  for (let attempt = 0; ; attempt += 1) {
    const response = await send(deps, apiKey, url, init, timeoutMs);
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length === 0) {
        throw new AudioGenerationError(`Text-to-speech returned an empty clip for "${options.text}".`, apiKey);
      }
      return bytes;
    }
    if (response.status === 429 && attempt < policy.maxRetries) {
      const delay = retryDelay(response, attempt, policy);
      deps.log(`Rate limited; waiting ${delay} ms before retry ${attempt + 1} of ${policy.maxRetries}.`);
      await deps.clock.sleep(delay);
      continue;
    }
    const detail = await describeFailure(response, apiKey);
    const hint = response.status === 429 ? ' (retries exhausted)' : '';
    throw new AudioGenerationError(
      `Text-to-speech for "${options.text}" answered ${response.status}${hint}. ${detail}`.trim(),
      apiKey,
    );
  }
}

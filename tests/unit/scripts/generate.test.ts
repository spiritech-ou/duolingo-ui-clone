import { describe, expect, it } from 'vitest';
import { generateAudio } from '@scripts/audio/generate';
import type { GenerateOptions } from '@scripts/audio/generate';
import type { Manifest } from '@scripts/audio/types';
import { GOOD_MODELS, HOME, KEY_PATH, OUT, SENTINEL, makeHarness, makeResponse } from './helpers';
import type { Call, Harness } from './helpers';

const ITEMS = [
  { id: 'v-tee', estonian: 'tee' },
  { id: 'v-oun', estonian: 'õun'.normalize('NFC') },
  { id: 'v-sokolaad', estonian: 'š'.normalize('NFD') + 'okolaad' },
];

const KEY_FILE = { [KEY_PATH]: `ELEVENLABS_API_KEY="${SENTINEL}"\n` };

function respond(call: Call): ReturnType<typeof makeResponse> {
  if (call.url.endsWith('/v1/models')) return makeResponse({ json: GOOD_MODELS });
  return makeResponse({ bytes: new TextEncoder().encode(`audio:${call.init.body ?? ''}`) });
}

function options(h: Harness, extra: Partial<GenerateOptions> = {}): GenerateOptions {
  return { items: ITEMS, model: 'eleven_v3', voiceId: 'voice-1', outDir: OUT, homeDir: HOME, deps: h.deps, ...extra };
}

function manifestOf(h: Harness): Manifest {
  const raw = h.fs.files.get(`${OUT}/manifest.json`);
  return JSON.parse(typeof raw === 'string' ? raw : '{}'); // test fixture: shape asserted by the expectations below
}

function everythingWritten(h: Harness): string {
  const parts: string[] = [...h.logs];
  for (const [path, data] of h.fs.files) {
    if (path === KEY_PATH) continue;
    parts.push(path, typeof data === 'string' ? data : new TextDecoder().decode(data));
  }
  return parts.join('\n');
}

describe('generateAudio', () => {
  it('writes one clip per word with the exact NFC text and a manifest ordered like the dataset', async () => {
    const h = makeHarness(respond, KEY_FILE);
    const result = await generateAudio(options(h));
    expect(result).toMatchObject({ generated: 3, skipped: 0 });

    const speech = h.calls.filter((c) => c.url.includes('/text-to-speech/'));
    expect(speech.map((c) => JSON.parse(c.init.body ?? '{}').text)).toEqual(['tee', 'õun', 'šokolaad']);
    expect(speech.every((c) => c.init.headers['xi-api-key'] === SENTINEL)).toBe(true);
    expect(h.fs.files.has(`${OUT}/v-oun.mp3`)).toBe(true);

    const manifest = manifestOf(h);
    expect(manifest).toMatchObject({ version: 1, model: 'eleven_v3', voiceId: 'voice-1', generatedAt: '2026-01-02T03:04:05.000Z' });
    expect(Object.keys(manifest.clips)).toEqual(['tee', 'õun', 'šokolaad']);
    for (const key of Object.keys(manifest.clips)) expect(key).toBe(key.normalize('NFC'));
    expect(manifest.clips['õun']).toEqual({ itemId: 'v-oun', file: 'v-oun.mp3', needsReview: true });
    expect(Object.values(manifest.clips).every((c) => c.needsReview === true)).toBe(true);
  });

  describe('language_code', () => {
    const bodies = (h: Harness): Array<Record<string, unknown>> =>
      h.calls.filter((c) => c.url.includes('/text-to-speech/')).map((c) => JSON.parse(c.init.body ?? '{}'));

    it('is sent by default when the models endpoint reports a two-letter code', async () => {
      const h = makeHarness(respond, KEY_FILE);
      await generateAudio(options(h));
      expect(bodies(h).every((b) => b['language_code'] === 'et')).toBe(true);
    });

    it('can be omitted by the caller', async () => {
      const h = makeHarness(respond, KEY_FILE);
      await generateAudio(options(h, { sendLanguageCode: false }));
      expect(bodies(h).every((b) => !('language_code' in b))).toBe(true);
    });

    it('is omitted when the reported id is not a plain two-letter code', async () => {
      const models = [{ model_id: 'eleven_v3', can_do_text_to_speech: true, languages: [{ language_id: 'est', name: 'Estonian' }] }];
      const h = makeHarness((call) => (call.url.endsWith('/v1/models') ? makeResponse({ json: models }) : respond(call)), KEY_FILE);
      await generateAudio(options(h));
      expect(bodies(h)).toHaveLength(3);
      expect(bodies(h).every((b) => !('language_code' in b))).toBe(true);
    });
  });

  it('writes each clip and the manifest through a temp name, then renames', async () => {
    const h = makeHarness(respond, KEY_FILE);
    await generateAudio(options(h));
    expect(h.fs.writes).toEqual([
      `${OUT}/v-tee.mp3.part`,
      `${OUT}/v-oun.mp3.part`,
      `${OUT}/v-sokolaad.mp3.part`,
      `${OUT}/manifest.json.part`,
    ]);
    expect([...h.fs.files.keys()].some((path) => path.endsWith('.part'))).toBe(false);
  });

  it('leaves no truncated clip under the final name when interrupted, so a rerun regenerates it', async () => {
    const h = makeHarness(respond, KEY_FILE);
    h.fs.failRename = true;
    await expect(generateAudio(options(h))).rejects.toThrow();
    expect(h.fs.files.has(`${OUT}/v-tee.mp3`)).toBe(false);

    h.fs.failRename = false;
    const rerun = await generateAudio(options(h));
    expect(rerun).toMatchObject({ generated: 3, skipped: 0 });
    expect(h.fs.files.has(`${OUT}/v-tee.mp3`)).toBe(true);
  });

  it('turns a stalled request into a key-free error (here during the model check, so nothing is written)', async () => {
    const h = makeHarness(() => new Promise(() => {}), KEY_FILE, { fireTimers: true });
    const error = await generateAudio(options(h, { timeoutMs: 500 })).catch((e: unknown) => e);
    expect(String(error)).toMatch(/timed out after 500 ms/);
    expect(String(error)).not.toContain(SENTINEL);
    expect(h.timers).toEqual([500]);
    expect(h.fs.files.has(`${OUT}/manifest.json`)).toBe(false);
  });

  it('skips clips that exist, unless forced', async () => {
    const existing = { ...KEY_FILE, [`${OUT}/v-tee.mp3`]: new Uint8Array([5]) };
    const h = makeHarness(respond, existing);
    const result = await generateAudio(options(h));
    expect(result).toMatchObject({ generated: 2, skipped: 1 });
    expect(h.calls.filter((c) => c.url.includes('/text-to-speech/'))).toHaveLength(2);
    expect(h.fs.files.get(`${OUT}/v-tee.mp3`)).toEqual(new Uint8Array([5]));
    expect(Object.keys(manifestOf(h).clips)).toEqual(['tee', 'õun', 'šokolaad']);

    const forced = makeHarness(respond, existing);
    await generateAudio(options(forced, { force: true }));
    expect(forced.calls.filter((c) => c.url.includes('/text-to-speech/'))).toHaveLength(3);
  });

  it('retries a rate-limited clip and still finishes', async () => {
    let limited = false;
    const h = makeHarness((call) => {
      if (call.url.includes('/text-to-speech/') && !limited) {
        limited = true;
        return makeResponse({ status: 429, headers: { 'retry-after': '1' } });
      }
      return respond(call);
    }, KEY_FILE);
    const result = await generateAudio(options(h));
    expect(result.generated).toBe(3);
    expect(h.sleeps).toEqual([1000]);
  });

  it('stops before any synthesis when the model check fails', async () => {
    const h = makeHarness(() => makeResponse({ json: [] }), KEY_FILE);
    await expect(generateAudio(options(h))).rejects.toThrow(/not offered/);
    expect(h.calls).toHaveLength(1);
    expect(h.fs.files.has(`${OUT}/manifest.json`)).toBe(false);
  });

  it('fails clearly without calling the network when the key file is missing', async () => {
    const h = makeHarness(respond, {});
    await expect(generateAudio(options(h))).rejects.toThrow(/Key file not found/);
    expect(h.calls).toHaveLength(0);
  });

  it('records the clips that exist when a run fails, so it can resume', async () => {
    const h = makeHarness((call) => {
      if (call.init.body?.includes('šokolaad')) return makeResponse({ status: 500, text: `boom ${SENTINEL}` });
      return respond(call);
    }, KEY_FILE);
    const error = await generateAudio(options(h)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(Object.keys(manifestOf(h).clips)).toEqual(['tee', 'õun']);
  });

  it('never lets the key reach a log, the manifest, a clip, a path or an error', async () => {
    // Success path.
    const ok = makeHarness(respond, KEY_FILE);
    await generateAudio(options(ok));
    expect(everythingWritten(ok)).not.toContain(SENTINEL);

    // Failure paths: server errors echoing the key, a network error holding it, a rate limit that never clears.
    const failures: Array<(call: Call) => ReturnType<typeof makeResponse>> = [
      (call) => (call.url.includes('/text-to-speech/') ? makeResponse({ status: 401, text: `bad ${SENTINEL}` }) : respond(call)),
      (call) => {
        if (call.url.includes('/text-to-speech/')) throw new Error(`reset while sending ${call.init.headers['xi-api-key']}`);
        return respond(call);
      },
      (call) => (call.url.includes('/text-to-speech/') ? makeResponse({ status: 429, text: SENTINEL }) : respond(call)),
      () => makeResponse({ status: 403, text: SENTINEL }),
    ];
    for (const failure of failures) {
      const h = makeHarness(failure, KEY_FILE);
      const error = await generateAudio(options(h)).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect(JSON.stringify(error, Object.getOwnPropertyNames(error))).not.toContain(SENTINEL);
      expect(String(error)).not.toContain(SENTINEL);
      expect(everythingWritten(h)).not.toContain(SENTINEL);
    }
  });
});

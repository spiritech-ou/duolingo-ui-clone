import { describe, expect, it } from 'vitest';
import { synthesize, verifyModel } from '@scripts/audio/elevenlabs';
import { GOOD_MODELS, SENTINEL, makeHarness, makeResponse } from './helpers';

async function messageOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return 'did not throw';
}

describe('verifyModel', () => {
  it('passes for a text-to-speech model that lists Estonian, and sends the key only as a header', async () => {
    const h = makeHarness(() => makeResponse({ json: GOOD_MODELS }));
    await expect(verifyModel(h.deps, SENTINEL, 'eleven_v3')).resolves.toEqual({ model: 'eleven_v3', languageCode: 'et' });
    const call = h.calls[0];
    expect(call?.url).toBe('https://api.elevenlabs.io/v1/models');
    expect(call?.init.method).toBe('GET');
    expect(call?.init.headers['xi-api-key']).toBe(SENTINEL);
    expect(call?.url).not.toContain(SENTINEL);
    expect(call?.init.body).toBeUndefined();
  });

  it('accepts the ISO 639-3 id and the language name', async () => {
    const models = [{ model_id: 'eleven_v4', can_do_text_to_speech: true, languages: [{ language_id: 'est', name: 'Estonian' }] }];
    const h = makeHarness(() => makeResponse({ json: models }));
    await expect(verifyModel(h.deps, SENTINEL, 'eleven_v4')).resolves.toEqual({ model: 'eleven_v4', languageCode: 'est' });
  });

  it.each([
    ['the model is not offered', [], /not offered/],
    ['it cannot do text-to-speech', [{ model_id: 'eleven_v3', can_do_text_to_speech: false, languages: [{ language_id: 'et' }] }], /cannot do text-to-speech/],
    ['it does not list Estonian', [{ model_id: 'eleven_v3', can_do_text_to_speech: true, languages: [{ language_id: 'en' }] }], /does not list Estonian/],
  ])('stops with a clear message when %s', async (_name, models, pattern) => {
    const h = makeHarness(() => makeResponse({ json: models }));
    await expect(verifyModel(h.deps, SENTINEL, 'eleven_v3')).rejects.toThrow(pattern);
  });

  it('never leaks the key through an HTTP failure, a bad shape or a network error', async () => {
    const failing = makeHarness(() => makeResponse({ status: 401, text: `invalid key ${SENTINEL}` }));
    const failMessage = await messageOf(verifyModel(failing.deps, SENTINEL, 'eleven_v3'));
    expect(failMessage).toContain('401');
    expect(failMessage).not.toContain(SENTINEL);

    const odd = makeHarness(() => makeResponse({ json: { detail: SENTINEL } }));
    expect(await messageOf(verifyModel(odd.deps, SENTINEL, 'eleven_v3'))).not.toContain(SENTINEL);

    const broken = makeHarness(() => {
      throw new Error(`socket closed for header xi-api-key=${SENTINEL}`);
    });
    const networkMessage = await messageOf(verifyModel(broken.deps, SENTINEL, 'eleven_v3'));
    expect(networkMessage).toContain('failed');
    expect(networkMessage).not.toContain(SENTINEL);
  });
});

describe('synthesize', () => {
  const options = { voiceId: 'voice/1', model: 'eleven_v3', languageCode: 'et', text: 'õun' } as const;
  const retry = { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 250 };

  it('sends the exact text, model and language with the key only in the header', async () => {
    const h = makeHarness(() => makeResponse({ bytes: new Uint8Array([9, 8, 7]) }));
    const bytes = await synthesize(h.deps, SENTINEL, options);
    expect(Array.from(bytes)).toEqual([9, 8, 7]);
    const call = h.calls[0];
    expect(call?.url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice%2F1?output_format=mp3_44100_128');
    expect(call?.init.method).toBe('POST');
    expect(call?.init.headers['xi-api-key']).toBe(SENTINEL);
    expect(call?.init.body).toBeDefined();
    expect(JSON.parse(call?.init.body ?? '{}')).toEqual({ text: 'õun', model_id: 'eleven_v3', language_code: 'et' });
    expect(call?.url).not.toContain(SENTINEL);
    expect(call?.init.body).not.toContain(SENTINEL);
  });

  it('omits language_code from the body when none is given', async () => {
    const h = makeHarness(() => makeResponse({}));
    await synthesize(h.deps, SENTINEL, { voiceId: 'v', model: 'eleven_v3', text: 'tee' });
    expect(JSON.parse(h.calls[0]?.init.body ?? '{}')).toEqual({ text: 'tee', model_id: 'eleven_v3' });
  });

  it('turns a stalled request into a key-free error, with an abort signal and the configured bound', async () => {
    const stalled = makeHarness(() => new Promise(() => {}), undefined, { fireTimers: true });
    const message = await messageOf(synthesize(stalled.deps, SENTINEL, { ...options, timeoutMs: 1234 }));
    expect(message).toMatch(/timed out after 1234 ms/);
    expect(message).not.toContain(SENTINEL);
    expect(stalled.timers).toEqual([1234]);
    expect(stalled.calls[0]?.init.signal?.aborted).toBe(true);

    const models = makeHarness(() => new Promise(() => {}), undefined, { fireTimers: true });
    expect(await messageOf(verifyModel(models.deps, SENTINEL, 'eleven_v3'))).toMatch(/timed out after 60000 ms/);
  });

  it('arms a timer on every request and does not time out a prompt answer', async () => {
    const h = makeHarness(() => makeResponse({ json: GOOD_MODELS }));
    await verifyModel(h.deps, SENTINEL, 'eleven_v3');
    expect(h.timers).toEqual([60000]);
    expect(h.calls[0]?.init.signal?.aborted).toBe(false);
  });

  it('retries on rate limiting, honours Retry-After, and bounds the delay', async () => {
    const h = makeHarness((_call, index) =>
      index === 0
        ? makeResponse({ status: 429, headers: { 'retry-after': '2' } })
        : index === 1
          ? makeResponse({ status: 429 })
          : makeResponse({}),
    );
    await synthesize(h.deps, SENTINEL, { ...options, retry });
    expect(h.calls).toHaveLength(3);
    // Retry-After 2 s is capped at 250 ms; the second wait is the backoff 100 * 2.
    expect(h.sleeps).toEqual([250, 200]);
  });

  it('gives up after the bounded number of retries without leaking the key', async () => {
    const h = makeHarness(() => makeResponse({ status: 429, text: `slow down ${SENTINEL}` }));
    const message = await messageOf(synthesize(h.deps, SENTINEL, { ...options, retry }));
    expect(h.calls).toHaveLength(4);
    expect(message).toContain('429');
    expect(message).not.toContain(SENTINEL);
  });

  it('does not retry other failures, and an empty clip is an error', async () => {
    const bad = makeHarness(() => makeResponse({ status: 500, text: SENTINEL }));
    const message = await messageOf(synthesize(bad.deps, SENTINEL, { ...options, retry }));
    expect(bad.calls).toHaveLength(1);
    expect(message).not.toContain(SENTINEL);

    const empty = makeHarness(() => makeResponse({ bytes: new Uint8Array() }));
    await expect(synthesize(empty.deps, SENTINEL, options)).rejects.toThrow(/empty clip/);
  });
});

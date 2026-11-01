import { describe, expect, it } from 'vitest';
import { parseCliArgs, runCli } from '@scripts/audio/cli';
import { GOOD_MODELS, HOME, KEY_PATH, OUT, SENTINEL, makeHarness, makeResponse } from './helpers';
import type { Call, Harness } from './helpers';

const ITEMS = [
  { id: 'v-tee', estonian: 'tee' },
  { id: 'v-oun', estonian: 'õun' },
  { id: 'v-leib', estonian: 'leib' },
];

function respond(call: Call): ReturnType<typeof makeResponse> {
  if (call.url.endsWith('/v1/models')) return makeResponse({ json: GOOD_MODELS });
  return makeResponse({ bytes: new Uint8Array([9, 9]) });
}

function run(h: Harness, argv: string[]): Promise<number> {
  return runCli(argv, { items: ITEMS, outDir: OUT, rootDir: HOME, deps: h.deps });
}

describe('parseCliArgs', () => {
  it('applies defaults', () => {
    expect(parseCliArgs(['--voice', 'abc'])).toEqual({
      ok: true,
      options: {
        voiceId: 'abc',
        model: 'eleven_v3',
        force: false,
        dryRun: false,
        limit: undefined,
        sendLanguageCode: true,
        verifyOnly: false,
        help: false,
      },
    });
  });

  it('parses every flag', () => {
    const result = parseCliArgs(['--voice', 'abc', '--model', 'eleven_v4', '--force', '--dry-run', '--limit', '3', '--no-language-code']);
    expect(result).toMatchObject({
      ok: true,
      options: { model: 'eleven_v4', force: true, dryRun: true, limit: 3, sendLanguageCode: false },
    });
  });

  it('does not require a voice for --verify-only or --help', () => {
    expect(parseCliArgs(['--verify-only'])).toMatchObject({ ok: true, options: { verifyOnly: true, voiceId: undefined } });
    expect(parseCliArgs(['--help'])).toMatchObject({ ok: true, options: { help: true } });
  });

  it.each([
    [[], '--voice'],
    [['--voice', ''], '--voice'],
    [['--voice', 'a', '--model', 'eleven_v2'], '--model'],
    [['--voice', 'a', '--limit', '0'], '--limit'],
    [['--voice', 'a', '--limit', '2x'], '--limit'],
    [['--voice', 'a', '--limit', '-1'], '--limit'],
    [['--voice', 'a', '--bogus'], 'bogus'],
    [['--voice', 'a', 'extra'], 'extra'],
    [['--verify-only', '--dry-run'], 'cannot be combined'],
  ])('rejects %j', (argv, fragment) => {
    const result = parseCliArgs(argv);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(fragment);
  });
});

describe('runCli', () => {
  it('dry run lists words and files, makes no call and never reads the key file', async () => {
    const h = makeHarness(respond, {});
    let keyFileRead = false;
    const readText = h.deps.fs.readText;
    h.deps.fs.readText = (path) => {
      if (path === KEY_PATH) keyFileRead = true;
      return readText(path);
    };
    const code = await run(h, ['--voice', 'v1', '--dry-run']);
    expect(code).toBe(0);
    expect(h.calls).toHaveLength(0);
    expect(keyFileRead).toBe(false);
    expect(h.fs.writes).toHaveLength(0);
    expect(h.logs.join('\n')).toContain(`Would write õun -> ${OUT}/v-oun.mp3`);
    expect(h.logs.join('\n')).toContain('3 clip(s) would be written');
  });

  it('dry run marks existing clips as skipped unless forced, and honours the limit', async () => {
    const h = makeHarness(respond, { [`${OUT}/v-tee.mp3`]: new Uint8Array([1]) });
    await run(h, ['--voice', 'v1', '--dry-run', '--limit', '1']);
    const text = h.logs.join('\n');
    expect(text).toContain('Would skip tee');
    expect(text).toContain('Would write õun');
    expect(text).not.toContain('Would write leib');
    expect(text).toContain('1 further clip(s) not listed');
    h.logs.length = 0;
    await run(h, ['--voice', 'v1', '--dry-run', '--force']);
    expect(h.logs.join('\n')).toContain('Would write tee');
  });

  it('verify-only checks the model and synthesizes nothing', async () => {
    const h = makeHarness(respond);
    const code = await run(h, ['--verify-only']);
    expect(code).toBe(0);
    expect(h.calls.map((c) => c.url)).toEqual(['https://api.elevenlabs.io/v1/models']);
    expect(h.fs.writes).toHaveLength(0);
    expect(h.logs.join('\n')).toContain('lists Estonian');
    expect(h.logs.join('\n')).not.toContain(SENTINEL);
  });

  it('verify-only fails with a clear message when the model cannot do Estonian', async () => {
    const h = makeHarness(() => makeResponse({ json: [{ model_id: 'eleven_v3', can_do_text_to_speech: true, languages: [] }] }));
    expect(await run(h, ['--verify-only'])).toBe(1);
    expect(h.logs.join('\n')).toContain('does not list Estonian');
    expect(h.logs.join('\n')).not.toContain(SENTINEL);
  });

  it('verify-only fails without calling anything when the key file is missing', async () => {
    const h = makeHarness(respond, {});
    expect(await run(h, ['--verify-only'])).toBe(1);
    expect(h.calls).toHaveLength(0);
  });

  it('generates clips, honours --limit and --no-language-code, and never prints the key', async () => {
    const h = makeHarness(respond);
    const code = await run(h, ['--voice', 'v1', '--limit', '2', '--no-language-code']);
    expect(code).toBe(0);
    const speech = h.calls.filter((c) => c.url.includes('/text-to-speech/'));
    expect(speech).toHaveLength(2);
    expect(speech.every((c) => !('language_code' in JSON.parse(c.init.body ?? '{}')))).toBe(true);
    expect(h.fs.files.has(`${OUT}/v-tee.mp3`)).toBe(true);
    expect(h.fs.files.has(`${OUT}/v-leib.mp3`)).toBe(false);
    expect(h.logs.join('\n')).not.toContain(SENTINEL);
  });

  it('sends language_code by default', async () => {
    const h = makeHarness(respond);
    await run(h, ['--voice', 'v1', '--limit', '1']);
    const speech = h.calls.find((c) => c.url.includes('/text-to-speech/'));
    expect(JSON.parse(speech?.init.body ?? '{}')).toMatchObject({ language_code: 'et' });
  });

  it('exits non-zero on a failure, keeps the clips written and a matching manifest, and never prints the key', async () => {
    let speechCalls = 0;
    const h = makeHarness((call) => {
      if (call.url.endsWith('/v1/models')) return makeResponse({ json: GOOD_MODELS });
      speechCalls += 1;
      return speechCalls === 1 ? makeResponse({ bytes: new Uint8Array([1]) }) : makeResponse({ status: 500, text: `boom ${SENTINEL}` });
    });
    const code = await run(h, ['--voice', 'v1']);
    expect(code).toBe(1);
    expect(h.fs.files.has(`${OUT}/v-tee.mp3`)).toBe(true);
    const manifest = h.fs.files.get(`${OUT}/manifest.json`);
    expect(Object.keys(JSON.parse(typeof manifest === 'string' ? manifest : '{}').clips)).toEqual(['tee']);
    expect(h.logs.join('\n')).not.toContain(SENTINEL);
  });

  it('prints usage and exits non-zero on bad arguments without any side effect', async () => {
    const h = makeHarness(respond);
    expect(await run(h, [])).toBe(1);
    expect(h.logs.join('\n')).toContain('Usage:');
    expect(h.calls).toHaveLength(0);
  });
});

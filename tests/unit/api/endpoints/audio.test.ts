import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  audioClipUrl,
  loadAudioClips,
  NO_AUDIO_CLIPS,
  resetAudioClipsCache,
} from '@/api/endpoints/audio';
import { audioManifestFixture } from '@/mocks/data/audio';
import {
  audioManifestHandler,
  audioManifestInvalidHandler,
  audioManifestMissingHandler,
  audioManifestNotJsonHandler,
} from '@/mocks/handlers/audio';
import { server } from '@/mocks/server';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('loadAudioClips', () => {
  it('resolves to the clips of the manifest', async () => {
    server.use(audioManifestHandler);
    expect(await loadAudioClips()).toEqual(audioManifestFixture.clips);
  });

  it('requests the static /audio/manifest.json, not under the API base', async () => {
    const urls: string[] = [];
    server.use(
      http.get('*/audio/manifest.json', ({ request }) => {
        urls.push(new URL(request.url).pathname);
        return HttpResponse.json(audioManifestFixture);
      }),
    );
    await loadAudioClips();
    expect(urls).toEqual(['/audio/manifest.json']);
  });

  it('requests the manifest under the Pages base path', async () => {
    vi.stubEnv('BASE_URL', '/duolingo-ui-clone/');
    resetAudioClipsCache();
    const urls: string[] = [];
    server.use(
      http.get('*/audio/manifest.json', ({ request }) => {
        urls.push(new URL(request.url).pathname);
        return HttpResponse.json(audioManifestFixture);
      }),
    );
    expect(await loadAudioClips()).toEqual(audioManifestFixture.clips);
    expect(urls).toEqual(['/duolingo-ui-clone/audio/manifest.json']);
  });

  it('follows a base change once the cache is reset', async () => {
    const urls: string[] = [];
    server.use(
      http.get('*/audio/manifest.json', ({ request }) => {
        urls.push(new URL(request.url).pathname);
        return HttpResponse.json(audioManifestFixture);
      }),
    );
    await loadAudioClips();
    vi.stubEnv('BASE_URL', '/duolingo-ui-clone/');
    resetAudioClipsCache();
    await loadAudioClips();
    expect(urls).toEqual(['/audio/manifest.json', '/duolingo-ui-clone/audio/manifest.json']);
  });

  it('resolves to no clips, without throwing, when the manifest is missing under the Pages base', async () => {
    vi.stubEnv('BASE_URL', '/duolingo-ui-clone/');
    resetAudioClipsCache();
    server.use(audioManifestMissingHandler);
    expect(await loadAudioClips()).toBe(NO_AUDIO_CLIPS);
  });

  it('resolves to no clips when the file is missing', async () => {
    server.use(audioManifestMissingHandler);
    expect(await loadAudioClips()).toEqual({});
  });

  it('resolves to no clips when the body is not JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(audioManifestNotJsonHandler);
    expect(await loadAudioClips()).toEqual({});
  });

  it('resolves to no clips when the manifest is invalid', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(audioManifestInvalidHandler);
    expect(await loadAudioClips()).toEqual({});
  });

  it('resolves to no clips on a network failure', async () => {
    server.use(http.get('*/audio/manifest.json', () => HttpResponse.error()));
    expect(await loadAudioClips()).toBe(NO_AUDIO_CLIPS);
  });

  it('resolves to no clips, without throwing, when aborted', async () => {
    const controller = new AbortController();
    const pending = loadAudioClips(controller.signal);
    controller.abort();
    expect(await pending).toEqual({});
    // The shared request is not cancelled by one caller; let it finish so it cannot leak into the next test.
    await loadAudioClips();
  });
});

describe('loadAudioClips once per page session', () => {
  function countingHandler(counter: { n: number }) {
    return http.get('*/audio/manifest.json', async () => {
      counter.n += 1;
      await delay(20);
      return HttpResponse.json(audioManifestFixture);
    });
  }

  it('makes one request for two concurrent calls', async () => {
    const counter = { n: 0 };
    server.use(countingHandler(counter));
    const [a, b] = await Promise.all([loadAudioClips(), loadAudioClips()]);
    expect(counter.n).toBe(1);
    expect(a).toEqual(audioManifestFixture.clips);
    expect(b).toBe(a);
  });

  it('reuses a success without another request', async () => {
    const counter = { n: 0 };
    server.use(countingHandler(counter));
    await loadAudioClips();
    expect(await loadAudioClips()).toEqual(audioManifestFixture.clips);
    expect(counter.n).toBe(1);
  });

  it('does not keep a failure: the next call tries again', async () => {
    server.use(audioManifestMissingHandler);
    expect(await loadAudioClips()).toEqual({});
    const counter = { n: 0 };
    server.use(countingHandler(counter));
    expect(await loadAudioClips()).toEqual(audioManifestFixture.clips);
    expect(counter.n).toBe(1);
  });

  it('aborting the first caller does not break the second', async () => {
    const counter = { n: 0 };
    server.use(countingHandler(counter));
    const first = new AbortController();
    const firstResult = loadAudioClips(first.signal);
    const secondResult = loadAudioClips(new AbortController().signal);
    first.abort();
    expect(await firstResult).toEqual({});
    expect(await secondResult).toEqual(audioManifestFixture.clips);
    expect(counter.n).toBe(1);
  });

  it('a caller already aborted starts no request', async () => {
    const counter = { n: 0 };
    server.use(countingHandler(counter));
    const controller = new AbortController();
    controller.abort();
    expect(await loadAudioClips(controller.signal)).toEqual({});
    expect(counter.n).toBe(0);
  });

  it('the first caller aborted before the request ends still leaves the result for a later call', async () => {
    const counter = { n: 0 };
    server.use(countingHandler(counter));
    const first = new AbortController();
    const firstResult = loadAudioClips(first.signal);
    first.abort();
    await firstResult;
    expect(await loadAudioClips()).toEqual(audioManifestFixture.clips);
    expect(counter.n).toBe(1);
  });

  it('resetAudioClipsCache forgets a cached success', async () => {
    const counter = { n: 0 };
    server.use(countingHandler(counter));
    await loadAudioClips();
    resetAudioClipsCache();
    await loadAudioClips();
    expect(counter.n).toBe(2);
  });
});

describe('audioClipUrl', () => {
  const clip = { itemId: 'a', file: 'a.mp3', needsReview: true };

  it('serves a clip under /audio/ at the root base', () => {
    expect(audioClipUrl(clip)).toBe('/audio/a.mp3');
  });

  it('serves a clip under the Pages base path', () => {
    vi.stubEnv('BASE_URL', '/duolingo-ui-clone/');
    expect(audioClipUrl(clip)).toBe('/duolingo-ui-clone/audio/a.mp3');
  });

  it('serves a clip at the root with a relative base', () => {
    vi.stubEnv('BASE_URL', './');
    expect(audioClipUrl(clip)).toBe('/audio/a.mp3');
  });
});

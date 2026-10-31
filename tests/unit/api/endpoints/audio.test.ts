import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { audioClipUrl, loadAudioClips, NO_AUDIO_CLIPS } from '@/api/endpoints/audio';
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
  });
});

describe('audioClipUrl', () => {
  it('serves a clip under /audio/', () => {
    expect(audioClipUrl({ itemId: 'a', file: 'a.mp3', needsReview: true })).toBe('/audio/a.mp3');
  });
});

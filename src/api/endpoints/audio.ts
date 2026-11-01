import { request } from '@/api/client';
import { audioManifestSchema, type AudioClip } from '@/api/schemas/audio';
import { assetUrl } from '@/lib/baseUrl';

/**
 * Where the manifest is served relative to the deployment base: a static asset, not under `/api`.
 * The request URL is `audioManifestUrl()`, which applies the base at call time.
 */
export const AUDIO_MANIFEST_PATH = '/audio/manifest.json';

/** Absolute URL of the manifest under the Vite base (`/duolingo-ui-clone/audio/manifest.json` on Pages). */
function audioManifestUrl(): string {
  return assetUrl(AUDIO_MANIFEST_PATH);
}

/** Clips keyed by Estonian word (NFC). Empty when there are none. */
export type AudioClips = Readonly<Record<string, AudioClip>>;

export const NO_AUDIO_CLIPS: AudioClips = Object.freeze({});

/** URL of a clip file named by a manifest entry. */
export function audioClipUrl(clip: AudioClip): string {
  return assetUrl(`/audio/${clip.file}`);
}

/** The page session's manifest: a loaded result, or the request in flight. Failures are never kept. */
let cached: AudioClips | null = null;
let inFlight: Promise<AudioClips | null> | null = null;

/** Forgets the cached manifest and any request in flight. For tests. */
export function resetAudioClipsCache(): void {
  cached = null;
  inFlight = null;
}

/** One shared request, not tied to any caller's signal; resolves to null on any failure. */
function fetchManifest(): Promise<AudioClips | null> {
  const pending: Promise<AudioClips | null> = request(audioManifestUrl(), {
    schema: audioManifestSchema,
    baseUrl: '',
  }).then(
    (manifest) => {
      if (inFlight === pending) {
        cached = manifest.clips;
        inFlight = null;
      }
      return manifest.clips;
    },
    () => {
      if (inFlight === pending) inFlight = null;
      return null;
    },
  );
  inFlight = pending;
  return pending;
}

/**
 * `GET <base>/audio/manifest.json`, read once per page session: concurrent callers share the request
 * in flight and a success is kept in memory; a failure is not kept, so the next call tries
 * again. Never throws and never reports an error: a missing file, a non-JSON body, an invalid
 * manifest, a network failure or an abort all resolve to no clips (the app then simply plays no
 * recording). Aborting one caller only ends that caller's wait, never the shared request.
 */
export function loadAudioClips(signal?: AbortSignal): Promise<AudioClips> {
  if (cached !== null) return Promise.resolve(cached);
  if (signal?.aborted) return Promise.resolve(NO_AUDIO_CLIPS);
  const shared = inFlight ?? fetchManifest();
  const result = shared.then((clips) => clips ?? NO_AUDIO_CLIPS);
  if (!signal) return result;
  return new Promise<AudioClips>((resolve) => {
    const onAbort = () => {
      resolve(NO_AUDIO_CLIPS);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    void result.then((clips) => {
      signal.removeEventListener('abort', onAbort);
      resolve(clips);
    });
  });
}

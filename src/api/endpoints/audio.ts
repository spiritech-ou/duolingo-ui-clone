import { request } from '@/api/client';
import { audioManifestSchema, type AudioClip } from '@/api/schemas/audio';

/** Where the manifest is served: a static asset, not under `/api`. */
export const AUDIO_MANIFEST_PATH = '/audio/manifest.json';

/** Clips keyed by Estonian word (NFC). Empty when there are none. */
export type AudioClips = Readonly<Record<string, AudioClip>>;

export const NO_AUDIO_CLIPS: AudioClips = Object.freeze({});

/** URL of a clip file named by a manifest entry. */
export function audioClipUrl(clip: AudioClip): string {
  return `/audio/${clip.file}`;
}

/**
 * `GET /audio/manifest.json`. Never throws and never reports an error: a missing file, a
 * non-JSON body, an invalid manifest, a network failure or an abort all resolve to no clips
 * (the app then simply plays no recording).
 */
export async function loadAudioClips(signal?: AbortSignal): Promise<AudioClips> {
  try {
    const manifest = await request(AUDIO_MANIFEST_PATH, {
      schema: audioManifestSchema,
      baseUrl: '',
      ...(signal ? { signal } : {}),
    });
    return manifest.clips;
  } catch {
    return NO_AUDIO_CLIPS;
  }
}

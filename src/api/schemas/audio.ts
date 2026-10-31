import { z } from 'zod';

/** One clip of `public/audio/manifest.json`, keyed in `clips` by the Estonian word (NFC). */
export const audioClipSchema = z.object({
  itemId: z.string().min(1),
  /** File name beside the manifest, `<itemId>.mp3`; served at `/audio/<file>`. */
  file: z.string().min(1),
  /** `true` until an Estonian speaker has checked the clip. */
  needsReview: z.boolean(),
});

/** Contract of `docs/product/vocabulary-dataset.md` (Audio clips and manifest), as written by `scripts/audio/generate.ts`. */
export const audioManifestSchema = z.object({
  version: z.literal(1),
  model: z.enum(['eleven_v3', 'eleven_v4']),
  voiceId: z.string().min(1),
  generatedAt: z.string().min(1),
  clips: z.record(z.string(), audioClipSchema),
});

export type AudioClip = z.infer<typeof audioClipSchema>;
export type AudioManifest = z.infer<typeof audioManifestSchema>;

import type { AudioManifest } from '@/api/schemas/audio';
import { VOCABULARY_ITEMS } from '@/mocks/data/vocabulary';

const FIXTURE_CLIP_COUNT = 5;

/** A small valid manifest (the first words of the dataset) for tests and stories; not the generated one. */
export const audioManifestFixture: AudioManifest = {
  version: 1,
  model: 'eleven_v3',
  voiceId: 'fixture-voice',
  generatedAt: '2026-01-01T00:00:00.000Z',
  clips: Object.fromEntries(
    VOCABULARY_ITEMS.slice(0, FIXTURE_CLIP_COUNT).map((item) => [
      item.estonian.normalize('NFC'),
      { itemId: item.id, file: `${item.id}.mp3`, needsReview: true },
    ]),
  ),
};

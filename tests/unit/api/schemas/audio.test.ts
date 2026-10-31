import { describe, expect, it } from 'vitest';
import { audioManifestSchema } from '@/api/schemas/audio';
import { audioManifestFixture } from '@/mocks/data/audio';

const valid = {
  version: 1,
  model: 'eleven_v4',
  voiceId: 'abc',
  generatedAt: '2026-05-01T10:00:00.000Z',
  clips: { õun: { itemId: 'item-1', file: 'item-1.mp3', needsReview: true } },
};

describe('audioManifestSchema', () => {
  it('accepts a valid manifest', () => {
    expect(audioManifestSchema.parse(valid).clips['õun']?.itemId).toBe('item-1');
  });

  it('accepts both models and a reviewed clip', () => {
    const reviewed = { ...valid, model: 'eleven_v3', clips: { õun: { itemId: 'a', file: 'a.mp3', needsReview: false } } };
    expect(audioManifestSchema.safeParse(reviewed).success).toBe(true);
  });

  it('accepts a manifest with no clips', () => {
    expect(audioManifestSchema.safeParse({ ...valid, clips: {} }).success).toBe(true);
  });

  it('accepts the fixture', () => {
    expect(audioManifestSchema.safeParse(audioManifestFixture).success).toBe(true);
  });

  it.each([
    ['wrong version', { ...valid, version: 2 }],
    ['unknown model', { ...valid, model: 'eleven_v2' }],
    ['missing voiceId', { ...valid, voiceId: undefined }],
    ['missing generatedAt', { ...valid, generatedAt: undefined }],
    ['clips as an array', { ...valid, clips: [] }],
    ['clip without itemId', { ...valid, clips: { õun: { file: 'a.mp3', needsReview: true } } }],
    ['clip without file', { ...valid, clips: { õun: { itemId: 'a', needsReview: true } } }],
    ['needsReview not a boolean', { ...valid, clips: { õun: { itemId: 'a', file: 'a.mp3', needsReview: 'yes' } } }],
    ['not an object', 'manifest'],
    ['null', null],
  ])('rejects %s', (_name, value) => {
    expect(audioManifestSchema.safeParse(value).success).toBe(false);
  });
});

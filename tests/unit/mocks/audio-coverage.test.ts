import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { audioManifestSchema } from '@/api/schemas/audio';
import { VOCABULARY_ITEMS } from '@/mocks/data/vocabulary';

// Vitest runs from the repository root (jsdom makes import.meta.url an http URL, so it cannot locate files).
const AUDIO_DIR = `${resolve(process.cwd(), 'public/audio')}/`;
const MANIFEST_PATH = `${AUDIO_DIR}manifest.json`;
const hasManifest = existsSync(MANIFEST_PATH);

// While the operator has not generated the clips (no public/audio/manifest.json) this is skipped, not
// passed: it enforces completeness of the 120 clips as soon as the manifest exists.
describe.skipIf(!hasManifest)(
  'audio manifest coverage (skipped until public/audio/manifest.json exists: generate the clips first)',
  () => {
    const readManifest = () => audioManifestSchema.parse(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));

    it('has an entry for every vocabulary word, with matching itemId and an existing file', () => {
      const manifest = readManifest();
      for (const item of VOCABULARY_ITEMS) {
        const entry = manifest.clips[item.estonian];
        expect(entry, `no clip for "${item.estonian}"`).toBeDefined();
        expect(entry?.itemId, `itemId of "${item.estonian}"`).toBe(item.id);
        expect(entry?.file, `file of "${item.estonian}"`).toBe(`${item.id}.mp3`);
        expect(existsSync(`${AUDIO_DIR}${entry?.file ?? ''}`), `${entry?.file} missing under public/audio`).toBe(true);
      }
    });

    it('has no entry for an unknown word', () => {
      const words = new Set(VOCABULARY_ITEMS.map((item) => item.estonian));
      const unknown = Object.keys(readManifest().clips).filter((word) => !words.has(word));
      expect(unknown).toEqual([]);
    });

    it('keys every entry by an NFC word', () => {
      const notNfc = Object.keys(readManifest().clips).filter((word) => word !== word.normalize('NFC'));
      expect(notNfc).toEqual([]);
    });
  },
);

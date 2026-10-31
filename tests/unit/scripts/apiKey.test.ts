import { describe, expect, it } from 'vitest';
import { parseApiKey, readApiKey } from '@scripts/audio/apiKey';
import { HOME, KEY_PATH, SENTINEL, makeFs } from './helpers';

describe('parseApiKey', () => {
  it('reads a plain entry', () => {
    expect(parseApiKey(`ELEVENLABS_API_KEY=${SENTINEL}`)).toBe(SENTINEL);
  });

  it.each([
    [`ELEVENLABS_API_KEY="${SENTINEL}"`],
    [`ELEVENLABS_API_KEY='${SENTINEL}'`],
    [`  ELEVENLABS_API_KEY  =  ${SENTINEL}  `],
    [`export ELEVENLABS_API_KEY=${SENTINEL}`],
    [`ELEVENLABS_API_KEY=${SENTINEL} # my key`],
    [`ELEVENLABS_API_KEY=${SENTINEL}\r\n`],
  ])('handles quotes, whitespace and comments: %s', (line) => {
    expect(parseApiKey(line)).toBe(SENTINEL);
  });

  it('ignores other entries, comments and similarly named entries', () => {
    const content = ['# ELEVENLABS_API_KEY=commented', 'OTHER_ELEVENLABS_API_KEY=wrong', 'OTHER=1', `ELEVENLABS_API_KEY=${SENTINEL}`].join('\n');
    expect(parseApiKey(content)).toBe(SENTINEL);
  });

  it('returns null when the entry is missing or empty', () => {
    expect(parseApiKey('OTHER=1\n')).toBeNull();
    expect(parseApiKey('ELEVENLABS_API_KEY=\n')).toBeNull();
    expect(parseApiKey('ELEVENLABS_API_KEY=""\n')).toBeNull();
  });
});

describe('readApiKey', () => {
  it('reads the file under the injected home directory', async () => {
    await expect(readApiKey(makeFs({ [KEY_PATH]: `ELEVENLABS_API_KEY=${SENTINEL}` }), HOME)).resolves.toBe(SENTINEL);
  });

  it('fails clearly when the file is missing', async () => {
    await expect(readApiKey(makeFs(), HOME)).rejects.toThrow(/Key file not found/);
  });

  it('fails clearly, without echoing other content, when the entry is missing', async () => {
    const fs = makeFs({ [KEY_PATH]: 'OTHER_SECRET=do-not-print\n' });
    const error = await readApiKey(fs, HOME).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/No ELEVENLABS_API_KEY entry/); // narrowed by the instanceof above
    expect((error as Error).message).not.toContain('do-not-print'); // same narrowing
  });
});

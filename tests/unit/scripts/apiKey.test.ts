import { describe, expect, it } from 'vitest';
import { readApiKey } from '@scripts/audio/apiKey';
import { SENTINEL } from './helpers';

describe('readApiKey', () => {
  it('reads ELEVENLABS_API_KEY from the environment', () => {
    expect(readApiKey({ ELEVENLABS_API_KEY: SENTINEL })).toBe(SENTINEL);
  });

  it('trims surrounding whitespace', () => {
    expect(readApiKey({ ELEVENLABS_API_KEY: `  ${SENTINEL}\n` })).toBe(SENTINEL);
  });

  it.each([[{}], [{ ELEVENLABS_API_KEY: '' }], [{ ELEVENLABS_API_KEY: '   ' }]])('fails clearly when the key is missing or empty: %j', (env) => {
    expect(() => readApiKey(env)).toThrow(/ELEVENLABS_API_KEY is not set.*\.env.*\.env\.example/);
  });

  it('does not echo other environment values in the error', () => {
    let message = '';
    try {
      readApiKey({ OTHER_SECRET: 'do-not-print' });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toContain('do-not-print');
  });
});

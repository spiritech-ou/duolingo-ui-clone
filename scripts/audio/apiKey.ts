import { AudioGenerationError } from './errors.ts';

export const KEY_ENTRY_NAME = 'ELEVENLABS_API_KEY';

/** The environment the key is read from; the npm script loads `.env` into it (`node --env-file-if-exists=.env`). */
export type KeyEnvironment = Readonly<Record<string, string | undefined>>;

/** Reads the ElevenLabs key from the environment. It is documented in `.env.example`; the real value lives in the git ignored `.env`. */
export function readApiKey(env: KeyEnvironment): string {
  const key = env[KEY_ENTRY_NAME]?.trim();
  if (key === undefined || key === '') {
    throw new AudioGenerationError(`${KEY_ENTRY_NAME} is not set. Add it to .env (see .env.example) and run npm run audio:generate again.`);
  }
  return key;
}

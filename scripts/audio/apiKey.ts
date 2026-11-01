import { join } from 'node:path';
import { AudioGenerationError } from './errors.ts';
import type { FileSystem } from './types.ts';

export const KEY_FILE_NAME = '.elevenlabs.env';
export const KEY_ENTRY_NAME = 'ELEVENLABS_API_KEY';

/** Pure parser: returns the value of the ELEVENLABS_API_KEY entry only; every other line is ignored. */
export function parseApiKey(content: string): string | null {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (match?.[1] !== KEY_ENTRY_NAME) continue;
    let value = (match[2] ?? '').trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.length >= 2 && value.endsWith(quote)) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    return value === '' ? null : value;
  }
  return null;
}

/** Reads the key from `<project root>/.elevenlabs.env` (git ignored, see `.elevenlabs.env.example`). */
export async function readApiKey(fs: FileSystem, rootDir: string): Promise<string> {
  const path = join(rootDir, KEY_FILE_NAME);
  const content = await fs.readText(path);
  if (content === null) {
    throw new AudioGenerationError(`Key file not found: ${path}. Create it with a line ${KEY_ENTRY_NAME}=<your key>.`);
  }
  const key = parseApiKey(content);
  if (key === null) {
    throw new AudioGenerationError(`No ${KEY_ENTRY_NAME} entry with a value in ${path}.`);
  }
  return key;
}

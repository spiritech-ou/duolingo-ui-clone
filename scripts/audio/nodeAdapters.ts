import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import type { AudioDeps } from './types.ts';

/** Real file system, clock and fetch for the command line entry. Tests inject their own. */
export function createNodeDeps(log: (message: string) => void): AudioDeps {
  return {
    fetch: (url, init) => fetch(url, init),
    fs: {
      async readText(path) {
        try {
          return await readFile(path, 'utf8');
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
          throw error;
        }
      },
      async writeFile(path, data) {
        await writeFile(path, data);
      },
      async exists(path) {
        try {
          await access(path);
          return true;
        } catch {
          return false;
        }
      },
      async mkdir(path) {
        await mkdir(path, { recursive: true });
      },
      async rename(from, to) {
        await rename(from, to);
      },
    },
    clock: {
      now: () => new Date(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      setTimer: (callback, ms) => {
        const handle = setTimeout(callback, ms);
        return () => clearTimeout(handle);
      },
    },
    log,
  };
}

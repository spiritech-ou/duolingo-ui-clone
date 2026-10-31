import type { AudioDeps, FileSystem, FetchLike, HttpRequest, HttpResponse } from '@scripts/audio/types';

export const SENTINEL = 'sk_SENTINEL_KEY_9f3a7c21';
export const HOME = '/home/tester';
export const KEY_PATH = `${HOME}/.elevenlabs.env`;
export const OUT = '/repo/public/audio';

export interface FakeFs extends FileSystem {
  readonly files: Map<string, string | Uint8Array>;
  /** Every path ever written, in order (including temp names). */
  readonly writes: string[];
  /** Set to make rename fail, simulating an interruption between write and rename. */
  failRename: boolean;
}

export function makeFs(initial: Record<string, string | Uint8Array> = {}): FakeFs {
  const files = new Map<string, string | Uint8Array>(Object.entries(initial));
  const writes: string[] = [];
  const fs: FakeFs = {
    files,
    writes,
    failRename: false,
    rename: (from, to) => {
      if (fs.failRename) return Promise.reject(new Error('interrupted'));
      const value = files.get(from);
      if (value === undefined) return Promise.reject(new Error('no such file'));
      files.delete(from);
      files.set(to, value);
      return Promise.resolve();
    },
    readText: (path) => {
      const value = files.get(path);
      return Promise.resolve(value === undefined ? null : typeof value === 'string' ? value : new TextDecoder().decode(value));
    },
    writeFile: (path, data) => {
      writes.push(path);
      files.set(path, data);
      return Promise.resolve();
    },
    exists: (path) => Promise.resolve(files.has(path)),
    mkdir: () => Promise.resolve(),
  };
  return fs;
}

export interface ResponseSpec {
  status?: number;
  json?: unknown;
  text?: string;
  bytes?: Uint8Array;
  headers?: Record<string, string>;
}

export function makeResponse(spec: ResponseSpec = {}): HttpResponse {
  const status = spec.status ?? 200;
  const headers = spec.headers ?? {};
  const bytes = spec.bytes ?? new Uint8Array([1, 2, 3]);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: () => Promise.resolve(spec.json),
    text: () => Promise.resolve(spec.text ?? ''),
    arrayBuffer: () => Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer), // Uint8Array to ArrayBuffer: the slice is exactly the view
  };
}

export interface Call {
  url: string;
  init: HttpRequest;
}

export interface Harness {
  deps: AudioDeps;
  fs: FakeFs;
  calls: Call[];
  logs: string[];
  sleeps: number[];
  /** Durations of the request timers that were armed. */
  timers: number[];
}

export interface HarnessOptions {
  /** Fire every timer at once, so a request that never answers times out. */
  fireTimers?: boolean;
}

export function makeHarness(
  respond: (call: Call, index: number) => HttpResponse | Promise<HttpResponse>,
  files: Record<string, string | Uint8Array> = { [KEY_PATH]: `ELEVENLABS_API_KEY=${SENTINEL}\n` },
  harnessOptions: HarnessOptions = {},
): Harness {
  const fs = makeFs(files);
  const calls: Call[] = [];
  const logs: string[] = [];
  const sleeps: number[] = [];
  const timers: number[] = [];
  const fetchLike: FetchLike = (url, init) => {
    const call = { url, init };
    calls.push(call);
    return Promise.resolve(respond(call, calls.length - 1));
  };
  const deps: AudioDeps = {
    fetch: fetchLike,
    fs,
    clock: {
      now: () => new Date('2026-01-02T03:04:05.000Z'),
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
      setTimer: (callback, ms) => {
        timers.push(ms);
        if (harnessOptions.fireTimers === true) callback();
        return () => {};
      },
    },
    log: (message) => logs.push(message),
  };
  return { deps, fs, calls, logs, sleeps, timers };
}

export const GOOD_MODELS = [
  { model_id: 'eleven_multilingual_v2', can_do_text_to_speech: true, languages: [{ language_id: 'en', name: 'English' }] },
  {
    model_id: 'eleven_v3',
    can_do_text_to_speech: true,
    languages: [
      { language_id: 'en', name: 'English' },
      { language_id: 'et', name: 'Estonian' },
    ],
  },
];

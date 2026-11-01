// Shared types for the one-off Estonian audio generation. Everything with a side
// effect (network, file system, clock, logging) is injected so tests never touch
// the network or the real project folder.

export type AudioModel = 'eleven_v3' | 'eleven_v4';

/** The slice of a vocabulary item the generation needs. */
export interface AudioItem {
  readonly id: string;
  readonly estonian: string;
}

export interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface HttpRequest {
  readonly method: 'GET' | 'POST';
  readonly headers: Record<string, string>;
  readonly body?: string;
  /** Aborted when the request times out; a real fetch honours it. */
  readonly signal?: AbortSignal;
}

export type FetchLike = (url: string, init: HttpRequest) => Promise<HttpResponse>;

export interface FileSystem {
  /** File content as text, or null when the file does not exist. */
  readText(path: string): Promise<string | null>;
  writeFile(path: string, data: string | Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  /** Atomic within one folder: after it resolves `to` holds the whole content of `from`. */
  rename(from: string, to: string): Promise<void>;
}

export interface Clock {
  now(): Date;
  sleep(ms: number): Promise<void>;
  /** Runs `callback` after `ms` unless the returned function cancels it first. */
  setTimer(callback: () => void, ms: number): () => void;
}

export interface AudioDeps {
  readonly fetch: FetchLike;
  readonly fs: FileSystem;
  readonly clock: Clock;
  readonly log: (message: string) => void;
}

export interface ClipEntry {
  itemId: string;
  file: string;
  needsReview: true;
}

export interface Manifest {
  version: 1;
  model: AudioModel;
  voiceId: string;
  generatedAt: string;
  clips: Record<string, ClipEntry>;
}

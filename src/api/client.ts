import type { z } from 'zod';
import { env } from '@/config/env';
import { errorBodySchema } from '@/api/schemas/error';

/** Shared request timeout; a timeout is reported as a network failure. */
export const REQUEST_TIMEOUT_MS = 10_000;

export type ApiErrorKind = 'network' | 'http' | 'invalid-payload';

interface ApiErrorInit {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  /** `code` from the `{ code, message }` error body, when the server sent one. */
  code?: string;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;

  constructor({ kind, message, status, code }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    if (status !== undefined) this.status = status;
    if (code !== undefined) this.code = code;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export interface RequestOptions<T> {
  schema: z.ZodType<T>;
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * The single place that calls `fetch`. Sends JSON, enforces a 10 second timeout,
 * never retries, and validates the 2xx body with `schema`. Every failure is an
 * `ApiError`: timeout, offline and caller abort are `network`, non-2xx is `http`,
 * a body that fails the schema is `invalid-payload` (cause logged to the console).
 */
export async function request<T>(
  path: string,
  { schema, method = 'GET', body, signal }: RequestOptions<T>,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', onCallerAbort, { once: true });

  try {
    let response: Response;
    try {
      response = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
        method,
        signal: controller.signal,
        ...(body === undefined
          ? {}
          : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
    } catch {
      throw new ApiError({
        kind: 'network',
        message: timedOut
          ? 'The request timed out'
          : controller.signal.aborted
            ? 'The request was cancelled'
            : 'The network request failed',
      });
    }

    if (!response.ok) {
      const parsed = errorBodySchema.safeParse(await readJson(response));
      throw new ApiError({
        kind: 'http',
        status: response.status,
        message: parsed.success ? parsed.data.message : `Request failed with status ${response.status}`,
        ...(parsed.success ? { code: parsed.data.code } : {}),
      });
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (cause) {
      // Body read can fail mid-stream (timeout/abort) or be non-JSON.
      if (timedOut || controller.signal.aborted) {
        throw new ApiError({
          kind: 'network',
          message: timedOut ? 'The request timed out' : 'The request was cancelled',
        });
      }
      console.error(`Invalid response body from ${method} ${path}`, cause);
      throw new ApiError({
        kind: 'invalid-payload',
        status: response.status,
        message: 'The response was not valid JSON',
      });
    }

    const result = schema.safeParse(json);
    if (!result.success) {
      console.error(`Invalid response from ${method} ${path}`, result.error);
      throw new ApiError({
        kind: 'invalid-payload',
        status: response.status,
        message: 'The response did not match the expected shape',
      });
    }
    return result.data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import { ApiError, REQUEST_TIMEOUT_MS, isApiError, request } from '@/api/client';
import { server } from '@/mocks/server';

const schema = z.object({ name: z.string() });
const url = '*/api/thing';

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (isApiError(error)) return error;
    throw error;
  }
  throw new Error('expected the request to fail');
}

describe('request', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the parsed body on success', async () => {
    server.use(http.get(url, () => HttpResponse.json({ name: 'Mari' })));
    await expect(request('/thing', { schema })).resolves.toEqual({ name: 'Mari' });
  });

  it('sends a JSON body with the method', async () => {
    let received: { method: string; contentType: string | null; body: unknown } | undefined;
    server.use(
      http.post(url, async ({ request: req }) => {
        received = {
          method: req.method,
          contentType: req.headers.get('content-type'),
          body: await req.json(),
        };
        return HttpResponse.json({ name: 'ok' });
      }),
    );
    await request('/thing', { schema, method: 'POST', body: { email: 'a@b.ee' } });
    expect(received).toEqual({
      method: 'POST',
      contentType: 'application/json',
      body: { email: 'a@b.ee' },
    });
  });

  it('does not attach an Authorization header', async () => {
    let auth: string | null = 'unset';
    server.use(
      http.get(url, ({ request: req }) => {
        auth = req.headers.get('authorization');
        return HttpResponse.json({ name: 'ok' });
      }),
    );
    await request('/thing', { schema });
    expect(auth).toBeNull();
  });

  it('maps a non-2xx response with an error body to an http ApiError', async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json({ code: 'not_found', message: 'No such lesson' }, { status: 404 }),
      ),
    );
    const error = await failureOf(request('/thing', { schema }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      kind: 'http',
      status: 404,
      code: 'not_found',
      message: 'No such lesson',
    });
  });

  it('maps a non-2xx response without a usable body to an http ApiError', async () => {
    server.use(http.get(url, () => new HttpResponse('boom', { status: 503 })));
    const error = await failureOf(request('/thing', { schema }));
    expect(error.kind).toBe('http');
    expect(error.status).toBe(503);
    expect(error.code).toBeUndefined();
  });

  it('reports a body failing the schema as invalid-payload and logs the cause', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(http.get(url, () => HttpResponse.json({ name: 42 })));
    const error = await failureOf(request('/thing', { schema }));
    expect(error.kind).toBe('invalid-payload');
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('reports a non-JSON 2xx body as invalid-payload', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(http.get(url, () => new HttpResponse('<html>', { status: 200 })));
    const error = await failureOf(request('/thing', { schema }));
    expect(error.kind).toBe('invalid-payload');
    expect(log).toHaveBeenCalled();
  });

  it('reports a connection failure as network', async () => {
    server.use(http.get(url, () => HttpResponse.error()));
    const error = await failureOf(request('/thing', { schema }));
    expect(error.kind).toBe('network');
  });

  it('does not retry a failed request', async () => {
    let calls = 0;
    server.use(
      http.get(url, () => {
        calls += 1;
        return HttpResponse.json({ code: 'server_error', message: 'x' }, { status: 500 });
      }),
    );
    await failureOf(request('/thing', { schema }));
    expect(calls).toBe(1);
  });

  it('times out after 10 seconds as a network failure', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    server.use(http.get(url, () => delay('infinite')));
    const pending = failureOf(request('/thing', { schema }));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const error = await pending;
    expect(error.kind).toBe('network');
    expect(error.message).toMatch(/timed out/);
  });

  it('rejects with a network ApiError when the caller aborts', async () => {
    server.use(http.get(url, () => delay('infinite')));
    const controller = new AbortController();
    const pending = failureOf(request('/thing', { schema, signal: controller.signal }));
    controller.abort();
    const error = await pending;
    expect(error.kind).toBe('network');
    expect(error.message).toMatch(/cancelled/);
  });

  it('does not call the network when the signal is already aborted', async () => {
    let calls = 0;
    server.use(
      http.get(url, () => {
        calls += 1;
        return HttpResponse.json({ name: 'x' });
      }),
    );
    const controller = new AbortController();
    controller.abort();
    const error = await failureOf(request('/thing', { schema, signal: controller.signal }));
    expect(error.kind).toBe('network');
    expect(calls).toBe(0);
  });

  describe('timer cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });

    it('clears the timeout once the request settles', async () => {
      server.use(http.get(url, () => HttpResponse.json({ name: 'ok' })));
      const result = request('/thing', { schema });
      await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThanOrEqual(0));
      await expect(result).resolves.toEqual({ name: 'ok' });
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrap, type BootstrapDeps, type MockWorker } from '@/bootstrap';

interface Harness {
  deps: BootstrapDeps;
  worker: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  render: ReturnType<typeof vi.fn>;
  loadWorker: ReturnType<typeof vi.fn>;
  registered: { current: (() => void) | null };
  fire: (event: string, payload?: { persisted: boolean }) => void;
  doc: { visibilityState: DocumentVisibilityState };
}

function setup(useMocks = true, rearmTimeoutMs?: number): Harness {
  const worker = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined) };
  const render = vi.fn();
  const loadWorker = vi.fn().mockResolvedValue(worker as MockWorker);
  const registered: { current: (() => void) | null } = { current: null };
  const listeners = new Map<string, Array<(event: { persisted: boolean }) => void>>();
  const add = (type: string, listener: unknown): void => {
    listeners.set(type, [...(listeners.get(type) ?? []), listener as (event: { persisted: boolean }) => void]);
  };
  const doc = { visibilityState: 'hidden' as DocumentVisibilityState, addEventListener: add };
  const deps: BootstrapDeps = {
    useMocks,
    loadWorker,
    render,
    onNonJsonResponse: (handler) => {
      registered.current = handler;
    },
    doc,
    win: { addEventListener: add },
    ...(rearmTimeoutMs === undefined ? {} : { rearmTimeoutMs }),
  };
  return {
    deps,
    worker,
    render,
    loadWorker,
    registered,
    doc,
    fire: (event, payload = { persisted: false }) => listeners.get(event)?.forEach((listener) => listener(payload)),
  };
}

const ROOT_START_OPTIONS = {
  onUnhandledFrame: 'bypass',
  serviceWorker: { url: '/mockServiceWorker.js', options: { scope: '/' } },
};

const PAGES_START_OPTIONS = {
  onUnhandledFrame: 'bypass',
  serviceWorker: { url: '/duolingo-ui-clone/mockServiceWorker.js', options: { scope: '/duolingo-ui-clone/' } },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('bootstrap', () => {
  it('renders only after the worker start resolved, with onUnhandledFrame bypass and the root worker url and scope', async () => {
    const h = setup();
    let finishStart: () => void = () => undefined;
    h.worker.start.mockReturnValueOnce(new Promise<void>((resolve) => (finishStart = resolve)));
    const done = bootstrap(h.deps);
    await Promise.resolve();
    await Promise.resolve();
    expect(h.worker.start).toHaveBeenCalledWith(ROOT_START_OPTIONS);
    expect(h.render).not.toHaveBeenCalled();
    finishStart();
    await done;
    expect(h.render).toHaveBeenCalledTimes(1);
  });

  it('starts the worker under the Pages base: script url and scope both include /duolingo-ui-clone/', async () => {
    vi.stubEnv('BASE_URL', '/duolingo-ui-clone/');
    const h = setup();
    await bootstrap(h.deps);
    expect(h.worker.start).toHaveBeenCalledTimes(1);
    expect(h.worker.start).toHaveBeenCalledWith(PAGES_START_OPTIONS);
  });

  it('re-arms with the same base-aware options as the first start', async () => {
    vi.stubEnv('BASE_URL', '/duolingo-ui-clone/');
    const h = setup();
    await bootstrap(h.deps);
    h.worker.start.mockClear();
    h.registered.current?.();
    await vi.waitFor(() => expect(h.worker.start).toHaveBeenCalledTimes(1));
    expect(h.worker.start).toHaveBeenCalledWith(PAGES_START_OPTIONS);
  });

  it('uses the root url and scope for a relative base (Storybook build)', async () => {
    vi.stubEnv('BASE_URL', './');
    const h = setup();
    await bootstrap(h.deps);
    expect(h.worker.start).toHaveBeenCalledWith(ROOT_START_OPTIONS);
  });

  it('logs once and still renders when the worker fails to start', async () => {
    const h = setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    h.worker.start.mockRejectedValueOnce(new Error('no service worker'));
    await bootstrap(h.deps);
    expect(error).toHaveBeenCalledTimes(1);
    expect(h.render).toHaveBeenCalledTimes(1);
  });

  it('still renders when the worker module fails to load', async () => {
    const h = setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    h.loadWorker.mockRejectedValueOnce(new Error('chunk failed'));
    await bootstrap(h.deps);
    expect(error).toHaveBeenCalledTimes(1);
    expect(h.render).toHaveBeenCalledTimes(1);
    expect(h.registered.current).toBeNull();
  });

  it('logs once and still renders when registering the callback throws', async () => {
    const h = setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    h.deps.onNonJsonResponse = () => {
      throw new Error('register failed');
    };
    await bootstrap(h.deps);
    expect(error).toHaveBeenCalledTimes(1);
    expect(h.render).toHaveBeenCalledTimes(1);
  });

  it('logs once and does not reject when render throws', async () => {
    const h = setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    h.render.mockImplementationOnce(() => {
      throw new Error('render failed');
    });
    await expect(bootstrap(h.deps)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('re-arms (stop then start) on a non-JSON response, once while one is running', async () => {
    const h = setup();
    await bootstrap(h.deps);
    h.worker.start.mockClear();
    let finishStop: () => void = () => undefined;
    h.worker.stop.mockReturnValueOnce(new Promise<void>((resolve) => (finishStop = resolve)));
    h.registered.current?.();
    h.registered.current?.();
    h.fire('pageshow', { persisted: true });
    expect(h.worker.stop).toHaveBeenCalledTimes(1);
    expect(h.worker.start).not.toHaveBeenCalled();
    finishStop();
    await vi.waitFor(() => expect(h.worker.start).toHaveBeenCalledTimes(1));
    expect(h.worker.start).toHaveBeenCalledWith(ROOT_START_OPTIONS);
    // A finished re-arm allows the next one.
    h.registered.current?.();
    await vi.waitFor(() => expect(h.worker.stop).toHaveBeenCalledTimes(2));
  });

  it('re-arms when the page becomes visible, not when it becomes hidden', async () => {
    const h = setup();
    await bootstrap(h.deps);
    h.fire('visibilitychange');
    expect(h.worker.stop).not.toHaveBeenCalled();
    h.doc.visibilityState = 'visible';
    h.fire('visibilitychange');
    expect(h.worker.stop).toHaveBeenCalledTimes(1);
  });

  it('re-arms on a persisted pageshow (bfcache restore) but not on the initial one', async () => {
    const h = setup();
    await bootstrap(h.deps);
    h.fire('pageshow', { persisted: false });
    expect(h.worker.stop).not.toHaveBeenCalled();
    h.fire('pageshow', { persisted: true });
    expect(h.worker.stop).toHaveBeenCalledTimes(1);
  });

  it('logs and recovers when a re-arm fails', async () => {
    const h = setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await bootstrap(h.deps);
    h.worker.stop.mockRejectedValueOnce(new Error('boom'));
    h.registered.current?.();
    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1));
    h.registered.current?.();
    await vi.waitFor(() => expect(h.worker.stop).toHaveBeenCalledTimes(2));
  });

  it('times out a stuck re-arm, logs once and releases the guard', async () => {
    const h = setup(true, 50);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await bootstrap(h.deps);
    h.worker.stop.mockReturnValueOnce(new Promise<void>(() => undefined));
    h.registered.current?.();
    h.registered.current?.();
    expect(h.worker.stop).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1));
    h.registered.current?.();
    await vi.waitFor(() => expect(h.worker.stop).toHaveBeenCalledTimes(2));
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('with mocks off never loads the worker or registers anything', async () => {
    const h = setup(false);
    await bootstrap(h.deps);
    expect(h.loadWorker).not.toHaveBeenCalled();
    expect(h.registered.current).toBeNull();
    expect(h.render).toHaveBeenCalledTimes(1);
    h.fire('pageshow', { persisted: true });
    expect(h.worker.stop).not.toHaveBeenCalled();
  });
});

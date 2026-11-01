import { assetUrl } from '@/lib/baseUrl';

/** The start options the shell passes: a subset of msw's `StartOptions`. */
export interface MockWorkerStartOptions {
  onUnhandledFrame: 'bypass';
  serviceWorker: { url: string; options: { scope: string } };
}

/** The slice of msw's `SetupWorker` the shell uses. */
export interface MockWorker {
  start: (options: MockWorkerStartOptions) => Promise<unknown>;
  stop: () => Promise<void> | void;
}

export interface BootstrapDeps {
  useMocks: boolean;
  /** Loads the worker lazily; only called when `useMocks` is true. */
  loadWorker: () => Promise<MockWorker>;
  render: () => void;
  /** Registers (or clears with `null`) the API client's non-JSON recovery callback. */
  onNonJsonResponse: (handler: (() => void) | null) => void;
  /** Where `visibilitychange` and `pageshow` are listened for. */
  doc: Pick<Document, 'addEventListener' | 'visibilityState'>;
  win: {
    addEventListener: (type: 'pageshow', listener: (event: { persisted: boolean }) => void) => void;
  };
  /** Upper bound for one re-arm (stop + start); defaults to `REARM_TIMEOUT_MS`. */
  rearmTimeoutMs?: number;
}

export const REARM_TIMEOUT_MS = 5_000;

/**
 * The options of the first start and of every re-arm. The worker script and its
 * scope both sit under Vite's base URL (`/` normally, `/duolingo-ui-clone/` on
 * GitHub Pages); the scope is the base with its trailing slash, never wider than
 * the folder of the script. Read at call time, so the base is current.
 */
function startOptions(): MockWorkerStartOptions {
  return {
    onUnhandledFrame: 'bypass',
    serviceWorker: { url: assetUrl('mockServiceWorker.js'), options: { scope: assetUrl('') } },
  };
}

function setUpMocks(worker: MockWorker, deps: BootstrapDeps): void {
  const timeoutMs = deps.rearmTimeoutMs ?? REARM_TIMEOUT_MS;
  let rearming = false;

  const rearm = (): void => {
    if (rearming) return;
    rearming = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
    });
    const work = (async () => {
      await worker.stop();
      await worker.start(startOptions());
    })();
    // A late rejection after the timeout won, or after success, must not go unhandled.
    work.catch(() => undefined);
    Promise.race([work, timeout])
      .catch((cause: unknown) => {
        console.error('Re-arming the mock service worker failed.', cause);
      })
      .finally(() => {
        clearTimeout(timer);
        rearming = false;
      });
  };

  deps.onNonJsonResponse(rearm);
  deps.doc.addEventListener('visibilitychange', () => {
    if (deps.doc.visibilityState === 'visible') rearm();
  });
  // The initial load also fires pageshow; only a bfcache restore needs a re-arm.
  deps.win.addEventListener('pageshow', (event) => {
    if (event.persisted) rearm();
  });
}

/**
 * Starts the mock worker (when mocks are on) before rendering, so nothing is
 * requested earlier. A failed start or setup is logged once and the app still
 * renders. With mocks on, a non-JSON response, the page becoming visible or a
 * bfcache restore re-arms the worker (stop then start), never twice at once and
 * never longer than the timeout. Never rejects: a render failure is logged.
 */
export async function bootstrap(deps: BootstrapDeps): Promise<void> {
  if (deps.useMocks) {
    try {
      const worker = await deps.loadWorker();
      await worker.start(startOptions());
      setUpMocks(worker, deps);
    } catch (cause) {
      console.error('The mock service worker failed to start; rendering without mocks.', cause);
    }
  }

  try {
    deps.render();
  } catch (cause) {
    console.error('The app failed to render.', cause);
  }
}

/**
 * Helpers for the deployment base path (Vite's `base`): `/` normally,
 * `/duolingo-ui-clone/` on GitHub Pages, `./` in Storybook's build.
 *
 * `BASE_URL` is read at call time (not import time) so tests can change it with
 * `vi.stubEnv('BASE_URL', ...)`. This is the one place besides `@/config/env`
 * allowed to touch `import.meta.env`, because `env.ts` parses once at import.
 */
function readBase(): string {
  // eslint-disable-next-line no-restricted-syntax -- call-time read of Vite's built-in BASE_URL, see file comment
  return import.meta.env.BASE_URL;
}

/**
 * The base as an absolute path with a leading and a trailing slash, or `/` when
 * the base is relative (`./`, empty) or otherwise not a root-anchored path.
 */
function absoluteBase(): string {
  const base = readBase();
  if (!base.startsWith('/')) {
    return '/';
  }
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Absolute URL of a static asset under the base:
 * `assetUrl('/audio/a.mp3')` and `assetUrl('audio/a.mp3')` both give
 * `/duolingo-ui-clone/audio/a.mp3` on Pages and `/audio/a.mp3` at the root or
 * with a relative base. The empty path gives the base itself.
 */
export function assetUrl(path: string): string {
  return `${absoluteBase()}${path.replace(/^\/+/, '')}`;
}

/**
 * Value for React Router's `basename`: `/` for the root (or a relative base),
 * `/duolingo-ui-clone` (no trailing slash) for the Pages sub path.
 */
export function routerBasename(): string {
  const base = absoluteBase();
  return base === '/' ? '/' : base.slice(0, -1);
}

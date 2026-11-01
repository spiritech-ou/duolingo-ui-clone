import type { Plugin } from 'vite';

// Build-time helpers for serving the app from a sub path (GitHub Pages project site).
// Used by vite.config.ts; kept here so the logic is unit-testable without starting Vite.

export const DEFAULT_BASE_PATH = '/';

// "/" or a sub path that starts and ends with "/" and has no empty, query or fragment segments.
const BASE_PATH_PATTERN = /^\/([^/\s?#]+\/)*$/;

/**
 * Reads the BASE_PATH environment variable. Unset means "/" (dev, tests, Storybook and the plain
 * build). Any other value must start and end with "/", otherwise the build fails with a clear message.
 */
export function resolveBasePath(raw: string | undefined): string {
  if (raw === undefined) return DEFAULT_BASE_PATH;
  if (!BASE_PATH_PATTERN.test(raw)) {
    throw new Error(
      `Invalid BASE_PATH ${JSON.stringify(raw)}: it must start and end with "/" (for example "/" or "/duolingo-ui-clone/").`,
    );
  }
  return raw;
}

interface EmittedAsset {
  type: 'asset' | 'chunk';
  source?: string | Uint8Array;
}

/**
 * GitHub Pages has no rewrites, so a deep link such as /duolingo-ui-clone/lesson/1 would hit a 404.
 * Pages serves 404.html for any unknown path, so a copy of the built index.html there boots the SPA
 * and the router resolves the URL. Downside: deep links are answered with HTTP status 404 (crawlers and
 * monitors see an error) and the app boots after a brief blank flash.
 *
 * Only active when the base is not "/", so the plain build is unchanged.
 */
export function spaFallbackPlugin(base: string): Plugin {
  return {
    name: 'duolingo-ui-clone:spa-404-fallback',
    apply: 'build',
    // Run after Vite's own HTML plugin so the copied index.html already has the final asset URLs.
    enforce: 'post',
    generateBundle(_options, bundle) {
      if (base === DEFAULT_BASE_PATH) return;
      const index = bundle['index.html'] as EmittedAsset | undefined;
      if (index === undefined || index.type !== 'asset' || index.source === undefined) {
        this.error('Cannot emit 404.html: index.html was not found in the bundle as an asset.');
      }
      this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
    },
  };
}

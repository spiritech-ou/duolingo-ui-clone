import { describe, expect, it, vi } from 'vitest';
import { resolveBasePath, spaFallbackPlugin } from '@scripts/pages';

describe('resolveBasePath', () => {
  it('defaults to "/" when BASE_PATH is unset', () => {
    expect(resolveBasePath(undefined)).toBe('/');
  });

  it.each(['/', '/duolingo-ui-clone/', '/a/b/'])('accepts %s', (value) => {
    expect(resolveBasePath(value)).toBe(value);
  });

  it.each([
    ['empty string', ''],
    ['no leading slash', 'duolingo-ui-clone/'],
    ['no trailing slash', '/duolingo-ui-clone'],
    ['neither slash', 'duolingo-ui-clone'],
    ['absolute URL', 'https://example.com/app/'],
    ['empty segment', '//app/'],
    ['whitespace', '/my app/'],
    ['query', '/app/?x=1/'],
  ])('rejects %s with a clear message', (_label, value) => {
    expect(() => resolveBasePath(value)).toThrowError(/Invalid BASE_PATH .* must start and end with "\/"/);
  });
});

interface FakeContext {
  emitFile: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

function runGenerateBundle(base: string, bundle: Record<string, unknown>): FakeContext {
  const plugin = spaFallbackPlugin(base);
  const context: FakeContext = {
    emitFile: vi.fn(),
    error: vi.fn((message: string) => {
      throw new Error(message);
    }),
  };
  const hook = plugin.generateBundle;
  if (typeof hook !== 'function') throw new Error('generateBundle hook is missing');
  // The hook only needs emitFile and error from the plugin context; the rest of the context is unused.
  hook.call(context as never, {} as never, bundle as never, false);
  return context;
}

describe('spaFallbackPlugin', () => {
  const html = '<!doctype html><script type="module" src="/duolingo-ui-clone/assets/index.js"></script>';

  it('emits 404.html as a copy of index.html when the base is a sub path', () => {
    const context = runGenerateBundle('/duolingo-ui-clone/', { 'index.html': { type: 'asset', source: html } });
    expect(context.emitFile).toHaveBeenCalledExactlyOnceWith({ type: 'asset', fileName: '404.html', source: html });
  });

  it('emits nothing when the base is "/"', () => {
    const context = runGenerateBundle('/', { 'index.html': { type: 'asset', source: html } });
    expect(context.emitFile).not.toHaveBeenCalled();
  });

  it('fails the build when index.html is missing from the bundle', () => {
    expect(() => runGenerateBundle('/duolingo-ui-clone/', {})).toThrowError(/index\.html was not found/);
  });

  it('only runs on build, after the HTML plugin', () => {
    const plugin = spaFallbackPlugin('/duolingo-ui-clone/');
    expect(plugin.apply).toBe('build');
    expect(plugin.enforce).toBe('post');
  });
});

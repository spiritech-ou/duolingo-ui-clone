import { afterEach, describe, expect, it, vi } from 'vitest';
import { assetUrl, routerBasename } from '@/lib/baseUrl';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('assetUrl', () => {
  it.each([
    ['/', '/audio/a.mp3'],
    ['/duolingo-ui-clone/', '/duolingo-ui-clone/audio/a.mp3'],
    ['./', '/audio/a.mp3'],
  ])('with base %s, a path with and without a leading slash gives %s', (base, expected) => {
    vi.stubEnv('BASE_URL', base);

    expect(assetUrl('/audio/a.mp3')).toBe(expected);
    expect(assetUrl('audio/a.mp3')).toBe(expected);
  });

  it.each([
    ['/', '/'],
    ['/duolingo-ui-clone/', '/duolingo-ui-clone/'],
    ['./', '/'],
  ])('with base %s, the empty path gives %s', (base, expected) => {
    vi.stubEnv('BASE_URL', base);

    expect(assetUrl('')).toBe(expected);
  });

  it('never produces a double slash, even for repeated leading slashes', () => {
    vi.stubEnv('BASE_URL', '/duolingo-ui-clone/');

    expect(assetUrl('//audio/a.mp3')).toBe('/duolingo-ui-clone/audio/a.mp3');
  });

  it('tolerates a base without a trailing slash', () => {
    vi.stubEnv('BASE_URL', '/duolingo-ui-clone');

    expect(assetUrl('audio/a.mp3')).toBe('/duolingo-ui-clone/audio/a.mp3');
  });

  it('reads the base at call time', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(assetUrl('x.png')).toBe('/x.png');

    vi.stubEnv('BASE_URL', '/duolingo-ui-clone/');
    expect(assetUrl('x.png')).toBe('/duolingo-ui-clone/x.png');
  });
});

describe('routerBasename', () => {
  it.each([
    ['/', '/'],
    ['/duolingo-ui-clone/', '/duolingo-ui-clone'],
    ['/duolingo-ui-clone', '/duolingo-ui-clone'],
    ['./', '/'],
  ])('with base %s gives %s', (base, expected) => {
    vi.stubEnv('BASE_URL', base);

    expect(routerBasename()).toBe(expected);
  });

  it('reads the base at call time', () => {
    vi.stubEnv('BASE_URL', '/');
    expect(routerBasename()).toBe('/');

    vi.stubEnv('BASE_URL', '/duolingo-ui-clone/');
    expect(routerBasename()).toBe('/duolingo-ui-clone');
  });
});

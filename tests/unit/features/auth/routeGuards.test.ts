import { describe, expect, it } from 'vitest';
import { resolveGuard, resolvePostLoginDestination } from '@/features/auth/logic/routeGuards';

const done = { completed: true, level: 2 };
const fresh = { completed: false, level: null };
const withLevel = { completed: false, level: 1 };
const none = { kind: 'none' };

describe('resolveGuard', () => {
  describe('rule 1: no session', () => {
    it('redirects to /login remembering the requested path', () => {
      expect(resolveGuard({ hasSession: false, onboarding: fresh, pathname: '/learn' })).toEqual({
        kind: 'redirect',
        to: '/login',
        from: '/learn',
      });
      expect(
        resolveGuard({ hasSession: false, onboarding: fresh, pathname: '/lesson/abc' }),
      ).toEqual({ kind: 'redirect', to: '/login', from: '/lesson/abc' });
      expect(
        resolveGuard({ hasSession: false, onboarding: fresh, pathname: '/onboarding/level' }),
      ).toEqual({ kind: 'redirect', to: '/login', from: '/onboarding/level' });
    });

    it('stays on /login', () => {
      expect(resolveGuard({ hasSession: false, onboarding: fresh, pathname: '/login' })).toEqual(
        none,
      );
    });
  });

  describe('rule 2: session on /login', () => {
    it('redirects to /learn', () => {
      expect(resolveGuard({ hasSession: true, onboarding: done, pathname: '/login' })).toEqual({
        kind: 'redirect',
        to: '/learn',
      });
    });

    it('redirects to /learn even when not onboarded (rule 3 then applies on /learn)', () => {
      expect(resolveGuard({ hasSession: true, onboarding: fresh, pathname: '/login' })).toEqual({
        kind: 'redirect',
        to: '/learn',
      });
    });
  });

  describe('rule 3: not onboarded outside /onboarding', () => {
    it.each(['/learn', '/practice', '/lesson/abc', '/', '/unknown'])('redirects %s', (pathname) => {
      expect(resolveGuard({ hasSession: true, onboarding: fresh, pathname })).toEqual({
        kind: 'redirect',
        to: '/onboarding/level',
      });
    });

    it('allows both onboarding routes (with a level for /start)', () => {
      expect(
        resolveGuard({ hasSession: true, onboarding: withLevel, pathname: '/onboarding/level' }),
      ).toEqual(none);
      expect(
        resolveGuard({ hasSession: true, onboarding: withLevel, pathname: '/onboarding/start' }),
      ).toEqual(none);
    });
  });

  describe('rule 4: onboarded under /onboarding', () => {
    it.each(['/onboarding/level', '/onboarding/start', '/onboarding'])(
      'redirects %s to /learn',
      (pathname) => {
        expect(resolveGuard({ hasSession: true, onboarding: done, pathname })).toEqual({
          kind: 'redirect',
          to: '/learn',
        });
      },
    );

    it('does not treat a lookalike prefix as onboarding', () => {
      expect(
        resolveGuard({ hasSession: true, onboarding: done, pathname: '/onboardingx' }),
      ).toEqual(none);
    });
  });

  describe('rule 5: /onboarding/start without a level', () => {
    it('redirects to /onboarding/level', () => {
      expect(
        resolveGuard({ hasSession: true, onboarding: fresh, pathname: '/onboarding/start' }),
      ).toEqual({ kind: 'redirect', to: '/onboarding/level' });
    });

    it('treats level 0 as chosen', () => {
      expect(
        resolveGuard({
          hasSession: true,
          onboarding: { completed: false, level: 0 },
          pathname: '/onboarding/start',
        }),
      ).toEqual(none);
    });
  });

  describe('no redirect', () => {
    it.each(['/learn', '/practice', '/lesson/abc', '/lesson/unknown-id'])(
      'lets an onboarded user open %s',
      (pathname) => {
        expect(resolveGuard({ hasSession: true, onboarding: done, pathname })).toEqual(none);
      },
    );
  });

  describe('rule order', () => {
    it('rule 1 beats rules 2 to 5 (no session wins on any path)', () => {
      expect(
        resolveGuard({ hasSession: false, onboarding: done, pathname: '/onboarding/start' }),
      ).toEqual({ kind: 'redirect', to: '/login', from: '/onboarding/start' });
    });

    it('rule 2 beats rule 3 (login goes to /learn, not onboarding)', () => {
      expect(resolveGuard({ hasSession: true, onboarding: fresh, pathname: '/login' })).toEqual({
        kind: 'redirect',
        to: '/learn',
      });
    });

    it('rule 4 beats rule 5 (onboarded on /start without level goes to /learn)', () => {
      expect(
        resolveGuard({
          hasSession: true,
          onboarding: { completed: true, level: null },
          pathname: '/onboarding/start',
        }),
      ).toEqual({ kind: 'redirect', to: '/learn' });
    });

    it('rule 3 beats rule 5 only outside onboarding (not-onboarded /learn goes to level)', () => {
      expect(resolveGuard({ hasSession: true, onboarding: fresh, pathname: '/learn' })).toEqual({
        kind: 'redirect',
        to: '/onboarding/level',
      });
    });
  });
});

describe('resolvePostLoginDestination', () => {
  it.each(['/learn', '/practice', '/lesson/abc'])('returns an allowed from %s', (from) => {
    expect(resolvePostLoginDestination({ from, onboarding: done })).toBe(from);
  });

  it('falls back to /learn without a from', () => {
    expect(resolvePostLoginDestination({ from: null, onboarding: done })).toBe('/learn');
    expect(resolvePostLoginDestination({ from: undefined, onboarding: done })).toBe('/learn');
  });

  it('ignores a from of /login', () => {
    expect(resolvePostLoginDestination({ from: '/login', onboarding: done })).toBe('/learn');
  });

  it.each(['/onboarding/level', '/onboarding/start'])('ignores an onboarding from %s', (from) => {
    expect(resolvePostLoginDestination({ from, onboarding: done })).toBe('/learn');
    expect(resolvePostLoginDestination({ from, onboarding: fresh })).toBe('/onboarding/level');
  });

  it.each(['/nope', '', '/lesson', '/lesson/', '/lesson/a/b', '/learn/extra', 'learn', '/'])(
    'ignores an unknown from %j',
    (from) => {
      expect(resolvePostLoginDestination({ from, onboarding: done })).toBe('/learn');
    },
  );

  it('sends a not onboarded user to onboarding whatever the from', () => {
    expect(resolvePostLoginDestination({ from: '/lesson/abc', onboarding: fresh })).toBe(
      '/onboarding/level',
    );
    expect(resolvePostLoginDestination({ from: null, onboarding: withLevel })).toBe(
      '/onboarding/level',
    );
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_STORAGE_KEY,
  SESSION_STORAGE_VERSION,
  useSessionStore,
} from '@/store/useSessionStore';

const session = {
  token: 'fake-token',
  user: { id: 'u1', email: 'ada@example.com', displayName: 'Ada' },
};

function stored(): { state: { session: unknown }; version: number } | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

describe('useSessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    localStorage.clear();
  });

  it('starts signed out', () => {
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('setSession stores the session and persists it with name and version', () => {
    useSessionStore.getState().setSession(session);
    expect(useSessionStore.getState().session).toEqual(session);
    expect(stored()).toEqual({ state: { session }, version: SESSION_STORAGE_VERSION });
  });

  it('never stores a password', () => {
    useSessionStore
      .getState()
      .setSession({ ...session, password: 'secret-password' } as unknown as typeof session);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toContain('secret-password');
    expect(useSessionStore.getState().session).toEqual(session);
  });

  it('clearSession signs out and persists null', () => {
    useSessionStore.getState().setSession(session);
    useSessionStore.getState().clearSession();
    expect(useSessionStore.getState().session).toBeNull();
    expect(stored()?.state.session).toBeNull();
  });

  it('reset signs out', () => {
    useSessionStore.getState().setSession(session);
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('restores a valid stored session on rehydrate, with no expiry', async () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ state: { session }, version: SESSION_STORAGE_VERSION }),
    );
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState().session).toEqual(session);
  });

  it.each([
    ['missing user field', { token: 't', user: { id: 'u1', email: 'a@b.co' } }],
    ['wrong token type', { token: 42, user: session.user }],
    ['a string', 'not-a-session'],
    ['an empty object', {}],
  ])('discards a stored session that fails parsing (%s)', async (_label, bad) => {
    useSessionStore.getState().setSession(session);
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ state: { session: bad }, version: SESSION_STORAGE_VERSION }),
    );
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('discards unparseable stored JSON', async () => {
    useSessionStore.getState().setSession(session);
    localStorage.setItem(SESSION_STORAGE_KEY, '{not json');
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState().session).toBeNull();
  });
});

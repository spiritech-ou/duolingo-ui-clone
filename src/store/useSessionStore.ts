import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type PersistStorage,
  type StorageValue,
} from 'zustand/middleware';
import { loginResponseSchema, type LoginResponse } from '@/api/schemas/auth';

export const SESSION_STORAGE_KEY = 'session';
export const SESSION_STORAGE_VERSION = 1;

/** The signed-in session (token and user), or null when signed out. */
export type Session = LoginResponse;

interface SessionState {
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
  reset: () => void;
}

type PersistedSession = Pick<SessionState, 'session'>;

const jsonStorage = createJSONStorage<PersistedSession>(() => localStorage);

// Unparseable JSON in storage counts as no stored session instead of throwing.
const storage: PersistStorage<PersistedSession> | undefined = jsonStorage && {
  ...jsonStorage,
  getItem: (name): StorageValue<PersistedSession> | null => {
    try {
      return jsonStorage.getItem(name) as StorageValue<PersistedSession> | null;
    } catch {
      return { state: { session: null }, version: SESSION_STORAGE_VERSION };
    }
  },
};

/** Current user id while signed out; never a real id. */
export const NO_USER_ID = '';

/** Narrow selector for the current user id: `useSessionStore(selectCurrentUserId)`. */
export const selectCurrentUserId = (state: Pick<SessionState, 'session'>): string =>
  state.session?.user.id ?? NO_USER_ID;

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => {
        // Rebuild from the schema so nothing beyond token and user (a password) is kept.
        set({ session: loginResponseSchema.parse(session) });
      },
      clearSession: () => set({ session: null }),
      reset: () => set({ session: null }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      version: SESSION_STORAGE_VERSION,
      storage,
      partialize: (state) => ({ session: state.session }),
      // A stored session that fails zod parsing is discarded (signed out).
      merge: (persisted, current) => {
        const stored =
          typeof persisted === 'object' && persisted !== null
            ? (persisted as { session?: unknown }).session
            : null;
        const parsed = loginResponseSchema.safeParse(stored);
        return { ...current, session: parsed.success ? parsed.data : null };
      },
    },
  ),
);

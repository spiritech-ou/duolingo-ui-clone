import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type PersistStorage,
  type StorageValue,
} from 'zustand/middleware';
import {
  MAX_HEARTS,
  profilesSchema,
  type Level,
  type Profile,
  type StartChoice,
} from '@/api/schemas/profile';

export const PROFILE_STORAGE_KEY = 'profiles';
export const PROFILE_STORAGE_VERSION = 1;

export type { Level, Profile, StartChoice };

export interface CompleteOnboardingInput {
  level: Level;
  startChoice: StartChoice;
  startUnitIndex: number;
}

/** Defaults of a new profile (app-shell-and-routing.md, Data needed). */
export function createDefaultProfile(): Profile {
  return {
    onboarding: { completed: false, level: null, startChoice: null },
    startUnitIndex: 0,
    completedLessonIds: [],
    hearts: MAX_HEARTS,
    hasSeenHeartsIntro: false,
    placementNoteDismissed: false,
    noVoiceNoteDismissed: false,
  };
}

/** Stable value returned by `selectProfile` for a user not seen yet (never mutated). */
export const DEFAULT_PROFILE: Profile = Object.freeze(createDefaultProfile()) as Profile; // freeze only narrows to readonly

interface ProfileState {
  /** Profiles keyed by user id. Survive log out; only `reset()` empties them. */
  profiles: Record<string, Profile>;
  /**
   * True when a stored profile could not be read (unparseable JSON or failed zod parse) and was
   * discarded. The route guard sends the user to /login while it is true, then calls
   * `acknowledgeUnreadableStorage()`. Never persisted.
   */
  storageUnreadable: boolean;
  acknowledgeUnreadableStorage: () => void;
  /** Creates the profile with the defaults the first time a user id is seen. */
  ensureProfile: (userId: string) => void;
  saveDraftLevel: (userId: string, level: Level) => void;
  completeOnboarding: (userId: string, input: CompleteOnboardingInput) => void;
  markLessonCompleted: (userId: string, lessonId: string) => void;
  loseHeart: (userId: string) => void;
  gainHeart: (userId: string) => void;
  markHeartsIntroSeen: (userId: string) => void;
  dismissPlacementNote: (userId: string) => void;
  dismissNoVoiceNote: (userId: string) => void;
  reset: () => void;
}

type PersistedProfiles = Pick<ProfileState, 'profiles'>;

const jsonStorage = createJSONStorage<PersistedProfiles>(() => localStorage);

// Unparseable JSON in storage becomes a value that fails the zod parse in `merge`.
const storage: PersistStorage<PersistedProfiles> | undefined = jsonStorage && {
  ...jsonStorage,
  getItem: (name): StorageValue<PersistedProfiles> | null => {
    try {
      return jsonStorage.getItem(name) as StorageValue<PersistedProfiles> | null;
    } catch {
      // Deliberately invalid shape so `merge` reports it as unreadable.
      return { state: { profiles: null }, version: PROFILE_STORAGE_VERSION } as unknown as StorageValue<PersistedProfiles>; // invalid on purpose
    }
  },
};

/** Keeps a heart count within 0 and MAX_HEARTS. */
export const clampHearts = (n: number): number => Math.min(MAX_HEARTS, Math.max(0, n));

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => {
      // Applies `change` to the user's profile, creating it with defaults first when unseen.
      const update = (userId: string, change: (profile: Profile) => Profile): void => {
        set((state): Pick<ProfileState, 'profiles'> => ({
          profiles: {
            ...state.profiles,
            [userId]: change(state.profiles[userId] ?? createDefaultProfile()),
          },
        }));
      };

      return {
        profiles: {},
        storageUnreadable: false,
        acknowledgeUnreadableStorage: () => set({ storageUnreadable: false }),
        ensureProfile: (userId) => update(userId, (p) => p),
        saveDraftLevel: (userId, level) =>
          update(userId, (p) => ({ ...p, onboarding: { ...p.onboarding, level } })),
        // startUnitIndex only informs the recommended lesson; it never touches completedLessonIds.
        completeOnboarding: (userId, { level, startChoice, startUnitIndex }) =>
          update(userId, (p) => ({
            ...p,
            onboarding: { completed: true, level, startChoice },
            startUnitIndex: Math.max(0, Math.trunc(startUnitIndex)),
          })),
        markLessonCompleted: (userId, lessonId) =>
          update(userId, (p) =>
            p.completedLessonIds.includes(lessonId)
              ? p
              : { ...p, completedLessonIds: [...p.completedLessonIds, lessonId] },
          ),
        loseHeart: (userId) => update(userId, (p) => ({ ...p, hearts: clampHearts(p.hearts - 1) })),
        gainHeart: (userId) => update(userId, (p) => ({ ...p, hearts: clampHearts(p.hearts + 1) })),
        markHeartsIntroSeen: (userId) => update(userId, (p) => ({ ...p, hasSeenHeartsIntro: true })),
        dismissPlacementNote: (userId) =>
          update(userId, (p) => ({ ...p, placementNoteDismissed: true })),
        dismissNoVoiceNote: (userId) => update(userId, (p) => ({ ...p, noVoiceNoteDismissed: true })),
        reset: () => set({ profiles: {}, storageUnreadable: false }),
      };
    },
    {
      name: PROFILE_STORAGE_KEY,
      version: PROFILE_STORAGE_VERSION,
      storage,
      partialize: (state) => ({ profiles: state.profiles }),
      // Stored profiles that fail zod parsing are discarded and reported via `storageUnreadable`.
      merge: (persisted, current) => {
        // Nothing stored (first visit): keep the current state, nothing to report.
        if (persisted === undefined) return current;
        const stored =
          typeof persisted === 'object' && persisted !== null
            ? (persisted as { profiles?: unknown }).profiles // narrowed by the zod parse below
            : undefined;
        const parsed = profilesSchema.safeParse(stored);
        return parsed.success
          ? { ...current, profiles: parsed.data, storageUnreadable: false }
          : { ...current, profiles: {}, storageUnreadable: true };
      },
    },
  ),
);

/** Narrow selector: `useProfileStore(selectProfile(userId))`. Unseen users read the defaults. */
export const selectProfile =
  (userId: string) =>
  (state: Pick<ProfileState, 'profiles'>): Profile =>
    state.profiles[userId] ?? DEFAULT_PROFILE;

export const selectStorageUnreadable = (state: Pick<ProfileState, 'storageUnreadable'>): boolean =>
  state.storageUnreadable;

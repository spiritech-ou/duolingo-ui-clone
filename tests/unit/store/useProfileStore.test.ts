import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFILE,
  PROFILE_STORAGE_KEY,
  PROFILE_STORAGE_VERSION,
  createDefaultProfile,
  selectProfile,
  useProfileStore,
} from '@/store/useProfileStore';

const A = 'user-a';
const B = 'user-b';

const actions = () => useProfileStore.getState();
const profileOf = (id: string) => selectProfile(id)(useProfileStore.getState());

function stored(): { state: { profiles: Record<string, unknown> }; version: number } | null {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

describe('useProfileStore', () => {
  beforeEach(() => {
    localStorage.clear();
    actions().reset();
    localStorage.clear();
  });

  it('reads the spec defaults for an unseen user without creating a profile', () => {
    expect(profileOf(A)).toEqual({
      onboarding: { completed: false, level: null, startChoice: null },
      startUnitIndex: 0,
      completedLessonIds: [],
      hearts: 5,
      hasSeenHeartsIntro: false,
      placementNoteDismissed: false,
      noVoiceNoteDismissed: false,
    });
    expect(profileOf(A)).toBe(DEFAULT_PROFILE);
    expect(actions().profiles).toEqual({});
  });

  it('ensureProfile creates defaults once and keeps later changes', () => {
    actions().ensureProfile(A);
    expect(actions().profiles[A]).toEqual(createDefaultProfile());
    actions().loseHeart(A);
    actions().ensureProfile(A);
    expect(profileOf(A).hearts).toBe(4);
  });

  it('saveDraftLevel stores the level without completing onboarding', () => {
    actions().saveDraftLevel(A, 3);
    expect(profileOf(A).onboarding).toEqual({ completed: false, level: 3, startChoice: null });
  });

  it('completeOnboarding stores level, choice and start unit, and completes nothing', () => {
    actions().completeOnboarding(A, { level: 2, startChoice: 'find-level', startUnitIndex: 3 });
    expect(profileOf(A).onboarding).toEqual({ completed: true, level: 2, startChoice: 'find-level' });
    expect(profileOf(A).startUnitIndex).toBe(3);
    expect(profileOf(A).completedLessonIds).toEqual([]);
  });

  it('markLessonCompleted never records a duplicate', () => {
    actions().markLessonCompleted(A, 'l1');
    actions().markLessonCompleted(A, 'l2');
    actions().markLessonCompleted(A, 'l1');
    expect(profileOf(A).completedLessonIds).toEqual(['l1', 'l2']);
  });

  it('keeps hearts between 0 and 5', () => {
    actions().gainHeart(A);
    expect(profileOf(A).hearts).toBe(5);
    for (let i = 0; i < 8; i += 1) actions().loseHeart(A);
    expect(profileOf(A).hearts).toBe(0);
    actions().gainHeart(A);
    expect(profileOf(A).hearts).toBe(1);
  });

  it('saves hearts immediately', () => {
    actions().loseHeart(A);
    expect(stored()?.state.profiles[A]).toMatchObject({ hearts: 4 });
  });

  it('sets the three flags independently', () => {
    actions().markHeartsIntroSeen(A);
    expect(profileOf(A)).toMatchObject({
      hasSeenHeartsIntro: true,
      placementNoteDismissed: false,
      noVoiceNoteDismissed: false,
    });
    actions().dismissPlacementNote(A);
    actions().dismissNoVoiceNote(A);
    expect(profileOf(A)).toMatchObject({
      hasSeenHeartsIntro: true,
      placementNoteDismissed: true,
      noVoiceNoteDismissed: true,
    });
  });

  it('keeps profiles of different users separate', () => {
    actions().loseHeart(A);
    actions().markLessonCompleted(A, 'l1');
    expect(profileOf(B)).toEqual(createDefaultProfile());
    actions().dismissNoVoiceNote(B);
    expect(profileOf(A).noVoiceNoteDismissed).toBe(false);
  });

  it('persists with name and version and restores on rehydrate', async () => {
    actions().completeOnboarding(A, { level: 1, startChoice: 'scratch', startUnitIndex: 0 });
    actions().markLessonCompleted(A, 'l1');
    actions().loseHeart(A);
    const expected = actions().profiles;
    expect(stored()).toEqual({
      state: { profiles: expected },
      version: PROFILE_STORAGE_VERSION,
    });
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY) ?? '';
    useProfileStore.setState({ profiles: {} });
    localStorage.setItem(PROFILE_STORAGE_KEY, raw);
    await useProfileStore.persist.rehydrate();
    expect(actions().profiles).toEqual(expected);
    expect(actions().storageUnreadable).toBe(false);
  });

  it('reset empties the profiles', () => {
    actions().loseHeart(A);
    actions().reset();
    expect(actions().profiles).toEqual({});
  });

  it.each([
    ['hearts above 5', { hearts: 9 }],
    ['hearts as a string', { hearts: '5' }],
    ['level 7', { onboarding: { completed: true, level: 7, startChoice: null } }],
    ['unknown start choice', { onboarding: { completed: true, level: 1, startChoice: 'x' } }],
    ['non-array lessons', { completedLessonIds: 'l1' }],
    ['missing fields', null],
  ])('discards stored data that fails parsing (%s) and reports it', async (_label, patch) => {
    actions().loseHeart(B);
    const bad = patch === null ? { hearts: 5 } : { ...createDefaultProfile(), ...patch };
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        state: { profiles: { [A]: bad } },
        version: PROFILE_STORAGE_VERSION,
      }),
    );
    await useProfileStore.persist.rehydrate();
    expect(actions().profiles).toEqual({});
    expect(actions().storageUnreadable).toBe(true);
  });

  it('discards unparseable stored JSON and reports it', async () => {
    actions().loseHeart(A);
    localStorage.setItem(PROFILE_STORAGE_KEY, '{not json');
    await useProfileStore.persist.rehydrate();
    expect(actions().profiles).toEqual({});
    expect(actions().storageUnreadable).toBe(true);
  });

  it('acknowledgeUnreadableStorage clears the flag, which is never persisted', async () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, '{not json');
    await useProfileStore.persist.rehydrate();
    actions().acknowledgeUnreadableStorage();
    expect(actions().storageUnreadable).toBe(false);
    actions().loseHeart(A);
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).not.toContain('storageUnreadable');
  });

  it('reports nothing when storage is empty', async () => {
    await useProfileStore.persist.rehydrate();
    expect(actions().storageUnreadable).toBe(false);
  });
});

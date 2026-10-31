import { beforeEach, describe, expect, it } from 'vitest';
import {
  getArrivalTarget,
  peekDeparture,
  rememberDeparture,
  resetArrivalMemory,
  type Departure,
} from '@/features/learn/logic/arrivalMemory';

const left: Departure = {
  userId: 'u1',
  lessonId: 'a',
  completedLessonIds: [],
  recommendedLessonId: 'a',
};

describe('departure memory', () => {
  beforeEach(resetArrivalMemory);

  it('is peeked without being forgotten, until reset', () => {
    rememberDeparture(left);
    expect(peekDeparture('u1')).toEqual(left);
    expect(peekDeparture('u1')).toEqual(left);
    resetArrivalMemory();
    expect(peekDeparture('u1')).toBeNull();
  });

  it('ignores a departure of another user', () => {
    rememberDeparture(left);
    expect(peekDeparture('u2')).toBeNull();
  });
});

describe('getArrivalTarget', () => {
  it('targets the recommended lesson, with no celebration on a plain visit', () => {
    expect(getArrivalTarget('b', [], null)).toEqual({ focusLessonId: 'b', celebrate: false });
  });

  it('celebrates a moved recommendation after a newly completed lesson', () => {
    expect(getArrivalTarget('b', ['a'], left)).toEqual({ focusLessonId: 'b', celebrate: true });
  });

  it('does not celebrate when nothing was completed or the recommendation did not move', () => {
    expect(getArrivalTarget('a', [], left).celebrate).toBe(false);
    expect(getArrivalTarget('a', ['x'], left).celebrate).toBe(false);
  });

  it('keeps the lesson just left in view when nothing is recommended', () => {
    expect(getArrivalTarget(null, ['a'], left)).toEqual({ focusLessonId: 'a', celebrate: false });
  });

  it('falls back to the first node (null) with no recommendation and no departure', () => {
    expect(getArrivalTarget(null, [], null)).toEqual({ focusLessonId: null, celebrate: false });
  });
});

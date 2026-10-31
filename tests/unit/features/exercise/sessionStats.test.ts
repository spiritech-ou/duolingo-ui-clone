import { describe, expect, it } from 'vitest';
import {
  calculateAccuracy,
  formatElapsed,
  isPerfectLesson,
} from '@/features/exercise/logic/sessionStats';

describe('calculateAccuracy', () => {
  it('is 100 with nothing missed and 0 with every exercise missed', () => {
    expect(calculateAccuracy(0)).toBe(100);
    expect(calculateAccuracy(10)).toBe(0);
  });

  it('takes 10 points per distinct miss', () => {
    expect(calculateAccuracy(1)).toBe(90);
    expect(calculateAccuracy(2)).toBe(80);
    expect(calculateAccuracy(5)).toBe(50);
  });

  it('counts a word missed twice once (callers pass the distinct count)', () => {
    // the same exercise missed twice is one entry in missedIds
    expect(calculateAccuracy(new Set(['a', 'a']).size)).toBe(90);
  });

  it('clamps out-of-range input and handles an empty total', () => {
    expect(calculateAccuracy(15)).toBe(0);
    expect(calculateAccuracy(-2)).toBe(100);
    expect(calculateAccuracy(0, 0)).toBe(100);
  });

  it('uses a custom total and rounds', () => {
    expect(calculateAccuracy(1, 3)).toBe(67);
    expect(calculateAccuracy(1, 5)).toBe(80);
  });
});

describe('isPerfectLesson', () => {
  it('is true only with no misses', () => {
    expect(isPerfectLesson(0)).toBe(true);
    expect(isPerfectLesson(1)).toBe(false);
  });
});

describe('formatElapsed', () => {
  it('formats under a minute with a padded second', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(5_000)).toBe('0:05');
    expect(formatElapsed(59_999)).toBe('0:59');
  });

  it('formats minutes without padding', () => {
    expect(formatElapsed(60_000)).toBe('1:00');
    expect(formatElapsed(134_000)).toBe('2:14');
  });

  it('formats over ten minutes', () => {
    expect(formatElapsed(10 * 60_000)).toBe('10:00');
    expect(formatElapsed(75 * 60_000 + 9_000)).toBe('75:09');
  });

  it('treats negative durations as zero', () => {
    expect(formatElapsed(-500)).toBe('0:00');
  });
});

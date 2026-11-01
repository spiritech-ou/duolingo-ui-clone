import { describe, expect, it } from 'vitest';
import { earnsPracticeHeart } from '@/features/exercise/logic/practiceHeart';

describe('earnsPracticeHeart', () => {
  it.each([0, 1, 4])('earns a heart with %i hearts before', (hearts) => {
    expect(earnsPracticeHeart(hearts)).toBe(true);
  });

  it('earns nothing at the cap', () => {
    expect(earnsPracticeHeart(5)).toBe(false);
  });
});

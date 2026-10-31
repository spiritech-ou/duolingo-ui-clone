import { describe, expect, it } from 'vitest';
import { LEVEL_OPTIONS } from '@/features/onboarding/logic/levels';
import { getStartUnitIndex } from '@/features/onboarding/logic/startUnit';

describe('getStartUnitIndex', () => {
  it('gives 0 for every level when starting from scratch', () => {
    for (const { level } of LEVEL_OPTIONS) expect(getStartUnitIndex(level, 'scratch')).toBe(0);
  });

  it('gives the level index for "find my level"', () => {
    expect(getStartUnitIndex(1, 'find-level')).toBe(1);
    expect(getStartUnitIndex(4, 'find-level')).toBe(4);
    expect(getStartUnitIndex(0, 'find-level')).toBe(0);
  });
});

describe('LEVEL_OPTIONS', () => {
  it('has five levels with 0 to 4 signal bars and a reaction each', () => {
    expect(LEVEL_OPTIONS.map((o) => o.bars)).toEqual([0, 1, 2, 3, 4]);
    expect(LEVEL_OPTIONS.map((o) => o.level)).toEqual([0, 1, 2, 3, 4]);
    for (const option of LEVEL_OPTIONS) expect(option.reaction).not.toBe('');
  });
});

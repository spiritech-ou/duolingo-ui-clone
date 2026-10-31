import type { Level, StartChoice } from '@/api/schemas/profile';

/**
 * Recommended start unit (onboarding.md): "scratch" starts at unit 0, "find-level" at the chosen
 * level index. Capping to the course length happens later, in the learning path.
 */
export function getStartUnitIndex(level: Level, startChoice: StartChoice): number {
  return startChoice === 'scratch' ? 0 : level;
}

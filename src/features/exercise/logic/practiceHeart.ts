import { MAX_HEARTS } from '@/api/schemas/profile';

/** Completing a practice earns a heart only below the cap (OQ-53); at the cap nothing is saved. */
export function earnsPracticeHeart(heartsBefore: number): boolean {
  return heartsBefore < MAX_HEARTS;
}

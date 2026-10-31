import type { Level } from '@/api/schemas/profile';

/** Step 1 prompt bubble (docs/product/onboarding.md, Copy). */
export const LEVEL_PROMPT = 'How much Estonian do you know?';
export const CONTINUE_HINT = 'Choose an option to continue';

export interface LevelOption {
  /** Profile level, also the `startUnitIndex` when "Find my level" is chosen. */
  level: Level;
  label: string;
  /** Filled bars of the four-bar signal icon. */
  bars: number;
  /** Bubble line shown after choosing this level. */
  reaction: string;
}

export const LEVEL_OPTIONS: readonly LevelOption[] = [
  { level: 0, label: "I'm new to Estonian", bars: 0, reaction: "Okay, we'll start fresh!" },
  { level: 1, label: 'I know some common words', bars: 1, reaction: 'Nice, you already have a head start!' },
  { level: 2, label: 'I can have basic conversations', bars: 2, reaction: 'Great, you can already chat a bit!' },
  { level: 3, label: 'I can talk about various topics', bars: 3, reaction: "Impressive, you're quite far along!" },
  { level: 4, label: 'I can discuss most topics in detail', bars: 4, reaction: "Wow, you're nearly fluent!" },
];

/** The lowest level completes onboarding on step 1. */
export const LOWEST_LEVEL: Level = 0;

export function findLevelOption(level: number | null): LevelOption | null {
  return LEVEL_OPTIONS.find((option) => option.level === level) ?? null;
}

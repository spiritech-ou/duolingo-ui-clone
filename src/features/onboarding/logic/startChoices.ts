import type { StartChoice } from '@/api/schemas/profile';

/** Step 2 prompt bubble (docs/product/onboarding.md, Copy). */
export const START_PROMPT = "Now let's find the best place to start!";

export interface StartChoiceOption {
  value: StartChoice;
  label: string;
  description: string;
}

export const START_OPTIONS: readonly StartChoiceOption[] = [
  { value: 'scratch', label: 'Start from scratch', description: 'Take the easiest lesson of the Estonian course' },
  {
    value: 'find-level',
    label: 'Find my level',
    description: 'Let the flame recommend where you should start learning',
  },
];

export function findStartChoice(value: string | null): StartChoice | null {
  return START_OPTIONS.find((option) => option.value === value)?.value ?? null;
}

import { z } from 'zod';

export const MAX_HEARTS = 5;

export const startChoiceSchema = z.enum(['scratch', 'find-level']);
export const levelSchema = z.number().int().min(0).max(4);

/** The per-user learner profile of docs/product/app-shell-and-routing.md (Data needed). */
export const profileSchema = z.object({
  onboarding: z.object({
    completed: z.boolean(),
    level: levelSchema.nullable(),
    startChoice: startChoiceSchema.nullable(),
  }),
  startUnitIndex: z.number().int().min(0),
  completedLessonIds: z.array(z.string().min(1)),
  hearts: z.number().int().min(0).max(MAX_HEARTS),
  hasSeenHeartsIntro: z.boolean(),
  placementNoteDismissed: z.boolean(),
  noVoiceNoteDismissed: z.boolean(),
});

/** Profiles keyed by user id. */
export const profilesSchema = z.record(z.string(), profileSchema);

export type Profile = z.infer<typeof profileSchema>;
export type StartChoice = z.infer<typeof startChoiceSchema>;
export type Level = z.infer<typeof levelSchema>;

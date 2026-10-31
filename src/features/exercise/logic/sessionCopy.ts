import type { SessionMode } from './sessionTypes';

const PRAISES = ['Great job!', 'Nice one!', 'Perfect!', 'Well done!'] as const;

/**
 * Praise for the n-th correct answer of the session, 0-based (0 is the first correct
 * answer): "Great job!", "Nice one!", "Perfect!", "Well done!", then repeating.
 */
export function getPraise(correctIndex: number): string {
  const index = Math.max(0, Math.floor(correctIndex)) % PRAISES.length;
  return PRAISES[index] ?? PRAISES[0];
}

/** Accessible name of the hearts counter. */
export function getHeartsLeftText(hearts: number): string {
  const count = Math.max(0, Math.floor(hearts));
  if (count === 0) return 'No hearts left';
  if (count === 1) return '1 heart left';
  return `${count} hearts left`;
}

/** The question above the cards, with curly quotes. */
export function getQuestionText(english: string): string {
  return `Which one of these is “${english}”?`;
}

export interface FeedbackAnnouncementInput {
  readonly mode: SessionMode;
  /** Estonian word of the correct option. */
  readonly estonian: string;
  /** Hearts left after the answer (used in lesson mode only). */
  readonly hearts: number;
}

/** Screen-reader text for a correct answer. */
export function getCorrectAnnouncement(praise: string): string {
  return `Correct. ${praise}`;
}

function missAnnouncement(prefix: string, { mode, estonian, hearts }: FeedbackAnnouncementInput): string {
  const solution = `${prefix}. Correct solution: ${estonian}.`;
  return mode === 'lesson' ? `${solution} ${getHeartsLeftText(hearts)}.` : solution;
}

/** Screen-reader text for a wrong answer; the heart sentence is omitted in practice. */
export function getIncorrectAnnouncement(input: FeedbackAnnouncementInput): string {
  return missAnnouncement('Incorrect', input);
}

/** Screen-reader text for a skipped exercise; the heart sentence is omitted in practice. */
export function getSkippedAnnouncement(input: FeedbackAnnouncementInput): string {
  return missAnnouncement('Skipped', input);
}

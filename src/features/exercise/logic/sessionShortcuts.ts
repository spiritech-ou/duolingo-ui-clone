import type { SessionPhase } from './sessionTypes';

/** The parts of a `KeyboardEvent` the resolver reads (a real event satisfies it). */
export interface ShortcutKeyEvent {
  readonly key: string;
  readonly repeat: boolean;
  readonly isComposing: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

export interface ShortcutInput {
  readonly event: ShortcutKeyEvent;
  readonly phase: SessionPhase;
  /** Option ids of the current exercise in card order: key "1" is the first. */
  readonly optionIds: readonly string[];
  /** The selected card, or null. CHECK is enabled exactly when a card is selected. */
  readonly selectedOptionId: string | null;
  /** The first-mistake modal, the exit dialog or any other dialog is open. */
  readonly isDialogOpen: boolean;
  /** A native button (or link) has focus: Enter belongs to it. */
  readonly isButtonFocused: boolean;
}

export type ShortcutAction =
  | { readonly type: 'none' }
  | { readonly type: 'select'; readonly optionId: string }
  | { readonly type: 'check' }
  | { readonly type: 'continue' };

const NONE: ShortcutAction = { type: 'none' };

const NUMBER_KEYS = ['1', '2', '3'] as const;

function isFeedbackOrEnd(phase: SessionPhase): boolean {
  return (
    phase === 'correct' ||
    phase === 'wrong' ||
    phase === 'skipped' ||
    phase === 'lessonOver' ||
    phase === 'practiceComplete' ||
    phase === 'outOfHearts'
  );
}

/**
 * Maps a key press to a session action (OQ-30). Pure.
 * - Keys 1 to 3 select that card in Idle and Option selected (the selected card's key keeps it).
 * - Enter checks when CHECK is enabled, and continues from a feedback panel or an end screen.
 * - Everything is ignored while a dialog is open, with Ctrl/Meta/Alt/Shift held, while composing
 *   text and on auto-repeat. A focused native button keeps Enter for its own click.
 * - Skip has no shortcut.
 */
export function resolveShortcut(input: ShortcutInput): ShortcutAction {
  const { event, phase } = input;
  if (input.isDialogOpen || event.repeat || event.isComposing) return NONE;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return NONE;

  if (event.key === 'Enter') {
    if (input.isButtonFocused) return NONE;
    if (phase === 'selected') return input.selectedOptionId === null ? NONE : { type: 'check' };
    return isFeedbackOrEnd(phase) ? { type: 'continue' } : NONE;
  }

  const index = NUMBER_KEYS.findIndex((key) => key === event.key);
  if (index === -1 || (phase !== 'idle' && phase !== 'selected')) return NONE;
  const optionId = input.optionIds[index];
  return optionId === undefined ? NONE : { type: 'select', optionId };
}

import { useEffect, useRef } from 'react';
import { resolveShortcut } from '../logic/sessionShortcuts';

export type EndPhase = 'lessonOver' | 'practiceComplete' | 'outOfHearts';

/**
 * Enter on an end screen runs the screen's primary action (OQ-30). The decision is the pure
 * `resolveShortcut`: it ignores auto-repeat (so the Enter held down to finish the last exercise
 * cannot press the button here), modifier keys and composition, and leaves Enter to a focused
 * native button.
 */
export function useEndScreenShortcut(phase: EndPhase, onPrimary: () => void): void {
  // The listener is attached once and reads the latest handler through a ref.
  const handler = useRef(onPrimary);
  useEffect(() => {
    handler.current = onPrimary;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const action = resolveShortcut({
        event,
        phase,
        optionIds: [],
        selectedOptionId: null,
        isDialogOpen: false,
        isButtonFocused:
          event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement,
      });
      if (action.type !== 'continue') return;
      event.preventDefault();
      handler.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [phase]);
}

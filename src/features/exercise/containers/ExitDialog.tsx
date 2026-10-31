import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { SessionMode } from '../logic/sessionTypes';

export interface ExitDialogProps {
  mode: SessionMode;
  /** KEEP LEARNING or Escape. */
  onKeepLearning: () => void;
  /** QUIT. */
  onQuit: () => void;
}

/** Asks whether to leave a lesson or practice that is in progress. */
export function ExitDialog({ mode, onKeepLearning, onQuit }: ExitDialogProps) {
  const noun = mode === 'practice' ? 'practice' : 'lesson';
  return (
    <Dialog
      isOpen
      onClose={onKeepLearning}
      title={`Quit ${noun}?`}
      description={`You'll lose your progress in this ${noun}.`}
      actions={
        <>
          <Button onClick={onKeepLearning}>Keep learning</Button>
          <Button variant="secondary" onClick={onQuit}>
            Quit
          </Button>
        </>
      }
    />
  );
}

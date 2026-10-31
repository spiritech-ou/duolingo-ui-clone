import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { HeartsCounter } from '@/components/ui/HeartsCounter';

export interface FirstMistakeModalProps {
  /** Hearts left after the loss; the heart row shows it. */
  hearts: number;
  /** KEEP GOING, Escape or Enter. */
  onDismiss: () => void;
}

/** The one-time explanation of what a mistake costs. */
export function FirstMistakeModal({ hearts, onDismiss }: FirstMistakeModalProps) {
  return (
    <Dialog
      isOpen
      onClose={onDismiss}
      title="Each mistake costs 1 heart!"
      description="Stay sharp and focused to keep your hearts. You got this!"
      actions={<Button onClick={onDismiss}>Keep going</Button>}
    >
      <HeartsCounter value={hearts} />
    </Dialog>
  );
}

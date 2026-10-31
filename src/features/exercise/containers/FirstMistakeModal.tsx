import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { HeartsCounter } from '@/components/ui/HeartsCounter';
import { Mascot } from '@/components/ui/Mascot';
import styles from './FirstMistakeModal.module.scss';

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
      <div className={styles['illustration']}>
        {/* Failure look: the red flame, decorative, fixed at 96px on every width. */}
        <Mascot mood="sad" size={96} />
        <HeartsCounter value={hearts} />
      </div>
    </Dialog>
  );
}

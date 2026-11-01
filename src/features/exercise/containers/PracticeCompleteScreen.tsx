import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { FocusedLayout } from '@/components/ui/FocusedLayout';
import { HeartsCounter } from '@/components/ui/HeartsCounter';
import { StatusScreen } from '@/components/ui/StatusScreen';
import styles from './StateScreen.module.scss';
import { useEndScreenShortcut } from './useEndScreenShortcut';

export interface PracticeCompleteScreenProps {
  /** Hearts after the run: the saved +1 when one was gained, else the unchanged 5 (at most 5). */
  hearts: number;
  /** A heart was gained: shows the "+1 heart" line. False at the 5-heart cap (OQ-53). */
  gainedHeart: boolean;
  /** CONTINUE or Enter: the route leaves for the path (replacing the history entry). */
  onContinue: () => void;
}

export function PracticeCompleteScreen({ hearts, gainedHeart, onContinue }: PracticeCompleteScreenProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  useEndScreenShortcut('practiceComplete', onContinue);

  return (
    <FocusedLayout contentMaxWidth="30rem">
      <div className={styles['column']}>
        <StatusScreen
          variant="info"
          mascotSize={160}
          mood="celebrating"
          title="Practice complete!"
          {...(gainedHeart ? { message: '+1 heart' } : {})}
          titleRef={titleRef}
          actions={<Button onClick={onContinue}>Continue</Button>}
        >
          <HeartsCounter value={hearts} />
        </StatusScreen>
      </div>
    </FocusedLayout>
  );
}

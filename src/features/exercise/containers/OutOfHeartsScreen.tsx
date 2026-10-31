import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { FocusedLayout } from '@/components/ui/FocusedLayout';
import { StatusScreen } from '@/components/ui/StatusScreen';
import styles from './StateScreen.module.scss';
import { useEndScreenShortcut } from './useEndScreenShortcut';

export interface OutOfHeartsScreenProps {
  /** "Practice to earn a heart" (and Enter): the route goes to `/practice`. */
  onPractice: () => void;
  /** "Quit lesson": the route goes to `/learn`; the lesson's progress is discarded. */
  onQuit: () => void;
}

export function OutOfHeartsScreen({ onPractice, onQuit }: OutOfHeartsScreenProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  // This screen has no CONTINUE; Enter runs its primary button.
  useEndScreenShortcut('outOfHearts', onPractice);

  return (
    <FocusedLayout contentMaxWidth="30rem">
      <div className={styles['column']}>
        <StatusScreen
          variant="info"
          mascotSize={160}
          mood="sad"
          title="You're out of hearts"
          message="Practice to earn a heart, or come back later."
          titleRef={titleRef}
          actions={
            <>
              <Button onClick={onPractice}>Practice to earn a heart</Button>
              <Button variant="secondary" onClick={onQuit}>
                Quit lesson
              </Button>
            </>
          }
        />
      </div>
    </FocusedLayout>
  );
}

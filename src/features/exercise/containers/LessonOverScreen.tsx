import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { FocusedLayout } from '@/components/ui/FocusedLayout';
import { LessonStats } from '@/components/ui/LessonStats';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { formatElapsed } from '../logic/sessionStats';
import type { LessonCompleteStats } from './ExerciseSession';
import { useEndScreenShortcut } from './useEndScreenShortcut';

export interface LessonOverScreenProps {
  stats: LessonCompleteStats;
  /** CONTINUE or Enter: the route leaves for the path (replacing the history entry). */
  onContinue: () => void;
}

export function LessonOverScreen({ stats, onContinue }: LessonOverScreenProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  useEndScreenShortcut('lessonOver', onContinue);

  return (
    <FocusedLayout>
      <StatusScreen
        variant="info"
        mood="celebrating"
        title={stats.isPerfect ? 'Perfect lesson!' : 'Lesson complete!'}
        titleRef={titleRef}
        actions={<Button onClick={onContinue}>Continue</Button>}
      >
        <LessonStats
          aria-label="Lesson results"
          items={[
            { label: 'XP', value: `+${stats.xp}` },
            { label: 'Accuracy', value: `${stats.accuracy}%` },
            { label: 'Time', value: formatElapsed(stats.elapsedMs) },
          ]}
        />
      </StatusScreen>
    </FocusedLayout>
  );
}

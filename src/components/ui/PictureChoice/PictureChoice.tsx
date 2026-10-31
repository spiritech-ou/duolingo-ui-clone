import { useId } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import { PictureCard } from '@/components/ui/PictureCard';
import type { PictureCardStatus } from '@/components/ui/PictureCard';
import styles from './PictureChoice.module.scss';

export interface PictureChoiceOption {
  id: string;
  /** The Estonian word, shown exactly as given. */
  word: string;
  picture: { emoji: string; alt: string };
}

export interface PictureChoiceProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'role' | 'aria-label' | 'onSelect'> {
  /** The question; it labels the radiogroup. */
  question: string;
  /** The cards, in display order. Their number keys are their 1-based positions. */
  options: readonly PictureChoiceOption[];
  /** The learner's pick, or null when nothing is chosen. */
  selectedId: string | null;
  /**
   * The right answer, set once the exercise is checked or skipped. It is shown as correct when
   * picked, or as revealed (not checked) when the learner picked another card or skipped.
   */
  correctId?: string | undefined;
  /** The learner's wrong pick, set after a wrong check. */
  wrongId?: string | undefined;
  /** The exercise was checked or skipped: cards no longer accept input. */
  isLocked?: boolean;
  /** Called with the option id when the learner chooses a card (click, Space or arrow keys). */
  onSelect?: (id: string) => void;
}

function getStatus(
  id: string,
  selectedId: string | null,
  correctId: string | undefined,
  wrongId: string | undefined,
): PictureCardStatus {
  if (id === wrongId) return 'wrong';
  if (id === correctId) return id === selectedId ? 'correct' : 'revealed';
  return id === selectedId ? 'selected' : 'idle';
}

export function PictureChoice({
  question,
  options,
  selectedId,
  correctId,
  wrongId,
  isLocked = false,
  onSelect,
  className,
  ...rest
}: PictureChoiceProps) {
  const baseId = useId();
  const hintId = `${baseId}-hint`;

  return (
    <div
      {...rest}
      role="radiogroup"
      aria-label={question}
      aria-describedby={hintId}
      className={clsx(styles['root'], className)}
    >
      {options.map((option, index) => (
        <PictureCard
          key={option.id}
          name={baseId}
          value={option.id}
          word={option.word}
          picture={option.picture}
          keyHint={String(index + 1)}
          status={getStatus(option.id, selectedId, correctId, wrongId)}
          isLocked={isLocked}
          {...(onSelect ? { onSelect } : {})}
        />
      ))}
      <span id={hintId} className={styles['hint']}>
        Press 1 to 3 to choose, Enter to check
      </span>
    </div>
  );
}

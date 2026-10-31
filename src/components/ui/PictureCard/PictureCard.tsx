import { useId } from 'react';
import type { ChangeEvent, ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import styles from './PictureCard.module.scss';

/**
 * - `selected`, `correct`, `wrong`: the learner's own pick (checked); `correct` and `wrong`
 *   are the checked result.
 * - `revealed`: the right answer shown after a wrong pick or a skip. Success style and icon,
 *   but NOT checked, so a group never has two checked radios or a selection nobody made.
 */
export type PictureCardStatus = 'idle' | 'selected' | 'correct' | 'wrong' | 'revealed';

export interface PictureCardProps
  extends Omit<
    ComponentPropsWithoutRef<'input'>,
    'type' | 'children' | 'checked' | 'defaultChecked' | 'onChange' | 'onSelect' | 'aria-disabled' | 'disabled'
  > {
  /** The Estonian word, rendered exactly as given inside `lang="et"`. */
  word: string;
  /** The picture: an emoji and its English alt text. */
  picture: { emoji: string; alt: string };
  /** Number key hint ("1" to "3"). Decorative. */
  keyHint: string;
  /** Radio group name shared by the sibling cards. */
  name: string;
  /** Value reported to `onSelect`. */
  value: string;
  /** Visual state. Only `selected`, `correct` and `wrong` (the learner's pick) are checked. */
  status?: PictureCardStatus;
  /** No longer accepts input (`aria-disabled`), but stays in the tab order. */
  isLocked?: boolean;
  /** Called with the card's value when the learner chooses it (never while locked). */
  onSelect?: (value: string) => void;
}

export function PictureCard({
  word,
  picture,
  keyHint,
  name,
  value,
  status = 'idle',
  isLocked = false,
  onSelect,
  className,
  ...rest
}: PictureCardProps) {
  const baseId = useId();
  const pictureId = `${baseId}-picture`;
  const wordId = `${baseId}-word`;
  const incorrectId = `${baseId}-incorrect`;
  const isChecked = status === 'selected' || status === 'correct' || status === 'wrong';
  const describedBy =
    [status === 'wrong' ? incorrectId : undefined, rest['aria-describedby']].filter(Boolean).join(' ') ||
    undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    onSelect?.(event.currentTarget.value);
  };

  return (
    <label
      className={clsx(
        styles['root'],
        status !== 'idle' && styles[status === 'revealed' ? 'correct' : status],
        isLocked && styles['isLocked'],
        className,
      )}
    >
      <input
        {...rest}
        type="radio"
        className={styles['input']}
        name={name}
        value={value}
        checked={isChecked}
        aria-disabled={isLocked ? true : undefined}
        aria-labelledby={`${pictureId} ${wordId}`}
        aria-describedby={describedBy}
        onChange={handleChange}
      />
      <span id={pictureId} className={styles['picture']} role="img" aria-label={picture.alt}>
        {picture.emoji}
      </span>
      <span className={styles['footer']}>
        <span className={styles['keyHint']} aria-hidden="true">
          {keyHint}
        </span>
        <span id={wordId} className={styles['word']} lang="et">
          {word}
        </span>
        {status === 'idle' ? null : (
          <span className={styles['status']} aria-hidden="true">
            <Icon name={status === 'wrong' ? 'close' : 'check'} size={20} />
          </span>
        )}
      </span>
      {status === 'wrong' ? (
        <span id={incorrectId} className={styles['srOnly']}>
          incorrect
        </span>
      ) : null}
    </label>
  );
}

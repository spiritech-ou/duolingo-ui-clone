import { useState } from 'react';
import clsx from 'clsx';
import flame from '@/assets/brand/flame.svg';
import styles from './Mascot.module.scss';

export type MascotMood = 'default' | 'sad' | 'celebrating';

export interface MascotProps {
  size?: number;
  /** Accessible name. When omitted the image is decorative (`alt=""`). */
  label?: string;
  /** Mood, produced with CSS on the flame art (tilt, tone, lift). */
  mood?: MascotMood;
  /** Gentle idle bob, for loading screens. */
  isBobbing?: boolean;
  /** Bounces once each time the value changes after mount (not on first render). */
  bounceKey?: string | number;
}

export function Mascot({
  size = 128,
  label,
  mood = 'default',
  isBobbing = false,
  bounceKey,
}: MascotProps) {
  const [initialBounceKey] = useState(bounceKey);
  const hasBounced = bounceKey !== undefined && bounceKey !== initialBounceKey;

  return (
    <img
      // A new key remounts the image, which replays the one-shot bounce.
      key={hasBounced ? `bounce-${bounceKey}` : 'still'}
      className={clsx(
        styles['root'],
        mood === 'sad' && styles['sad'],
        mood === 'celebrating' && styles['celebrating'],
        isBobbing && styles['isBobbing'],
        hasBounced && styles['isBouncing'],
      )}
      src={flame}
      alt={label ?? ''}
      width={size}
      height={size}
      data-mood={mood}
    />
  );
}

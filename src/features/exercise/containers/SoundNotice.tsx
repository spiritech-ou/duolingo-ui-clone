import { useEffect, useState } from 'react';
import { Notice } from '@/components/ui/Notice';
import { getSoundUnavailableCopy } from '../logic/sessionCopy';
import type { SoundUnavailableReason } from '../logic/sessionCopy';

export interface SoundNoticeProps {
  reason: SoundUnavailableReason;
  onDismiss: () => void;
  /** Applied while the region is still empty, to keep it out of sight (but mounted). */
  pendingClassName?: string | undefined;
}

/**
 * The dismissible "no sound" notice. The same live region mounts empty and receives its text a
 * tick later, so screen readers announce it (a region that appears already filled is skipped).
 */
export function SoundNotice({ reason, onDismiss, pendingClassName }: SoundNoticeProps) {
  const [isFilled, setIsFilled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFilled(true);
    }, 50);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const copy = getSoundUnavailableCopy(reason);
  return (
    <Notice
      variant="info"
      role="status"
      {...(isFilled ? {} : { className: pendingClassName })}
      {...(isFilled ? { title: copy.title, actionLabel: 'Got it', onAction: onDismiss } : {})}
    >
      {isFilled ? copy.text : ''}
    </Notice>
  );
}

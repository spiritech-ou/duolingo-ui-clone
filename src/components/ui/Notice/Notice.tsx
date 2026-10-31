import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import styles from './Notice.module.scss';

export type NoticeVariant = 'error' | 'info';
export type NoticeRole = 'alert' | 'status';

export interface NoticeProps
  extends Omit<
    ComponentPropsWithoutRef<'div'>,
    'children' | 'title' | 'role' | 'aria-live' | 'aria-atomic'
  > {
  /** Error uses the alert icon and danger accent, info the info icon and info accent. */
  variant: NoticeVariant;
  /** Optional bold headline above the text. */
  title?: string;
  /** The message text. */
  children: ReactNode;
  /** Optional small secondary button, for example "Got it". Shown only together with `onAction`. */
  actionLabel?: string;
  /** Called when the action button is pressed. */
  onAction?: () => void;
  /** `alert` (assertive) for banners that interrupt, `status` (polite) otherwise. */
  role?: NoticeRole;
}

export function Notice({
  variant,
  title,
  children,
  actionLabel,
  onAction,
  role = 'status',
  className,
  ...rest
}: NoticeProps) {
  const hasAction = Boolean(actionLabel && onAction);

  return (
    <div
      {...rest}
      className={clsx(styles['root'], styles[variant], className)}
      // Set after the rest props so they can never override the live-region semantics.
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {/* Decorative: the title and text carry the meaning; the icon is the non-colour cue. */}
      <Icon name={variant === 'error' ? 'alert' : 'info'} size={24} className={styles['icon']} />
      <div className={styles['body']}>
        {title ? <p className={styles['title']}>{title}</p> : null}
        <p className={styles['text']}>{children}</p>
      </div>
      {hasAction ? (
        <Button variant="secondary" size="sm" className={styles['action']} onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

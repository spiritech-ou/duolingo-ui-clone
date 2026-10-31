import { useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode, Ref, RefObject } from 'react';
import clsx from 'clsx';
import { Mascot } from '@/components/ui/Mascot';
import type { MascotProps } from '@/components/ui/Mascot';
import styles from './StatusScreen.module.scss';

export type StatusScreenVariant = 'loading' | 'error' | 'empty' | 'info';

export interface StatusScreenProps
  extends Omit<
    ComponentPropsWithoutRef<'div'>,
    'children' | 'title' | 'role' | 'aria-busy' | 'aria-live' | 'aria-atomic'
  > {
  /** Loading is busy and bobbing, error is an alert, empty and info are polite status text. */
  variant: StatusScreenVariant;
  /** Mascot mood; the mascot is always decorative. */
  mood?: NonNullable<MascotProps['mood']>;
  /** Headline, for example "We couldn't load this lesson". */
  title: string;
  /** Line under the headline. */
  message?: string;
  /** Heading level of the title; a full-screen state is the page's h1. */
  headingLevel?: 1 | 2 | 3;
  /** Extra content between the text and the actions, for example stats. */
  children?: ReactNode;
  /** Buttons or links, laid out in a column below. */
  actions?: ReactNode;
  /** Receives the title heading (`tabIndex={-1}`), so a container can move focus to it. */
  titleRef?: Ref<HTMLHeadingElement>;
  /** Receives the first focusable element inside `actions`, so a container can focus it. */
  firstActionRef?: Ref<HTMLElement>;
}

const FIRST_ACTION_SELECTOR = 'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

function assignRef(ref: Ref<HTMLElement> | undefined, value: HTMLElement | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    // Ref objects are writable at runtime; the type marks `current` read-only.
    (ref as RefObject<HTMLElement | null>).current = value;
  }
}

export function StatusScreen({
  variant,
  mood = 'default',
  title,
  message,
  headingLevel = 1,
  children,
  actions,
  titleRef,
  firstActionRef,
  className,
  ...rest
}: StatusScreenProps) {
  const Heading = headingLevel === 1 ? 'h1' : headingLevel === 2 ? 'h2' : 'h3';
  const isLoading = variant === 'loading';
  const isError = variant === 'error';
  const actionsRef = useRef<HTMLDivElement>(null);

  // DOM-level work: expose the first focusable action. Runs every render because
  // the actions slot can change; cleanup clears the ref.
  useEffect(() => {
    assignRef(
      firstActionRef,
      actionsRef.current?.querySelector<HTMLElement>(FIRST_ACTION_SELECTOR) ?? null,
    );
    return () => assignRef(firstActionRef, null);
  });

  return (
    <div
      {...rest}
      className={clsx(styles['root'], className)}
      // The semantics live on the text group below; rest props must not set them here.
      role={undefined}
      aria-live={undefined}
      aria-atomic={undefined}
      aria-busy={isLoading ? 'true' : undefined}
    >
      {/* Decorative: the text carries the message. */}
      <Mascot mood={mood} size={128} isBobbing={isLoading} />
      <div
        className={styles['text']}
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
      >
        <Heading ref={titleRef} tabIndex={-1} className={styles['title']}>
          {title}
        </Heading>
        {message ? <p className={styles['message']}>{message}</p> : null}
      </div>
      {children ? <div className={styles['content']}>{children}</div> : null}
      {actions ? (
        <div ref={actionsRef} className={styles['actions']}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}

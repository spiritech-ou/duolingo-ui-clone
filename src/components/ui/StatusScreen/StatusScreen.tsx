import { useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode, Ref, RefObject } from 'react';
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
  /** Mascot size in px, fixed on every width (end screens pass 160). Omitted: 120 on desktop and tablet, 96 on mobile. */
  mascotSize?: number;
  /** Heading level of the title; a full-screen state is the page's h1. */
  headingLevel?: 1 | 2 | 3;
  /** Extra content between the text and the actions, for example stats. */
  children?: ReactNode;
  /** Buttons or links, laid out in a column below. */
  actions?: ReactNode;
  /** Receives the title heading (`tabIndex={-1}`), so a container can move focus to it. */
  titleRef?: Ref<HTMLHeadingElement>;
  /**
   * Receives the status text group (the `role="status"` or `role="alert"` element holding the title and
   * message). In the loading variant it is programmatically focusable (`tabIndex={-1}`, not a tab stop),
   * so a container can move focus to it, for example after "Try again".
   */
  statusRef?: Ref<HTMLDivElement>;
  /**
   * Draw no focus ring on the status text, even when the browser reports `:focus-visible`. For a focus
   * move caused by a pointer click ("Try again" pressed with the mouse); keyboard use keeps the ring.
   */
  hideStatusFocusRing?: boolean;
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
  mascotSize,
  titleRef,
  statusRef,
  hideStatusFocusRing = false,
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
      <div
        className={clsx(styles['mascot'], mascotSize === undefined && styles['mascotDefault'])}
        style={
          mascotSize === undefined
            ? undefined
            : // CSSProperties has no index signature for custom properties.
              ({ '--mascot-size': `${mascotSize / 16}rem` } as CSSProperties)
        }
      >
        <Mascot mood={mood} size={mascotSize ?? 120} isBobbing={isLoading} />
      </div>
      <div
        ref={statusRef}
        tabIndex={isLoading ? -1 : undefined}
        className={clsx(styles['text'], hideStatusFocusRing && styles['textNoRing'])}
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

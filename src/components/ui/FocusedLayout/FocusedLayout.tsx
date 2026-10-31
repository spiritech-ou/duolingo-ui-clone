import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react';
import clsx from 'clsx';
import styles from './FocusedLayout.module.scss';

export interface FocusedLayoutProps extends Omit<ComponentPropsWithoutRef<'div'>, 'role'> {
  /** Optional top slot, for example a close button and progress bar. Not a banner landmark. */
  header?: ReactNode;
  /** Main content: scrolls inside the frame, centred with a readable maximum width. */
  children: ReactNode;
  /** Optional bottom slot pinned under the scrolling content, for buttons or a feedback panel. */
  footer?: ReactNode;
  /** Receives the `main` element, so a container can scroll it or move focus to it. */
  mainRef?: Ref<HTMLElement>;
}

/**
 * Full-screen frame without the app header (header rule, OQ-34). It renders the page's one
 * `main` landmark and must not be nested inside another `main`.
 */
export function FocusedLayout({
  header,
  children,
  footer,
  mainRef,
  className,
  ...rest
}: FocusedLayoutProps) {
  return (
    <div
      {...rest}
      className={clsx(styles['root'], !footer && styles['noFooter'], className)}
      // The frame is a plain wrapper; rest props must not give it a role.
      role={undefined}
    >
      {header ? (
        <div className={styles['header']}>
          <div className={styles['inner']}>{header}</div>
        </div>
      ) : null}
      {/* Focusable so keyboard users can scroll it when the content has no focusable element. */}
      <main ref={mainRef} className={styles['main']} tabIndex={0}>
        <div className={styles['content']}>{children}</div>
      </main>
      {footer ? (
        <div className={styles['footer']}>
          <div className={styles['inner']}>{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

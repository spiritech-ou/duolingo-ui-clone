import type { ComponentPropsWithoutRef, CSSProperties, ReactNode, Ref } from 'react';
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
  /**
   * The *MaxWidth props take valid CSS lengths: an invalid value makes the column unbounded.
   * The 38rem content default mirrors the SCSS fallback in FocusedLayout.module.scss.
   *
   * Maximum width of the header column, as a CSS length (`'82.5rem'`, `'min(90vw, 70rem)'`).
   * Default `40rem`. The header strip keeps spanning the window; only its inner column is capped.
   */
  headerMaxWidth?: string;
  /**
   * Maximum width of the content column, as a CSS length. Default `38rem` (the former 40rem
   * column including 1rem side padding). Children may be wider than the column: they overflow it
   * visibly and are clipped only at the window edge.
   */
  contentMaxWidth?: string;
  /** Maximum width of the footer column, as a CSS length. Default `40rem`. */
  footerMaxWidth?: string;
}

type WidthVars = CSSProperties & Record<`--${string}`, string | undefined>;

/**
 * Full-screen frame without the app header (header rule, OQ-34). It renders the page's one
 * `main` landmark and must not be nested inside another `main`.
 */
export function FocusedLayout({
  header,
  children,
  footer,
  mainRef,
  headerMaxWidth,
  contentMaxWidth,
  footerMaxWidth,
  className,
  style,
  ...rest
}: FocusedLayoutProps) {
  // Computed runtime values only: unset props leave the stylesheet defaults in force.
  const widthVars: WidthVars = {
    '--header-max-width': headerMaxWidth,
    '--content-max-width': contentMaxWidth,
    '--footer-max-width': footerMaxWidth,
  };
  return (
    <div
      {...rest}
      style={{ ...widthVars, ...style }}
      className={clsx(styles['root'], !footer && styles['noFooter'], className)}
      // The frame is a plain wrapper; rest props must not give it a role.
      role={undefined}
    >
      {header ? (
        <div className={styles['header']}>
          <div className={clsx(styles['inner'], styles['headerInner'])}>{header}</div>
        </div>
      ) : null}
      {/* Focusable so keyboard users can scroll it when the content has no focusable element. */}
      <main ref={mainRef} className={styles['main']} tabIndex={0}>
        <div className={styles['content']}>{children}</div>
      </main>
      {footer ? (
        <div className={styles['footer']}>
          <div className={clsx(styles['inner'], styles['footerInner'])}>{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

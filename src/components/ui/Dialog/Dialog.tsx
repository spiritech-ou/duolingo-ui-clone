import { useEffect, useId, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import styles from './Dialog.module.scss';

export interface DialogProps
  extends Omit<
    ComponentPropsWithoutRef<'div'>,
    'title' | 'role' | 'children' | 'aria-modal' | 'aria-labelledby' | 'aria-describedby'
  > {
  /** Controlled: the dialog is rendered only while this is true. */
  isOpen: boolean;
  /** Called when the user presses Escape. The parent decides whether to close. */
  onClose: () => void;
  /** The heading; it is also the dialog's accessible name. */
  title: string;
  /** Supporting sentence under the heading; wired to `aria-describedby`. */
  description?: string;
  /** Optional illustration or extra content between the text and the actions. */
  children?: ReactNode;
  /** The buttons row, rendered last. */
  actions?: ReactNode;
}

const TABBABLE_CANDIDATES =
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, [contenteditable]:not([contenteditable="false"]), [tabindex]';

function isTabbable(element: HTMLElement): boolean {
  if (element.matches(':disabled')) return false;
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex !== null && Number(tabIndex) < 0) return false;
  if (element.closest('[hidden], [inert]')) return false;
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function getTabbable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_CANDIDATES)).filter(isTabbable);
}

// Module-level bookkeeping, shared by every open dialog, so stacked dialogs can
// close in any order without leaving the page inert or scroll-locked.

/** Open dialogs, oldest first. Only the last one reacts to the keyboard. */
const openStack: symbol[] = [];

/** How many open dialogs made each element inert, and whether it was inert beforehand. */
const inertClaims = new Map<Element, { count: number; wasInert: boolean }>();

function claimInert(element: Element) {
  const claim = inertClaims.get(element) ?? { count: 0, wasInert: element.hasAttribute('inert') };
  if (claim.count === 0 && !claim.wasInert) element.setAttribute('inert', '');
  claim.count += 1;
  inertClaims.set(element, claim);
}

function releaseInert(element: Element) {
  const claim = inertClaims.get(element);
  if (!claim) return;
  claim.count -= 1;
  if (claim.count > 0) return;
  if (!claim.wasInert) element.removeAttribute('inert');
  inertClaims.delete(element);
}

let scrollLocks = 0;
let scrollOverflowBefore = '';

function lockScroll() {
  if (scrollLocks === 0) {
    scrollOverflowBefore = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}

function unlockScroll() {
  scrollLocks -= 1;
  if (scrollLocks === 0) document.body.style.overflow = scrollOverflowBefore;
}

/**
 * The open dialog. Mounted only while `isOpen`, so its effect runs once per
 * opening: make the rest of the page inert and non-scrolling, move focus in,
 * listen for Escape and Tab on the document, and undo all of it on close.
 *
 * Limitation: only elements already in `body` when the dialog opens are made
 * inert; a node appended to `body` later (for example a toast host) is not.
 *
 * Focus on close goes back to the element focused when the dialog was rendered.
 * If that element has been removed, focus is left where the browser puts it
 * (the document body); nothing throws.
 */
function OpenDialog({
  onClose,
  title,
  description,
  children,
  actions,
  className,
  ...rest
}: Omit<DialogProps, 'isOpen'>) {
  const titleId = useId();
  const descriptionId = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  // Read before children mount, so a child that takes focus (autoFocus) cannot hide the opener.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const layer = layerRef.current;
    const panel = panelRef.current;
    if (!layer || !panel) return undefined;

    const token = Symbol('dialog');
    openStack.push(token);

    const inerted = Array.from(document.body.children).filter((element) => element !== layer);
    for (const element of inerted) claimInert(element);
    lockScroll();

    if (!panel.contains(document.activeElement)) (getTabbable(panel)[0] ?? panel).focus();

    // On the document in the capture phase, so Escape and Tab work whatever has
    // focus (the backdrop, the body, a control that was removed or disabled).
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== token) return;

      if (event.key === 'Escape') {
        if (event.isComposing) return;
        // Other handlers (a page-level Escape shortcut) must not see it.
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const tabbable = getTabbable(panel);
        const first = tabbable[0];
        const last = tabbable[tabbable.length - 1];
        const active = document.activeElement;
        if (!first || !last) {
          event.preventDefault();
          panel.focus();
        } else if (!panel.contains(active) || active === panel) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      const index = openStack.indexOf(token);
      if (index !== -1) openStack.splice(index, 1);
      for (const element of inerted) releaseInert(element);
      unlockScroll();
      // After the page is interactive again, or focus() would be ignored.
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);

  return createPortal(
    <div ref={layerRef} className={styles['layer']}>
      <div className={styles['backdrop']} aria-hidden="true" />
      <div
        {...rest}
        ref={panelRef}
        className={clsx(styles['root'], className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <h2 id={titleId} className={styles['title']}>
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className={styles['description']}>
            {description}
          </p>
        ) : null}
        {children ? <div className={styles['content']}>{children}</div> : null}
        {actions ? <div className={styles['actions']}>{actions}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Dialog({ isOpen, ...rest }: DialogProps) {
  return isOpen ? <OpenDialog {...rest} /> : null;
}

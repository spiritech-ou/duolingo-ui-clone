import type { ComponentPropsWithoutRef, ElementType, Ref } from 'react';
import clsx from 'clsx';
import { Mascot } from '@/components/ui/Mascot';
import styles from './SpeechBubble.module.scss';

/** Intrinsic size of the mascot image: the largest rendered size; the stylesheet scales it down. */
const MASCOT_SIZE = 110;

export type SpeechBubbleRole = 'status' | 'heading';
export type SpeechBubbleHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface SpeechBubbleProps
  extends Omit<
    ComponentPropsWithoutRef<'div'>,
    'children' | 'role' | 'aria-live' | 'aria-atomic' | 'tabIndex'
  > {
  /** The text in the bubble. When it changes the new text fades in (no fade under reduced motion). */
  message: string;
  /**
   * `status` (polite live region) for a reaction bubble whose changes should be announced.
   * `heading` for the prompt bubble: a heading of `headingLevel` that can be focused with `ref`.
   */
  role?: SpeechBubbleRole;
  /** Heading level, used only when `role` is `heading`. */
  headingLevel?: SpeechBubbleHeadingLevel;
  /** Forwarded to the Mascot: it bounces once each time this value changes after mount. */
  bounceKey?: string | number;
  /** Ref to the bubble element (the heading or the status region), so a container can focus it. */
  ref?: Ref<HTMLElement>;
}

export function SpeechBubble({
  message,
  role = 'status',
  headingLevel = 1,
  bounceKey,
  ref,
  className,
  ...rest
}: SpeechBubbleProps) {
  const isHeading = role === 'heading';
  const bubbleClassName = styles['bubble'];
  const Bubble: ElementType = isHeading ? `h${headingLevel}` : 'div';
  // The tag is chosen at runtime (a div or h1-h6), so no single element type fits the ref:
  // the cast only widens what the compiler cannot express, any HTMLElement ref works for both.
  const bubbleRef = ref as Ref<HTMLDivElement> | undefined;
  // A new key remounts the text, which replays the fade-in. The bubble element itself stays
  // mounted, so a live region is already in the page when its text changes and gets announced.
  const text = (
    <span key={message} className={styles['text']}>
      {message}
    </span>
  );

  return (
    <div
      {...rest}
      className={clsx(styles['root'], className)}
      // The wrapper has no semantics of its own: the types forbid these, and this keeps a
      // forced value from turning it into a second live region or focus stop.
      role={undefined}
      aria-live={undefined}
      aria-atomic={undefined}
      tabIndex={undefined}
    >
      {/* Decorative: the bubble text carries the meaning. */}
      {/* The wrapper sets the rendered size (96px, 110px on wide screens); the image fills it. */}
      <span className={styles['mascot']}>
        <Mascot size={MASCOT_SIZE} {...(bounceKey !== undefined ? { bounceKey } : {})} />
      </span>
      {isHeading ? (
        // tabIndex -1 lets a container move focus here (for example on arrival) without
        // adding a tab stop.
        <Bubble ref={bubbleRef} className={bubbleClassName} tabIndex={-1}>
          {text}
        </Bubble>
      ) : (
        <Bubble
          ref={bubbleRef}
          className={bubbleClassName}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {text}
        </Bubble>
      )}
    </div>
  );
}

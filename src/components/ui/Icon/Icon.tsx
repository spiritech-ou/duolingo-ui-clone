import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Icon.module.scss';

/** Hand-drawn glyphs on a 24x24 grid. Strokes and fills use `currentColor`. */
const glyphs = {
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" />,
  heart: (
    <path
      d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"
      fill="currentColor"
    />
  ),
  'speaker-off': (
    <>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10.5 5 8 4.5 4.5 4.5v13c3.5 0 6 .5 7.5 2 1.5-1.5 4-2 7.5-2v-13C16 4.5 13.5 5 12 6.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof glyphs;

export const iconNames = Object.keys(glyphs) as IconName[]; // Object.keys is typed string[]; keys are exactly IconName

export interface IconProps
  extends Omit<ComponentPropsWithoutRef<'svg'>, 'children' | 'width' | 'height'> {
  name: IconName;
  /** Width and height in px. */
  size?: number;
  /** Accessible name. When omitted the icon is decorative (`aria-hidden`). */
  label?: string;
}

export function Icon({ name, size = 24, label, className, ...rest }: IconProps) {
  const labelProps = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <svg
      className={clsx(styles['root'], className)}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...labelProps}
      {...rest}
    >
      {glyphs[name]}
    </svg>
  );
}

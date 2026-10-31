import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import styles from './IconButton.module.scss';

const iconSizes = { sm: 16, md: 24, lg: 32 } as const;

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'children' | 'aria-label'> {
  icon: IconName;
  /** Accessible name of the button (the icon itself is decorative). */
  label: string;
  size?: 'sm' | 'md' | 'lg';
  /** Natively disabled: not focusable, click handler never runs. */
  isDisabled?: boolean;
  /**
   * Looks and announces as disabled (`aria-disabled="true"`) but stays focusable and still
   * fires `onClick`, so the consumer can explain why the action is unavailable.
   * Link the explanation with `aria-describedby`.
   */
  isAriaDisabled?: boolean;
}

export function IconButton({
  icon,
  label,
  size = 'md',
  isDisabled = false,
  isAriaDisabled = false,
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={clsx(styles['root'], styles[size], isAriaDisabled && styles['isAriaDisabled'], className)}
      disabled={isDisabled}
      aria-label={label}
      aria-disabled={isAriaDisabled && !isDisabled ? true : undefined}
    >
      <Icon name={icon} size={iconSizes[size]} />
    </button>
  );
}

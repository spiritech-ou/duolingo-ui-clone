import { useId } from 'react';
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from 'react';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import styles from './RadioCardGroup.module.scss';

export interface RadioCardOption {
  /** Unique within the group; reported to `onChange`. */
  value: string;
  label: string;
  /** Optional secondary line under the label. */
  description?: string;
  /** Optional decorative leading node (for example signal bars). Hidden from assistive tech. */
  icon?: ReactNode;
}

export type RadioCardGroupProps = Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'role' | 'onChange' | 'aria-label' | 'aria-labelledby'
> & {
  /** Accessible name of the group. Give this or `aria-labelledby`. */
  label?: string;
  /** Id of the element that names the group (for example the bubble heading). */
  'aria-labelledby'?: string;
  options: readonly RadioCardOption[];
  /** The selected option's value, or `null` when nothing is chosen. */
  value: string | null;
  onChange: (value: string) => void;
  /** Called when Enter is pressed on the selected option (the container presses CONTINUE). */
  onActivate?: () => void;
};

export function RadioCardGroup({
  options,
  value,
  onChange,
  onActivate,
  label,
  'aria-labelledby': labelledBy,
  className,
  ...rest
}: RadioCardGroupProps) {
  const baseId = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, optionValue: string) => {
    if (event.key === 'Enter' && optionValue === value && onActivate) {
      event.preventDefault(); // no implicit form submission: the container decides
      onActivate();
    }
  };

  return (
    <div
      {...rest}
      className={clsx(styles['root'], className)}
      // Set after the rest props so they can never override the group semantics.
      role="radiogroup"
      aria-label={label || undefined}
      aria-labelledby={labelledBy}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const labelId = `${baseId}-${index}-label`;
        const descriptionId = `${baseId}-${index}-description`;

        return (
          <label key={option.value} className={clsx(styles['card'], selected && styles['isSelected'])}>
            <input
              type="radio"
              className={styles['input']}
              name={baseId}
              value={option.value}
              checked={selected}
              aria-labelledby={labelId}
              aria-describedby={option.description ? descriptionId : undefined}
              onChange={() => onChange(option.value)}
              onKeyDown={(event) => handleKeyDown(event, option.value)}
            />
            {option.icon ? (
              <span className={styles['icon']} aria-hidden="true">
                {option.icon}
              </span>
            ) : null}
            <span className={styles['text']}>
              <span id={labelId} className={styles['label']}>
                {option.label}
              </span>
              {option.description ? (
                <span id={descriptionId} className={styles['description']}>
                  {option.description}
                </span>
              ) : null}
            </span>
            {/* Non-colour cue for the selected card; decorative since the radio state is announced. */}
            <span className={styles['check']} aria-hidden="true" data-visible={selected}>
              <Icon name="check" size={20} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

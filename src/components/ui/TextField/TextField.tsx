import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import styles from './TextField.module.scss';

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'children'> {
  /** Visible label, tied to the input. */
  label: string;
  /** Validation message. Its presence puts the field in the invalid state. */
  error?: string;
  /** Helper text under the field. */
  hint?: string;
  /** Trailing slot rendered inside the field, for example a "Forgot?" button. */
  endAdornment?: ReactNode;
}

/** Text input primitive. Dumb and form-library agnostic: `ref` and native props go to the `<input>`. */
export function TextField({
  label,
  error,
  hint,
  endAdornment,
  id,
  type = 'text',
  className,
  'aria-describedby': describedBy,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  // A caller-provided description is kept, then the ids this component owns follow.
  const describedByIds = [describedBy, hint ? hintId : undefined, hasError ? errorId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={clsx(styles['root'], className)}>
      <label htmlFor={inputId} className={styles['label']}>
        {label}
      </label>
      <div className={clsx(styles['field'], hasError && styles['isInvalid'])}>
        <input
          {...rest}
          id={inputId}
          type={type}
          className={styles['input']}
          // Set after the rest props so they can never override the derived a11y state.
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedByIds || undefined}
        />
        {endAdornment ? <div className={styles['adornment']}>{endAdornment}</div> : null}
      </div>
      {hint ? (
        <p id={hintId} className={styles['hint']}>
          {hint}
        </p>
      ) : null}
      {/* The live region stays mounted so a message added later is announced. */}
      <div id={errorId} role="status" className={styles['status']}>
        {hasError ? (
          <p className={styles['error']}>
            <Icon name="alert" size={20} className={styles['errorIcon']} />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

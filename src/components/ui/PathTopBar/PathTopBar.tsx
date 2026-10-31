import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { HeartsCounter } from '@/components/ui/HeartsCounter';
import styles from './PathTopBar.module.scss';

export interface PathTopBarProps extends Omit<ComponentPropsWithoutRef<'header'>, 'children'> {
  /** Hearts left, shown by the counter. */
  hearts: number;
  /** Called when the learner presses "Log out". */
  onLogOut: () => void;
}

export function PathTopBar({ hearts, onLogOut, className, ...rest }: PathTopBarProps) {
  return (
    <header {...rest} className={clsx(styles['root'], className)}>
      <HeartsCounter value={hearts} />
      <Button variant="secondary" size="sm" onClick={onLogOut}>
        Log out
      </Button>
    </header>
  );
}

import flame from '@/assets/brand/flame.svg';
import styles from './Mascot.module.scss';

export interface MascotProps {
  size?: number;
  /** Accessible name. When omitted the image is decorative (`alt=""`). */
  label?: string;
}

export function Mascot({ size = 128, label }: MascotProps) {
  return (
    <img
      className={styles['root']}
      src={flame}
      alt={label ?? ''}
      width={size}
      height={size}
    />
  );
}

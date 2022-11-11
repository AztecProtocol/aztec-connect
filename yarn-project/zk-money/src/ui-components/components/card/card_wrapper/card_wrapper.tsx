import { bindStyle } from '../../../../ui-components/util/classnames.js';
import style from './card_wrapper.module.scss';

const cx = bindStyle(style);

interface CardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function CardWrapper({ children, className }: CardWrapperProps) {
  return <div className={cx(style.cardWrapper, className)}>{children}</div>;
}

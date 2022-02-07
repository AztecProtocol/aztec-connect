import style from './card_wrapper.module.scss';
import { bindStyle } from '../../../../util/classnames';

const cx = bindStyle(style);

interface CardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function CardWrapper({ children, className }: CardWrapperProps) {
  return <div className={cx(style.cardWrapper, className)}>{children}</div>;
}

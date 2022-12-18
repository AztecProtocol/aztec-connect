import { bindStyle } from '../../../../ui-components/util/classnames.js';
import style from './card_wrapper.module.scss';

const cx = bindStyle(style);

interface CardWrapperProps {
  children: React.ReactNode;
  className?: string;
  inModal?: boolean;
}

export function CardWrapper({ children, className, inModal }: CardWrapperProps) {
  return <div className={cx(style.cardWrapper, inModal && style.inModal, className)}>{children}</div>;
}

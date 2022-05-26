import { bindStyle } from 'ui-components/util/classnames';
import style from './tooltip.module.scss';

const cx = bindStyle(style);

interface TooltipProps {
  content: React.ReactNode;
  className?: string;
}

export function Tooltip(props: TooltipProps) {
  return <div className={cx(style.tooltip, props.className)}>{props.content}</div>;
}

import { bindStyle } from 'ui-components/util/classnames';
import style from './tooltip.module.scss';

const cx = bindStyle(style);

interface TooltipProps {
  text: string;
  className?: string;
}

export function Tooltip(props: TooltipProps) {
  return <div className={cx(style.tooltip, props.className)}>{props.text}</div>;
}

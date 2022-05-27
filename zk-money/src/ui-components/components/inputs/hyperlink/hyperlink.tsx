import { bindStyle } from 'ui-components/util/classnames';
import infoIcon from '../../../images/info_icon.svg';
import openIcon from '../../../images/open_icon.svg';
import style from './hyperlink.module.scss';

export enum HyperlinkIcon {
  Info = 'Info',
  Open = 'Open',
}

interface HyperlinkProps {
  label: string;
  href?: string;
  icon?: HyperlinkIcon;
  className?: string;
  onClick?: () => void;
  onMouseLeave?: () => void;
  onMouseEnter?: () => void;
}

const cx = bindStyle(style);

function getIcon(icon?: HyperlinkIcon) {
  switch (icon) {
    case HyperlinkIcon.Info:
      return infoIcon;
    case HyperlinkIcon.Open:
      return openIcon;
  }
}

export function Hyperlink(props: HyperlinkProps) {
  const icon = getIcon(props.icon);

  return (
    <a
      onClick={props.onClick}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      className={cx(style.actionButton, props.className, style.gradient)}
      href={props.href}
      target="_blank"
      rel="noreferrer"
    >
      {props.label}
      {icon && <img className={style.icon} src={icon} />}
    </a>
  );
}

import { bindStyle } from 'ui-components/util/classnames';
import infoIcon from '../../../images/info_icon.svg';
import openIcon from '../../../images/open_icon.svg';
import whiteInfoIcon from '../../../images/info_icon_white.svg';
import whiteOpenIcon from '../../../images/open_icon_white.svg';
import style from './hyperlink.module.scss';

export enum HyperlinkIcon {
  Info = 'Info',
  Open = 'Open',
}

interface HyperlinkProps {
  label: string;
  href?: string;
  theme?: 'gradient' | 'white';
  icon?: HyperlinkIcon;
  className?: string;
  onClick?: () => void;
  onMouseLeave?: () => void;
  onMouseEnter?: () => void;
}

const cx = bindStyle(style);

function getIcon(icon?: HyperlinkIcon, theme?: 'gradient' | 'white') {
  switch (icon) {
    case HyperlinkIcon.Info:
      return theme === 'white' ? whiteInfoIcon : infoIcon;
    case HyperlinkIcon.Open:
      return theme === 'white' ? whiteOpenIcon : openIcon;
  }
}

export function Hyperlink(props: HyperlinkProps) {
  const icon = getIcon(props.icon, props.theme);

  return (
    <a
      onClick={props.onClick}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      className={cx(style.actionButton, props.className, props.theme === 'white' ? style.white : style.gradient)}
      href={props.href}
      target="_blank"
      rel="noreferrer"
    >
      {props.label}
      {icon && <img className={style.icon} src={icon} alt="Link button" />}
    </a>
  );
}

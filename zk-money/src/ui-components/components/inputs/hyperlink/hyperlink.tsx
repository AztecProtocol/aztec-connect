import { bindStyle } from 'ui-components/util/classnames';
import infoIcon from '../../../images/info_icon.svg';
import openIcon from '../../../images/open_icon.svg';
import openIconBlack from '../../../images/open_icon_black.svg';
import infoIconBlack from '../../../images/info_icon_black.svg';
import style from './hyperlink.module.scss';

export enum HyperlinkIcon {
  Info = 'Info',
  Open = 'Open',
}

export enum HyperlinkTheme {
  Gradient = 'Gradient',
  Gray = 'Gray',
}

interface HyperlinkProps {
  label: string;
  href?: string;
  theme?: HyperlinkTheme;
  icon?: HyperlinkIcon;
  className?: string;
  onClick?: () => void;
}

const cx = bindStyle(style);

function getIcon(theme: HyperlinkTheme, icon?: HyperlinkIcon) {
  switch (icon) {
    case HyperlinkIcon.Info:
      return theme === HyperlinkTheme.Gradient ? infoIcon : infoIconBlack;
    case HyperlinkIcon.Open:
      return theme === HyperlinkTheme.Gradient ? openIcon : openIconBlack;
  }
}

export function Hyperlink(props: HyperlinkProps) {
  const theme = props.theme || HyperlinkTheme.Gradient;
  const icon = getIcon(theme, props.icon);

  return (
    <a
      onClick={props.onClick}
      className={cx(
        style.actionButton,
        props.className,
        theme === HyperlinkTheme.Gradient ? style.gradient : style.gray,
      )}
      href={props.href}
      target="_blank"
      rel="noreferrer"
    >
      {props.label}
      {icon && <img className={style.icon} src={icon} />}
    </a>
  );
}

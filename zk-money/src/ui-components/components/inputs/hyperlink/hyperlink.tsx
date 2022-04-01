import infoIcon from '../../../images/info_icon.svg';
import openIcon from '../../../images/open_icon.svg';
import style from './hyperlink.module.scss';

export enum HyperlinkIcon {
  Info = 'Info',
  Open = 'Open',
}

interface HyperlinkProps {
  label: string;
  icon?: HyperlinkIcon;
}

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
    <div className={style.actionButton}>
      {props.label}
      {icon && <img className={style.icon} src={icon} />}
    </div>
  );
}

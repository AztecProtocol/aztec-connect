import { Link, useLocation } from 'react-router-dom';
import { isSafari } from 'device_support';
import { bindStyle } from '../../../util/classnames';
import { ReactComponent as Logo } from '../../../images/zk_money.svg';
import { Pages } from 'views/views';
import { AppAction } from 'app';
import zkMoneyLogoWhite from 'images/zk_money_white.svg';
import zkMoneyLogo from 'images/zk_money.svg';
import style from './navbar.module.scss';

const cx = bindStyle(style);

export enum Theme {
  GRADIENT = 'GRADIENT',
  WHITE = 'WHITE',
}

interface NavbarProps {
  isLoggedIn: boolean;
  appAction: AppAction;
  path?: string;
  theme?: Theme;
  onChange?: (path: string) => void;
  // NOTE: This is receiving an AccountComponent
  //     this should instead receive an AccountState and
  //     render the AccountComponent within here
  //     this will happen once we migrate AccountComponent to Storybook
  accountComponent?: JSX.Element;
}

interface LinkItem {
  url: string;
  label: string;
  disabled?: boolean;
}

const LINKS: LinkItem[] = [
  { url: Pages.EARN, label: 'Earn' },
  { url: Pages.TRADE, label: 'Trade' },
];

function getLogo(theme: Theme | undefined) {
  if (isSafari) {
    return <img src={theme === Theme.GRADIENT ? zkMoneyLogoWhite : zkMoneyLogo} alt="zk.money logo" />;
  }
  return <Logo className={cx(style.logo, theme === Theme.GRADIENT ? style.gradient : style.white)} />;
}

export function Navbar({ appAction, isLoggedIn, accountComponent, theme, onChange }: NavbarProps): JSX.Element {
  const location = useLocation();

  return (
    <div className={style.headerRoot}>
      <div className={cx(style.logoRoot, { enabled: !!onChange })}>
        <Link to={Pages.HOME}>{getLogo(theme)}</Link>
      </div>

      <div className={style.accountRoot}>
        {LINKS.map(link => (
          <Link
            key={link.url}
            to={link.url}
            className={cx(style.link, isSafari && style.noLetterSpacing, style.navLink, {
              active: link.url === location.pathname,
              white: theme === Theme.WHITE,
              gradient: theme === Theme.GRADIENT,
            })}
          >
            {link.label}
          </Link>
        ))}
        {isLoggedIn || appAction === AppAction.ACCOUNT ? (
          <>
            <div className={style.accountWrapper}>
              <Link
                to={Pages.BALANCE}
                className={cx(style.link, isSafari && style.noLetterSpacing, style.navLink, {
                  active: Pages.BALANCE === location.pathname,
                  white: theme === Theme.WHITE,
                  gradient: theme === Theme.GRADIENT,
                })}
              >
                Wallet
              </Link>
            </div>
            {accountComponent && <div className={style.accountComponent}>{accountComponent}</div>}
          </>
        ) : (
          <Link
            to={Pages.SIGNIN}
            className={cx(style.link, isSafari && style.noLetterSpacing, style.navLink, {
              active: Pages.SIGNIN === location.pathname || Pages.SIGNUP === location.pathname,
              white: theme === Theme.WHITE,
              gradient: theme === Theme.GRADIENT,
            })}
          >
            Log In
          </Link>
        )}
      </div>
    </div>
  );
}

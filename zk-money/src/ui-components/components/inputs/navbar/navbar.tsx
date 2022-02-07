import logo from '../../../images/zk_money.svg';
import logoWhite from '../../../images/zk_money_white.svg';
import { bindStyle } from '../../../util/classnames';
import style from './navbar.module.scss';

const cx = bindStyle(style);

export enum Theme {
  GRADIENT = 'GRADIENT',
  WHITE = 'WHITE',
}

interface NavbarProps {
  isLoggedIn: boolean;
  path?: string;
  theme?: Theme;
  balance?: string;
  onLogin?: () => void;
  onChange?: (path: string) => void;
  // NOTE: This is receiving an AccountComponent
  //     this should instead receive an AccountState and
  //     render the AccountComponent within here
  //     this will happen once we migrate AccountComponent to Storybook
  accountComponent?: JSX.Element;
}

interface Link {
  url: string;
  label: string;
  disabled?: boolean;
}

const LINKS: Link[] = [
  { url: '/dashboard/earn', label: 'Earn' },
  { url: '/dashboard/trade', label: 'Trade', disabled: true },
];

export function Navbar({
  balance,
  isLoggedIn,
  accountComponent,
  theme,
  onChange,
  onLogin,
  path = '/',
}: NavbarProps): JSX.Element {
  return (
    <div className={style.headerRoot}>
      <div className={cx(style.logoRoot, { enabled: !!onChange })}>
        <div onClick={() => onChange && onChange('/')}>
          <img className={style.logo} src={theme === Theme.GRADIENT ? logoWhite : logo} />
        </div>
      </div>
      {path && onChange && (
        <div className={style.accountRoot}>
          <div />
          {LINKS.map(link => (
            <div
              key={link.url}
              onClick={() => onChange(link.url)}
              className={cx(style.link, style.navLink, {
                active: link.url === path,
                white: theme === Theme.WHITE,
                gradient: theme === Theme.GRADIENT,
              })}
            >
              {link.label}
            </div>
          ))}
          {isLoggedIn ? (
            <div className={style.accountWrapper}>
              <div
                onClick={() => onChange('/dashboard/balance')}
                className={cx(style.link, style.balanceLink, {
                  active: '/dashboard/balance' === path,
                  white: theme === Theme.WHITE,
                  gradient: theme === Theme.GRADIENT,
                })}
              >
                ${balance}
              </div>
              <div className={style.accountComponent}>{accountComponent}</div>
            </div>
          ) : (
            <div
              onClick={() => onLogin && onLogin()}
              className={cx(style.link, style.navLink, {
                white: theme === Theme.WHITE,
                gradient: theme === Theme.GRADIENT,
              })}
            >
              Log In
            </div>
          )}
        </div>
      )}
    </div>
  );
}

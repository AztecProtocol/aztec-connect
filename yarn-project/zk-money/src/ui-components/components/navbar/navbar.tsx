import { Link, useLocation } from 'react-router-dom';
import { ReactComponent as Logo } from '../../images/zk_money.svg';
import { ReactComponent as MobileNavbarEarn } from '../../../images/mobile_navbar_earn.svg';
import { ReactComponent as MobileNavbarTrade } from '../../../images/mobile_navbar_trade.svg';
import { ReactComponent as MobileNavbarWallet } from '../../../images/mobile_navbar_wallet.svg';
import zkMoneyLogoWhite from '../../../images/zk_money_white.svg';
import zkMoneyLogo from '../../images/zk_money.svg';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import style from './navbar.module.scss';

const cx = bindStyle(style);

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

enum Pages {
  HOME = '/',
  EARN = '/earn',
  SEND = '/send',
  TRADE = '/trade',
  BALANCE = '/balance',
}

export enum Theme {
  GRADIENT = 'GRADIENT',
  WHITE = 'WHITE',
}

interface NavbarProps {
  path?: string;
  theme?: Theme;
  onChange?: (path: string) => void;
  isUserRegistered?: boolean;
  // NOTE: This is receiving an AccountComponent
  //     this should instead receive an AccountState and
  //     render the AccountComponent within here
  //     this will happen once we migrate AccountComponent to Storybook
  accountComponent?: JSX.Element;
}

interface LinkItem {
  url: string;
  label: string;
  mobileImage: JSX.Element;
  disabled?: boolean;
}

const LINKS: LinkItem[] = [
  { url: Pages.EARN, label: 'Earn', mobileImage: <MobileNavbarEarn className={style.mobileImage} /> },
  { url: Pages.TRADE, label: 'Trade', mobileImage: <MobileNavbarTrade className={style.mobileImage} /> },
];

function getLogo(theme: Theme | undefined) {
  if (isSafari) {
    return <img src={theme === Theme.GRADIENT ? zkMoneyLogoWhite : zkMoneyLogo} alt="zk.money logo" />;
  }
  return <Logo className={cx(style.logo, theme === Theme.GRADIENT ? style.gradient : style.white)} />;
}

export function Navbar({ isUserRegistered, accountComponent, theme, onChange }: NavbarProps): JSX.Element {
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
            {link.mobileImage}
            {link.label}
          </Link>
        ))}
        <Link
          to={Pages.BALANCE}
          className={cx(style.link, isSafari && style.noLetterSpacing, style.navLink, {
            active: Pages.BALANCE === location.pathname,
            white: theme === Theme.WHITE,
            gradient: theme === Theme.GRADIENT,
          })}
        >
          <MobileNavbarWallet className={style.mobileImage} />
          {isUserRegistered ? 'Wallet' : 'Access'}
        </Link>
        {isUserRegistered ? <div className={style.accountComponent}>{accountComponent}</div> : null}
      </div>
    </div>
  );
}

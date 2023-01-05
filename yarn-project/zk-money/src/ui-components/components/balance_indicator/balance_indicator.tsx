import { bindStyle } from '../../../ui-components/util/classnames.js';
import walletIcon from '../../images/wallet_switcher.svg';
import style from './balance_indicator.module.scss';
const cx = bindStyle(style);

interface BalanceIndicatorProps {
  balance: string;
  disabled: boolean;
  onClick: () => void;
  onChangeWalletRequest?: () => void;
}

export function BalanceIndicator(props: BalanceIndicatorProps) {
  const handleClick = () => {
    if (props.disabled) return;
    props.onClick();
  };

  return (
    <>
      <div className={style.balanceIndicatorWrapper}>
        {props.onChangeWalletRequest && (
          <img
            className={cx(style.wallet, props.disabled && style.disabled)}
            src={walletIcon}
            alt="Change wallet"
            onClick={props.onChangeWalletRequest}
          />
        )}
        <div className={cx(style.text, props.disabled && style.disabled)}>Balance: {props.balance}</div>
        <div onClick={handleClick} className={cx(style.text, style.maxButton, props.disabled && style.disabled)}>
          Max
        </div>
      </div>
    </>
  );
}

import { bindStyle } from 'ui-components/util/classnames';
import { MetamaskIcon, WalletConnectIcon } from 'ui-components/components/icons';
import downArrow from 'ui-components/images/down_arrow.svg';
import style from './wallet_account_indicator.module.scss';
import { Dropdown, DropdownOption } from 'components/dropdown';
import { WalletId } from 'app';

const cx = bindStyle(style);

const icons = {
  [WalletId.METAMASK]: MetamaskIcon,
  [WalletId.CONNECT]: WalletConnectIcon,
};

interface WalletAccountIndicatorProps {
  walletId?: WalletId;
  address: string;
  className?: string;
  onChange: (value: any) => any;
  onClose: () => any;
  onClick: () => any;
  isOpen: boolean;
  options: DropdownOption<number>[];
}

export function WalletAccountIndicator(props: WalletAccountIndicatorProps) {
  const Icon = icons[props.walletId!];
  const walletConnected = typeof props.walletId !== 'undefined';
  return (
    <div className={cx(style.root, props.className)} onClick={props.onClick}>
      {walletConnected && (
        <>
          <Icon />
          <div className={style.address}>{props.address}</div>
        </>
      )}
      {!walletConnected && <div className={style.address}>Not Connected</div>}
      <div className={style.wallet}>Switch</div>
      <img src={downArrow} alt="" />
      <Dropdown
        isOpen={props.isOpen}
        className={style.walletDropdown}
        options={props.options}
        onClick={e => props.onChange(e.value)}
        onClose={props.onClose}
      />
    </div>
  );
}

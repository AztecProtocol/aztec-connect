import { Button, Modal } from 'components';
import closeIconWhite from 'images/close_white.svg';
import gift from 'images/gift.svg';
import giftBackground from 'images/gift_background.svg';
import { bindStyle } from 'ui-components/util/classnames';
import style from './incentive_modal.module.scss';

const cx = bindStyle(style);
export interface IncentiveModalProps {
  onClose: () => void;
  onSignUp: () => void;
}

export function IncentiveModal(props: IncentiveModalProps) {
  return (
    <Modal className={style.incentiveModal}>
      <div className={style.incentiveModalWrapper}>
        <img src={giftBackground} className={style.background} />
        <div className={style.text}>
          <div className={style.title}>Use private DeFi on Aztec and win a weekly $500 prize!</div>
          <div className={style.body}>
            Aztec Connect is now enabled on zk.money. Deposit at least 1 ETH or 2,000 DAI to qualify.
          </div>
          <div className={cx(style.body, style.body2)}>
            Winners will be drawn at 12PM UTC every Friday and announced on our official Aztec Twitter.
          </div>
          <Button className={style.button} text="Shield Now" onClick={props.onSignUp} />
        </div>
        <img src={closeIconWhite} onClick={props.onClose} className={style.close} />
        <img src={gift} className={style.gift} />
      </div>
    </Modal>
  );
}

import { Button, Modal } from 'components';
import closeIconWhite from 'images/close_white.svg';
import gift from 'images/gift.svg';
import giftBackground from 'images/gift_background.svg';
import { useState } from 'react';
import { bindStyle } from 'ui-components/util/classnames';
import style from './incentive_modal.module.scss';

const cx = bindStyle(style);
export interface IncentiveModalProps {
  onClose: () => void;
  onButtonClick: () => void;
  buttonLabel: string;
}

export function IncentiveModal(props: IncentiveModalProps) {
  return (
    <Modal className={style.incentiveModal}>
      <div className={style.incentiveModalWrapper}>
        <img src={giftBackground} className={style.background} alt="" />
        <div className={style.text}>
          <div className={style.title}>Use private DeFi on Aztec and win a weekly 1 ETH prize!</div>
          <div className={style.body}>
            Aztec Connect is now enabled on zk.money. Deposit at least 1 ETH or 2,000 DAI to qualify.
          </div>
          <div className={cx(style.body, style.body2)}>
            Winners will be drawn at 12PM UTC every Friday and announced on our official Aztec Twitter.
          </div>
          <Button className={style.button} text={props.buttonLabel} onClick={props.onButtonClick} />
        </div>
        <img src={closeIconWhite} onClick={props.onClose} className={style.close} alt="Close button" />
        <img src={gift} className={style.gift} alt="A gift box" />
      </div>
    </Modal>
  );
}

interface SelfDismissingIncentiveModalProps {
  instanceName: string;
  onButtonClick: () => void;
  buttonLabel: string;
}

// TODO: Only show incentive modals once we have gone live
// (similar change required in home.tsx & src/index.tsx)
const hasGoneLive = false;

export function useShouldShowIncentiveModal(instanceName: string) {
  const storageKey = `incentive_modal_was_closed:${instanceName}`;
  const [shouldShow, setShouldShow] = useState(() => hasGoneLive && !localStorage.getItem(storageKey));
  const markAsShown = () => {
    localStorage.setItem(storageKey, 'true');
    setShouldShow(false);
  };
  return [shouldShow, markAsShown] as const;
}

export function SelfDismissingIncentiveModal(props: SelfDismissingIncentiveModalProps) {
  const [shouldShow, markAsShown] = useShouldShowIncentiveModal(props.instanceName);
  const handleButtonClick = () => {
    markAsShown();
    props.onButtonClick();
  };

  if (!shouldShow) return <></>;
  return <IncentiveModal onClose={markAsShown} onButtonClick={handleButtonClick} buttonLabel={props.buttonLabel} />;
}

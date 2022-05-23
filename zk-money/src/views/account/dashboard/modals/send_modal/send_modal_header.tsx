import { SendMode } from 'alt-model/send';
import { BackButton } from 'ui-components';
import { CloseButtonWhite } from 'components';
import style from './send_modal_header.module.scss';

interface SendModalHeaderProps {
  closeDisabled: boolean;
  sendMode: SendMode;
  onClose: () => void;
  onBack?: () => void;
}

function getTitle(sendMode?: SendMode) {
  switch (sendMode) {
    case SendMode.SEND:
      return 'Send to L2';
    case SendMode.WIDTHDRAW:
      return 'Withdraw to L1';
    default:
      return '';
  }
}

export function SendModalHeader({ sendMode, onClose, closeDisabled, onBack }: SendModalHeaderProps) {
  return (
    <div className={style.root}>
      <div className={style.leftSegment}>
        {onBack && (
          <div className={style.navButtons}>
            <BackButton disabled={!onBack} onClick={onBack} />
          </div>
        )}
        <span className={style.headerLabel}>{getTitle(sendMode)}</span>
      </div>
      <div className={style.rightSegment}>
        <CloseButtonWhite disabled={closeDisabled} onClick={onClose} />
      </div>
    </div>
  );
}

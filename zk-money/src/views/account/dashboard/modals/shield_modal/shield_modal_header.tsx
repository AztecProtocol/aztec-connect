import { BackButton } from 'ui-components';
import { CloseButtonWhite } from 'components';
import style from './shield_modal_header.module.scss';

interface ShieldModalHeaderProps {
  closeDisabled: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export function ShieldModalHeader({ onClose, closeDisabled, onBack }: ShieldModalHeaderProps) {
  return (
    <div className={style.root}>
      <div className={style.leftSegment}>
        {onBack && (
          <div className={style.navButtons}>
            <BackButton disabled={!onBack} onClick={onBack} />
          </div>
        )}
        <span className={style.headerLabel}>Shield Funds</span>
      </div>
      <div className={style.rightSegment}>
        <CloseButtonWhite disabled={closeDisabled} onClick={onClose} />
      </div>
    </div>
  );
}

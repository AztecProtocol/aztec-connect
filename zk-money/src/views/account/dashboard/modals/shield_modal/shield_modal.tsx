import { Card, CardHeaderSize } from 'ui-components';
import { useShieldForm } from 'alt-model/shield/shield_form_hooks';
import { CloseButtonWhite, Modal } from 'components';
import style from './shield_modal.module.scss';
import { ShieldPage2 } from './shield_page2/shield_page2';
import { ShieldPage1 } from './shield_page1';

export function ShieldModal({ preselectedAssetId, onClose }: { preselectedAssetId?: number; onClose: () => void }) {
  const { fields, setters, validationResult, composerState, locked, attemptLock, feedback, submit, unlock } =
    useShieldForm(preselectedAssetId);
  const handleClose = () => {
    if (locked) unlock();
    else onClose();
  };

  const cardContent =
    locked && composerState ? (
      <ShieldPage2
        composerState={composerState}
        validationResult={validationResult}
        onSubmit={submit}
        onClose={onClose}
      />
    ) : (
      <ShieldPage1
        fields={fields}
        feedback={feedback}
        validationResult={validationResult}
        onNext={attemptLock}
        onChangeAmountStr={setters.amountStr}
        onChangeRecipientAlias={setters.recipientAlias}
        onChangeSpeed={setters.speed}
      />
    );

  return (
    <Modal>
      <Card
        cardHeader={
          <div className={style.sendHeader}>
            <span className={style.headerLabel}>Shield</span>
            <CloseButtonWhite onClick={handleClose} />
          </div>
        }
        cardContent={<div className={style.contentWrapper}>{cardContent}</div>}
        headerSize={CardHeaderSize.LARGE}
      />
    </Modal>
  );
}

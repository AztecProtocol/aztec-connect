import { Card, CardHeaderSize } from 'ui-components';
import { useShieldForm, ShieldComposerPhase } from 'alt-model/shield';
import { CloseButtonWhite, Modal } from 'components';
import { ShieldPage2 } from './shield_page2/shield_page2';
import { ShieldPage1 } from './shield_page1';
import { useRemoteAssets } from 'alt-model/top_level_context';
import style from './shield_modal.module.scss';

interface ShieldModalProps {
  onClose: () => void;
}

export function ShieldModal(props: ShieldModalProps) {
  const assets = useRemoteAssets();
  const { onClose } = props;
  const { fields, setters, validationResult, composerState, locked, attemptLock, feedback, submit, unlock } =
    useShieldForm();

  const handleClose = () => {
    if (!locked) {
      onClose();
    } else {
      if (composerState?.phase === ShieldComposerPhase.DONE) {
        onClose();
      } else {
        unlock();
      }
    }
  };

  if (!assets) {
    return <div />;
  }

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
        assets={assets}
        validationResult={validationResult}
        onNext={attemptLock}
        onChangeAmountStr={setters.amountStr}
        onChangeAsset={setters.assetId}
        onChangeRecipientAlias={setters.recipientAlias}
        onChangeSpeed={setters.speed}
      />
    );

  return (
    <Modal onClose={handleClose}>
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

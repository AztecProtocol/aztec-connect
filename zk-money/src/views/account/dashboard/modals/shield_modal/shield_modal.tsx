import { Card, CardHeaderSize } from 'ui-components';
import { useShieldForm, ShieldComposerPhase } from 'alt-model/shield';
import { CloseButtonWhite, Modal } from 'components';
import { ShieldConfirmationPage } from './shield_confirmation_page';
import { ShieldPage1 } from './shield_page1';
import { useRemoteAssets } from 'alt-model/top_level_context';
import style from './shield_modal.module.scss';

interface ShieldModalProps {
  onClose: () => void;
  preselectedAssetId?: number;
}

export function ShieldModal(props: ShieldModalProps) {
  const assets = useRemoteAssets();
  const { onClose } = props;
  const { fields, setters, validationResult, composerState, locked, attemptLock, feedback, submit, unlock } =
    useShieldForm(props.preselectedAssetId);

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
    return null;
  }

  const cardContent =
    locked && composerState ? (
      <ShieldConfirmationPage
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
        onChangeAmountStrOrMax={setters.amountStrOrMax}
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
            <span className={style.headerLabel}>Shield Funds</span>
            <CloseButtonWhite onClick={handleClose} />
          </div>
        }
        cardContent={cardContent}
        headerSize={CardHeaderSize.LARGE}
      />
    </Modal>
  );
}

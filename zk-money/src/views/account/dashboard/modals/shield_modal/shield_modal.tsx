import { Card, CardHeaderSize } from 'ui-components';
import { useShieldForm, ShieldComposerPhase } from 'alt-model/shield';
import { Modal } from 'components';
import { ShieldConfirmationPage } from './shield_confirmation_page';
import { ShieldPage1 } from './shield_page1';
import { useRemoteAssets } from 'alt-model/top_level_context';
import { ShieldModalHeader } from './shield_modal_header';

interface ShieldModalProps {
  onClose: () => void;
  preselectedAssetId?: number;
}

export function ShieldModal(props: ShieldModalProps) {
  const assets = useRemoteAssets();
  const { onClose } = props;
  const { fields, setters, validationResult, composerState, locked, attemptLock, feedback, submit, unlock } =
    useShieldForm(props.preselectedAssetId);

  const phase = composerState?.phase;
  const isIdle = phase === ShieldComposerPhase.IDLE;
  const canClose = phase === undefined || isIdle || phase === ShieldComposerPhase.DONE;
  const canGoBack = locked && isIdle;
  const handleBack = canGoBack ? unlock : undefined;

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
    <Modal onClose={onClose}>
      <Card
        cardHeader={<ShieldModalHeader closeDisabled={!canClose} onClose={onClose} onBack={handleBack} />}
        cardContent={cardContent}
        headerSize={CardHeaderSize.LARGE}
      />
    </Modal>
  );
}

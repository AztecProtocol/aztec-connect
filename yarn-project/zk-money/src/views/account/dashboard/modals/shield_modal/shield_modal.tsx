import { Card, CardHeaderSize } from '../../../../../ui-components/index.js';
import { useShieldForm, ShieldComposerPhase } from '../../../../../alt-model/shield/index.js';
import { Modal } from '../../../../../components/index.js';
import { ShieldConfirmationPage } from './shield_confirmation_page/index.js';
import { ShieldPage1 } from './shield_page1.js';
import { ShieldModalHeader } from './shield_modal_header.js';

interface ShieldModalProps {
  preselectedAssetId?: number;
  preselectedRecipient?: string;
  onClose: () => void;
  onShieldComplete?: () => void;
}

export function ShieldModal(props: ShieldModalProps) {
  const { onClose } = props;
  const {
    fields,
    setters,
    validationResult,
    composerState,
    lockedComposerPayload,
    locked,
    attemptLock,
    feedback,
    submit,
    unlock,
  } = useShieldForm(props.preselectedAssetId, props.preselectedRecipient, props.onShieldComplete);

  const phase = composerState?.phase;
  const isIdle = phase === ShieldComposerPhase.IDLE;
  const canClose = phase === undefined || isIdle || phase === ShieldComposerPhase.DONE;
  const canGoBack = locked && isIdle;
  const handleBack = canGoBack ? unlock : undefined;

  const cardContent =
    locked && composerState && lockedComposerPayload ? (
      <ShieldConfirmationPage
        composerState={composerState}
        validationResult={validationResult}
        lockedComposerPayload={lockedComposerPayload}
        onSubmit={submit}
        onClose={onClose}
      />
    ) : (
      <ShieldPage1
        fields={fields}
        feedback={feedback}
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

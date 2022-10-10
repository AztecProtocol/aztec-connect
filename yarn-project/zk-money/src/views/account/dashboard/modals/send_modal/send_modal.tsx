import { Card, CardHeaderSize } from '../../../../../ui-components/index.js';
import { Modal } from '../../../../../components/index.js';
import { SendFormFieldsPage } from './send_form_fields_page.js';
import { SendComposerPhase, useSendForm } from '../../../../../alt-model/send/index.js';
import { SendConfirmationPage } from './send_confirmation_page.js';
import { Theme } from '../../../../../styles/index.js';
import { SendModalHeader } from './send_modal_header.js';

interface SendModalProps {
  onClose: () => void;
  assetId: number;
}

export function SendModal({ assetId, onClose }: SendModalProps) {
  const sendForm = useSendForm(assetId);
  const {
    state,
    setters,
    feedback,
    composerState,
    lockedComposerPayload,
    isValid,
    isLocked,
    unlock,
    submit,
    attemptLock,
  } = sendForm;

  const phase = composerState?.phase;
  const isIdle = phase === SendComposerPhase.IDLE;
  const canClose = phase === undefined || isIdle || phase === SendComposerPhase.DONE;
  const canGoBack = isLocked && isIdle;
  const handleBack = canGoBack ? unlock : undefined;
  const generatingKey = phase === SendComposerPhase.GENERATING_KEY;
  const overrideModalLayout = !generatingKey;
  const theme = generatingKey ? Theme.GRADIENT : Theme.WHITE;

  const cardContent =
    isLocked && composerState && lockedComposerPayload ? (
      <SendConfirmationPage
        state={state}
        lockedComposerPayload={lockedComposerPayload}
        composerState={composerState}
        onSubmit={submit}
        onClose={onClose}
      />
    ) : (
      <SendFormFieldsPage
        state={state}
        feedback={feedback}
        isValid={!!isValid}
        onChangeSendMode={setters.sendMode}
        onChangeAmount={setters.amountStrOrMax}
        onChangeRecipient={setters.recipientStr}
        onChangeSpeed={setters.speed}
        onNext={attemptLock}
      />
    );

  return (
    <Modal theme={theme} onClose={() => canClose && onClose()} noPadding={overrideModalLayout}>
      <Card
        cardHeader={
          <SendModalHeader
            closeDisabled={!canClose}
            onBack={handleBack}
            onClose={onClose}
            sendMode={state.fields.sendMode}
          />
        }
        cardContent={cardContent}
        headerSize={CardHeaderSize.LARGE}
      />
    </Modal>
  );
}

import { isKnownAssetAddressString } from 'alt-model/known_assets/known_asset_addresses';
import type { RemoteAsset } from 'alt-model/types';
import { useSendForm } from 'alt-model/send/send_form_hooks';
import { Card, CardHeaderSize } from 'ui-components';
import { useApp } from 'alt-model';
import { SendMode } from 'app';
import { CloseButtonWhite, Modal } from 'components';
import { SendFormFieldsPage } from './send_form_fields_page';
import { SendComposerPhase } from 'alt-model/send/send_composer_state_obs';
import { SendConfirmationPage } from './send_confirmation_page';
import { Theme } from 'styles';
import style from './send_modal.module.scss';
import { SendModalHeader } from './send_modal_header';

interface SendModalProps {
  onClose: () => void;
  asset: RemoteAsset;
}

export function SendModal({ asset, onClose }: SendModalProps) {
  const { config } = useApp();
  const sendForm = useSendForm(asset.id);
  const { state, setters, feedback, composerState, isValid, isLocked, unlock, submit, attemptLock } = sendForm;

  const phase = composerState?.phase;
  const isIdle = phase === SendComposerPhase.IDLE;
  const canClose = phase === undefined || isIdle || phase === SendComposerPhase.DONE;
  const canGoBack = isLocked && isIdle;
  const handleBack = canGoBack ? unlock : undefined;
  const generatingKey = phase === SendComposerPhase.GENERATING_KEY;
  const overrideModalLayout = !generatingKey;
  const theme = generatingKey ? Theme.GRADIENT : Theme.WHITE;

  const assetAddressStr = asset.address.toString();
  if (!isKnownAssetAddressString(assetAddressStr)) {
    throw new Error(`Attempting SendModal with unknown asset address '${assetAddressStr}'`);
  }
  const txAmountLimit = config.txAmountLimits[assetAddressStr];

  const cardContent =
    isLocked && composerState ? (
      <SendConfirmationPage
        state={state}
        composerState={composerState}
        onSubmit={submit}
        onClose={onClose}
        asset={asset}
        txAmountLimit={txAmountLimit}
      />
    ) : (
      <SendFormFieldsPage
        asset={asset}
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

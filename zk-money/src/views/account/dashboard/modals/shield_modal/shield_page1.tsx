import type { ShieldFormFeedback } from 'alt-model/shield/shield_form_feedback';
import type { ShieldFormFields, ShieldFormValidationResult } from 'alt-model/shield/shield_form_validation';
import { TxSettlementTime, TxType } from '@aztec/sdk';
import { SendMode, ValueAvailability } from 'app';
import { Button, InputTheme } from 'components';
import { AmountSection, GasSection, GasSectionType, RecipientSection } from 'views/account/dashboard/modals/sections';
import { ConnectedLegacyWalletSelect } from './connected_legacy_wallet_select';
import { DropdownOption } from 'components/dropdown';
import { RemoteAsset } from 'alt-model/types';
import style from './shield.module.scss';

function toLegacyRecipientInput({ recipientAlias }: ShieldFormFields, { input }: ShieldFormValidationResult) {
  const { aliasIsValid } = input;
  const valid =
    aliasIsValid === undefined
      ? ValueAvailability.PENDING
      : aliasIsValid
      ? ValueAvailability.VALID
      : ValueAvailability.INVALID;
  return {
    value: { input: recipientAlias, txType: TxType.DEPOSIT, valid },
  };
}

interface ShieldPage1Props {
  fields: ShieldFormFields;
  feedback: ShieldFormFeedback;
  validationResult: ShieldFormValidationResult;
  assets: RemoteAsset[];
  onNext(): void;
  onChangeAmountStr(value: string): void;
  onChangeRecipientAlias(value: string): void;
  onChangeSpeed(speed: TxSettlementTime): void;
  onChangeAsset(asset: number): void;
}

export function ShieldPage1({
  fields,
  feedback,
  validationResult,
  assets,
  onNext,
  onChangeAmountStr,
  onChangeRecipientAlias,
  onChangeSpeed,
  onChangeAsset,
}: ShieldPage1Props) {
  const asset = validationResult.input.targetL2OutputAmount?.info;
  if (!asset) {
    return <>Loading...</>;
  }

  return (
    <>
      <ConnectedLegacyWalletSelect
        className={style.walletSelect}
        asset={asset}
        errorFeedback={feedback.walletAccount}
      />
      <AmountSection
        maxAmount={validationResult.maxL2Output ?? 0n}
        asset={asset}
        assets={assets}
        amountStr={fields.amountStr}
        allowAssetSelection={true}
        onChangeAsset={onChangeAsset}
        onChangeAmountStr={onChangeAmountStr}
        hidePrivacy
        message={feedback.amount}
        balanceType="L1"
      />
      <RecipientSection
        theme={InputTheme.WHITE}
        recipient={toLegacyRecipientInput(fields, validationResult)}
        sendMode={SendMode.SEND}
        onChangeValue={onChangeRecipientAlias}
      />
      <GasSection
        type={GasSectionType.TX}
        speed={fields.speed}
        onChangeSpeed={speed => onChangeSpeed(speed as TxSettlementTime)}
        feeAmount={validationResult.input.feeAmount}
      />
      {feedback.footer && <div className={style.errorMessage}>{feedback.footer}</div>}
      <div className={style.nextWrapper}>
        <Button theme="gradient" text="Next" onClick={onNext} disabled={!validationResult.isValid} />
      </div>
    </>
  );
}

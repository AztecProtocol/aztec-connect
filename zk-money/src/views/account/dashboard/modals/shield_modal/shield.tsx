import React from 'react';
import { TxSettlementTime, TxType } from '@aztec/sdk';
import {
  Asset,
  isValidForm,
  ProviderState,
  SendMode,
  ShieldFormValues,
  ShieldStatus,
  ValueAvailability,
  WalletId,
} from 'app';
import { Button, InputMessage, InputTheme } from 'components';
import { Theme } from 'styles';
import { ShieldProgress } from './shield_progress';
import { AmountSection, GasSection, GasSectionType, RecipientSection } from 'views/account/dashboard/modals/sections';
import style from './shield.module.scss';

interface ShieldProps {
  theme: Theme;
  asset: Asset;
  assetPrice: bigint;
  txAmountLimit: bigint;
  providerState?: ProviderState;
  explorerUrl: string;
  form: ShieldFormValues;
  onChangeInputs(inputs: Partial<ShieldFormValues>): void;
  onValidate(): void;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const Shield: React.FunctionComponent<ShieldProps> = (props: ShieldProps) => {
  const {
    theme,
    asset,
    assetPrice,
    txAmountLimit,
    providerState,
    form,
    onChangeInputs,
    onValidate,
    onChangeWallet,
    onDisconnectWallet,
    onGoBack,
    onSubmit,
    onClose,
  } = props;

  if (form.status.value !== ShieldStatus.NADA) {
    return (
      <ShieldProgress
        theme={theme}
        asset={asset}
        assetPrice={assetPrice}
        txAmountLimit={txAmountLimit}
        providerState={providerState}
        form={form}
        onChangeWallet={onChangeWallet}
        onDisconnectWallet={onDisconnectWallet}
        onGoBack={onGoBack}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );
  }

  const inputTheme = theme === Theme.WHITE ? InputTheme.WHITE : InputTheme.LIGHT;
  const { amount, fees, speed, maxAmount, recipient, submit } = form;
  const txFee = fees.value[speed.value];

  return (
    <div className={style.root}>
      <AmountSection
        maxAmount={maxAmount.value}
        asset={asset}
        amountStr={amount.value}
        onChangeAmountStr={(value: string) => onChangeInputs({ amount: { value } })}
        amountStrAnnotation={undefined}
        hidePrivacy={true}
        message={form.amount?.message}
      />
      <RecipientSection
        theme={inputTheme}
        recipient={{ ...recipient, value: { ...recipient.value, txType: TxType.TRANSFER } }}
        sendMode={SendMode.SEND}
        onChangeValue={input => onChangeInputs({ recipient: { value: { ...recipient.value, input } } })}
        message={form.recipient?.message}
      />
      <GasSection
        type={GasSectionType.TX}
        speed={speed.value as TxSettlementTime}
        onChangeSpeed={speed => onChangeInputs({ speed: { value: speed as TxSettlementTime } })}
        asset={asset}
        fee={txFee.fee}
      />
      {/* <div>
        {recipient.message && (
          <InputMessage
            className={style.fixedInputMessage}
            theme={inputTheme}
            message={recipient.message}
            type={recipient.messageType}
          />
        )}
      </div> */}
      <div className={style.nextWrapper}>
        <Button
          theme="gradient"
          text="Next"
          onClick={onValidate}
          disabled={!isValidForm(form as any) || recipient.value.valid !== ValueAvailability.VALID}
          isLoading={submit.value}
        />
      </div>
      {/* {submit.message && <InputMessage theme={inputTheme} message={submit.message} type={submit.messageType} />} */}
    </div>
  );
};

import type { RemoteAsset } from 'alt-model/types';
import React from 'react';
import { TxSettlementTime, TxType } from '@aztec/sdk';

import { isValidForm, ProviderState, SendMode, ShieldFormValues, ShieldStatus, ValueAvailability, WalletId } from 'app';
import { Button, InputTheme } from 'components';
import { Theme } from 'styles';
import { ShieldProgress } from './shield_progress';
import { AmountSection, GasSection, GasSectionType, RecipientSection } from 'views/account/dashboard/modals/sections';
import { WalletSelect } from 'views/account/wallet_select';
import style from './shield.module.scss';

interface ShieldProps {
  theme: Theme;
  asset: RemoteAsset;
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
  const { amount, fees, speed, maxAmount, recipient, submit, ethAccount } = form;
  const txFee = fees.value[speed.value];

  return (
    <div className={style.root}>
      <WalletSelect
        className={style.walletSelect}
        asset={asset}
        providerState={providerState}
        ethAccount={ethAccount.value}
        message={ethAccount.message}
        messageType={ethAccount.messageType}
        onChangeWallet={onChangeWallet}
      />
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
      {submit.message && <div className={style.errorMessage}>{submit.message}</div>}
      <div className={style.nextWrapper}>
        <Button
          theme="gradient"
          text="Next"
          onClick={onValidate}
          disabled={!isValidForm(form as any) || recipient.value.valid !== ValueAvailability.VALID}
          isLoading={submit.value}
        />
      </div>
    </div>
  );
};

import React from 'react';
import type { RemoteAsset } from 'alt-model/types';
import { isValidForm, SendFormValues, SendMode, SendStatus, ValueAvailability, WalletId } from 'app';
import { Button, InputTheme } from 'components';
import { Theme } from 'styles';
import { SplitSection } from '../sections/split_section';
import { AmountSection } from 'views/account/dashboard/modals/sections/amount_section';
import { TxGasSection } from 'views/account/dashboard/modals/sections/gas_section';
import { SendProgress } from './send_progress';
import { FaqHint, formatMaxAmount } from 'ui-components';
import { DescriptionSection, RecipientSection } from '../sections';
import { useAmounts } from 'alt-model/asset_hooks';
import { PrivacyInformationSection } from '../sections/privacy_information_section';
import { TransactionSettlementTimeInformationSection } from '../sections/settlement_time_information_section';
import { MAX_MODE, StrOrMax } from 'alt-model/forms/constants';
import style from './send.module.scss';

export interface SendProps {
  theme: Theme;
  asset: RemoteAsset;
  txAmountLimit: bigint;
  spendableBalance: bigint;
  form: SendFormValues;
  sendMode: SendMode;
  explorerUrl: string;
  onChangeInputs(inputs: Partial<SendFormValues>): void;
  onValidate(): void;
  onSubmit(): void;
  onClose(): void;
}

function getDescription(sendMode: SendMode) {
  switch (sendMode) {
    case SendMode.SEND:
      return `Send funds within Layer 2 zk Money. This includes anyone who has an account, and therefore an Alias. Privacy risks are negligable!`;
    case SendMode.WIDTHDRAW:
      return `Withdraw funds from zk Money to Layer 1 Ethereum. This includes your own external wallet or any other Ethereum address. Be careful! Depending on your initial deposit, certain withdrawls can carry privacy risks! The crowd below shows how hidden you are based on the values you input.`;
    default:
      return '';
  }
}

export const Send: React.FunctionComponent<SendProps> = ({
  theme,
  asset,
  txAmountLimit,
  sendMode,
  form,
  onChangeInputs,
  onValidate,
  onSubmit,
  onClose,
}) => {
  const { amount, fees, maxAmount, recipient, submit } = form;
  const inputTheme = theme === Theme.WHITE ? InputTheme.WHITE : InputTheme.LIGHT;
  const feeAmounts = useAmounts(fees.value.map(feeValue => ({ assetId: asset.id, value: feeValue.fee })));

  if (form.status.value !== SendStatus.NADA) {
    return (
      <SendProgress asset={asset} txAmountLimit={txAmountLimit} form={form} onSubmit={onSubmit} onClose={onClose} />
    );
  }

  // TODO: Remove once concept of max mode is supported parent form logic
  const handleChangeAmountStrOrMax = (amountStrOrMax: StrOrMax) => {
    const value = amountStrOrMax === MAX_MODE ? formatMaxAmount(maxAmount.value, asset) : amountStrOrMax;
    onChangeInputs({ amount: { value } });
  };

  return (
    <div className={style.root}>
      <DescriptionSection text={getDescription(sendMode)} />
      <SplitSection
        leftPanel={
          <>
            <RecipientSection
              theme={inputTheme}
              recipient={recipient}
              sendMode={sendMode}
              onChangeValue={value => {
                onChangeInputs({ recipient: { value: { ...recipient.value, input: value.replace(/^@+/, '') } } });
              }}
              message={form.recipient?.message}
            />
            <AmountSection
              maxAmount={maxAmount.value}
              asset={asset}
              amountStrOrMax={amount.value}
              onChangeAmountStrOrMax={handleChangeAmountStrOrMax}
              amountStrAnnotation={undefined}
              message={form.amount?.message}
              balanceType="L2"
            />
          </>
        }
        rightPanel={
          <PrivacyInformationSection
            privacyIssue={form.privacyIssue.value}
            amount={form.selectedAmount.value}
            asset={asset}
            txToAlias={sendMode === SendMode.SEND}
          />
        }
      />
      <SplitSection
        leftPanel={
          <TxGasSection
            asset={asset}
            balanceType="L2"
            speed={form.speed.value}
            onChangeSpeed={speed => onChangeInputs({ speed: { value: speed } })}
            feeAmounts={feeAmounts}
            targetAssetIsErc20={asset.id !== 0}
          />
        }
        rightPanel={<TransactionSettlementTimeInformationSection selectedSpeed={form.speed.value} />}
      />
      <div className={style.footer}>
        <FaqHint className={style.faqHint} />
        <div className={style.nextWrapper}>
          {submit.message && <div className={style.errorMessage}>{submit.message}</div>}
          <Button
            className={style.nextButton}
            text="Next"
            theme="gradient"
            onClick={onValidate}
            isLoading={submit.value}
            disabled={!isValidForm(form as any) || recipient.value.valid !== ValueAvailability.VALID}
          />
        </div>
      </div>
    </div>
  );
};

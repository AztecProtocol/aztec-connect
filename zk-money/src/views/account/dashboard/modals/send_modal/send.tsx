import type { RemoteAsset } from 'alt-model/types';
import React, { useState } from 'react';
import { TxSettlementTime } from '@aztec/sdk';
import { isValidForm, SendFormValues, SendMode, SendStatus, ValueAvailability } from 'app';
import { Button, InputTheme } from 'components';
import { Theme } from 'styles';
import { SplitSection } from '../sections/split_section';
import { AmountSection } from 'views/account/dashboard/modals/sections/amount_section';
import { GasSection, GasSectionType } from 'views/account/dashboard/modals/sections/gas_section';
import { SendProgress } from './send_progress';
import { FaqHint } from 'ui-components';
import { DescriptionSection, RecipientSection } from '../sections';
import { useAmounts } from 'alt-model/asset_hooks';
import { PrivacyInformationSection } from '../sections/privacy_information_section';
import { SettlementTimeInformationSection } from '../sections/settlement_time_information_section';
import style from './send.module.scss';

interface SendFormFields {
  amountStr: string;
  speed: TxSettlementTime;
}

export interface SendProps {
  theme: Theme;
  asset: RemoteAsset;
  assetPrice: bigint;
  txAmountLimit: bigint;
  spendableBalance: bigint;
  form: SendFormValues;
  sendMode: SendMode;
  explorerUrl: string;
  onChangeInputs(inputs: Partial<SendFormValues>): void;
  onValidate(): void;
  onGoBack(): void;
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
  assetPrice,
  txAmountLimit,
  sendMode,
  form,
  onChangeInputs,
  onValidate,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const [fields, setFields] = useState<SendFormFields>({
    speed: TxSettlementTime.INSTANT,
    amountStr: '',
  });
  const { amount, fees, speed, maxAmount, recipient, submit } = form;
  const txFee = fees.value[speed.value];
  const inputTheme = theme === Theme.WHITE ? InputTheme.WHITE : InputTheme.LIGHT;
  const feeAmounts = useAmounts(fees.value.map(feeValue => ({ assetId: asset.id, value: feeValue.fee })));

  if (form.status.value !== SendStatus.NADA) {
    return (
      <SendProgress
        theme={theme}
        asset={asset}
        assetPrice={assetPrice}
        txAmountLimit={txAmountLimit}
        form={form}
        onGoBack={onGoBack}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );
  }

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
              amountStr={amount.value}
              onChangeAmountStr={(value: string) => onChangeInputs({ amount: { value } })}
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
          <GasSection
            asset={asset}
            balanceType="L2"
            type={GasSectionType.TX}
            speed={fields.speed as TxSettlementTime}
            onChangeSpeed={speed => setFields({ ...fields, speed: speed as TxSettlementTime })}
            feeAmounts={feeAmounts}
          />
        }
        rightPanel={<SettlementTimeInformationSection />}
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

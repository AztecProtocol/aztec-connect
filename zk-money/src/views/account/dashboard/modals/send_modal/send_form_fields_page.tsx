import React from 'react';
import type { RemoteAsset } from 'alt-model/types';
import { InputTheme } from 'components';
import { SplitSection } from '../sections/split_section';
import { AmountSection } from 'views/account/dashboard/modals/sections/amount_section';
import { TxGasSection } from 'views/account/dashboard/modals/sections/gas_section';
import { Toggle } from 'ui-components';
import { DescriptionSection, RecipientSection } from '../sections';
import { PrivacyInformationSection } from '../sections/privacy_information_section';
import { TransactionSettlementTimeInformationSection } from '../sections/settlement_time_information_section';
import { StrOrMax } from 'alt-model/forms/constants';
import { TxSettlementTime } from '@aztec/sdk';
import { SendFormDerivedData, SendMode, SendFormFeedback } from 'alt-model/send';
import style from './send_form_fields_page.module.scss';
import { FooterSection } from '../sections/footer_section';

export interface SendProps {
  asset: RemoteAsset;
  state: SendFormDerivedData;
  feedback: SendFormFeedback;
  isValid: boolean;
  onChangeSendMode(sendMode: SendMode): void;
  onChangeAmount(value: StrOrMax): void;
  onChangeRecipient(recipient: string): void;
  onChangeSpeed(speed: TxSettlementTime): void;
  onNext(): void;
}

const MODES = [
  { label: 'Withdraw to L1', value: SendMode.WIDTHDRAW },
  { label: 'Send to L2', value: SendMode.SEND },
];

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

export const SendFormFieldsPage: React.FunctionComponent<SendProps> = ({
  asset,
  state,
  feedback,
  isValid,
  onChangeSendMode,
  onChangeAmount,
  onChangeRecipient,
  onChangeSpeed,
  onNext,
}) => {
  const { sendMode } = state.fields;

  return (
    <div className={style.root}>
      <div className={style.header}>
        <Toggle className={style.toggle} value={sendMode} options={MODES} onChangeValue={onChangeSendMode} />
        <DescriptionSection className={style.description} text={getDescription(sendMode)} />
      </div>
      <SplitSection
        leftPanel={
          <>
            <RecipientSection
              theme={InputTheme.WHITE}
              recipientStr={state.fields.recipientStr}
              isLoading={state.isLoadingRecipient}
              isValid={!!state.recipient}
              recipientType={sendMode === SendMode.SEND ? 'L2' : 'L1'}
              message={feedback.recipient}
              onChangeValue={value => {
                onChangeRecipient(value.replace(/^@+/, ''));
              }}
            />
            <AmountSection
              maxAmount={state.maxOutput ?? 0n}
              asset={asset}
              amountStrOrMax={state.fields.amountStrOrMax}
              onChangeAmountStrOrMax={onChangeAmount}
              amountStrAnnotation={undefined}
              message={feedback.amount}
              balanceType="L2"
            />
          </>
        }
        rightPanel={
          <PrivacyInformationSection
            amount={state.targetAmount?.baseUnits ?? 0n}
            asset={asset}
            txToAlias={sendMode === SendMode.SEND}
          />
        }
      />
      <SplitSection
        leftPanel={
          <TxGasSection
            balanceType="L2"
            speed={state.fields.speed}
            onChangeSpeed={onChangeSpeed}
            feeAmounts={state.feeAmounts}
            targetAssetIsErc20={asset.id !== 0}
          />
        }
        rightPanel={<TransactionSettlementTimeInformationSection selectedSpeed={state.fields.speed} />}
      />
      <FooterSection onNext={onNext} nextDisabled={!isValid} feedback={feedback.footer} />
    </div>
  );
};

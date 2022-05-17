import React from 'react';
import type { RemoteAsset } from 'alt-model/types';
import { SendMode, ValueAvailability } from 'app';
import { Button, InputTheme } from 'components';
import { SplitSection } from '../sections/split_section';
import { AmountSection } from 'views/account/dashboard/modals/sections/amount_section';
import { TxGasSection } from 'views/account/dashboard/modals/sections/gas_section';
import { FaqHint, formatMaxAmount, Toggle } from 'ui-components';
import { DescriptionSection, RecipientSection } from '../sections';
import { PrivacyInformationSection } from '../sections/privacy_information_section';
import { TransactionSettlementTimeInformationSection } from '../sections/settlement_time_information_section';
import { MAX_MODE, StrOrMax } from 'alt-model/forms/constants';
import { TxSettlementTime } from '@aztec/sdk';
import { SendFormFeedback } from 'alt-model/send/send_form_feedback';
import { SendFormDerivedData } from 'alt-model/send/send_form_validation';
import style from './send.module.scss';

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
  const handleChangeAmountStrOrMax = (amountStrOrMax: StrOrMax) => {
    const value =
      amountStrOrMax === MAX_MODE && state.maxOutput ? formatMaxAmount(state.maxOutput, asset) : amountStrOrMax;
    onChangeAmount(value);
  };
  const { sendMode } = state.fields;

  return (
    <div className={style.root}>
      <div className={style.header}>
        <DescriptionSection className={style.description} text={getDescription(sendMode)} />
        <Toggle className={style.toggle} value={sendMode} options={MODES} onChangeValue={onChangeSendMode} />
      </div>
      <SplitSection
        leftPanel={
          <>
            <RecipientSection
              theme={InputTheme.WHITE}
              recipientStr={state.fields.recipientStr}
              isLoading={state.isLoadingRecipient}
              isValid={!!state.recipient}
              sendMode={sendMode}
              message={feedback.recipient}
              onChangeValue={value => {
                onChangeRecipient(value.replace(/^@+/, ''));
              }}
            />
            <AmountSection
              maxAmount={state.maxOutput ?? 0n}
              asset={asset}
              amountStrOrMax={state.fields.amountStrOrMax}
              onChangeAmountStrOrMax={handleChangeAmountStrOrMax}
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
            asset={asset}
            balanceType="L2"
            speed={state.fields.speed}
            onChangeSpeed={onChangeSpeed}
            feeAmounts={state.feeAmounts}
            targetAssetIsErc20={asset.id !== 0}
          />
        }
        rightPanel={<TransactionSettlementTimeInformationSection selectedSpeed={state.fields.speed} />}
      />
      <div className={style.footer}>
        <FaqHint className={style.faqHint} />
        <div className={style.nextWrapper}>
          {feedback.footer && <div className={style.errorMessage}>{feedback.footer}</div>}
          <Button className={style.nextButton} text="Next" theme="gradient" onClick={onNext} disabled={!isValid} />
        </div>
      </div>
    </div>
  );
};

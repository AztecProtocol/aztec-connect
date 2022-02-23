import React, { useState } from 'react';
import { DefiSettlementTime } from '@aztec/sdk';
import { debounce } from 'lodash';
import styled from 'styled-components/macro';
import {
  Asset,
  isValidForm,
  MessageType,
  RecipientInput,
  SendFormValues,
  SendMode,
  SendStatus,
  ValueAvailability,
} from '../../app';
import {
  BlockTitle,
  BorderBox,
  Button,
  Text,
  Link,
  InputStatus,
  InputStatusIcon,
  InputTheme,
  InputWrapper,
  MaskedInput,
} from '../../components';
import { spacings, Theme } from '../../styles';
import { AmountSection } from './dashboard/defi_modal/amount_section';
import { GasSection } from './dashboard/defi_modal/gas_section';
import { DefiFormFields } from './dashboard/defi_modal/types';
import { SendProgress } from './send_progress';
import faqIcon from '../../images/faq_icon_gradient.svg';

const getRecipientInputStatus = (recipient: RecipientInput) => {
  if (recipient.messageType === MessageType.WARNING) {
    return InputStatus.WARNING;
  }
  if (recipient.value.valid === ValueAvailability.PENDING) {
    return InputStatus.LOADING;
  }
  return (recipient.value.input || recipient.message) && recipient.value.valid === ValueAvailability.INVALID
    ? InputStatus.ERROR
    : InputStatus.SUCCESS;
};

interface RootProps {
  sendMode: SendMode;
}

const Root = styled.div<RootProps>`
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;

  ${({ sendMode }) =>
    sendMode === SendMode.SEND
      ? `
    grid-template-areas:
      'description description'
      'amount recipient'
      'amount gas';
    `
      : sendMode === SendMode.WIDTHDRAW
      ? `grid-template-areas:
          'description description'
          'amount gas'
          'recipient gas';`
      : ``}
`;

const DescriptionText = styled.div`
  grid-area: description;
  font-size: 16px;
  margin-bottom: 10px;
  line-height: 150%;
  letter-spacing: 0.03em;
`;

const FaqLink = styled.div`
  justify-self: start;
`;

const NextWrapper = styled.div`
  justify-self: end;
`;

const Content = styled.div`
  padding: ${spacings.m};
`;

const FaqIcon = styled.div`
  display: inline-block;
  width: 30px;
  height: 24px;
  margin-left: 4px;
  transform: translateY(9px);
  background: url(${faqIcon});
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
`;

const Message = styled.div`
  display: flex;
  margin-top: 10px;
  margin-bottom: 10px;
  font-size: 16px;
  justify-self: end;
  text-align: right;
`;

export interface SendProps {
  theme: Theme;
  asset: Asset;
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

function getRecipientPlaceholder(sendMode: SendMode) {
  switch (sendMode) {
    case SendMode.SEND:
      return `Enter Alias`;
    case SendMode.WIDTHDRAW:
      return `Enter Ethereum Address`;
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
  const [fields, setFields] = useState<DefiFormFields>({
    speed: DefiSettlementTime.NEXT_ROLLUP,
    amountStr: '',
  });

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

  const inputTheme = theme === Theme.WHITE ? InputTheme.WHITE : InputTheme.LIGHT;
  const { amount, fees, speed, maxAmount, recipient, submit } = form;
  const txFee = fees.value[speed.value];

  return (
    <Root sendMode={sendMode}>
      <DescriptionText>{getDescription(sendMode)}</DescriptionText>
      <BorderBox area="recipient">
        <Content>
          <BlockTitle title="Recipient" />
          <InputWrapper theme={inputTheme}>
            <InputStatusIcon
              status={getRecipientInputStatus(recipient)}
              inactive={!recipient.value.input && !recipient.message}
            />
            <MaskedInput
              theme={inputTheme}
              value={recipient.value.input}
              prefix={sendMode === SendMode.WIDTHDRAW ? '' : '@'}
              onChangeValue={value => {
                onChangeInputs({ recipient: { value: { ...recipient.value, input: value.replace(/^@+/, '') } } });
              }}
              placeholder={getRecipientPlaceholder(sendMode)}
            />
          </InputWrapper>
        </Content>
      </BorderBox>
      <BorderBox area="amount">
        <AmountSection
          maxAmount={maxAmount.value}
          asset={asset}
          amountStr={amount.value}
          onChangeAmountStr={(value: string) => onChangeInputs({ amount: { value } })}
          amountStrAnnotation={undefined}
          hidePrivacy={sendMode === SendMode.WIDTHDRAW}
        />
      </BorderBox>
      <BorderBox area="gas">
        <GasSection
          speed={fields.speed}
          onChangeSpeed={speed => setFields({ ...fields, speed })}
          asset={asset}
          fee={txFee.fee}
        />
      </BorderBox>
      <div />
      <Message>{recipient.message}</Message>
      <FaqLink>
        <Text size="xxs">
          Need help? Check out the
          <Link href="https://aztec-protocol.gitbook.io/zk-money/faq" target="_blank">
            <FaqIcon />
          </Link>
        </Text>
      </FaqLink>
      <NextWrapper>
        <Button
          text="Next"
          theme="gradient"
          onClick={onValidate}
          isLoading={submit.value}
          disabled={!isValidForm(form as any) || recipient.value.valid !== ValueAvailability.VALID}
        />
      </NextWrapper>
    </Root>
  );
};

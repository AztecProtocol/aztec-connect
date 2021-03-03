import { EthAddress } from '@aztec/sdk';
import React from 'react';
import styled from 'styled-components';
import { Asset, fromBaseUnits, isAddress, isValidForm, SendFormValues, SendStatus, ValueAvailability } from '../../app';
import {
  BlockTitle,
  Button,
  Checkbox,
  DisclaimerBlock,
  FixedInputMessage,
  Input,
  InputCol,
  InputMessage,
  InputRow,
  InputStatus,
  InputStatusIcon,
  InputTheme,
  InputWrapper,
  MaskedInput,
  PaddedBlock,
  Text,
} from '../../components';
import { borderRadiuses, breakpoints, colours, spacings, Theme } from '../../styles';
import { SendProgress } from './send_progress';
import { SettledTime } from './settled_time';
import { WithdrawDisclaimer } from './withdraw_disclaimer';

const AssetIcon = styled.img`
  padding: 0 ${spacings.s};
  height: 24px;
`;

const AmountCol = styled(InputCol)`
  width: 60%;

  @media (max-width: ${breakpoints.s}) {
    width: 100%;
  }
`;

const FeeCol = styled(InputCol)`
  width: 40%;

  @media (max-width: ${breakpoints.s}) {
    width: 100%;
  }
`;

const AmountInputWrapper = styled(InputWrapper)`
  align-items: stretch;
`;

const AmountAssetIconRoot = styled.div`
  display: flex;
  align-items: center;
`;

const MaxButton = styled.div`
  display: flex;
  align-items: center;
  padding: 0 ${spacings.m};
  background: ${colours.greyLight};
  border-radius: 0 ${borderRadiuses.s} ${borderRadiuses.s} 0;
  cursor: pointer;
`;

const ConfirmRoot = styled(InputCol)`
  display: flex;
  align-items: center;
  flex: 1;
  flex-wrap: wrap;
`;

const ButtonRoot = styled(InputCol)`
  flex-shrink: 0;
  width: auto;
`;

interface SendProps {
  theme: Theme;
  asset: Asset;
  form: SendFormValues;
  explorerUrl: string;
  onChangeInputs(inputs: Partial<SendFormValues>): void;
  onValidate(): void;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const Send: React.FunctionComponent<SendProps> = ({
  theme,
  asset,
  form,
  explorerUrl,
  onChangeInputs,
  onValidate,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  if (form.status.value !== SendStatus.NADA) {
    return (
      <SendProgress theme={theme} asset={asset} form={form} onGoBack={onGoBack} onSubmit={onSubmit} onClose={onClose} />
    );
  }

  const inputTheme = theme === Theme.WHITE ? InputTheme.WHITE : InputTheme.LIGHT;
  const { amount, fee, settledIn, maxAmount, recipient, confirmed, submit } = form;

  return (
    <>
      <InputRow>
        <InputCol>
          <BlockTitle title="Recipient" />
          <InputWrapper theme={inputTheme}>
            <InputStatusIcon
              status={
                recipient.value.valid === ValueAvailability.PENDING
                  ? InputStatus.LOADING
                  : (recipient.value.input || recipient.message) && recipient.value.valid === ValueAvailability.INVALID
                  ? InputStatus.ERROR
                  : InputStatus.SUCCESS
              }
              inactive={!recipient.value.input && !recipient.message}
            />
            <MaskedInput
              theme={inputTheme}
              value={recipient.value.input}
              prefix={EthAddress.isAddress(recipient.value.input.trim()) ? '' : '@'}
              onChangeValue={value =>
                onChangeInputs({ recipient: { value: { ...recipient.value, input: value.replace(/^@+/, '') } } })
              }
              placeholder="username or ethereum address"
            />
          </InputWrapper>
          {recipient.message && (
            <FixedInputMessage theme={inputTheme} message={recipient.message} type={recipient.messageType} />
          )}
        </InputCol>
      </InputRow>
      {isAddress(recipient.value.input) && (
        <PaddedBlock size="m">
          <WithdrawDisclaimer />
        </PaddedBlock>
      )}
      <InputRow>
        <AmountCol>
          <BlockTitle title="Amount" />
          <AmountInputWrapper theme={inputTheme}>
            <AmountAssetIconRoot>
              <AssetIcon src={asset.icon} />
            </AmountAssetIconRoot>
            <Input
              theme={inputTheme}
              value={amount.value}
              onChangeValue={value => onChangeInputs({ amount: { value } })}
            />
            <MaxButton
              onClick={() => onChangeInputs({ amount: { value: fromBaseUnits(maxAmount.value, asset.decimals) } })}
            >
              <Text text="MAX" size="xs" />
            </MaxButton>
          </AmountInputWrapper>
          {amount.message && (
            <FixedInputMessage theme={inputTheme} message={amount.message} type={amount.messageType} />
          )}
        </AmountCol>
        <FeeCol>
          <BlockTitle title="Fee" info={<SettledTime settledIn={settledIn.value} explorerUrl={explorerUrl} />} />
          <InputWrapper theme={inputTheme}>
            <AssetIcon src={asset.icon} />
            <Input theme={inputTheme} value={fee.value} onChangeValue={value => onChangeInputs({ fee: { value } })} />
          </InputWrapper>
          {fee.message && <FixedInputMessage theme={inputTheme} message={fee.message} type={fee.messageType} />}
        </FeeCol>
      </InputRow>
      <PaddedBlock size="m">
        <DisclaimerBlock />
      </PaddedBlock>
      <InputRow>
        <ConfirmRoot>
          <Checkbox
            text="I understand the risks"
            checked={confirmed.value}
            onChangeValue={value => onChangeInputs({ confirmed: { value } })}
          />
          {confirmed.message && (
            <FixedInputMessage theme={inputTheme} message={confirmed.message} type={confirmed.messageType} />
          )}
        </ConfirmRoot>
        <ButtonRoot>
          <Button
            theme="gradient"
            text="Next"
            onClick={onValidate}
            disabled={!isValidForm(form as any) || recipient.value.valid !== ValueAvailability.VALID}
            isLoading={submit.value}
          />
        </ButtonRoot>
      </InputRow>
      {submit.message && <InputMessage theme={inputTheme} message={submit.message} type={submit.messageType} />}
    </>
  );
};

import { EthAddress } from '@aztec/sdk';
import React from 'react';
import styled from 'styled-components';
import {
  AssetState,
  formatBaseUnits,
  isAddress,
  isValidForm,
  MessageType,
  ProviderState,
  RecipientInput,
  SendFormValues,
  SendStatus,
  ValueAvailability,
  WalletId,
} from '../../app';
import {
  BlockTitle,
  Button,
  Checkbox,
  DisclaimerBlock,
  Dot,
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
  Tooltip,
} from '../../components';
import { borderRadiuses, breakpoints, colours, spacings, Theme } from '../../styles';
import { FeeSelect } from './fee_select';
import { PrivacySetSelect } from './privacy_set_select';
import { SendProgress } from './send_progress';
import { SettledTime } from './settled_time';

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

const RecipientMessage = styled(Text)`
  padding-top: ${spacings.xs};
  text-align: right;
`;

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

const SpendableBalanceRoot = styled.div`
  display: flex;
  align-items: center;
`;

const SpendableBalance = styled(Text)`
  padding-left: ${spacings.xs};
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
  assetState: AssetState;
  providerState?: ProviderState;
  form: SendFormValues;
  explorerUrl: string;
  onChangeInputs(inputs: Partial<SendFormValues>): void;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
  onValidate(): void;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const Send: React.FunctionComponent<SendProps> = ({
  theme,
  assetState,
  providerState,
  form,
  explorerUrl,
  onChangeInputs,
  onChangeWallet,
  onDisconnectWallet,
  onValidate,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  if (form.status.value !== SendStatus.NADA) {
    return (
      <SendProgress
        theme={theme}
        assetState={assetState}
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
  const { asset, spendableBalance } = assetState;
  const { selectedAmount, amount, fees, speed, maxAmount, recipient, confirmed, submit } = form;
  const txFee = fees.value[speed.value];

  return (
    <>
      <InputRow>
        <InputCol>
          <BlockTitle title="Recipient" />
          <InputWrapper theme={inputTheme}>
            <InputStatusIcon
              status={getRecipientInputStatus(recipient)}
              inactive={!recipient.value.input && !recipient.message}
            />
            <MaskedInput
              theme={inputTheme}
              value={recipient.value.input}
              prefix={EthAddress.isAddress(recipient.value.input.trim()) || !recipient.value.input ? '' : '@'}
              onChangeValue={value =>
                onChangeInputs({ recipient: { value: { ...recipient.value, input: value.replace(/^@+/, '') } } })
              }
              placeholder="username or ethereum address"
            />
          </InputWrapper>
          {recipient.message &&
            (recipient.messageType === MessageType.ERROR ? (
              <FixedInputMessage theme={inputTheme} message={recipient.message} type={recipient.messageType} />
            ) : (
              <RecipientMessage text={recipient.message} size="xs" />
            ))}
        </InputCol>
      </InputRow>
      {isAddress(recipient.value.input) && assetState.withdrawSafeAmounts.length > 0 && (
        <PaddedBlock size="m">
          <PrivacySetSelect
            asset={assetState.asset}
            values={assetState.withdrawSafeAmounts}
            value={selectedAmount.value}
            onSelect={value => onChangeInputs({ selectedAmount: { value } })}
          />
        </PaddedBlock>
      )}
      <InputRow>
        <AmountCol>
          <BlockTitle
            title="Amount"
            info={
              <SpendableBalanceRoot>
                <Tooltip trigger={<Dot size="xs" color="green" />}>
                  <Text text="Sendable balance" size="xxs" nowrap />
                </Tooltip>
                <SpendableBalance
                  text={`${formatBaseUnits(spendableBalance, asset.decimals, {
                    precision: asset.preferredFractionalDigits,
                    commaSeparated: true,
                  })} zk${asset.symbol}`}
                  size="xs"
                />
              </SpendableBalanceRoot>
            }
          />
          <AmountInputWrapper theme={inputTheme}>
            <AmountAssetIconRoot>
              <AssetIcon src={asset.icon} />
            </AmountAssetIconRoot>
            <Input
              theme={inputTheme}
              type="number"
              value={amount.value}
              onChangeValue={value => onChangeInputs({ amount: { value } })}
            />
            <MaxButton
              onClick={() =>
                onChangeInputs({
                  amount: {
                    value: formatBaseUnits(maxAmount.value, asset.decimals, {
                      precision: asset.preferredFractionalDigits,
                    }),
                  },
                })
              }
            >
              <Text text="MAX" size="xs" />
            </MaxButton>
          </AmountInputWrapper>
          {amount.message && (
            <FixedInputMessage theme={inputTheme} message={amount.message} type={amount.messageType} />
          )}
        </AmountCol>
        <FeeCol>
          <BlockTitle title="Fee" info={<SettledTime settledIn={txFee.time} explorerUrl={explorerUrl} />} />
          <FeeSelect
            inputTheme={inputTheme}
            asset={asset}
            selectedSpeed={speed.value}
            fees={fees.value}
            onSelect={speed => onChangeInputs({ speed: { value: speed } })}
          />
        </FeeCol>
      </InputRow>
      <PaddedBlock size="m">
        <DisclaimerBlock assetState={assetState} />
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

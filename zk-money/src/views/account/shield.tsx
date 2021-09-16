import React from 'react';
import styled from 'styled-components';
import {
  AssetState,
  fromBaseUnits,
  isValidForm,
  ProviderState,
  ShieldFormValues,
  ShieldStatus,
  ValueAvailability,
  WalletId,
} from '../../app';
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
  TextLink,
} from '../../components';
import { borderRadiuses, breakpoints, colours, spacings, Theme } from '../../styles';
import { FeeSelect } from './fee_select';
import { SettledTime } from './settled_time';
import { ShieldProgress } from './shield_progress';
import { WalletSelect } from './wallet_select';

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

const InputFoot = styled(Text)`
  padding-top: ${spacings.xs};
  text-align: right;

  @media (max-width: ${breakpoints.s}) {
    text-align: left;
  }
`;

const FlexPaddedRow = styled(PaddedBlock)`
  display: flex;
  align-items: center;
`;

const FlexExpand = styled.div`
  flex: 1;
  padding-right: ${spacings.s};
`;

const FlexFixed = styled.div`
  flex-shrink: 0;
`;

const ConfirmRoot = styled(InputCol)`
  display: flex;
  align-items: center;
  flex: 1;
  flex-wrap: wrap;
`;

const ConfirmMessage = styled(Text)`
  padding-right: ${spacings.xs};
`;

const ButtonRoot = styled(InputCol)`
  flex-shrink: 0;
  width: auto;
`;

interface ShieldProps {
  theme: Theme;
  assetState: AssetState;
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

export const Shield: React.FunctionComponent<ShieldProps> = ({
  theme,
  assetState,
  providerState,
  explorerUrl,
  form,
  onChangeInputs,
  onValidate,
  onChangeWallet,
  onDisconnectWallet,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  if (form.status.value !== ShieldStatus.NADA) {
    return (
      <ShieldProgress
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
  const { asset } = assetState;
  const {
    amount,
    fees,
    speed,
    maxAmount,
    ethAccount,
    recipient,
    enableAddToBalance,
    addToBalance,
    confirmed,
    submit,
  } = form;
  const { icon, decimals, symbol } = asset;
  const { pendingBalance } = ethAccount.value;
  const txFee = fees.value[speed.value];

  return (
    <>
      <InputRow>
        <AmountCol>
          <BlockTitle
            title="Amount"
            info={
              <WalletSelect
                asset={asset}
                providerState={providerState}
                ethAccount={ethAccount.value}
                message={ethAccount.message}
                messageType={ethAccount.messageType}
                onChangeWallet={onChangeWallet}
              />
            }
          />
          <AmountInputWrapper theme={inputTheme}>
            <AmountAssetIconRoot>
              <AssetIcon src={icon} />
            </AmountAssetIconRoot>
            <Input
              theme={inputTheme}
              type="number"
              value={amount.value}
              onChangeValue={value => onChangeInputs({ amount: { value } })}
            />
            <MaxButton onClick={() => onChangeInputs({ amount: { value: fromBaseUnits(maxAmount.value, decimals) } })}>
              <Text text="MAX" size="xs" />
            </MaxButton>
          </AmountInputWrapper>
          {pendingBalance > txFee.fee && (
            <InputFoot size="xxs">
              {`You have ${fromBaseUnits(
                pendingBalance - txFee.fee,
                decimals,
              )} ${symbol} pending on the contract, this will be used first. `}
            </InputFoot>
          )}
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
      <InputRow>
        <InputCol>
          <BlockTitle title="Recipient" />
          <InputWrapper theme={inputTheme}>
            <InputStatusIcon
              status={
                recipient.value.valid === ValueAvailability.PENDING
                  ? InputStatus.LOADING
                  : recipient.value && recipient.value.valid === ValueAvailability.INVALID
                  ? InputStatus.ERROR
                  : InputStatus.SUCCESS
              }
              inactive={!recipient.value}
            />
            <MaskedInput
              theme={inputTheme}
              value={recipient.value.input}
              prefix="@"
              onChangeValue={input => onChangeInputs({ recipient: { value: { ...recipient.value, input } } })}
              placeholder="@montzema50"
            />
          </InputWrapper>
          {recipient.message && (
            <FixedInputMessage theme={inputTheme} message={recipient.message} type={recipient.messageType} />
          )}
        </InputCol>
      </InputRow>
      {enableAddToBalance.value && (
        <FlexPaddedRow size="m">
          <FlexExpand>
            <Text size="s" weight="semibold">
              {'Add to available balance '}
              <TextLink text="(?)" weight="normal" href="/about_your_balance" target="_blank" inline italic />
            </Text>
            <Text
              text="(This will make a portion of your balance unavailable until the transaction settles)"
              size="xs"
            />
          </FlexExpand>
          <FlexFixed>
            <Checkbox
              checked={addToBalance.value}
              onChangeValue={value => onChangeInputs({ addToBalance: { value } })}
            />
          </FlexFixed>
        </FlexPaddedRow>
      )}
      <PaddedBlock size="m">
        <DisclaimerBlock assetState={assetState} />
      </PaddedBlock>
      <InputRow>
        <ConfirmRoot>
          <ConfirmMessage text="I understand the risks" size="s" />
          <Checkbox checked={confirmed.value} onChangeValue={value => onChangeInputs({ confirmed: { value } })} />
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

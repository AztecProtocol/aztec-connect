import React from 'react';
import styled from 'styled-components/macro';
import {
  Asset,
  formatBaseUnits,
  isValidForm,
  ProviderState,
  ShieldFormValues,
  ShieldStatus,
  ValueAvailability,
  WalletId,
} from '../../app';
import {
  BlockTitle,
  BorderBox,
  Button,
  Checkbox,
  FixedInputMessage,
  Input,
  InputMessage,
  InputStatus,
  InputStatusIcon,
  InputTheme,
  InputWrapper,
  MaskedInput,
  PaddedBlock,
  ShieldedAssetIcon,
  Text,
  TextLink,
} from '../../components';
import { borderRadiuses, breakpoints, colours, spacings, Theme } from '../../styles';
import { FeeSelect } from './fee_select';
import { SettledTime } from './settled_time';
import { ShieldProgress } from './shield_progress';
import { WalletSelect } from './wallet_select';

const Root = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'amount recipient'
    'amount fee';
`;

const AmountInputWrapper = styled(InputWrapper)`
  align-items: stretch;
`;

const AmountAssetIconRoot = styled.div`
  display: flex;
  align-items: center;
  padding-left: ${spacings.s};
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

const StyledBorderBox = styled(BorderBox)`
  padding: 24px;
`;

const NextWrapper = styled.div`
  justify-self: end;
`;

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

export const Shield: React.FunctionComponent<ShieldProps> = ({
  theme,
  asset,
  assetPrice,
  txAmountLimit,
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
  const { amount, fees, speed, maxAmount, ethAccount, recipient, enableAddToBalance, addToBalance, submit } = form;
  const { decimals, symbol } = asset;
  const { pendingBalance } = ethAccount.value;
  const txFee = fees.value[speed.value];

  return (
    <Root>
      <StyledBorderBox area="amount">
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
            <ShieldedAssetIcon asset={asset} />
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
                  value: formatBaseUnits(maxAmount.value, decimals, {
                    precision: asset.preferredFractionalDigits,
                    floor: true,
                  }),
                },
              })
            }
          >
            <Text text="MAX" size="xs" />
          </MaxButton>
        </AmountInputWrapper>
      </StyledBorderBox>
      <StyledBorderBox area="fee">
        {pendingBalance > txFee.fee && (
          <InputFoot size="xxs">
            {`You have ${formatBaseUnits(pendingBalance - txFee.fee, decimals, {
              precision: asset.preferredFractionalDigits,
              commaSeparated: true,
            })} ${symbol} pending on the contract, this will be used first. `}
          </InputFoot>
        )}
        {amount.message && <FixedInputMessage theme={inputTheme} message={amount.message} type={amount.messageType} />}
        <BlockTitle title="Fee" info={<SettledTime settledIn={txFee.time} explorerUrl={explorerUrl} />} />
        <FeeSelect
          inputTheme={inputTheme}
          asset={asset}
          selectedSpeed={speed.value}
          fees={fees.value}
          onSelect={speed => onChangeInputs({ speed: { value: speed } })}
        />
      </StyledBorderBox>
      <StyledBorderBox area="recipient">
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
      </StyledBorderBox>
      <div />
      <NextWrapper>
        <Button
          theme="gradient"
          text="Next"
          onClick={onValidate}
          disabled={!isValidForm(form as any) || recipient.value.valid !== ValueAvailability.VALID}
          isLoading={submit.value}
        />
      </NextWrapper>
      {submit.message && <InputMessage theme={inputTheme} message={submit.message} type={submit.messageType} />}
    </Root>
  );
};

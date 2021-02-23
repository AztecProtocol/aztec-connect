import React from 'react';
import styled from 'styled-components';
import {
  fromBaseUnits,
  isValidForm,
  ProviderState,
  ProviderStatus,
  ShieldForm,
  ShieldStatus,
  Wallet,
  wallets,
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
  Select,
  Text,
  TextLink,
  Tooltip,
} from '../../components';
import errorIcon from '../../images/exclamation_mark.svg';
import { borderRadiuses, breakpoints, colours, spacings, systemStates, Theme } from '../../styles';
import { SettledTime } from './settled_time';
import { ShieldProgress } from './shield_progress';

const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

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

const FlexRow = styled.div`
  display: flex;
  align-items: center;
`;

const EthAddressText = styled(Text)`
  padding: 0 ${spacings.xs};
`;

const EthAddressStatus = styled(Dot)`
  margin-top: 1px; // To make it visually centered with the address
`;

const ErrorEthAddressRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 0 0 16px;
  height: 16px;
  border-radius: 100%;
  background: ${systemStates.error};
`;

const ErrorEthAddressIcon = styled.img`
  height: 8px;
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

const WalletItemIcon = styled.img`
  width: 24px;
`;

const WalletItemText = styled(Text)`
  padding: 0 ${spacings.s};
`;

interface WalletItemProps {
  name: string;
  icon: string;
  connected: boolean;
}

export const WalletItem: React.FunctionComponent<WalletItemProps> = ({ name, icon, connected }) => (
  <FlexRow>
    <WalletItemIcon src={icon} />
    <WalletItemText text={name} />
    {connected && <Text text="(Connected)" />}
  </FlexRow>
);

interface ShieldProps {
  theme: Theme;
  wallet: Wallet;
  providerState?: ProviderState;
  explorerUrl: string;
  form: ShieldForm;
  onChangeInputs(inputs: Partial<ShieldForm>): void;
  onValidate(): void;
  onChangeWallet(wallet: Wallet): void;
  onGoBack(): void;
  onSubmit(): void;
  onClose(): void;
}

export const Shield: React.FunctionComponent<ShieldProps> = ({
  theme,
  wallet,
  providerState,
  explorerUrl,
  form,
  onChangeInputs,
  onValidate,
  onChangeWallet,
  onGoBack,
  onSubmit,
  onClose,
}) => {
  const {
    asset,
    amount,
    fee,
    settledIn,
    maxAmount,
    ethAddress,
    publicBalance,
    recipient,
    recipientStatus,
    enableAddToBalance,
    addToBalance,
    confirmed,
    submit,
    status,
  } = form;

  if (status.value !== ShieldStatus.NADA) {
    return <ShieldProgress theme={theme} form={form} onGoBack={onGoBack} onSubmit={onSubmit} onClose={onClose} />;
  }

  const inputTheme = theme === Theme.WHITE ? InputTheme.WHITE : InputTheme.LIGHT;
  const { icon, decimals, symbol } = asset.value;
  const isStatusUpToDate = recipient.value === recipientStatus.value.input;

  const walletSelect = (
    <Select
      trigger={<Text text={`(${ethAddress.value ? 'Change' : 'Connect'})`} size="xs" nowrap />}
      items={wallets
        .filter(({ id }) => id !== Wallet.HOT)
        .map(({ id, name, icon }) => ({
          id,
          content: <WalletItem name={name} icon={icon} connected={id === wallet} />,
          disabled: id === wallet,
        }))}
      onSelect={id => onChangeWallet(id)}
    />
  );

  return (
    <>
      <InputRow>
        <AmountCol>
          <BlockTitle
            title="Amount"
            info={
              ethAddress.value ? (
                <FlexRow>
                  <Tooltip trigger={<EthAddressStatus size="xs" color="green" />}>
                    <EthAddressText
                      text={`${fromBaseUnits(publicBalance.value, decimals)} ${symbol}`}
                      size="xxs"
                      nowrap
                    />
                  </Tooltip>
                  <EthAddressText text={formatAddress(ethAddress.value)} size="xs" italic />
                  {walletSelect}
                </FlexRow>
              ) : providerState?.status === ProviderStatus.INITIALIZING ? (
                <FlexRow>
                  <EthAddressStatus size="xs" color="orange" />
                  <EthAddressText
                    text={`Connecting to ${wallets[providerState.wallet].name}...`}
                    size="xs"
                    italic
                    nowrap
                  />
                </FlexRow>
              ) : (
                <FlexRow>
                  <ErrorEthAddressRoot>
                    <ErrorEthAddressIcon src={errorIcon} />
                  </ErrorEthAddressRoot>
                  <EthAddressText text="Unknown Wallet" size="xs" italic nowrap />
                  {walletSelect}
                </FlexRow>
              )
            }
          />
          <AmountInputWrapper theme={inputTheme}>
            <AmountAssetIconRoot>
              <AssetIcon src={icon} />
            </AmountAssetIconRoot>
            <Input
              theme={inputTheme}
              value={amount.value}
              onChangeValue={value => onChangeInputs({ amount: { value } })}
            />
            <MaxButton onClick={() => onChangeInputs({ amount: { value: fromBaseUnits(maxAmount.value, decimals) } })}>
              <Text text="MAX" size="xs" />
            </MaxButton>
          </AmountInputWrapper>
          {amount.message && (
            <FixedInputMessage theme={inputTheme} message={amount.message} type={amount.messageType} />
          )}
        </AmountCol>
        <FeeCol>
          <BlockTitle
            title="Fee"
            info={
              <SettledTime
                settledIn={settledIn.value.seconds}
                status={settledIn.value.valid}
                explorerUrl={explorerUrl}
              />
            }
          />
          <InputWrapper theme={inputTheme}>
            <AssetIcon src={icon} />
            <Input theme={inputTheme} value={fee.value} onChangeValue={value => onChangeInputs({ fee: { value } })} />
          </InputWrapper>
          {fee.message && <FixedInputMessage theme={inputTheme} message={fee.message} type={fee.messageType} />}
        </FeeCol>
      </InputRow>
      <InputRow>
        <InputCol>
          <BlockTitle title="Recipient" />
          <InputWrapper theme={inputTheme}>
            <InputStatusIcon
              status={
                !isStatusUpToDate
                  ? InputStatus.LOADING
                  : recipient.value && !recipientStatus.value.valid
                  ? InputStatus.ERROR
                  : InputStatus.SUCCESS
              }
              inactive={!recipient.value}
            />
            <MaskedInput
              theme={inputTheme}
              value={recipient.value}
              prefix="@"
              onChangeValue={value => onChangeInputs({ recipient: { value } })}
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
              <TextLink text="(?)" weight="normal" href="/about_your_balance" target="_blank" inline />
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
        <DisclaimerBlock />
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
            disabled={!isValidForm(form) || !isStatusUpToDate || !recipientStatus.value.valid}
            isLoading={submit.value}
          />
        </ButtonRoot>
      </InputRow>
      {submit.message && <InputMessage theme={inputTheme} message={submit.message} type={submit.messageType} />}
    </>
  );
};

import type { RemoteAsset } from '../../alt-model/types.js';
import React from 'react';
import { default as styled } from 'styled-components';
import {
  EthAccountState,
  fromBaseUnits,
  MessageType,
  ProviderState,
  ProviderStatus,
  WalletId,
  wallets,
} from '../../app/index.js';
import { Dot, LegacySelect, Text, TextButton, Tooltip } from '../../components/index.js';
import errorIcon from '../../images/exclamation_mark.svg';
import { spacings, systemStates } from '../../styles/index.js';

const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

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
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 100%;
  background: ${systemStates.error};
`;

const ErrorEthAddressIcon = styled.img`
  height: 8px;
`;

const WalletItemRoot = styled(FlexRow)`
  padding: ${spacings.xs} 0;
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

const WalletItem: React.FunctionComponent<WalletItemProps> = ({ name, icon, connected }) => (
  <WalletItemRoot>
    <WalletItemIcon src={icon} />
    <WalletItemText text={name} />
    {connected && <Text text="(Connected)" />}
  </WalletItemRoot>
);

interface WalletSelectInputProps {
  className?: string;
  asset: RemoteAsset;
  providerState?: ProviderState;
  ethAccount: EthAccountState;
  message?: string;
  comparisonAddress?: string;
  messageType?: MessageType;
  onChangeWallet(walletId: WalletId): void;
}

export const WalletSelect: React.FunctionComponent<WalletSelectInputProps> = ({
  className,
  asset,
  providerState,
  ethAccount,
  comparisonAddress,
  message,
  messageType,
  onChangeWallet,
}) => {
  const { ethAddress, publicBalance } = ethAccount;

  const walletId = providerState?.walletId;
  const walletSelect = (
    <LegacySelect
      className={className}
      trigger={<TextButton text={`(${ethAddress ? 'Change' : 'Connect'})`} size="xs" nowrap />}
      items={wallets.map(({ id, name, icon }) => ({
        id,
        content: <WalletItem name={name} icon={icon} connected={id === walletId && id !== WalletId.CONNECT} />,
        disabled: id === walletId && id !== WalletId.CONNECT,
      }))}
      onSelect={id => onChangeWallet(id)}
    />
  );

  if (ethAddress && ethAddress.toString() === providerState?.account?.toString()) {
    const comparisonFails = comparisonAddress && comparisonAddress !== ethAddress.toString();

    return (
      <FlexRow className={className}>
        <Tooltip
          trigger={
            (message && messageType === MessageType.ERROR) || comparisonFails ? (
              <ErrorEthAddressRoot>
                <ErrorEthAddressIcon src={errorIcon} />
              </ErrorEthAddressRoot>
            ) : (
              <EthAddressStatus size="xs" color="green" />
            )
          }
        >
          <EthAddressText
            text={message || `${fromBaseUnits(publicBalance, asset.decimals)} ${asset.symbol}`}
            size="xs"
            nowrap
          />
        </Tooltip>
        <EthAddressText text={formatAddress(ethAddress.toString())} size="xs" />

        {walletSelect}
      </FlexRow>
    );
  }

  if (providerState && [ProviderStatus.INITIALIZING, ProviderStatus.INITIALIZED].indexOf(providerState.status) >= 0) {
    return (
      <FlexRow className={className}>
        <EthAddressStatus size="xs" color="orange" />
        <EthAddressText text={`Connecting to ${wallets[providerState!.walletId].name}...`} size="xs" nowrap />
      </FlexRow>
    );
  }

  return (
    <FlexRow className={className}>
      <ErrorEthAddressRoot>
        <ErrorEthAddressIcon src={errorIcon} />
      </ErrorEthAddressRoot>
      <EthAddressText text="Unknown Wallet" size="xs" nowrap />
      {walletSelect}
    </FlexRow>
  );
};

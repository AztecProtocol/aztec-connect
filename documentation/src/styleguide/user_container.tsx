import { AssetId, WebSdk, EthAddress, EthereumSdkUser, EthereumSdkUserAsset, SdkEvent, AccountId } from '@aztec/sdk';
import { useState, useEffect } from 'react';
import { App } from './app';

export interface PrivateAssetContainerChildrenProps {
  asset: EthereumSdkUserAsset;
  balance: bigint;
}

interface PrivateAssetContainerProps {
  sdk: WebSdk;
  user: EthereumSdkUser;
  assetId: AssetId;
  children: (props: PrivateAssetContainerChildrenProps) => JSX.Element;
}

export const PrivateAssetContainer = ({ sdk, user, assetId, children }: PrivateAssetContainerProps) => {
  const [asset, setAsset] = useState(user.getAsset(assetId));
  const [balance, setBalance] = useState(asset.balance());

  useEffect(() => {
    setAsset(user.getAsset(assetId));
  }, [assetId]);

  useEffect(() => {
    const handleUserStateChanged = (accountId: AccountId) => {
      if (!accountId || !accountId.equals(user.getUserData().id)) return;

      setBalance(asset.balance());
    };

    handleUserStateChanged(user.getUserData()?.id);

    sdk.on(SdkEvent.UPDATED_USER_STATE, handleUserStateChanged);

    return () => {
      sdk.off(SdkEvent.UPDATED_USER_STATE, handleUserStateChanged);
    };
  }, [sdk, user, asset]);

  return children({ asset, balance });
};

export interface PublicAssetContainerChildrenProps {
  asset: EthereumSdkUserAsset;
  balance: bigint;
  allowance: bigint;
}

interface PublicAssetContainerProps {
  sdk: WebSdk;
  user: EthereumSdkUser;
  assetId: AssetId;
  children: (props: PublicAssetContainerChildrenProps) => JSX.Element;
}

export const PublicAssetContainer = ({ sdk, user, assetId, children }: PublicAssetContainerProps) => {
  const [asset, setAsset] = useState(user.getAsset(assetId));
  const [balance, setBalance] = useState(BigInt(0));
  const [allowance, setAllowance] = useState(BigInt(0));

  useEffect(() => {
    setAsset(user.getAsset(assetId));
  }, [assetId]);

  useEffect(() => {
    const handleUserStateChanged = async (accountId: AccountId) => {
      if (!accountId || !accountId.equals(user.getUserData().id)) return;

      const balance = await asset.publicBalance();
      setBalance(balance);
      const allowance = await asset.publicAllowance();
      setAllowance(allowance);
    };

    handleUserStateChanged(user.getUserData()?.id);

    // TODO - should subscribe to contract event
    sdk.on(SdkEvent.UPDATED_USER_STATE, handleUserStateChanged);

    return () => {
      sdk.off(SdkEvent.UPDATED_USER_STATE, handleUserStateChanged);
    };
  }, [sdk, user, asset]);

  return children({
    asset,
    balance,
    allowance,
  });
};

export interface UserContainerChildrenProps {
  user?: EthereumSdkUser;
}

interface UserContainerProps {
  app: App;
  account: EthAddress;
  children: (props: UserContainerChildrenProps) => JSX.Element;
}

export const UserContainer = ({ app, account, children }: UserContainerProps) => {
  return children({ user: account ? app.getWebSdk().getUser() : undefined });
};

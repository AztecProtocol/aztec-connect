import React, { useState } from 'react';
import styled from 'styled-components/macro';
import {
  AccountAction,
  AccountState,
  AppAssetId,
  Asset,
  assets,
  AssetState,
  Form,
  LoginState,
  LoginStep,
  MergeStatus,
  ProviderState,
  SendStatus,
  ShieldStatus,
  WalletId,
  WorldState,
} from '../../app';
import { Modal, PaddedBlock, Tab, Text } from '../../components';
import { breakpoints, spacings, Theme } from '../../styles';
import { AccountAsset } from './asset';
import { UnsupportedAsset } from './unsupported_asset';

const getPopupInfo = (action: AccountAction, formValues: Form) => {
  switch (action) {
    case AccountAction.SHIELD: {
      const generatingKey = formValues.status.value === ShieldStatus.GENERATE_KEY;
      return {
        theme: generatingKey ? Theme.GRADIENT : Theme.WHITE,
        generatingKey,
        title: 'Shield',
      };
    }
    case AccountAction.SEND: {
      const generatingKey = formValues.status.value === SendStatus.GENERATE_KEY;
      return {
        theme: generatingKey ? Theme.GRADIENT : Theme.WHITE,
        generatingKey,
        overridesModalLayout: !generatingKey,
      };
    }
    case AccountAction.MERGE: {
      const generatingKey = formValues.status.value === MergeStatus.GENERATE_KEY;
      return {
        theme: generatingKey ? Theme.GRADIENT : Theme.WHITE,
        generatingKey,
        title: formValues.status.value === MergeStatus.NADA ? 'About your balance' : 'Merge',
      };
    }
    case AccountAction.MIGRATE_OLD_BALANCE:
      return {
        theme: Theme.GRADIENT,
        generatingKey: false,
        title: 'Migrate balance',
      };
    case AccountAction.MIGRATE_FORGOTTON_BALANCE:
      return {
        theme: Theme.GRADIENT,
        generatingKey: false,
        title: 'Migrate forgotton balance',
      };
  }
};

const AccountRoot = styled.div`
  padding-bottom: ${spacings.xxl};

  @media (max-width: ${breakpoints.s}) {
    padding-bottom: ${spacings.xl};
  }
`;

const AssetsRoot = styled.div`
  display: flex;
  margin: 0 -${spacings.m};
  padding: 0 ${spacings.xs} ${spacings.l};
  overflow: auto;

  @media (max-width: ${breakpoints.s}) {
    padding: 0 ${spacings.s} ${spacings.s};
    margin-bottom: ${spacings.s};
  }
`;

const AssetCol = styled.div`
  padding: 0 ${spacings.s};

  @media (max-width: ${breakpoints.s}) {
    padding: 0 ${spacings.xs};
  }
`;

interface AccountProps {
  worldState: WorldState;
  accountState: AccountState;
  asset: Asset;
  assetEnabled: boolean;
  assetState: AssetState;
  loginState: LoginState;
  providerState?: ProviderState;
  explorerUrl: string;
  activeAction?: {
    action: AccountAction;
    formValues: Form;
  };
  processingAction: boolean;
  mergeForm?: {
    mergeOption: bigint[];
    fee: bigint;
  };
  txsPublishTime?: Date;
  onFormInputsChange(action: AccountAction, inputs: Form): void;
  onValidate(action: AccountAction): void;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
  onGoBack(action: AccountAction): void;
  onSubmit(action: AccountAction): void;
  onChangeAsset(assetId: AppAssetId): void;
  onSelectAction(action: AccountAction): void;
  onClearAction(): void;
}

export const Account: React.FunctionComponent<AccountProps> = ({
  worldState,
  accountState,
  asset,
  assetEnabled,
  assetState,
  loginState,
  providerState,
  explorerUrl,
  activeAction,
  processingAction,
  mergeForm,
  txsPublishTime,
  onFormInputsChange,
  onValidate,
  onChangeWallet,
  onDisconnectWallet,
  onGoBack,
  onSubmit,
  onChangeAsset,
  onSelectAction,
  onClearAction,
}) => {
  const [explainUnsettled, setExplainUnsettled] = useState(false);

  const isInitializing = loginState.step !== LoginStep.DONE;

  const handleValidateMergeForm = (toMerge: bigint[]) => {
    onFormInputsChange(AccountAction.MERGE, { toMerge: { value: toMerge } });
    onValidate(AccountAction.MERGE);
  };

  const handleSubmitMergeForm = (toMerge: bigint[]) => {
    onSelectAction(AccountAction.MERGE);
    handleValidateMergeForm(toMerge);
  };

  return (
    <AccountRoot>
      <AssetsRoot>
        {assets.map(a => (
          <AssetCol key={a.id}>
            <Tab text={a.symbol} icon={a.iconWhite} onClick={() => onChangeAsset(a.id)} inactive={a.id !== asset.id} />
          </AssetCol>
        ))}
      </AssetsRoot>
      {assetEnabled ? (
        <AccountAsset
          worldState={worldState}
          accountState={accountState}
          asset={asset}
          assetState={assetState}
          mergeForm={mergeForm}
          txsPublishTime={txsPublishTime}
          onSubmitMergeForm={handleSubmitMergeForm}
          onSelectAction={onSelectAction}
          onExplainUnsettled={() => setExplainUnsettled(true)}
          isInitializing={isInitializing}
        />
      ) : (
        <PaddedBlock>
          <UnsupportedAsset asset={asset} />
        </PaddedBlock>
      )}
      {explainUnsettled && (
        <Modal title="About your balance" onClose={() => setExplainUnsettled(false)}>
          <PaddedBlock>
            <Text size="m">
              <PaddedBlock>
                <Text weight="bold" inline>
                  zk.money
                </Text>{' '}
                uses Aztec for cheap private transactions.
              </PaddedBlock>
              <PaddedBlock>
                Aztec represents your balance in an asset with UTXO notes. You can think of these as coins and notes in
                your wallet.
              </PaddedBlock>
              <PaddedBlock>
                Each note is owned by your username, you can't spend any of your shielded balance until your username
                has been registered successfully. On busy times, this can take several hours.
              </PaddedBlock>
            </Text>
          </PaddedBlock>
        </Modal>
      )}
    </AccountRoot>
  );
};

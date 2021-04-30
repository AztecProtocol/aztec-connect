import { AssetId } from '@aztec/sdk';
import React, { useState } from 'react';
import styled from 'styled-components';
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
  Wallet,
  WorldState,
} from '../../app';
import { Modal, PaddedBlock, Tab, Text } from '../../components';
import { breakpoints, spacings, Theme } from '../../styles';
import { FreeDaiTxs } from '../promotion/free_dai_txs';
import { AccountAsset } from './asset';
import { Merge } from './merge';
import { Send } from './send';
import { Shield } from './shield';
import { UnsupportedAsset } from './unsupported_asset';

const popupInfos = {
  [AccountAction.SHIELD]: {
    title: 'Shield',
  },
  [AccountAction.SEND]: {
    title: 'Send',
  },
  [AccountAction.MERGE]: {
    title: 'Merge',
  },
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
  theme?: Theme;
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
  onChangeWallet(wallet: Wallet): void;
  onGoBack(action: AccountAction): void;
  onSubmit(action: AccountAction): void;
  onChangeAsset(assetId: AppAssetId): void;
  onSelectAction(action: AccountAction): void;
  onClearAction(): void;
  isDaiTxFree: boolean;
}

export const Account: React.FunctionComponent<AccountProps> = ({
  theme = Theme.WHITE,
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
  onGoBack,
  onSubmit,
  onChangeAsset,
  onSelectAction,
  onClearAction,
  isDaiTxFree,
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
      {isDaiTxFree && !isInitializing && !activeAction && (
        <FreeDaiTxs activeAsset={asset.id} onSubmit={() => onChangeAsset(AssetId.DAI)} />
      )}
      {activeAction && (
        <Modal
          title={
            activeAction.action === AccountAction.MERGE && activeAction.formValues!.status.value === MergeStatus.NADA
              ? 'About your balance'
              : popupInfos[activeAction.action].title
          }
          onClose={!processingAction ? onClearAction : undefined}
        >
          {(() => {
            switch (activeAction.action) {
              case AccountAction.SHIELD:
                return (
                  <Shield
                    theme={theme}
                    assetState={assetState}
                    providerState={providerState}
                    form={activeAction.formValues as any}
                    explorerUrl={explorerUrl}
                    onChangeInputs={(inputs: Form) => onFormInputsChange(AccountAction.SHIELD, inputs)}
                    onValidate={() => onValidate(AccountAction.SHIELD)}
                    onChangeWallet={onChangeWallet}
                    onGoBack={() => onGoBack(AccountAction.SHIELD)}
                    onSubmit={() => onSubmit(AccountAction.SHIELD)}
                    onClose={onClearAction}
                  />
                );
              case AccountAction.SEND:
                return (
                  <Send
                    theme={theme}
                    assetState={assetState}
                    form={activeAction.formValues as any}
                    explorerUrl={explorerUrl}
                    onChangeInputs={(inputs: Form) => onFormInputsChange(AccountAction.SEND, inputs)}
                    onValidate={() => onValidate(AccountAction.SEND)}
                    onGoBack={() => onGoBack(AccountAction.SEND)}
                    onSubmit={() => onSubmit(AccountAction.SEND)}
                    onClose={onClearAction}
                  />
                );
              case AccountAction.MERGE:
                return (
                  <Merge
                    theme={theme}
                    assetState={assetState}
                    form={activeAction.formValues as any}
                    onValidate={handleValidateMergeForm}
                    onGoBack={() => onGoBack(AccountAction.MERGE)}
                    onSubmit={() => onSubmit(AccountAction.MERGE)}
                    onClose={onClearAction}
                  />
                );
              default:
                return null;
            }
          })()}
        </Modal>
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

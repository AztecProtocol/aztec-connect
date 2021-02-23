import { AssetId } from '@aztec/sdk';
import React from 'react';
import styled from 'styled-components';
import {
  AccountAction,
  AccountState,
  Asset,
  assets,
  Form,
  LoginState,
  MergeForm,
  MergeStatus,
  ProviderState,
  SendForm,
  ShieldForm,
  Wallet,
} from '../../app';
import { Modal, PaddedBlock, Tab } from '../../components';
import { breakpoints, spacings, Theme } from '../../styles';
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
  accountState: AccountState;
  asset: Asset;
  loginState: LoginState;
  providerState?: ProviderState;
  explorerUrl: string;
  shieldForm: ShieldForm;
  sendForm: SendForm;
  mergeForm: MergeForm;
  action?: AccountAction;
  processingAction: boolean;
  onFormInputsChange(action: AccountAction, inputs: Form): void;
  onValidate(action: AccountAction): void;
  onChangeWallet(wallet: Wallet): void;
  onGoBack(action: AccountAction): void;
  onSubmit(action: AccountAction): void;
  onChangeAsset(assetId: AssetId): void;
  onSelectAction(action: AccountAction): void;
  onClearAction(): void;
}

export const Account: React.FunctionComponent<AccountProps> = ({
  theme = Theme.WHITE,
  asset,
  accountState,
  loginState,
  providerState,
  explorerUrl,
  shieldForm,
  sendForm,
  mergeForm,
  action,
  processingAction,
  onFormInputsChange,
  onValidate,
  onChangeWallet,
  onGoBack,
  onSubmit,
  onChangeAsset,
  onSelectAction,
  onClearAction,
}) => {
  const enableMerge = mergeForm.mergeOptions.value.length > 0;

  const handleValidateMergeForm = (toMerge: bigint[]) => {
    onFormInputsChange(AccountAction.MERGE, { toMerge: { value: toMerge } });
    onValidate(AccountAction.MERGE);
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
      {asset.enabled ? (
        <AccountAsset
          asset={asset}
          accountState={accountState}
          mergeForm={enableMerge ? mergeForm : undefined}
          onSubmitMergeForm={handleValidateMergeForm}
          onSelectAction={onSelectAction}
        />
      ) : (
        <PaddedBlock>
          <UnsupportedAsset asset={asset} />
        </PaddedBlock>
      )}
      {action !== undefined && (
        <Modal
          title={
            action === AccountAction.MERGE && mergeForm.status.value === MergeStatus.NADA
              ? 'About your balance'
              : popupInfos[action].title
          }
          onClose={!processingAction ? onClearAction : undefined}
        >
          {(() => {
            switch (action) {
              case AccountAction.SHIELD:
                return (
                  <Shield
                    theme={theme}
                    wallet={loginState.wallet!}
                    providerState={providerState}
                    explorerUrl={explorerUrl}
                    form={shieldForm}
                    onChangeInputs={(inputs: ShieldForm) => onFormInputsChange(AccountAction.SHIELD, inputs)}
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
                    explorerUrl={explorerUrl}
                    form={sendForm}
                    onChangeInputs={(inputs: SendForm) => onFormInputsChange(AccountAction.SEND, inputs)}
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
                    form={mergeForm}
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
    </AccountRoot>
  );
};

import React from 'react';
import styled from 'styled-components/macro';
import { MessageType, MigrateFormValues, MigrateStatus, ProviderState, WalletId } from '../../../app';
import { PaddedBlock, Spinner, SpinnerTheme, Text } from '../../../components';
import { spacings } from '../../../styles';
import { AssetBalancesForm } from './asset_balances_form';
import { ConnectAccountForm } from './connect_account_form';
import { MigratingProgress } from './migrating_progress';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: ${spacings.l} 0;
`;

const DescriptionRoot = styled(PaddedBlock)`
  max-width: 600px;
  text-align: center;
`;

const Description = styled(Text)`
  display: flex;
  justify-content: center;
  padding: ${spacings.xs} 0;
`;

const SpinnerRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

interface MigrateProps {
  providerState?: ProviderState;
  form: MigrateFormValues;
  onChangeWallet(walletId: WalletId): void;
  onDisconnectWallet(): void;
  onSubmit(): void;
  onClose(): void;
}

export const Migrate: React.FunctionComponent<MigrateProps> = ({
  providerState,
  form,
  onChangeWallet,
  onDisconnectWallet,
  onSubmit,
  onClose,
}) => (
  <Root>
    {(() => {
      switch (form.status.value) {
        case MigrateStatus.CONNECT:
          return (
            <>
              <DescriptionRoot>
                <Description
                  size="s"
                  text="Please connect the wallet you used to register and sign a message to check the balances from your old account."
                />
              </DescriptionRoot>
              <ConnectAccountForm
                providerState={providerState}
                onChangeWallet={onChangeWallet}
                onDisconnectWallet={onDisconnectWallet}
                message={form.submit.message}
                messageType={form.submit.messageType}
              />
            </>
          );
        case MigrateStatus.SYNC:
          return (
            <>
              <DescriptionRoot>
                <Description size="s" text="Checking balances in the old account..." />
                <Description size="s" text="This may take several minutes. Please don’t close the window." />
              </DescriptionRoot>
              <SpinnerRoot size="m">
                <Spinner theme={SpinnerTheme.WHITE} size="s" />
              </SpinnerRoot>
            </>
          );
        case MigrateStatus.CONFIRM:
        case MigrateStatus.VALIDATE: {
          const migratingAssets = form.migratingAssets.value;
          const migratable = migratingAssets.some(a => a.migratableValues.length > 0);
          const totalFee = migratingAssets.reduce((sum, a) => sum + a.totalFee, 0n);
          return (
            <>
              <DescriptionRoot>
                <Description
                  size="s"
                  text={
                    !migratable
                      ? 'This account is empty.'
                      : [
                          'There are some balances left in your old account. Migrate them to this account to spend them.',
                          totalFee ? ' The fees will be taken from the old balances.' : '',
                        ].join('')
                  }
                />
              </DescriptionRoot>
              <AssetBalancesForm
                migratingAssets={migratingAssets}
                migratable={migratable}
                submitting={form.status.value === MigrateStatus.VALIDATE}
                onSubmit={onSubmit}
                onClose={onClose}
              />
            </>
          );
        }
        default: {
          const migratingAssets = form.migratingAssets.value;
          const activeAsset = migratingAssets.find(
            a => a.migratableValues.length > 0 && a.migratedValues.length * 2 < a.migratableValues.length,
          );
          const failed = form.submit.messageType === MessageType.ERROR;
          return (
            <>
              {!!activeAsset && !failed && (
                <DescriptionRoot>
                  <Description size="s" text="Migrating balances from your old account..." />
                  <Description size="s" text="This may take several minutes. Please don’t close the window." />
                </DescriptionRoot>
              )}
              <MigratingProgress
                migratingAssets={migratingAssets}
                activeAsset={activeAsset}
                failed={failed}
                onClose={onClose}
              />
            </>
          );
        }
      }
    })()}
  </Root>
);

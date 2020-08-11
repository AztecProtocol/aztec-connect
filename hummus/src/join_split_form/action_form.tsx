import { SdkEvent } from 'aztec2-sdk';
import React, { useState, useEffect } from 'react';
import { Block, Text } from '@aztec/guacamole-ui';
import { App, AppEvent, ProofState } from '../app';
import { Button, FormSection, FormField } from '../components';
import { EthProviderEvent, EthProviderAccessState } from '../eth_provider';
import { UserSelect } from './user_select';
import { RecipientValueForm } from './recipient_value_form';
import { ClearDataButton } from './clear_data_button';
import { Action, ActionSelect } from './action_select';

interface ActionFormProps {
  app: App;
}

export const ActionForm = ({ app }: ActionFormProps) => {
  const [ethProviderAccessState, setEthProviderAccessState] = useState(app.ethProvider.getAccessState());
  const [user, setUser] = useState(app.getUser());
  const [users, setUsers] = useState(app.getUsers());
  const [balance, setBalance] = useState(app.getBalance());
  const [tokenBalance, setTokenBalance] = useState(BigInt(0));
  const [allowance, setAllowance] = useState(BigInt(-1));
  const [currentProof, setCurrentProof] = useState(app.getProofState());
  const [network, setNetwork] = useState(app.ethProvider.getNetwork());
  const [account, setAccount] = useState<string>(app.ethProvider.getAccount() || '');
  const [action, setAction] = useState(Action.DEPOSIT);
  const [isApproving, setApproving] = useState(false);

  const isCorrectNetwork = app.isCorrectNetwork();

  useEffect(() => {
    app.on(SdkEvent.UPDATED_USERS, setUsers);
    app.on(SdkEvent.UPDATED_ACCOUNT, setUser);
    app.on(AppEvent.UPDATED_PROOF_STATE, setCurrentProof);
    app.on(AppEvent.UPDATED_TOKEN_BALANCE, setTokenBalance);
    app.on(AppEvent.UPDATED_NETWORK_AND_CONTRACTS, setNetwork);
    app.ethProvider.on(EthProviderEvent.UPDATED_ACCESS_STATE, setEthProviderAccessState);
    app.ethProvider.on(EthProviderEvent.UPDATED_ACCOUNT, setAccount);

    return () => {
      app.off(SdkEvent.UPDATED_USERS, setUsers);
      app.off(SdkEvent.UPDATED_ACCOUNT, setUser);
      app.off(AppEvent.UPDATED_PROOF_STATE, setCurrentProof);
      app.off(AppEvent.UPDATED_TOKEN_BALANCE, setTokenBalance);
      app.off(AppEvent.UPDATED_NETWORK_AND_CONTRACTS, setNetwork);
      app.ethProvider.off(EthProviderEvent.UPDATED_ACCESS_STATE, setEthProviderAccessState);
      app.ethProvider.off(EthProviderEvent.UPDATED_ACCOUNT, setAccount);
    };
  }, [app]);

  useEffect(() => {
    const isContractQueryable = isCorrectNetwork && ethProviderAccessState === EthProviderAccessState.APPROVED;
    const refreshTokenBalance = async () => {
      const tokenBalance = isContractQueryable ? await app.getTokenBalance(account) : BigInt(0);
      setTokenBalance(tokenBalance);
    };

    const refreshAllowance = async () => {
      const allowance = isContractQueryable ? await app.getRollupContractAllowance(account) : BigInt(0);
      setAllowance(allowance);
    };

    const onBalanceChange = async (balance: number) => {
      setBalance(balance);
      await Promise.all([refreshTokenBalance(), refreshAllowance()]);
    };

    const onApproveStateChange = async (approving: boolean) => {
      setApproving(approving);
      if (!approving) {
        await refreshAllowance();
      }
    };

    refreshTokenBalance();
    refreshAllowance();

    app.on(SdkEvent.UPDATED_BALANCE, onBalanceChange);
    app.on(AppEvent.APPROVED, onApproveStateChange);

    return () => {
      app.off(SdkEvent.UPDATED_BALANCE, onBalanceChange);
      app.off(AppEvent.APPROVED, onApproveStateChange);
    };
  }, [app, ethProviderAccessState, network]);

  const isRunning = currentProof.state === ProofState.RUNNING;
  const providerStatus = app.getProviderStatus();

  return (
    <FormSection>
      {ethProviderAccessState !== EthProviderAccessState.APPROVED && (
        <Block padding="m 0" align="center">
          <Block bottom="l">
            <Text
              text={
                ethProviderAccessState === EthProviderAccessState.APPROVING
                  ? 'Check MetaMask for access.'
                  : 'MetaMask is not connected.'
              }
            />
          </Block>
          <Button
            text="Connect"
            onSubmit={async () => app.requestEthProviderAccess()}
            isLoading={ethProviderAccessState === EthProviderAccessState.APPROVING}
          />
        </Block>
      )}
      {ethProviderAccessState === EthProviderAccessState.APPROVED && (
        <>
          {!isCorrectNetwork && (
            <Block padding="m 0" align="center">
              <Text text={`Please switch your wallet's network to ${providerStatus.networkOrHost}.`} />
            </Block>
          )}
          {isCorrectNetwork && (
            <>
              <Block padding="xs 0">
                <FormField label="Public Account">{account}</FormField>
                <FormField label="Public Balance">{`${app.toTokenValueString(tokenBalance)}`}</FormField>
                <UserSelect
                  users={users}
                  user={user!}
                  onSelect={async (id: string) => {
                    if (id === 'new') {
                      const user = await app.createUser();
                      await app.switchToUser(user.id);
                    } else {
                      await app.switchToUser(+id);
                    }
                  }}
                />
                <FormField label="Private Balance">{`${app.toTokenValueString(BigInt(balance))}`}</FormField>
                <ActionSelect action={action} onSelect={setAction} />
                {action === Action.DEPOSIT && (
                  <RecipientValueForm
                    valueLabel="Deposit Value"
                    buttonText="Deposit"
                    initialValue="100"
                    allowance={allowance}
                    onApprove={async (value: bigint) => app.approve(value)}
                    onSubmit={async (value: bigint) => app.deposit(value, account)}
                    toNoteValue={app.toNoteValue}
                    isApproving={isApproving}
                    isLoading={isRunning && currentProof.action === 'DEPOSIT'}
                    error={(currentProof.action === 'DEPOSIT' && currentProof.error) || ''}
                  />
                )}
                {action === Action.WITHDRAW && (
                  <RecipientValueForm
                    valueLabel="Withdraw Value"
                    buttonText="Withdraw"
                    onSubmit={async (value: bigint) => app.withdraw(value, account)}
                    toNoteValue={app.toNoteValue}
                    isLoading={isRunning && currentProof.action === 'WITHDRAW'}
                    error={(currentProof.action === 'WITHDRAW' && currentProof.error) || ''}
                  />
                )}
                {action === Action.TRANSFER && (
                  <RecipientValueForm
                    valueLabel="Transfer Value"
                    recipientLabel="To"
                    buttonText="Transfer"
                    initialRecipient={user.publicKey.toString('hex')}
                    onSubmit={async (value: bigint, recipient: string) => app.transfer(value, recipient)}
                    toNoteValue={app.toNoteValue}
                    isLoading={isRunning && currentProof.action === 'TRANSFER'}
                    error={(currentProof.action === 'TRANSFER' && currentProof.error) || ''}
                  />
                )}
                {action === Action.MINT && (
                  <RecipientValueForm
                    valueLabel="Mint Value"
                    buttonText="Mint"
                    initialValue="100"
                    onSubmit={async (value: bigint) => app.mintToken(account, value)}
                    toNoteValue={app.toNoteValue}
                    isLoading={isRunning && currentProof.action === 'MINT'}
                    error={(currentProof.action === 'MINT' && currentProof.error) || ''}
                  />
                )}
                {action === Action.PUBLIC_TRANSFER && (
                  <RecipientValueForm
                    valueLabel="Transfer Value"
                    recipientLabel="To"
                    buttonText="Public Send"
                    allowance={allowance}
                    onApprove={async (value: bigint) => app.approve(value)}
                    onSubmit={async (value: bigint, recipient: string) => app.publicTransfer(value, account, recipient)}
                    toNoteValue={app.toNoteValue}
                    isApproving={isApproving}
                    isLoading={isRunning && currentProof.action === 'PUBLIC_TRANSFER'}
                    error={(currentProof.action === 'PUBLIC_TRANSFER' && currentProof.error) || ''}
                  />
                )}
              </Block>
              <Block top="xl">
                <ClearDataButton onClearData={async () => app.clearData()} disabled={false} />
              </Block>
            </>
          )}
        </>
      )}
    </FormSection>
  );
};

import React, { useState, useEffect } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { App, AppEvent, ProofState } from '../app';
import { Form, FormSection, FormField } from '../components';
import { Init } from './init';
import { UserSelect } from './user_select';
import { RecipientValueForm } from './recipient_value_form';
import { ClearDataButton } from './clear_data_button';
import createDebug from 'debug';
import { SdkEvent, SdkInitState, User } from 'aztec2-sdk';
import { Action, ActionSelect } from './action_select';

const debug = createDebug('bb:join_split_form');

interface JoinSplitFormProps {
  app: App;
}

export const JoinSplitForm = ({ app }: JoinSplitFormProps) => {
  const [initState, setInitState] = useState(app.getInitState());
  const [users, setUsers] = useState(app.isInitialized() ? app.getUsers() : ([] as User[]));
  const [user, setUser] = useState<User | null>(app.isInitialized() ? app.getUser() : null);
  const [balance, setBalance] = useState(app.isInitialized() ? app.getBalance() : 0);
  const [tokenBalance, setTokenBalance] = useState(0n);
  const [allowance, setAllowance] = useState(0n);
  const [currentProof, setCurrentProof] = useState(app.getProofState());
  const [serverUrl, setServerUrl] = useState(window.location.protocol + '//' + window.location.hostname);
  const [accounts, setAccounts] = useState<string[]>(app.isInitialized() ? app.getEthAccounts() : []);
  const [account, setAccount] = useState((app.isInitialized() && app.getEthAccounts()[0]) || '');
  const [action, setAction] = useState(Action.DEPOSIT);
  const [isApproving, setApproving] = useState(false);

  useEffect(() => {
    const refreshEthAccounts = (accounts: string[]) => {
      setAccounts(accounts);
      setAccount(accounts[0] || '');
    };

    const onInitStateChange = (state: SdkInitState) => {
      setInitState(state);
      if (state === SdkInitState.INITIALIZED && !user) {
        setUsers(app.getUsers());
        setUser(app.getUser());
      }
    };

    const onUserChange = async (user: User) => {
      setUser(user);
    };

    app.on(SdkEvent.UPDATED_INIT_STATE, onInitStateChange);
    app.on(SdkEvent.UPDATED_USERS, setUsers);
    app.on(SdkEvent.UPDATED_ACCOUNT, onUserChange);
    app.on(AppEvent.UPDATED_PROOF_STATE, setCurrentProof);
    app.on(AppEvent.UPDATED_ETH_ACCOUNTS, refreshEthAccounts);
    app.on(AppEvent.UPDATED_TOKEN_BALANCE, setTokenBalance);

    return () => {
      app.off(SdkEvent.UPDATED_INIT_STATE, onInitStateChange);
      app.off(SdkEvent.UPDATED_USERS, setUsers);
      app.off(SdkEvent.UPDATED_ACCOUNT, onUserChange);
      app.off(AppEvent.UPDATED_PROOF_STATE, setCurrentProof);
      app.off(AppEvent.UPDATED_ETH_ACCOUNTS, refreshEthAccounts);
      app.off(AppEvent.UPDATED_TOKEN_BALANCE, setTokenBalance);
    };
  }, [app]);

  useEffect(() => {
    const refreshTokenBalance = async () => {
      const tokenBalance = account ? await app.getTokenBalance(account) : 0n;
      setTokenBalance(tokenBalance);
    };

    const refreshAllowance = async () => {
      const allowance = account ? await app.getRollupContractAllowance(account) : 0n;
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
  }, [app, account]);

  const selectUser = async (id: string) => {
    if (id === 'new') {
      const user = await app.createUser();
      await app.switchToUser(user.id);
    } else {
      await app.switchToUser(+id);
    }
  };

  const isRunning = currentProof.state === ProofState.RUNNING;

  return (
    <Form>
      <FormSection>
        <FormField label="Init State">{initState.toString()}</FormField>
        <FormField label="Proof State">{currentProof.state.toString()}</FormField>
        <FormField label="Proof Time">{currentProof.time ? `${currentProof.time.toString()}ms` : '-'}</FormField>
        {initState !== SdkInitState.INITIALIZED && (
          <Init
            initialServerUrl={serverUrl}
            onSubmit={async (serverUrl: string) => {
              setServerUrl(serverUrl);
              app.init(serverUrl);
            }}
            isLoading={initState === SdkInitState.INITIALIZING}
          />
        )}
        {initState === SdkInitState.INITIALIZED && !!user && (
          <UserSelect users={users} user={user!} onSelect={selectUser} />
        )}
      </FormSection>
      {initState === SdkInitState.INITIALIZED && !!user && !!account && (
        <FormSection>
          <Block padding="xs 0">
            <FormField label="Token Balance">{`${app.toTokenValueString(
              tokenBalance,
            )} (Allowance: ${app.toTokenValueString(allowance)})`}</FormField>
            <FormField label="Balance">{`${app.toTokenValueString(BigInt(balance))}`}</FormField>
            <ActionSelect action={action} onSelect={setAction} />
            {action === Action.DEPOSIT && (
              <RecipientValueForm
                valueLabel="Deposit Value"
                buttonText="Deposit"
                initialValue="100"
                account={account}
                accounts={accounts}
                allowance={allowance}
                onAccountSelect={setAccount}
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
                account={account}
                accounts={accounts}
                onAccountSelect={setAccount}
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
                account={account}
                accounts={accounts}
                onAccountSelect={setAccount}
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
                account={account}
                accounts={accounts}
                allowance={allowance}
                onAccountSelect={setAccount}
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
        </FormSection>
      )}
    </Form>
  );
};

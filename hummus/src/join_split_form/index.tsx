import React, { useState, useEffect } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { App, AppEvent, ProofState } from '../app';
import { Form, FormField } from '../components';
import { Init } from './init';
import { UserSelect } from './user_select';
import { Deposit } from './deposit';
import { Withdraw } from './withdraw';
import { Transfer } from './transfer';
import { ClearDataButton } from './clear_data_button';
import { ThemeContext } from '../config/context';
import createDebug from 'debug';
import { SdkEvent, SdkInitState, User } from 'aztec2-sdk';
import { Action, ActionSelect } from './action_select';

const debug = createDebug('bb:join_split_form');

interface JoinSplitFormProps {
  app: App;
  theme: ThemeContext;
}

export const JoinSplitForm = ({ app }: JoinSplitFormProps) => {
  const [initState, setInitState] = useState(app.getInitState());
  const [users, setUsers] = useState(app.isInitialized() ? app.getUsers() : ([] as User[]));
  const [user, setUser] = useState<User | null>(app.isInitialized() ? app.getUser() : null);
  const [balance, setBalance] = useState(app.isInitialized() ? app.getBalance() : 0);
  const [currentProof, setCurrentProof] = useState(app.getProofState());
  const [serverUrl, setServerUrl] = useState(window.location.protocol + '//' + window.location.hostname);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [depositAccount, setDepositAccount] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [action, setAction] = useState(Action.DEPOSIT);

  useEffect(() => {}, []);

  useEffect(() => {
    window.ethereum.autoRefreshOnNetworkChange = false;

    const refreshEthAccounts = (accounts: string[]) => {
      setAccounts(accounts);
      setDepositAccount(accounts[0]);
      setWithdrawAccount(accounts[0]);
    };

    const onInitStateChange = (state: SdkInitState) => {
      setInitState(state);
      if (state === SdkInitState.INITIALIZING) {
        window.ethereum.enable().then(refreshEthAccounts);
        window.ethereum.off('accountsChanged', refreshEthAccounts);
        window.ethereum.on('accountsChanged', refreshEthAccounts);
      }
      if (state === SdkInitState.INITIALIZED && !user) {
        setUsers(app.getUsers());
        setUser(app.getUser());
      }
    };
    app.on(SdkEvent.UPDATED_INIT_STATE, onInitStateChange);
    app.on(SdkEvent.UPDATED_USERS, setUsers);
    app.on(SdkEvent.UPDATED_ACCOUNT, setUser);
    app.on(SdkEvent.UPDATED_BALANCE, setBalance);
    app.on(AppEvent.UPDATED_PROOF_STATE, setCurrentProof);

    return () => {
      app.off(SdkEvent.UPDATED_INIT_STATE, onInitStateChange);
      app.off(SdkEvent.UPDATED_USERS, setUsers);
      app.off(SdkEvent.UPDATED_ACCOUNT, setUser);
      app.off(SdkEvent.UPDATED_BALANCE, setBalance);
      app.off(AppEvent.UPDATED_PROOF_STATE, setCurrentProof);
    };
  }, [app]);

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
        <Block padding="xs 0">
          <UserSelect users={users} user={user!} onSelect={selectUser} />
          <FormField label="Balance">{`${balance}`}</FormField>
          <ActionSelect action={action} onSelect={setAction} />
          {action === Action.DEPOSIT && (
            <Deposit
              initialValue={100}
              onSubmit={async (value: number) => app.deposit(value, depositAccount)}
              account={depositAccount}
              accounts={accounts}
              onAccountSelect={setDepositAccount}
              isLoading={isRunning && currentProof.action === 'DEPOSIT'}
              disabled={isRunning && currentProof.action !== 'DEPOSIT'}
            />
          )}
          {action === Action.WITHDRAW && (
            <Withdraw
              onSubmit={async (value: number) => app.withdraw(value, withdrawAccount)}
              account={withdrawAccount}
              accounts={accounts}
              onAccountSelect={setWithdrawAccount}
              isLoading={isRunning && currentProof.action === 'WITHDRAW'}
              disabled={isRunning && currentProof.action !== 'WITHDRAW'}
            />
          )}
          {action === Action.TRANSFER && (
            <Transfer
              initialRecipient={user.publicKey.toString('hex')}
              onSubmit={async (value: number, recipient: string) => app.transfer(value, recipient)}
              isLoading={isRunning && currentProof.action === 'TRANSFER'}
              disabled={isRunning && currentProof.action !== 'TRANSFER'}
            />
          )}
          <Block padding="m">
            <ClearDataButton onClearData={async () => app.clearData()} disabled={false} />
          </Block>
        </Block>
      )}
    </Form>
  );
};

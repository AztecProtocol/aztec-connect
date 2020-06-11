import React, { useState, useEffect } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { App, AppEvent, AppInitState, ProofState, ProofApi } from '../app';
import { Form, FormField } from '../components';
import { Init } from './init';
import { UserSelect } from './user_select';
import { Deposit } from './deposit';
import { Withdraw } from './withdraw';
import { Transfer } from './transfer';
import { ClearDataButton } from './clear_data_button';
import { ThemeContext } from '../config/context';
import { User } from '../user';
import createDebug from 'debug';

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
  const [currentProof, setCurrentProof] = useState(app.getCurrentProof());

  useEffect(() => {
    const onUserChange = () => {
      setUsers(app.getUsers());
      setUser(app.getUser());
    };
    const onInitStateChange = (state: AppInitState) => {
      setInitState(state);
      if (state === AppInitState.INITIALIZED && !user) {
        onUserChange();
      }
    };
    app.on(AppEvent.INIT, onInitStateChange);
    app.on(AppEvent.UPDATED_ACCOUNT, onUserChange);
    app.on(AppEvent.UPDATED_BALANCE, setBalance);
    app.on(AppEvent.PROOF, setCurrentProof);

    return () => {
      app.off(AppEvent.INIT, onInitStateChange);
      app.off(AppEvent.UPDATED_ACCOUNT, onUserChange);
      app.off(AppEvent.UPDATED_BALANCE, setBalance);
      app.off(AppEvent.PROOF, setCurrentProof);
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
      {initState !== AppInitState.INITIALIZED && (
        <Init
          initialServerUrl={window.location.protocol + '//' + window.location.hostname}
          onSubmit={async (serverUrl: string) => app.init(serverUrl)}
          isLoading={initState === AppInitState.INITIALIZING}
        />
      )}
      {initState === AppInitState.INITIALIZED && !!user && (
        <Block padding="xs 0">
          <UserSelect users={users} user={user!} onSelect={selectUser} />
          <FormField label="Balance">{`${balance}`}</FormField>
          <Deposit
            initialValue={100}
            onSubmit={async (value: number) => app.deposit(value)}
            isLoading={isRunning && currentProof.api === ProofApi.DEPOSIT}
            disabled={isRunning && currentProof.api !== ProofApi.DEPOSIT}
          />
          <Withdraw
            onSubmit={async (value: number) => app.withdraw(value)}
            isLoading={isRunning && currentProof.api === ProofApi.WITHDRAW}
            disabled={isRunning && currentProof.api !== ProofApi.WITHDRAW}
          />
          <Transfer
            initialRecipient={user.publicKey.toString('hex')}
            onSubmit={async (value: number, recipient: string) => app.transfer(value, recipient)}
            isLoading={isRunning && currentProof.api === ProofApi.TRANSFER}
            disabled={isRunning && currentProof.api !== ProofApi.TRANSFER}
          />
        </Block>
      )}
      <Block padding="m">
        <ClearDataButton
          onClearData={async () => app.clearNoteData()}
          disabled={initState === AppInitState.INITIALIZING}
        />
      </Block>
    </Form>
  );
};

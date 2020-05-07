import React, { useState, useEffect } from 'react';
import { Block } from '@aztec/guacamole-ui';
import { App } from '../app';
import { Form, FormField } from '../components';
import { Init } from './init';
import { UserSelect } from './user_select';
import { Deposit } from './deposit';
import { Withdraw } from './withdraw';
import { Transfer } from './transfer';
import { ThemeContext } from '../config/context';
import { User } from '../user';
import createDebug from 'debug';

const debug = createDebug('bb:join_split_form');

enum InitState {
  UNINITIALIZED = 'Uninitialized',
  INITIALIZING = 'Initializing',
  INITIALIZED = 'Initialized',
}

enum ProofState {
  NADA = 'Nada',
  RUNNING = 'Running',
  FAILED = 'Failed',
  VERIFIED = 'Verified',
  FINISHED = 'Finished',
}

enum ApiNames {
  NADA,
  DEPOSIT,
  WITHDRAW,
  TRANSFER,
}

interface JoinSplitFormProps {
  app: App;
  theme: ThemeContext;
}

export const JoinSplitForm = ({ app }: JoinSplitFormProps) => {
  const [initState, setInitState] = useState(InitState.UNINITIALIZED);
  const [proofState, setProofState] = useState(ProofState.NADA);
  const [currentApi, setCurrentApi] = useState(ApiNames.NADA);
  const [time, setTime] = useState(0);
  const [users, setUsers] = useState([] as User[]);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = () => setBalance(app.getBalance());
    app.on('updated', fetchBalance);
    const initialized = app.isInitialized();
    if (initialized && !user) {
      setUsers(app.getUsers());
      setUser(app.getUser());
      fetchBalance();
      setInitState(InitState.INITIALIZED);
    }

    return () => {
      app.off('updated', fetchBalance);
    };
  }, [app]);

  const initialize = async (serverUrl: string) => {
    setInitState(InitState.INITIALIZING);
    await app.init(serverUrl);
    setUsers(app.getUsers());
    setUser(app.getUser());
    setInitState(InitState.INITIALIZED);
  };

  const selectUser = async (id: string) => {
    if (id === 'new') {
      const user = await app.createUser();
      await app.switchToUser(user.id);
      setUsers(app.getUsers());
    } else {
      await app.switchToUser(+id);
    }
    setUser(app.getUser());
  };

  const deposit = async (value: number) => {
    setProofState(ProofState.RUNNING);
    setCurrentApi(ApiNames.DEPOSIT);
    try {
      const start = Date.now();
      await app.deposit(value);
      setTime(Date.now() - start);
      setProofState(ProofState.FINISHED);
    } catch (e) {
      debug(e);
      setProofState(ProofState.FAILED);
    }
  };

  const withdraw = async (value: number) => {
    setProofState(ProofState.RUNNING);
    setCurrentApi(ApiNames.WITHDRAW);
    try {
      const start = Date.now();
      await app.withdraw(value);
      setTime(Date.now() - start);
      setProofState(ProofState.FINISHED);
    } catch (e) {
      debug(e);
      setProofState(ProofState.FAILED);
    }
  };

  const transfer = async (value: number, recipient: string) => {
    setProofState(ProofState.RUNNING);
    setCurrentApi(ApiNames.TRANSFER);
    try {
      const start = Date.now();
      await app.transfer(value, Buffer.from(recipient, 'hex'));
      setTime(Date.now() - start);
      setProofState(ProofState.FINISHED);
    } catch (e) {
      debug(e);
      setProofState(ProofState.FAILED);
    }
  };

  return (
    <Form>
      <FormField label="Init State">{initState.toString()}</FormField>
      <FormField label="Proof State">{proofState.toString()}</FormField>
      <FormField label="Proof Time">{time.toString()}ms</FormField>
      {initState !== InitState.INITIALIZED && (
        <Init
          initialServerUrl="http://localhost"
          onSubmit={initialize}
          isLoading={initState === InitState.INITIALIZING}
        />
      )}
      {initState === InitState.INITIALIZED && (
        <Block padding="xs 0">
          <UserSelect users={users} user={user!} onSelect={selectUser} />
          <FormField label="Balance">{`${balance}`}</FormField>
          <Deposit
            initialValue={100}
            onSubmit={deposit}
            isLoading={proofState === ProofState.RUNNING && currentApi === ApiNames.DEPOSIT}
            disabled={proofState === ProofState.RUNNING && currentApi !== ApiNames.DEPOSIT}
          />
          <Withdraw
            onSubmit={withdraw}
            isLoading={proofState === ProofState.RUNNING && currentApi === ApiNames.WITHDRAW}
            disabled={proofState === ProofState.RUNNING && currentApi !== ApiNames.WITHDRAW}
          />
          <Transfer
            initialRecipient={user!.publicKey.toString('hex')}
            onSubmit={transfer}
            isLoading={proofState === ProofState.RUNNING && currentApi === ApiNames.TRANSFER}
            disabled={proofState === ProofState.RUNNING && currentApi !== ApiNames.TRANSFER}
          />
        </Block>
      )}
    </Form>
  );
};

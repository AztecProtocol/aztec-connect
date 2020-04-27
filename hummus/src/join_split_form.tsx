import React, { useState } from 'react';
import { Block, Button, TextInput } from '@aztec/guacamole-ui';
import { App } from './app';
import Input from './input';
import './styles/guacamole.css';
require('barretenberg-es/wasm/barretenberg.wasm');

interface JoinSplitFormProps {
  app: App;
}

enum State {
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

export default function JoinSplitForm({ app }: JoinSplitFormProps) {
  const [init, setInit] = useState(State.UNINITIALIZED);
  const [result, setResult] = useState(ProofState.NADA);
  const [time, setTime] = useState(0);
  // TODO: Should not be strings. UI component should output right types.
  const [depositValue, setDepositValue] = useState('100');
  const [withdrawValue, setWithdrawValue] = useState('0');
  const [transferValue, setTransferValue] = useState('0');
  const [transferTo, setTransferTo] = useState('');
  const [balance, setBalance] = useState(0);

  app.on('updated', () => {
    setBalance(app.getBalance());
  })

  return (
    <Block
      padding="l"
      align="left"
      borderRadius="m"
      hasBorder
    >
      <Block padding="m">Init State: {init.toString()}</Block>
      <Block padding="m">Proof State: {result.toString()}</Block>
      <Block padding="m">Proof Time: {time.toString()}ms</Block>
      <Block padding="m">Balance: {balance}</Block>
      {init !== State.INITIALIZED && (
        <Block padding="m">
          <label>Press the button: </label>
          <Button
            text="The Button"
            onSubmit={async () => {
              setInit(State.INITIALIZING);
              await app.init();
              setTransferTo(app.getUser().publicKey.toString('hex'));
              setInit(State.INITIALIZED);
            }}
            isLoading={init == State.INITIALIZING}
          />
        </Block>
      )}
      {init === State.INITIALIZED && (
        <Block padding="xs 0">
          <Input
            label="Deposit Value"
            value={depositValue}
            onChange={setDepositValue}
          />
          <Block padding="m">
            <Button
              text="Deposit"
              onSubmit={async () => {
                setResult(ProofState.RUNNING);
                try {
                  const start = Date.now();
                  await app.deposit(parseInt(depositValue, 10));
                  setTime(Date.now() - start);
                  setResult(ProofState.FINISHED);
                } catch (e) {
                  console.log(e);
                  setResult(ProofState.FAILED);
                }
              }}
              isLoading={result == ProofState.RUNNING}
            />
          </Block>
          <Input
            label="Withdraw Value"
            value={withdrawValue}
            onChange={setWithdrawValue}
          />
          <Block padding="m">
            <Button
              text="Withdraw"
              onSubmit={async () => {
                setResult(ProofState.RUNNING);
                try {
                  const start = Date.now();
                  await app.withdraw(parseInt(withdrawValue, 10));
                  setTime(Date.now() - start);
                  setResult(ProofState.FINISHED);
                } catch (e) {
                  console.log(e);
                  setResult(ProofState.FAILED);
                }
              }}
              isLoading={result == ProofState.RUNNING}
            />
          </Block>
          <Input
            label="Transfer Value"
            value={transferValue}
            onChange={setTransferValue}
          />
          <TextInput
            label="To"
            value={transferTo}
            onChange={setTransferTo}
          />
          <Block padding="m">
            <Button
              text="Transfer"
              onSubmit={async () => {
                setResult(ProofState.RUNNING);
                try {
                  const start = Date.now();
                  await app.transfer(parseInt(transferValue, 10), Buffer.from(transferTo, 'hex'));
                  setTime(Date.now() - start);
                  setResult(ProofState.FINISHED);
                } catch (e) {
                  console.log(e);
                  setResult(ProofState.FAILED);
                }
              }}
              isLoading={result == ProofState.RUNNING}
            />
          </Block>
        </Block>
      )}
    </Block>
  );
}

import React, { useState } from 'react';
import { Block, Button } from '@aztec/guacamole-ui';
import { App } from './app';
import { Balance, Input } from './components';
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

enum ApiNames {
  NADA,
  DEPOSIT,
  WITHDRAW,
  TRANSFER,
}

export default function JoinSplitForm({ app }: JoinSplitFormProps) {
  const [init, setInit] = useState(State.UNINITIALIZED);
  const [result, setResult] = useState(ProofState.NADA);
  const [time, setTime] = useState(0);
  // TODO: Should not be strings. UI component should output right types.
  const [currentApi, setCurrentApi] = useState(ApiNames.NADA);
  const [depositValue, setDepositValue] = useState('100');
  const [withdrawValue, setWithdrawValue] = useState('0');
  const [transferValue, setTransferValue] = useState('0');
  const [transferTo, setTransferTo] = useState('');

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
      <Block padding="m">Balance: <Balance app={app} /></Block>
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
            type="number"
            label="Deposit Value"
            value={depositValue}
            onChange={setDepositValue}
          />
          <Block padding="m">
            <Button
              text="Deposit"
              onSubmit={async () => {
                setCurrentApi(ApiNames.DEPOSIT);
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
              isLoading={result === ProofState.RUNNING && currentApi === ApiNames.DEPOSIT}
              disabled={result === ProofState.RUNNING && currentApi !== ApiNames.DEPOSIT}
            />
          </Block>
          <Input
            type="number"
            label="Withdraw Value"
            value={withdrawValue}
            onChange={setWithdrawValue}
          />
          <Block padding="m">
            <Button
              text="Withdraw"
              onSubmit={async () => {
                setCurrentApi(ApiNames.WITHDRAW);
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
              isLoading={result === ProofState.RUNNING && currentApi === ApiNames.WITHDRAW}
              disabled={result === ProofState.RUNNING && currentApi !== ApiNames.WITHDRAW}
            />
          </Block>
          <Input
            type="number"
            label="Transfer Value"
            value={transferValue}
            onChange={setTransferValue}
          />
          <Input
            label="To"
            value={transferTo}
            onChange={setTransferTo}
          />
          <Block padding="m">
            <Button
              text="Transfer"
              onSubmit={async () => {
                setCurrentApi(ApiNames.TRANSFER);
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
              isLoading={result === ProofState.RUNNING && currentApi === ApiNames.TRANSFER}
              disabled={result === ProofState.RUNNING && currentApi !== ApiNames.TRANSFER}
            />
          </Block>
        </Block>
      )}
    </Block>
  );
}

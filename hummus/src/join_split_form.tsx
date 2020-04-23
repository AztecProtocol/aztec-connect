import React, { useState } from 'react';
import { Block, Button } from '@aztec/guacamole-ui';
import JoinSplitProof from './join_split_proof';
import Input from './input';

import './styles/guacamole.css';
require('barretenberg-es/wasm/barretenberg.wasm');

interface JoinSplitFormProps {
  joinSplit: JoinSplitProof;
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
}

export default function JoinSplitForm({ joinSplit }: JoinSplitFormProps) {
  const [init, setInit] = useState(State.UNINITIALIZED);
  const [result, setResult] = useState(ProofState.NADA);
  const [time, setTime] = useState(0);
  const [inputValue, setInputValue] = useState('0');
  const [outputValue, setOutputValue] = useState('100');

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
      {init !== State.INITIALIZED && (
        <Block padding="m">
          <label>Press the button: </label>
          <Button
            text="The Button"
            onSubmit={async () => {
              setInit(State.INITIALIZING);
              await joinSplit.init();
              setInit(State.INITIALIZED);
            }}
            isLoading={init == State.INITIALIZING}
          />
        </Block>
      )}
      {init === State.INITIALIZED && (
        <Block padding="xs 0">
          <Block padding="m">Join Split Proof:</Block>
          <Input
            label="Input Value"
            value={inputValue}
            onChange={setInputValue}
          />
          <Input
            label="Output Value"
            value={outputValue}
            onChange={setOutputValue}
          />
          <Block padding="m">
            <Button
              text="Create Proof"
              onSubmit={async () => {
                setResult(ProofState.RUNNING);
                try {
                  const start = Date.now();
                  const r = await joinSplit.createProof({
                    inputValue: parseInt(inputValue, 10),
                    outputValue: parseInt(outputValue, 10),
                  });
                  setTime(Date.now() - start);
                  setResult(r ? ProofState.VERIFIED : ProofState.FAILED);
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

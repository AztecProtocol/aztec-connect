import React, { useState } from 'react';
import { FlexBox, Block, Button, SelectInput, Text, Icon } from '@aztec/guacamole-ui';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { App } from './app';
import { Balance, Input, FormField } from './components';
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
  const [userId, setUserId] = useState(0);
  const [currentApi, setCurrentApi] = useState(ApiNames.NADA);
  const [justCopied, setJustCopied] = useState(false);
  // TODO: Should not be strings. UI component should output right types.
  const [depositValue, setDepositValue] = useState('100');
  const [withdrawValue, setWithdrawValue] = useState('0');
  const [transferValue, setTransferValue] = useState('0');
  const [transferTo, setTransferTo] = useState('');

  return (
    <Block
      padding="l"
      align="left"
      borderRadius="m"
      style={{ width: '100%', maxWidth: '360px' }}
      hasBorder
    >
      <FormField label="Init State">{init.toString()}</FormField>
      <FormField label="Proof State">{result.toString()}</FormField>
      <FormField label="Proof Time">{time.toString()}ms</FormField>
      {init !== State.INITIALIZED && (
        <FormField label="Press the button">
          <Button
            text="The Button"
            onSubmit={async () => {
              setInit(State.INITIALIZING);
              await app.init();
              setTransferTo(app.getUser().publicKey.toString('hex'));
              setInit(State.INITIALIZED);
            }}
            isLoading={init === State.INITIALIZING}
          />
        </FormField>
      )}
      {init === State.INITIALIZED && (
        <Block padding="xs 0">
          <FormField label="User">
            <FlexBox valign="center">
              <SelectInput
                className="flex-free-expand"
                size="s"
                itemGroups={[{
                  items: app.getUsers().map(({ id, publicKey }) => ({
                    value: `${id}`,
                    title: publicKey.toString('hex').replace(/^(.{10})(.+)(.{4})$/, '$1...$3'),
                  })).concat([{
                    value: 'new',
                    // @ts-ignore
                    title: (
                      <Text
                        text="Create new user"
                        color="secondary"
                        size="xs"
                      />
                    ),
                  }]),
                }]}
                value={`${userId}`}
                onSelect={async (id: string) => {
                  if (id === 'new') {
                    const user = await app.switchToNewUser();
                    setUserId(user.id);
                    return;
                  }
                  await app.switchUser(+id);
                  setUserId(parseInt(id, 10));
                }}
                highlightSelected
              />
              <Block left="m">
                <CopyToClipboard
                  text={app.getUser().publicKey.toString('hex')}
                  onCopy={() => {
                    if (justCopied) return;
                    setJustCopied(true);
                    setTimeout(() => {
                      setJustCopied(false);
                    }, 1500);
                  }}
                >
                  <span
                    style={{ position: 'relative', cursor: 'pointer' }}
                    title="Click to copy"
                  >
                    <Icon
                      name="launch"
                      color={justCopied ? 'white' : 'secondary'}
                    />
                    {justCopied && (
                      <span style={{ position: 'absolute', left: '-4px' }}>
                        <Text text="Copied!" color="green" size="xxs" />
                      </span>
                    )}
                  </span>
                </CopyToClipboard>
              </Block>
            </FlexBox>
          </FormField>
          <FormField label="Balance"><Balance app={app} /></FormField>
          <Block padding="m">
            <Input
              type="number"
              label="Deposit Value"
              value={depositValue}
              onChange={setDepositValue}
            />
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
                  console.log(e); // tslint:disable-line no-console
                  setResult(ProofState.FAILED);
                }
              }}
              isLoading={result === ProofState.RUNNING && currentApi === ApiNames.DEPOSIT}
              disabled={result === ProofState.RUNNING && currentApi !== ApiNames.DEPOSIT}
            />
          </Block>
          <Block padding="m">
            <Input
              type="number"
              label="Withdraw Value"
              value={withdrawValue}
              onChange={setWithdrawValue}
            />
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
                  console.log(e); // tslint:disable-line no-console
                  setResult(ProofState.FAILED);
                }
              }}
              isLoading={result === ProofState.RUNNING && currentApi === ApiNames.WITHDRAW}
              disabled={result === ProofState.RUNNING && currentApi !== ApiNames.WITHDRAW}
            />
          </Block>
          <Block padding="m">
            <Block bottom="xs">
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
            </Block>
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
                  console.log(e); // tslint:disable-line no-console
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

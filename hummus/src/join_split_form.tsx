import React, { useState } from 'react';
import { FlexBox, Block, Text, Icon, SelectInput } from '@aztec/guacamole-ui';
import CopyToClipboard from 'react-copy-to-clipboard';
import { App } from './app';
import { Balance, Button, Form, FormField, Input } from './components';
import { IThemeContext } from './config/context';
import { User } from './user';
import createDebug from 'debug';
import './styles/guacamole.css';
require('barretenberg-es/wasm/barretenberg.wasm');

const debug = createDebug('bb:join_split_form');

interface JoinSplitFormProps {
  app: App;
  theme: IThemeContext;
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

export function JoinSplitForm({ app, theme }: JoinSplitFormProps) {
  const [init, setInit] = useState(app.initialized() ? State.INITIALIZED : State.UNINITIALIZED);
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
  const [serverUrl, setServerUrl] = useState('http://localhost');
  const [users, setUsers] = useState([] as User[]);

  return (
    <Form>
      <FormField label="Init State">{init.toString()}</FormField>
      <FormField label="Proof State">{result.toString()}</FormField>
      <FormField label="Proof Time">{time.toString()}ms</FormField>
      {init !== State.INITIALIZED && (
        <Block padding="xs 0">
          <FormField label="Server url">
            <Input
              value={serverUrl}
              onChange={setServerUrl}
            />
          </FormField>
          <FormField label="Press the button">
            <Button
              text="The Button"
              onSubmit={async () => {
                setInit(State.INITIALIZING);
                await app.init(serverUrl);
                setUsers(app.getUsers());
                setTransferTo(app.getUser().publicKey.toString('hex'));
                setInit(State.INITIALIZED);
              }}
              isLoading={init === State.INITIALIZING}
            />
          </FormField>
        </Block>
      )}
      {init === State.INITIALIZED && (
        <Block padding="xs 0">
          <FormField label="User">
            <FlexBox valign="center">
              <SelectInput
                className="flex-free-expand"
                theme={theme.theme === 'dark' ? 'dark' : 'default'}
                size="s"
                menuBorderColor="white-lighter"
                menuOffsetTop="xxs"
                itemGroups={[{
                  items: users.map(({ id, publicKey }) => ({
                    value: `${id}`,
                    title: publicKey.toString('hex').replace(/^(.{58})(.+)(.{4})$/, '$1...$3'),
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
                    const user = await app.createUser();
                    setUsers(app.getUsers());
                    setUserId(user.id);
                    await app.switchToUser(user.id);
                  } else {
                    setUserId(+id);
                    await app.switchToUser(+id);
                  }
                }}
                highlightSelected={theme.theme === 'light'}
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
                      color={justCopied ? 'transparent' : theme.link}
                    />
                    {justCopied && (
                      <span style={{ position: 'absolute', left: '-4px' }}>
                        <Text
                          text="Copied!"
                          color={theme.theme === 'dark' ? 'white' : 'green'}
                          size="xxs"
                        />
                      </span>
                    )}
                  </span>
                </CopyToClipboard>
              </Block>
            </FlexBox>
          </FormField>
          <FormField label="Balance"><Balance app={app} /></FormField>
          <Block padding="xs 0">
            <FormField label="Deposit Value">
              <Input
                type="number"
                value={depositValue}
                onChange={setDepositValue}
              />
            </FormField>
            <Block padding="xs m" align="right">
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
                    debug(e);
                    setResult(ProofState.FAILED);
                  }
                }}
                isLoading={result === ProofState.RUNNING && currentApi === ApiNames.DEPOSIT}
                disabled={result === ProofState.RUNNING && currentApi !== ApiNames.DEPOSIT}
              />
            </Block>
          </Block>
          <Block padding="xs 0">
            <FormField label="Withdraw Value">
              <Input
                type="number"
                value={withdrawValue}
                onChange={setWithdrawValue}
              />
            </FormField>
            <Block padding="xs m" align="right">
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
                    debug(e);
                    setResult(ProofState.FAILED);
                  }
                }}
                isLoading={result === ProofState.RUNNING && currentApi === ApiNames.WITHDRAW}
                disabled={result === ProofState.RUNNING && currentApi !== ApiNames.WITHDRAW}
              />
            </Block>
          </Block>
          <Block padding="xs 0">
            <FormField label="Transfer Value">
              <Input
                type="number"
                value={transferValue}
                onChange={setTransferValue}
              />
            </FormField>
            <FormField label="To">
              <Input
                value={transferTo}
                onChange={setTransferTo}
              />
            </FormField>
            <Block padding="xs m" align="right">
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
                    debug(e);
                    setResult(ProofState.FAILED);
                  }
                }}
                isLoading={result === ProofState.RUNNING && currentApi === ApiNames.TRANSFER}
                disabled={result === ProofState.RUNNING && currentApi !== ApiNames.TRANSFER}
              />
            </Block>
          </Block>
        </Block>
      )}
    </Form>
  );
}

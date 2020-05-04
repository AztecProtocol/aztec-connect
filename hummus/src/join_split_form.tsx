import React, { PureComponent } from 'react';
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
  theme: IThemeContext;
}

interface State {
  initState: InitState;
  resultState: ProofState;
  time: number;
  justCopied: boolean;
  currentApi: ApiNames;
  depositValue: string;
  withdrawValue: string;
  transferValue: string;
  transferTo: string;
  serverUrl: string;
  user: User | null;
  users: User[];
}

export class JoinSplitForm extends PureComponent<JoinSplitFormProps, State> {
  constructor(props: JoinSplitFormProps) {
    super(props);

    const { app } = props;
    const initialized = app.initialized();
    const users = initialized ? app.getUsers() : [];
    const user = initialized ? app.getUser() : null;

    this.state = {
      initState: initialized ? InitState.INITIALIZED : InitState.UNINITIALIZED,
      resultState: ProofState.NADA,
      time: 0,
      currentApi: ApiNames.NADA,
      justCopied: false,
      depositValue: '100',
      withdrawValue: '0',
      transferValue: '0',
      transferTo: user ? user.publicKey.toString('hex') : '',
      serverUrl: 'http://localhost',
      user,
      users,
    };
  }

  setServerUrl = (serverUrl: string) => {
    this.setState({ serverUrl });
  };

  setDepositValue = (depositValue: string) => {
    this.setState({ depositValue });
  };

  setWithdrawValue = (withdrawValue: string) => {
    this.setState({ withdrawValue });
  };

  setTransferValue = (transferValue: string) => {
    this.setState({ transferValue });
  };

  setTransferTo = (transferTo: string) => {
    this.setState({ transferTo });
  };

  initialize = () => {
    this.setState(
      { initState: InitState.INITIALIZING },
      async () => {
        const { app } = this.props;
        const { serverUrl } = this.state;
        await app.init(serverUrl);
        this.setState({
          initState: InitState.INITIALIZED,
          users: app.getUsers(),
          user: app.getUser(),
          transferTo: app.getUser().publicKey.toString('hex'),
        });
      },
    );
  };

  selectUser = async (id: string) => {
    const { app } = this.props;
    if (id === 'new') {
      const user = await app.createUser();
      await app.switchToUser(user.id);
      this.setState({
        users: app.getUsers(),
        user,
      });
    } else {
      await app.switchToUser(+id);
      const user = app.getUser();
      this.setState({
        user,
      });
    }
  };

  deposit = () => {
    this.setState(
      {
        resultState: ProofState.RUNNING,
        currentApi: ApiNames.DEPOSIT,
      },
      async () => {
        try {
          const { app } = this.props;
          const { depositValue } = this.state;
          const start = Date.now();
          await app.deposit(parseInt(depositValue, 10));
          this.setState({
            time: Date.now() - start,
            resultState: ProofState.FINISHED,
          });
        } catch (e) {
          debug(e);
          this.setState({ resultState: ProofState.FAILED });
        }
      },
    );
  };

  withdraw = () => {
    this.setState(
      {
        resultState: ProofState.RUNNING,
        currentApi: ApiNames.WITHDRAW,
      },
      async () => {
        try {
          const { app } = this.props;
          const { withdrawValue } = this.state;
          const start = Date.now();
          await app.withdraw(parseInt(withdrawValue, 10));
          this.setState({
            time: Date.now() - start,
            resultState: ProofState.FINISHED,
          });
        } catch (e) {
          debug(e);
          this.setState({ resultState: ProofState.FAILED });
        }
      },
    );
  };

  transfer = () => {
    this.setState(
      {
        resultState: ProofState.RUNNING,
        currentApi: ApiNames.TRANSFER,
      },
      async () => {
        try {
          const { app } = this.props;
          const { transferValue, transferTo } = this.state;
          const start = Date.now();
          await app.transfer(parseInt(transferValue, 10), Buffer.from(transferTo, 'hex'));
          this.setState({
            time: Date.now() - start,
            resultState: ProofState.FINISHED,
          });
        } catch (e) {
          debug(e);
          this.setState({ resultState: ProofState.FAILED });
        }
      },
    );
  };

  renderTheButton() {
    const { initState, serverUrl } = this.state;
    return (
      <Block padding="xs 0">
        <FormField label="Server url">
          <Input
            value={serverUrl}
            onChange={this.setServerUrl}
          />
        </FormField>
        <FormField label="Press the button">
          <Button
            text="The Button"
            onSubmit={this.initialize}
            isLoading={initState === InitState.INITIALIZING}
          />
        </FormField>
      </Block>
    );
  }

  renderUserSelect() {
    const { theme } = this.props;
    const { users, user, justCopied } = this.state;

    return (
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
            value={`${user!.id}`}
            onSelect={this.selectUser}
            highlightSelected={theme.theme === 'light'}
          />
          <Block left="m">
            <CopyToClipboard
              text={user!.publicKey.toString('hex')}
              onCopy={() => {
                if (justCopied) return;
                this.setState({ justCopied: true });
                setTimeout(() => {
                  this.setState({ justCopied: false });
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
    );
  }

  renderDepositForm() {
    const { depositValue, resultState, currentApi } = this.state;

    return (
      <Block padding="xs 0">
        <FormField label="Deposit Value">
          <Input
            type="number"
            value={depositValue}
            onChange={this.setDepositValue}
          />
        </FormField>
        <Block padding="xs m" align="right">
          <Button
            text="Deposit"
            onSubmit={this.deposit}
            isLoading={resultState === ProofState.RUNNING && currentApi === ApiNames.DEPOSIT}
            disabled={resultState === ProofState.RUNNING && currentApi !== ApiNames.DEPOSIT}
          />
        </Block>
      </Block>
    );
  }

  renderWithdrawForm() {
    const { withdrawValue, resultState, currentApi } = this.state;

    return (
      <Block padding="xs 0">
        <FormField label="Withdraw Value">
          <Input
            type="number"
            value={withdrawValue}
            onChange={this.setWithdrawValue}
          />
        </FormField>
        <Block padding="xs m" align="right">
          <Button
            text="Withdraw"
            onSubmit={this.withdraw}
            isLoading={resultState === ProofState.RUNNING && currentApi === ApiNames.WITHDRAW}
            disabled={resultState === ProofState.RUNNING && currentApi !== ApiNames.WITHDRAW}
          />
        </Block>
      </Block>
    );
  }

  renderTransferForm() {
    const { transferValue, transferTo, resultState, currentApi } = this.state;

    return (
      <Block padding="xs 0">
        <FormField label="Transfer Value">
          <Input
            type="number"
            value={transferValue}
            onChange={this.setTransferValue}
          />
        </FormField>
        <FormField label="To">
          <Input
            value={transferTo}
            onChange={this.setTransferTo}
          />
        </FormField>
        <Block padding="xs m" align="right">
          <Button
            text="Transfer"
            onSubmit={this.transfer}
            isLoading={resultState === ProofState.RUNNING && currentApi === ApiNames.TRANSFER}
            disabled={resultState === ProofState.RUNNING && currentApi !== ApiNames.TRANSFER}
          />
        </Block>
      </Block>
    );
  }

  render() {
    const { app } = this.props;
    const {
      initState,
      resultState,
      time,
    } = this.state;

    return (
      <Form>
        <FormField label="Init State">{initState.toString()}</FormField>
        <FormField label="Proof State">{resultState.toString()}</FormField>
        <FormField label="Proof Time">{time.toString()}ms</FormField>
        {initState !== InitState.INITIALIZED && this.renderTheButton()}
        {initState === InitState.INITIALIZED && (
          <Block padding="xs 0">
            {this.renderUserSelect()}
            <FormField label="Balance"><Balance app={app} /></FormField>
            {this.renderDepositForm()}
            {this.renderWithdrawForm()}
            {this.renderTransferForm()}
          </Block>
        )}
      </Form>
    );
  }
}

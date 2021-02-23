import React, { PureComponent } from 'react';
import { withApollo, WithApolloClient } from 'react-apollo';
import {
  AccountAction,
  AccountState,
  App,
  AppAction,
  AppEvent,
  Form,
  initialMergeForm,
  initialSendForm,
  initialShieldForm,
  LoginState,
  LoginStep,
  MergeForm,
  MessageType,
  SendForm,
  ShieldForm,
  SystemMessage,
  Wallet,
  WorldState,
} from '../app';
import { ProviderState } from '../app/provider';
import { Template } from '../components';
import { Config } from '../config';
import { Theme } from '../styles';
import { Account } from '../views/account';
import { Home } from '../views/home';
import { Login } from '../views/login';

interface AppProps {
  initialAction?: AppAction;
  config: Config;
}

type AppPropsWithApollo = WithApolloClient<AppProps>;

interface AppState {
  action: AppAction;
  loginState: LoginState;
  worldState: WorldState;
  providerState?: ProviderState;
  accountState: AccountState;
  accountAction?: AccountAction;
  processingAction: boolean;
  [AccountAction.SHIELD]: ShieldForm;
  [AccountAction.SEND]: SendForm;
  [AccountAction.MERGE]: MergeForm;
  systemMessage: SystemMessage;
}

class AppComponent extends PureComponent<AppPropsWithApollo, AppState> {
  private app: App;

  constructor(props: AppPropsWithApollo) {
    super(props);

    const { client, config, initialAction = AppAction.NADA } = props;

    this.app = new App(config, client);

    this.state = {
      action: initialAction,
      loginState: this.app.loginState,
      worldState: this.app.worldState,
      providerState: this.app.providerState,
      accountState: this.app.accountState,
      accountAction: this.app.accountAction,
      processingAction: this.app.isProcessingAction(),
      [AccountAction.SHIELD]: initialShieldForm,
      [AccountAction.SEND]: initialSendForm,
      [AccountAction.MERGE]: initialMergeForm,
      systemMessage: {
        message: '',
        type: MessageType.TEXT,
      },
    };
  }

  componentDidMount() {
    this.app.on(AppEvent.SESSION_CLOSED, this.handleSessionClosed);
    this.app.on(AppEvent.UPDATED_LOGIN_STATE, this.handleLoginStateChange);
    this.app.on(AppEvent.UPDATED_PROVIDER_STATE, this.handleProviderStateChange);
    this.app.on(AppEvent.UPDATED_WORLD_STATE, this.handleWorldStateChange);
    this.app.on(AppEvent.UPDATED_ACTION_STATE, this.handleAccountActionChange);
    this.app.on(AppEvent.UPDATED_ACCOUNT_STATE, this.handleAccountStateChange);
    this.app.on(AppEvent.UPDATED_FORM_INPUTS, this.handleFormChange);
    this.app.on(AppEvent.UPDATED_SYSTEM_MESSAGE, this.handleSystemMessageChange);
  }

  componentWillUnmount() {
    this.app.destroy();
  }

  private handleLoginStateChange = (loginState: LoginState) => {
    if (loginState.step === LoginStep.DONE) {
      this.setState({ action: AppAction.ACCOUNT, loginState });
    } else {
      const callback =
        loginState.step === LoginStep.INIT_SDK && this.state.loginState.step !== LoginStep.INIT_SDK
          ? this.app.initSdk
          : undefined;
      this.setState(
        {
          action: AppAction.LOGIN,
          loginState,
        },
        callback,
      );
    }
  };

  private handleProviderStateChange = (providerState: ProviderState) => {
    this.setState({ providerState });
  };

  private handleWorldStateChange = (worldState: WorldState) => {
    this.setState({ worldState });
  };

  private handleAccountActionChange = (accountAction: AccountAction, locked: boolean, processingAction: boolean) => {
    this.setState({ accountAction, processingAction });
  };

  private handleAccountStateChange = (accountState: AccountState) => {
    this.setState({ accountState });
  };

  private handleSystemMessageChange = (systemMessage: SystemMessage) => {
    this.setState({ systemMessage });
  };

  private handleFormChange = (action: AccountAction, inputs: Form) => {
    switch (action) {
      case AccountAction.SHIELD:
        this.setState({ [AccountAction.SHIELD]: inputs as ShieldForm });
        break;
      case AccountAction.SEND:
        this.setState({ [AccountAction.SEND]: inputs as SendForm });
        break;
      case AccountAction.MERGE:
        this.setState({ [AccountAction.MERGE]: inputs as MergeForm });
        break;
      default:
    }
  };

  private handleSessionClosed = () => {
    const { action } = this.state;
    this.setState({
      action: action === AppAction.ACCOUNT ? AppAction.LOGIN : action,
      loginState: this.app.loginState,
      worldState: this.app.worldState,
      providerState: this.app.providerState,
      accountState: this.app.accountState,
      accountAction: this.app.accountAction,
      processingAction: this.app.isProcessingAction(),
      [AccountAction.SHIELD]: initialShieldForm,
      [AccountAction.SEND]: initialSendForm,
      [AccountAction.MERGE]: initialMergeForm,
    });
  };

  private handleLogin = () => {
    if (this.state.action !== AppAction.LOGIN) {
      this.setState({ action: AppAction.LOGIN });
    }
    this.app.createSession();
  };

  private handleConnect = (wallet: Wallet) => {
    if (!this.app.hasSession()) {
      this.handleLogin();
    }
    this.app.connectWallet(wallet);
  };

  private handleLogout = () => {
    this.setState({ action: AppAction.NADA, systemMessage: { message: '', type: MessageType.TEXT } }, () =>
      this.app.logout(),
    );
  };

  render() {
    const {
      action,
      accountState,
      accountAction,
      loginState,
      providerState,
      processingAction,
      worldState,
      systemMessage,
    } = this.state;
    const { step } = loginState;
    const theme = action === AppAction.ACCOUNT ? Theme.WHITE : Theme.GRADIENT;
    const { requiredNetwork } = this.app;
    const allowRestart = step === LoginStep.SET_SEED_PHRASE || step === LoginStep.SET_ALIAS;

    return (
      <Template
        theme={theme}
        network={requiredNetwork.network}
        worldState={worldState}
        account={step === LoginStep.DONE ? accountState : undefined}
        systemMessage={systemMessage}
        onLogout={this.handleLogout}
      >
        {(() => {
          switch (action) {
            case AppAction.LOGIN: {
              const { step, wallet, seedPhrase, alias, aliasAvailability, rememberMe, accountNonce } = loginState;
              return (
                <Login
                  currentStep={step!}
                  worldState={worldState}
                  wallet={wallet}
                  seedPhrase={seedPhrase}
                  alias={alias}
                  aliasAvailability={aliasAvailability}
                  rememberMe={rememberMe}
                  isNewAccount={!accountNonce}
                  systemMessage={systemMessage}
                  setSeedPhrase={this.app.setSeedPhrase}
                  setAlias={this.app.setAlias}
                  setRememberMe={this.app.setRememberMe}
                  onSelectWallet={this.handleConnect}
                  onSelectSeedPhrase={this.app.confirmSeedPhrase}
                  onSelectAlias={this.app.confirmAlias}
                  onRestart={allowRestart ? this.app.restart : undefined}
                />
              );
            }
            case AppAction.ACCOUNT: {
              const { config } = this.props;
              return (
                <Account
                  asset={accountState.asset}
                  accountState={accountState}
                  loginState={loginState}
                  providerState={providerState}
                  action={accountAction}
                  processingAction={processingAction}
                  explorerUrl={config.explorerUrl}
                  shieldForm={this.state[AccountAction.SHIELD]}
                  sendForm={this.state[AccountAction.SEND]}
                  mergeForm={this.state[AccountAction.MERGE]}
                  onFormInputsChange={this.app.changeForm}
                  onValidate={this.app.validateForm}
                  onChangeWallet={this.app.changeWallet}
                  onGoBack={this.app.resetFormStep}
                  onSubmit={this.app.submitForm}
                  onChangeAsset={this.app.changeAsset}
                  onSelectAction={this.app.selectAction}
                  onClearAction={this.app.clearAction}
                />
              );
            }
            default:
              return <Home onConnect={this.handleLogin} />;
          }
        })()}
      </Template>
    );
  }
}

export const AppView = withApollo<AppPropsWithApollo>(AppComponent);

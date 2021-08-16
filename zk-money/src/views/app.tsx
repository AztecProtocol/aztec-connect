import { AssetId } from '@aztec/sdk';
import { isEqual } from 'lodash';
import { PureComponent } from 'react';
import { withApollo, WithApolloClient } from 'react-apollo';
import { RouteComponentProps } from 'react-router';
import {
  AccountAction,
  AccountState,
  App,
  AppAction,
  AppAssetId,
  AppEvent,
  assets,
  AssetState,
  DepositFormValues,
  Form,
  LoginMode,
  LoginState,
  LoginStep,
  MessageType,
  SystemMessage,
  WalletId,
  WorldState,
} from '../app';
import { ProviderState } from '../app/provider';
import { Template } from '../components';
import { Config } from '../config';
import { isUnsupportedDevice } from '../device_support';
import { Theme } from '../styles';
import { Account } from '../views/account';
import { Home } from '../views/home';
import { Login } from '../views/login';
import { getAccountUrl, getActionFromUrl, getLoginModeFromUrl, getUrlFromAction, getUrlFromLoginMode } from './views';

interface RouteParams {
  assetSymbol?: string;
}

interface AppProps extends RouteComponentProps<RouteParams> {
  config: Config;
}

type AppPropsWithApollo = WithApolloClient<AppProps>;

interface AppState {
  action: AppAction;
  activeAsset: AppAssetId;
  loginState: LoginState;
  worldState: WorldState;
  providerState?: ProviderState;
  accountState?: AccountState;
  assetState?: AssetState;
  activeAction?: {
    action: AccountAction;
    formValues: Form;
  };
  depositForm?: DepositFormValues;
  systemMessage: SystemMessage;
  isLoading: boolean;
}

class AppComponent extends PureComponent<AppPropsWithApollo, AppState> {
  private app: App;

  private readonly defaultAsset = AssetId.ETH;

  constructor(props: AppPropsWithApollo) {
    super(props);

    const { match, client, config } = props;
    const { path, params } = match;
    const initialAction = getActionFromUrl(path);

    let activeAsset = params?.assetSymbol
      ? assets.find(a => a.symbol.toLowerCase() === params.assetSymbol!.toLowerCase())?.id
      : this.defaultAsset;
    if (activeAsset === undefined) {
      activeAsset = this.defaultAsset;
      const url = getAccountUrl(activeAsset);
      this.props.history.push(url);
    }

    const loginMode = getLoginModeFromUrl(path);

    this.app = new App(config, client, activeAsset, loginMode);

    this.state = {
      action: initialAction,
      activeAsset,
      loginState: this.app.loginState,
      worldState: this.app.worldState,
      providerState: this.app.providerState,
      accountState: this.app.accountState,
      assetState: this.app.assetState,
      activeAction: this.app.activeAction,
      depositForm: this.app.depositForm,
      systemMessage: {
        message: '',
        type: MessageType.TEXT,
      },
      isLoading: true,
    };
  }

  async componentDidMount() {
    this.app.on(AppEvent.SESSION_CLOSED, this.onSessionClosed);
    this.app.on(AppEvent.UPDATED_LOGIN_STATE, this.onLoginStateChange);
    this.app.on(AppEvent.UPDATED_USER_SESSION_DATA, this.onUserSessionDataChange);
    this.app.on(AppEvent.UPDATED_SYSTEM_MESSAGE, this.onSystemMessageChange);
    await this.handleActionChange(this.state.action);
    this.setState({ isLoading: false });
  }

  componentDidUpdate(prevProps: AppPropsWithApollo, prevState: AppState) {
    const { match: prevMatch } = prevProps;
    const { match } = this.props;
    const { action: prevAction } = prevState;
    const { action } = this.state;
    if (match.path !== prevMatch.path || !isEqual(match.params, prevMatch.params)) {
      this.handleUrlChange(match);
    }
    if (action !== prevAction) {
      this.handleActionChange(action);
    }
  }

  componentWillUnmount() {
    this.app.destroy();
  }

  private goToAction = (action: AppAction) => {
    if (action === this.state.action) {
      return;
    }

    if (action === AppAction.ACCOUNT) {
      const url = getAccountUrl(this.state.activeAsset);
      this.props.history.push(url);
    } else {
      const url = getUrlFromAction(action);
      this.props.history.push(url);
    }
  };

  private handleUrlChange = async ({ path, params }: { path: string; params: RouteParams }) => {
    const action = getActionFromUrl(path);
    this.setState({ action, systemMessage: { message: '', type: MessageType.TEXT } });

    const { action: prevAction } = this.state;
    if (action === prevAction) {
      switch (action) {
        case AppAction.LOGIN: {
          const loginMode = getLoginModeFromUrl(path);
          this.app.changeLoginMode(loginMode);
          break;
        }
        case AppAction.ACCOUNT: {
          const activeAsset = assets.find(a => a.symbol.toLowerCase() === params.assetSymbol!.toLowerCase())?.id;
          if (activeAsset !== this.state.activeAsset) {
            this.handleChangeAssetThroughUrl(activeAsset);
          }
          break;
        }
        default:
      }
    }
  };

  private async handleActionChange(action: AppAction) {
    if (action === AppAction.ACCOUNT) {
      if (!this.app.hasSession()) {
        if (this.app.hasCookie()) {
          this.app.backgroundLogin();
        } else {
          this.goToAction(AppAction.LOGIN);
        }
      }
    } else if (this.app.hasCookie()) {
      this.goToAction(AppAction.ACCOUNT);
    } else if (action === AppAction.LOGIN) {
      if (this.app.hasLocalAccountProof()) {
        this.app.resumeSignup();
        return;
      }

      const accountV0 = await this.app.getLocalAccountV0();
      if (accountV0) {
        const url = getUrlFromLoginMode(LoginMode.MIGRATE);
        this.props.history.push(url);
        this.app.migrateFromLocalAccountV0(accountV0);
      }
    }
  }

  private onLoginStateChange = (loginState: LoginState) => {
    if (loginState.step === LoginStep.DONE) {
      this.setState({ loginState }, () => this.goToAction(AppAction.ACCOUNT));
    } else {
      const callback =
        loginState.step === LoginStep.INIT_SDK && this.state.loginState.step !== LoginStep.INIT_SDK
          ? this.app.initSdk
          : undefined;
      this.setState({ loginState }, callback);
    }
  };

  private onUserSessionDataChange = () => {
    this.setState({
      providerState: this.app.providerState,
      worldState: this.app.worldState,
      accountState: this.app.accountState,
      assetState: this.app.assetState,
      activeAction: this.app.activeAction,
      depositForm: this.app.depositForm,
    });
  };

  private onSystemMessageChange = (systemMessage: SystemMessage) => {
    this.setState({ systemMessage });
  };

  private onSessionClosed = () => {
    const { action } = this.state;
    if (action === AppAction.ACCOUNT) {
      this.goToAction(AppAction.LOGIN);
    }
    this.setState({
      loginState: this.app.loginState,
      worldState: this.app.worldState,
      providerState: this.app.providerState,
      accountState: this.app.accountState,
      assetState: this.app.assetState,
      activeAction: this.app.activeAction,
      depositForm: this.app.depositForm,
    });
  };

  private handleConnect = () => {
    const url = getUrlFromLoginMode(LoginMode.SIGNUP);
    this.props.history.push(url);
  };

  private handleConnectWallet = (walletId: WalletId) => {
    if (!this.app.hasSession()) {
      this.app.createSession();
    }
    this.app.connectWallet(walletId);
  };

  private handleRestart = () => {
    if (this.state.loginState.accountV0) {
      const url = getUrlFromLoginMode(LoginMode.SIGNUP);
      this.props.history.push(url);
    }
    this.setState({ systemMessage: { message: '', type: MessageType.TEXT } }, () => this.app.logout());
  };

  private handleLogout = () => {
    this.setState({ systemMessage: { message: '', type: MessageType.TEXT } }, () => this.app.logout());
  };

  private handleMigrateBalance = () => {
    this.app.selectAction(AccountAction.MIGRATE);
  };

  private handleChangeAsset = (assetId: AppAssetId) => {
    const action = this.state.action;
    if (action !== AppAction.ACCOUNT || assetId == this.state.activeAsset || this.app.isProcessingAction()) return;

    const url = getAccountUrl(assetId);
    this.props.history.push(url);
    this.setState({ activeAsset: assetId });
    this.app.changeAsset(assetId);
  };

  private handleChangeAssetThroughUrl(assetId?: AppAssetId) {
    if (assetId === undefined || this.app.isProcessingAction()) {
      const url = getAccountUrl(this.state.activeAsset);
      this.props.history.push(url);
    } else {
      this.setState({ activeAsset: assetId });
      this.app.changeAsset(assetId);
    }
  }

  private handleClearAccountV0s = async () => {
    const url = getUrlFromLoginMode(LoginMode.SIGNUP);
    this.props.history.push(url);
    await this.app.clearLocalAccountV0s();
  };

  render() {
    const {
      action,
      assetState,
      activeAsset,
      accountState,
      activeAction,
      loginState,
      providerState,
      worldState,
      depositForm,
      systemMessage,
      isLoading,
    } = this.state;
    const { config } = this.props;
    const { step } = loginState;
    const theme = action === AppAction.ACCOUNT ? Theme.WHITE : Theme.GRADIENT;
    const { requiredNetwork } = this.app;
    const processingAction = this.app.isProcessingAction();
    const allowReset = action !== AppAction.ACCOUNT && (!processingAction || systemMessage.type === MessageType.ERROR);
    const rootUrl = allowReset ? '/' : this.props.match.url;

    return (
      <Template
        theme={theme}
        rootUrl={rootUrl}
        network={requiredNetwork.network}
        worldState={worldState}
        account={step === LoginStep.DONE ? accountState : undefined}
        systemMessage={systemMessage}
        onMigrateBalance={this.handleMigrateBalance}
        onLogout={this.handleLogout}
        isLoading={isLoading}
      >
        {(() => {
          switch (action) {
            case AppAction.LOGIN: {
              return (
                <Login
                  worldState={worldState}
                  loginState={loginState}
                  providerState={providerState}
                  availableWallets={this.app.availableWallets}
                  depositForm={depositForm}
                  explorerUrl={config.explorerUrl}
                  systemMessage={systemMessage}
                  setSeedPhrase={this.app.setSeedPhrase}
                  setAlias={this.app.setAlias}
                  setRememberMe={this.app.setRememberMe}
                  onSelectWallet={this.handleConnectWallet}
                  onSelectSeedPhrase={this.app.confirmSeedPhrase}
                  onMigrateToWallet={this.app.migrateToWallet}
                  onMigrateNotes={this.app.migrateNotes}
                  onSelectAlias={this.app.confirmAlias}
                  onRestart={allowReset && step !== LoginStep.CONNECT_WALLET ? this.handleRestart : undefined}
                  onForgotAlias={this.app.forgotAlias}
                  onMigrateAccount={this.app.migrateAccount}
                  onClearAccountV0s={this.handleClearAccountV0s}
                  onDepositFormInputsChange={this.app.changeDepositForm}
                  onSubmitDepositForm={this.app.claimUserName}
                  onChangeWallet={this.app.changeWallet}
                />
              );
            }
            case AppAction.ACCOUNT: {
              return (
                <Account
                  worldState={worldState}
                  accountState={accountState!}
                  asset={assets[activeAsset]}
                  assetEnabled={activeAsset <= config.maxAvailableAssetId}
                  assetState={assetState!}
                  loginState={loginState}
                  providerState={providerState}
                  activeAction={activeAction}
                  processingAction={processingAction}
                  explorerUrl={config.explorerUrl}
                  txsPublishTime={this.app.txsPublishTime}
                  mergeForm={this.app.mergeForm}
                  onFormInputsChange={this.app.changeForm}
                  onValidate={this.app.validateForm}
                  onChangeWallet={this.app.changeWallet}
                  onDisconnectWallet={this.app.disconnectWallet}
                  onGoBack={this.app.resetFormStep}
                  onSubmit={this.app.submitForm}
                  onChangeAsset={this.handleChangeAsset}
                  onSelectAction={this.app.selectAction}
                  onClearAction={this.app.clearAction}
                />
              );
            }
            default:
              return <Home onConnect={this.handleConnect} unsupported={isUnsupportedDevice()} />;
          }
        })()}
      </Template>
    );
  }
}

export const AppView = withApollo<AppPropsWithApollo>(AppComponent);

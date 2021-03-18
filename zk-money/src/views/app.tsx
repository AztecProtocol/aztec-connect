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
  LoginState,
  LoginStep,
  MessageType,
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

const views = [
  {
    path: '/',
    action: AppAction.NADA,
  },
  {
    path: '/signin',
    action: AppAction.LOGIN,
  },
  {
    path: '/asset/:assetSymbol',
    action: AppAction.ACCOUNT,
  },
];

const getAccountUrl = (assetId: AppAssetId) =>
  views.find(v => v.action === AppAction.ACCOUNT)!.path.replace(':assetSymbol', `${assets[assetId].symbol}`);

export const appPaths = views.map(p => p.path);

const isIOS = () =>
  ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

const isUnsupportedDevice = () => isIOS();

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
  processingAction: boolean;
  systemMessage: SystemMessage;
}

class AppComponent extends PureComponent<AppPropsWithApollo, AppState> {
  private app: App;

  private readonly defaultAsset = AssetId.ETH;

  constructor(props: AppPropsWithApollo) {
    super(props);

    const { match, client, config } = props;
    const { path, params } = match;
    const initialAction = views.find(v => v.path === path)?.action || AppAction.NADA;
    let activeAsset = params?.assetSymbol
      ? assets.find(a => a.symbol.toLowerCase() === params.assetSymbol!.toLowerCase())?.id
      : this.defaultAsset;
    if (activeAsset === undefined) {
      activeAsset = this.defaultAsset;
      const url = getAccountUrl(activeAsset);
      this.props.history.push(url);
    }

    this.app = new App(config, client, activeAsset);

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
      processingAction: this.app.isProcessingAction(),
      systemMessage: {
        message: '',
        type: MessageType.TEXT,
      },
    };
  }

  componentDidMount() {
    this.app.on(AppEvent.SESSION_CLOSED, this.onSessionClosed);
    this.app.on(AppEvent.UPDATED_LOGIN_STATE, this.onLoginStateChange);
    this.app.on(AppEvent.UPDATED_USER_SESSION_DATA, this.onUserSessionDataChange);
    this.app.on(AppEvent.UPDATED_SYSTEM_MESSAGE, this.onSystemMessageChange);
    this.handleActionChange(this.state.action);

    if (this.state.action !== AppAction.NADA && isUnsupportedDevice()) {
      this.goToAction(AppAction.NADA);
    }
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
      const { path } = views.find(v => v.action === action)!;
      this.props.history.push(path);
    }
  };

  private handleUrlChange = ({ path, params }: { path: string; params: RouteParams }) => {
    const action = views.find(v => v.path === path)?.action || AppAction.NADA;
    this.setState({ action });

    if (action === AppAction.ACCOUNT) {
      const activeAsset = assets.find(a => a.symbol.toLowerCase() === params.assetSymbol!.toLowerCase())?.id;
      if (activeAsset !== this.state.activeAsset) {
        this.handleChangeAssetThroughUrl(activeAsset);
      }
    }
  };

  private handleActionChange(action: AppAction) {
    if (action === AppAction.ACCOUNT) {
      if (!this.app.hasSession()) {
        if (this.app.hasCookie()) {
          this.app.backgroundLogin();
        } else {
          this.goToAction(AppAction.LOGIN);
        }
      }
    } else if (this.app.hasSession()) {
      this.goToAction(AppAction.ACCOUNT);
    } else if (action === AppAction.LOGIN && this.app.hasLocalAccountProof()) {
      this.app.resumeLogin();
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
      processingAction: this.app.isProcessingAction(),
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
      processingAction: this.app.isProcessingAction(),
    });
  };

  private handleLogin = () => {
    if (this.app.hasCookie()) {
      this.goToAction(AppAction.ACCOUNT);
    } else if (this.state.action !== AppAction.LOGIN) {
      this.goToAction(AppAction.LOGIN);
    }
  };

  private handleConnect = (wallet: Wallet) => {
    if (!this.app.hasSession()) {
      this.app.createSession();
    }
    this.app.connectWallet(wallet);
  };

  private handleRestart = () => {
    this.setState({ systemMessage: { message: '', type: MessageType.TEXT } }, () => this.app.logout());
  };

  private handleLogout = () => {
    this.goToAction(AppAction.NADA);
    this.setState({ systemMessage: { message: '', type: MessageType.TEXT } }, () => this.app.logout());
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

  render() {
    const {
      action,
      assetState,
      activeAsset,
      accountState,
      activeAction,
      loginState,
      providerState,
      processingAction,
      worldState,
      depositForm,
      systemMessage,
    } = this.state;
    const { config } = this.props;
    const { step } = loginState;
    const theme = action === AppAction.ACCOUNT ? Theme.WHITE : Theme.GRADIENT;
    const { requiredNetwork } = this.app;
    const rootUrl = this.app.hasSession() ? this.props.match.url : '/';

    return (
      <Template
        theme={theme}
        rootUrl={rootUrl}
        network={requiredNetwork.network}
        worldState={worldState}
        account={step === LoginStep.DONE ? accountState : undefined}
        systemMessage={systemMessage}
        onLogout={this.handleLogout}
      >
        {(() => {
          switch (action) {
            case AppAction.LOGIN: {
              const { step, accountNonce } = loginState;
              const allowRestart =
                !processingAction &&
                ([LoginStep.SET_SEED_PHRASE, LoginStep.SET_ALIAS, LoginStep.CLAIM_USERNAME].indexOf(step) >= 0 ||
                  (step !== LoginStep.CONNECT_WALLET && systemMessage.type === MessageType.ERROR));
              return (
                <Login
                  worldState={worldState}
                  loginState={loginState}
                  providerState={providerState}
                  depositForm={depositForm}
                  isNewAccount={!accountNonce}
                  explorerUrl={config.explorerUrl}
                  systemMessage={systemMessage}
                  setSeedPhrase={this.app.setSeedPhrase}
                  setAlias={this.app.setAlias}
                  setRememberMe={this.app.setRememberMe}
                  onSelectWallet={this.handleConnect}
                  onSelectSeedPhrase={this.app.confirmSeedPhrase}
                  onSelectAlias={this.app.confirmAlias}
                  onRestart={allowRestart ? this.handleRestart : undefined}
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
                  onGoBack={this.app.resetFormStep}
                  onSubmit={this.app.submitForm}
                  onChangeAsset={this.handleChangeAsset}
                  onSelectAction={this.app.selectAction}
                  onClearAction={this.app.clearAction}
                />
              );
            }
            default:
              return <Home onConnect={this.handleLogin} unsupported={isUnsupportedDevice()} />;
          }
        })()}
      </Template>
    );
  }
}

export const AppView = withApollo<AppPropsWithApollo>(AppComponent);

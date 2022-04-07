import type { DefiFormMode } from 'alt-model/defi/defi_form';
import { AztecSdk } from '@aztec/sdk';
import { Navbar } from 'ui-components';
import { BroadcastChannel } from 'broadcast-channel';
import { PureComponent } from 'react';
import styled from 'styled-components/macro';
import type { CutdownAsset } from 'app/types';
import { AppContext } from '../alt-model/app_context';
import {
  AccountState,
  App,
  AppAction,
  AppEvent,
  ShieldFormValues,
  LoginMode,
  LoginState,
  LoginStep,
  MessageType,
  Provider,
  SystemMessage,
  WalletId,
  WorldState,
} from '../app';
import { ProviderState } from '../app/provider';
import { Template } from '../components';
import { Config } from '../config';
import { getSupportStatus } from '../device_support';
import { spacings, Theme } from '../styles';
import { Home, HomeState } from '../views/home';
import { Login } from '../views/login';
import { getAccountUrl, getActionFromUrl, getLoginModeFromUrl, getUrlFromAction, getUrlFromLoginMode } from './views';
import { UserAccount } from '../components/template/user_account';
import { NavigateFunction, Route, Routes } from 'react-router-dom';
import { SdkObs } from 'alt-model/top_level_context/sdk_obs';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { Balance } from './account/dashboard/balance';
import { Earn } from './account/dashboard/earn';
import { Trade } from './account/dashboard/trade';
import { DefiRecipe } from 'alt-model/defi/types';
import { DefiModal } from 'views/account/dashboard/modals/defi_modal';
import { KNOWN_MAINNET_ASSET_ADDRESSES } from 'alt-model/known_assets/known_asset_addresses';
import './app.css';

interface AppProps {
  config: Config;
  sdkObs: SdkObs;
  path: string;
  navigate: NavigateFunction;
}

interface AppState {
  action: AppAction;
  activeDefiModal?: { recipe: DefiRecipe; mode: DefiFormMode };
  loginState: LoginState;
  worldState: WorldState;
  providerState?: ProviderState;
  accountState?: AccountState;
  shieldForAliasForm?: ShieldFormValues;
  systemMessage: SystemMessage;
  isLoading: boolean;
  homeState: HomeState;
  sdk?: AztecSdk | undefined;
  provider?: Provider | undefined;
  path: string;
}

enum CrossTabEvent {
  LOGGED_IN = 'CROSS_TAB_LOGGED_IN',
  LOGGED_OUT = 'CROSS_TAB_LOGGED_OUT',
}

const AccountItem = styled.div`
  padding: ${spacings.xxs} 0;
`;

const LEGACY_APP_ASSETS: CutdownAsset[] = [
  {
    id: 0,
    symbol: 'ETH',
    address: KNOWN_MAINNET_ASSET_ADDRESSES.ETH,
    decimals: 18,
  },
];

export class AppView extends PureComponent<AppProps, AppState> {
  private app: App;
  private channel = new BroadcastChannel('zk-money');

  private readonly defaultAsset = 0;

  constructor(props: AppProps) {
    super(props);

    const { path, config } = props;
    const initialAction = getActionFromUrl(path);

    const loginMode = getLoginModeFromUrl(path);

    this.app = new App(config, LEGACY_APP_ASSETS, props.sdkObs, this.defaultAsset, loginMode);

    this.state = {
      action: initialAction,
      loginState: this.app.loginState,
      worldState: this.app.worldState,
      providerState: this.app.providerState,
      accountState: this.app.accountState,
      shieldForAliasForm: this.app.shieldForAliasForm,
      activeDefiModal: undefined,
      // path will be removed once we are able to add router to ui-components
      path: '/',
      systemMessage: {
        message: '',
        type: MessageType.TEXT,
      },
      isLoading: true,
      homeState: { supportStatus: 'supported' },
    };
  }

  async componentDidMount() {
    this.app.on(AppEvent.SESSION_CLOSED, () => {
      this.onSessionClosed();
      this.channel.postMessage({ name: CrossTabEvent.LOGGED_OUT });
    });
    this.app.on(AppEvent.SESSION_OPEN, () => this.channel.postMessage({ name: CrossTabEvent.LOGGED_IN }));
    this.app.on(AppEvent.UPDATED_LOGIN_STATE, this.onLoginStateChange);
    this.app.on(AppEvent.UPDATED_USER_SESSION_DATA, this.onUserSessionDataChange);
    this.app.on(AppEvent.UPDATED_SYSTEM_MESSAGE, this.onSystemMessageChange);
    this.channel.onmessage = async msg => {
      switch (msg.name) {
        case CrossTabEvent.LOGGED_IN:
          this.goToAction(AppAction.ACCOUNT);
          break;
        case CrossTabEvent.LOGGED_OUT:
          this.handleLogout();
          break;
      }
    };
    const ethPrice = this.app.priceFeedService.getPrice(0);
    if (ethPrice !== 0n) this.setState({ homeState: { ...this.state.homeState, ethPrice } });
    this.app.priceFeedService.subscribe(0, this.handleEthPriceChange);
    getSupportStatus().then(supportStatus => {
      this.setState({ homeState: { ...this.state.homeState, supportStatus } });
    });
    await this.handleActionChange(this.state.action);
    this.setState({ isLoading: false });
  }

  componentDidUpdate(prevProps: AppProps, prevState: AppState) {
    const { path: prevPath } = prevProps;
    const { path } = this.props;
    const { action: prevAction } = prevState;
    const { action } = this.state;
    if (path !== prevPath) {
      this.handleUrlChange(path);
    }
    if (action !== prevAction) {
      this.handleActionChange(action);
    }
  }

  componentWillUnmount() {
    this.app.priceFeedService.unsubscribe(0, this.handleEthPriceChange);
    this.app.destroy();
    this.channel.close();
  }

  private goToAction = (action: AppAction) => {
    if (action === this.state.action) {
      return;
    }

    if (action === AppAction.ACCOUNT) {
      const url = getAccountUrl();
      if (window.location.pathname === '/signin' || window.location.pathname === '/signup') {
        setTimeout(() => this.props.navigate(url), 0);
      }
    } else {
      const url = getUrlFromAction(action);
      if (window.location.pathname === '/balance') {
        setTimeout(() => this.props.navigate(url), 0);
      }
    }
  };

  private handleUrlChange = async (path: string) => {
    const action = getActionFromUrl(path);
    this.setState({ action, systemMessage: { message: '', type: MessageType.TEXT } });

    switch (action) {
      case AppAction.LOGIN: {
        const loginMode = getLoginModeFromUrl(path);
        this.app.changeLoginMode(loginMode);
        break;
      }
      default:
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
    }
  }

  private onLoginStateChange = (loginState: LoginState) => {
    if (loginState.step === LoginStep.DONE) {
      this.setState({ loginState }, () => this.goToAction(AppAction.ACCOUNT));
    } else {
      const callback =
        loginState.step === LoginStep.INIT_ACCOUNT && this.state.loginState.step !== LoginStep.INIT_ACCOUNT
          ? this.app.initAccount
          : undefined;
      this.setState({ loginState }, callback);
    }
  };

  private onUserSessionDataChange = () => {
    this.setState({
      loginState: this.app.loginState,
      providerState: this.app.providerState,
      worldState: this.app.worldState,
      accountState: this.app.accountState,
      shieldForAliasForm: this.app.shieldForAliasForm,
      sdk: this.app.sdk,
      provider: this.app.provider,
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
    this.onUserSessionDataChange();
  };

  private handleEthPriceChange = (_: number, ethPrice: bigint) => {
    this.setState({ homeState: { ...this.state.homeState, ethPrice } });
  };

  private handleLogin = () => {
    const url = getUrlFromLoginMode(LoginMode.LOGIN);
    this.props.navigate(url);
  };

  private handleSignupAndShield = (amount: bigint) => {
    this.app.updateShieldForAliasAmountPreselection(amount);
    const url = getUrlFromLoginMode(LoginMode.SIGNUP);
    this.props.navigate(url);
  };

  private handleConnectWallet = (walletId: WalletId) => {
    if (!this.app.hasSession()) {
      this.app.createSession();
    }
    this.app.connectWallet(walletId);
  };

  private handleRestart = () => {
    const prevMode = this.state.loginState.mode;
    switch (prevMode) {
      case LoginMode.NEW_ALIAS: {
        const url = getUrlFromLoginMode(LoginMode.SIGNUP);
        this.props.navigate(url);
        break;
      }
    }
    this.setState({ systemMessage: { message: '', type: MessageType.TEXT } }, () => this.app.logout());
  };

  private handleOpenDefiEnterModal = (recipe: DefiRecipe) => {
    this.setState({ activeDefiModal: { recipe, mode: 'enter' } });
  };

  private handleOpenDefiExitModal = (recipe: DefiRecipe) => {
    this.setState({ activeDefiModal: { recipe, mode: 'exit' } });
  };

  private handleLogout = () => {
    if (!this.app.hasSession()) {
      return;
    }
    this.setState({ systemMessage: { message: '', type: MessageType.TEXT } }, () => this.app.logout());
  };

  private getTheme = () => {
    if (
      window.location.pathname === '/' ||
      window.location.pathname === '/signin' ||
      window.location.pathname === '/signup'
    ) {
      return Theme.GRADIENT;
    }

    return Theme.WHITE;
  };

  render() {
    const {
      action,
      accountState,
      loginState,
      providerState,
      worldState,
      shieldForAliasForm,
      systemMessage,
      isLoading,
      homeState,
      activeDefiModal,
    } = this.state;
    const { config } = this.props;
    const { step } = loginState;
    const theme = this.getTheme();
    const processingAction = this.app.isProcessingAction();
    const allowReset = action !== AppAction.ACCOUNT && (!processingAction || systemMessage.type === MessageType.ERROR);
    const isLoggedIn = step === LoginStep.DONE;
    const shouldCenterContent =
      window.location.pathname === '/trade' ||
      window.location.pathname === '/signup' ||
      window.location.pathname === '/signin';

    const accountComponent = isLoggedIn ? (
      <AccountItem>
        <UserAccount account={accountState!} worldState={worldState} onLogout={this.handleLogout} />
      </AccountItem>
    ) : undefined;

    return (
      <Template theme={theme} systemMessage={systemMessage} isLoading={isLoading}>
        <AppContext.Provider
          value={{
            config,
            requiredNetwork: this.app.requiredNetwork,
            provider: this.state.provider,
            accountId: this.state.accountState?.userId,
            alias: this.state.accountState?.alias,
            keyVault: this.app.keyVault,
            db: this.app.db,
            rollupService: this.app.rollupService,
            userSession: this.app.getSession(),
          }}
        >
          <Navbar
            path={window.location.pathname}
            theme={theme}
            isLoggedIn={isLoggedIn}
            accountComponent={accountComponent}
            onLogin={this.handleLogin}
          />
          <TransitionGroup
            style={{
              margin: shouldCenterContent ? 'auto 0 auto 0' : 'initial',
              // paddingTop: shouldCenterContent ? '64px' : 'initial',
            }}
          >
            <CSSTransition key={window.location.pathname} classNames="fade" timeout={250}>
              <Routes location={window.location.pathname}>
                {['/signup', '/signin'].map((path: string) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <Login
                        worldState={worldState}
                        loginState={loginState}
                        providerState={providerState}
                        availableWallets={this.app.availableWallets}
                        shieldForAliasForm={shieldForAliasForm}
                        explorerUrl={config.explorerUrl}
                        systemMessage={systemMessage}
                        setAlias={this.app.setAlias}
                        setRememberMe={this.app.setRememberMe}
                        onSelectWallet={this.handleConnectWallet}
                        onSelectAlias={this.app.confirmAlias}
                        onRestart={allowReset && step !== LoginStep.CONNECT_WALLET ? this.handleRestart : undefined}
                        onForgotAlias={this.app.forgotAlias}
                        onShieldForAliasFormInputsChange={this.app.changeShieldForAliasForm}
                        onSubmitShieldForAliasForm={this.app.claimUserName}
                        onChangeWallet={this.app.changeWallet}
                      />
                    }
                  />
                ))}
                <Route
                  path="/earn"
                  element={
                    <Earn
                      isLoggedIn={isLoggedIn}
                      onOpenDefiEnterModal={this.handleOpenDefiEnterModal}
                      onOpenDefiExitModal={this.handleOpenDefiExitModal}
                    />
                  }
                />
                <Route path="/trade" element={<Trade />} />
                <Route path="/balance" element={<Balance onOpenDefiExitModal={this.handleOpenDefiExitModal} />} />
                <Route
                  path="/"
                  element={
                    <Home
                      isLoggedIn={isLoggedIn}
                      onLogin={this.handleLogin}
                      onSignupAndShield={this.handleSignupAndShield}
                      homeState={homeState}
                    />
                  }
                />
              </Routes>
            </CSSTransition>
          </TransitionGroup>
          {activeDefiModal && (
            <DefiModal onClose={() => this.setState({ activeDefiModal: undefined })} {...activeDefiModal} />
          )}
        </AppContext.Provider>
      </Template>
    );
  }
}

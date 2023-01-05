import Cookie from 'js-cookie';
import React, { useContext, useEffect, useState } from 'react';
import { Location, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { TopLevelContext } from '../alt-model/top_level_context/top_level_context.js';
import { useAccountState } from '../alt-model/account_state/index.js';
import { DefiRecipe } from '../alt-model/defi/types.js';
import wave from '../images/wave.svg';

import { Template } from '../components/index.js';
import { Config } from '../config.js';
import { PageTransitionHandler } from '../page_transition_handler.js';
import { Pages } from './views.js';
import { getCookiesToast } from './toasts/toast_configurations.js';
import { Navbar, Theme } from '../ui-components/index.js';
import { UserAccountMenu } from '../components/template/user_account_menu.js';
import { Earn } from './account/dashboard/earn.js';
import { Trade } from './account/dashboard/trade.js';
import { Balance } from './account/dashboard/balance.js';
import { DefiModal, DefiModalProps } from './account/dashboard/modals/defi_modal/defi_modal.js';
import { Home } from './home.js';
import { Toasts } from './toasts/toasts.js';
import './app.css';

const getIsCookieAccepted = () => Cookie.get('accepted') === 'true';

function useShowCookies() {
  const { toastsObs } = useContext(TopLevelContext);
  const isCookieAccepted = getIsCookieAccepted();

  useEffect(() => {
    if (!isCookieAccepted) {
      toastsObs.addToast(getCookiesToast(toastsObs));
    }
  }, [isCookieAccepted, toastsObs]);
}

function getTheme(location: Location) {
  return location.pathname === Pages.HOME ? Theme.GRADIENT : Theme.WHITE;
}

interface ViewsProps {
  config: Config;
}

export function Views({ config }: ViewsProps) {
  const [defiModalProps, setDefiModalProps] = useState<DefiModalProps>();
  const navigate = useNavigate();
  const accountState = useAccountState();
  const location = useLocation();
  const theme = getTheme(location);
  const hasAccountState = !!accountState;
  const isLoggedIn = !!accountState?.isRegistered;

  const handleCloseDefiModal = () => {
    setDefiModalProps(undefined);
  };
  const handleOpenDefiEnterModal = (recipe: DefiRecipe) => {
    setDefiModalProps({ recipe, flowDirection: 'enter', onClose: handleCloseDefiModal });
  };
  const handleOpenDefiExitModal = (recipe: DefiRecipe) => {
    setDefiModalProps({ recipe, flowDirection: 'exit', onClose: handleCloseDefiModal });
  };

  useShowCookies();

  const isInAccessPage = location.pathname === Pages.BALANCE && (!isLoggedIn || accountState?.isSyncing);
  const shouldCenterContent = location.pathname === Pages.TRADE || isInAccessPage;

  return (
    <>
      <Template theme={theme} explorerUrl={config.explorerUrl}>
        {location.pathname === '/' && <img className={'wave'} src={wave} alt="" />}
        <Navbar
          path={location.pathname}
          theme={theme}
          isUserRegistered={accountState?.isRegistered}
          accountComponent={hasAccountState ? <UserAccountMenu /> : undefined}
        />
        <TransitionGroup
          style={{
            margin: shouldCenterContent ? 'auto 0' : 'initial',
            maxWidth: location.pathname === '/' ? 'initial' : 'calc(1350px + 20%)',
            padding: location.pathname === '/' ? 'initial' : '0 10%',
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <CSSTransition key={location.pathname} classNames="fade" timeout={250}>
            <Routes location={location.pathname}>
              <Route
                path={Pages.EARN}
                element={
                  <Earn
                    isLoggedIn={isLoggedIn}
                    onOpenDefiEnterModal={handleOpenDefiEnterModal}
                    onOpenDefiExitModal={handleOpenDefiExitModal}
                  />
                }
              />
              <Route path={Pages.TRADE} element={<Trade />} />
              <Route path={Pages.BALANCE} element={<Balance onOpenDefiExitModal={handleOpenDefiExitModal} />} />
              <Route path={Pages.HOME} element={<Home onSignup={() => navigate(Pages.BALANCE)} />} />
              <Route
                path="*"
                element={
                  <Template theme={Theme.WHITE} explorerUrl={config.explorerUrl}>
                    <div>Not Found</div>
                  </Template>
                }
              />
            </Routes>
          </CSSTransition>
        </TransitionGroup>
        <Toasts />
        {defiModalProps && <DefiModal {...defiModalProps} />}
      </Template>
      <PageTransitionHandler />
    </>
  );
}

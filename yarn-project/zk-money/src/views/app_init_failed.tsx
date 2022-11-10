import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar, ToastGroup, ToastType } from '../ui-components/index.js';
import { MessageType } from '../app/index.js';
import { Template } from '../components/index.js';
import { Theme } from '../styles/index.js';
import { Home } from '../views/home.js';
import { SupportStatus } from '../device_support.js';
import { UnsupportedPopup } from './unsupported_popup/index.js';

const FALAFEL_UNREACHABLE_MSG = {
  type: MessageType.ERROR,
  message: 'Cannot reach rollup provider. Please try again later.',
};

const STALE_FRONTEND_MSG = {
  type: MessageType.ERROR,
  message:
    'Version mismatch between zk.money and rollup server. ' +
    'Refresh the page! ' +
    '(If this issue persists it may be a problem with your ISP)',
};

type FailureReason =
  | { type: 'unsupported'; supportStatus: SupportStatus }
  | { type: 'falafel-down' }
  | { type: 'stale-frontend' };

interface AppInitFailedProps {
  reason: FailureReason;
  explorerUrl: string;
}

export function AppInitFailed({ reason, explorerUrl }: AppInitFailedProps) {
  const [showingReason, setShowingReason] = useState(false);
  const handleInteraction = () => setShowingReason(true);
  const handleClosePopup = () => setShowingReason(false);
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname !== '/') handleInteraction();
  }, [pathname]);

  return (
    <Template theme={Theme.GRADIENT} explorerUrl={explorerUrl}>
      <Navbar path={window.location.pathname} theme={Theme.GRADIENT} isLoggingIn={false} isLoggedIn={false} />
      <Home onSignup={handleInteraction} />
      {showingReason && reason.type === 'unsupported' && (
        <UnsupportedPopup onClose={handleClosePopup} supportStatus={reason.supportStatus} />
      )}

      <ToastGroup
        onCloseToast={handleClosePopup}
        toasts={
          showingReason && reason.type === 'falafel-down'
            ? [
                {
                  isClosable: true,
                  type: ToastType.ERROR,
                  text: FALAFEL_UNREACHABLE_MSG.message,
                  key: 'falafel-unreachable',
                  isHeavy: true,
                },
              ]
            : showingReason && reason.type === 'stale-frontend'
            ? [
                {
                  isClosable: true,
                  type: ToastType.ERROR,
                  text: STALE_FRONTEND_MSG.message,
                  key: 'client-version-mismatch',
                  isHeavy: true,
                },
              ]
            : []
        }
      />
    </Template>
  );
}

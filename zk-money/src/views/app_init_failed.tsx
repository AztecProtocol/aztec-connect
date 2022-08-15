import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar, ToastGroup, ToastType } from 'ui-components';
import { MessageType } from 'app';
import { Template } from 'components';
import { Theme } from 'styles';
import { Home } from 'views/home';
import { SupportStatus } from 'device_support';
import { UnsupportedPopup } from './unsupported_popup';

const FALAFEL_UNREACHABLE_MSG = {
  type: MessageType.ERROR,
  message: 'Cannot reach rollup provider. Please try again later.',
};

type FailureReason = { type: 'unsupported'; supportStatus: SupportStatus } | { type: 'falafel-down' };

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
            : []
        }
      />
    </Template>
  );
}

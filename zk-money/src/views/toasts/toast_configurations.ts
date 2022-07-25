import Cookies from 'js-cookie';
import { ToastsObs } from 'alt-model/top_level_context/toasts_obs';

const COOKIES_TOAST_KEY = 'COOKIES_TOAST';

const acceptCookies = () => {
  Cookies.set('accepted', 'true');
};

export const getCookiesToast = (toastsObs: ToastsObs) => ({
  key: COOKIES_TOAST_KEY,
  text: 'This website uses cookies to enhance to user experience. Learn more in our Privacy Policy.',
  isHeavy: true,
  primaryButton: {
    onClick: () => {
      acceptCookies();
      toastsObs.removeToastByKey(COOKIES_TOAST_KEY);
    },
    text: 'Accept',
  },
  secondaryButton: {
    onClick: () => {
      window.open('https://www.aztec.network/privacy', '_blank');
    },
    text: 'Learn More',
  },
});

export const getRollupProviderTimeoutToast = () => ({
  text: 'Connecting to the rollup provider is taking longer than expected. Please follow the troubleshooting guide.',
  isClosable: true,
  primaryButton: {
    text: 'Go to guide',
    onClick: () => {
      window.open('https://docs.aztec.network/zk-money/troubleshooting', '_blank');
    },
  },
});

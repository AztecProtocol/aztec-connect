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
  isClosable: false,
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

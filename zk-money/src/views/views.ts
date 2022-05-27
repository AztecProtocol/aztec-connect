import { AppAction, LoginMode } from '../app';

export enum Pages {
  HOME = '/',
  SIGNIN = '/signin',
  SIGNUP = '/signup',
  DASHBOARD = '/dashboard',
  EARN = '/earn',
  SEND = '/send',
  TRADE = '/trade',
  BALANCE = '/balance',
}

const views = [
  {
    path: Pages.HOME,
    action: AppAction.NADA,
  },
  {
    path: Pages.SIGNIN,
    action: AppAction.LOGIN,
  },
  {
    path: Pages.SIGNUP,
    action: AppAction.LOGIN,
  },
  {
    path: Pages.DASHBOARD,
    action: AppAction.ACCOUNT,
  },
  {
    path: Pages.EARN,
    action: AppAction.ACCOUNT,
  },
  {
    path: Pages.SEND,
    action: AppAction.ACCOUNT,
  },
  {
    path: Pages.TRADE,
    action: AppAction.ACCOUNT,
  },
  {
    path: Pages.BALANCE,
    action: AppAction.ACCOUNT,
  },
];

export const appPaths = views.map(p => p.path.toString());

export const getActionFromUrl = (url: string) => views.find(v => v.path === url)?.action || AppAction.NADA;

export const getUrlFromAction = (action: AppAction) => views.find(v => v.action === action)!.path;

export const getLoginModeFromUrl = (url: string) => {
  switch (url) {
    case Pages.SIGNUP:
    case Pages.HOME:
      return LoginMode.SIGNUP;
    default:
      return LoginMode.LOGIN;
  }
};

export const getUrlFromLoginMode = (mode: LoginMode) => {
  switch (mode) {
    case LoginMode.SIGNUP:
      return Pages.SIGNUP;
    default:
      return Pages.SIGNIN;
  }
};

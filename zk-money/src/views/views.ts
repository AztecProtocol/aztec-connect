import { AppAction, AppAssetId, assets, LoginMode } from '../app';

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
    path: '/signup',
    action: AppAction.LOGIN,
  },
  {
    path: '/migrate',
    action: AppAction.LOGIN,
  },
  {
    path: '/asset/:assetSymbol',
    action: AppAction.ACCOUNT,
  },
];

export const appPaths = views.map(p => p.path);

export const getActionFromUrl = (url: string) => views.find(v => v.path === url)?.action || AppAction.NADA;

export const getUrlFromAction = (action: AppAction) => views.find(v => v.action === action)!.path;

export const getLoginModeFromUrl = (url: string) => {
  switch (url) {
    case '/signup':
    case '/':
      return LoginMode.SIGNUP;
    case '/migrate':
      return LoginMode.MIGRATE;
    default:
      return LoginMode.LOGIN;
  }
};

export const getUrlFromLoginMode = (mode: LoginMode) => {
  switch (mode) {
    case LoginMode.SIGNUP:
      return '/signup';
    case LoginMode.MIGRATE:
      return '/migrate';
    default:
      return '/signin';
  }
};

export const getAccountUrl = (assetId: AppAssetId) =>
  views.find(v => v.action === AppAction.ACCOUNT)!.path.replace(':assetSymbol', `${assets[assetId].symbol}`);

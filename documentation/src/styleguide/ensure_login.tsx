import { AppEvent, AppInitState, AppInitStatus, EthAddress, WebSdk } from '@aztec/sdk';
import React, { useEffect, useState } from 'react';
import { App } from './app';

export interface EnsureLoginChildrenProps {
  app: App;
  sdk: WebSdk;
  account: EthAddress;
}

export interface DefaultContentProps {
  app: App;
  sdk: WebSdk;
  initStatus?: AppInitStatus;
}

interface SdkPermissionHandlerProps {
  app: App;
  children: React.ReactNode | ((props: EnsureLoginChildrenProps) => JSX.Element);
  DefaultContent?: (props: DefaultContentProps) => JSX.Element;
}

const SdkPermissionHandler = ({ app, children, DefaultContent }: SdkPermissionHandlerProps) => {
  const sdk = app.getWebSdk();
  const [initStatus, setInitStatus] = useState(sdk.getInitStatus());

  useEffect(() => {
    const handleInitStatusChanged = (status: AppInitStatus) => {
      setInitStatus(status);
    };

    sdk.on(AppEvent.UPDATED_INIT_STATE, handleInitStatusChanged);

    return () => {
      sdk.off(AppEvent.UPDATED_INIT_STATE, handleInitStatusChanged);
    };
  }, [sdk]);

  if (initStatus?.initState === AppInitState.INITIALIZED) {
    if (typeof children === 'function') {
      return children({ app, sdk, account: sdk.getAddress() });
    }

    return <>{children}</>;
  }

  if (!DefaultContent) {
    return <></>;
  }

  return <DefaultContent app={app} sdk={sdk} initStatus={initStatus} />;
};

interface EnsureLoginProps {
  app: App;
  children: React.ReactNode | ((props: EnsureLoginChildrenProps) => JSX.Element);
  DefaultContent?: (props: DefaultContentProps) => JSX.Element;
  UnsupportedContent?: () => JSX.Element;
}

export const EnsureLogin = ({ app, children, DefaultContent, UnsupportedContent }: EnsureLoginProps) => {
  if (!app.isSdkAvailable()) {
    return UnsupportedContent ? <UnsupportedContent /> : <></>;
  }

  return <SdkPermissionHandler app={app} children={children} DefaultContent={DefaultContent} />;
};

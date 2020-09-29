import { AppEvent, AppInitState, AppInitStatus, EthAddress, WebSdk } from 'aztec2-sdk';
import React, { useEffect, useState } from 'react';
import { App } from './app';

export interface EnsureLoginChildrenProps {
  app: App;
  sdk: WebSdk;
  account: EthAddress;
}

export interface DefaultContentProps {
  app: App;
  initStatus?: AppInitStatus;
}

interface SdkPermissionHandlerProps {
  app: App;
  children: React.ReactNode | ((props: EnsureLoginChildrenProps) => JSX.Element);
  DefaultContent?: (props: DefaultContentProps) => JSX.Element;
}

const SdkPermissionHandler = ({ app, children, DefaultContent }: SdkPermissionHandlerProps) => {
  const [initStatus, setInitStatus] = useState(app.webSdk.getInitStatus());

  useEffect(() => {
    const handleInitStatusChanged = (status: AppInitStatus) => {
      setInitStatus(status);
    };

    app.webSdk.on(AppEvent.UPDATED_INIT_STATE, handleInitStatusChanged);

    return () => {
      app.webSdk.off(AppEvent.UPDATED_INIT_STATE, handleInitStatusChanged);
    };
  }, [app]);

  if (initStatus?.initState === AppInitState.INITIALIZED) {
    if (typeof children === 'function') {
      return children({ app, sdk: app.webSdk, account: initStatus!.account! });
    }

    return <>{children}</>;
  }

  if (!DefaultContent) {
    return <></>;
  }

  return <DefaultContent app={app} initStatus={initStatus} />;
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

import React, { useState, useEffect, FunctionComponent } from 'react';
import { Text, TextButton, Block } from '@aztec/guacamole-ui';
import { EthAddress } from 'barretenberg/address';
import { Button, Input, FormSection, Form } from './components';
import { WebSdk, AppInitState, AppEvent, AppInitAction, AppInitStatus } from 'aztec2-sdk';
import createDebug from 'debug';

const debug = createDebug('bb::init_form');

export interface InitChildrenProps {
  app: WebSdk;
  account: EthAddress;
}

interface InitProps {
  app: WebSdk;
  initialServerUrl?: string;
  children: (props: InitChildrenProps) => JSX.Element;
}

export const Init: FunctionComponent<InitProps> = ({ app, initialServerUrl = '', children }) => {
  const [initStatus, setInitStatus] = useState(app.getInitStatus());
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [showServerUrl, setShowServerUrl] = useState(false);
  const { initState } = initStatus;

  useEffect(() => {
    app.on(AppEvent.UPDATED_INIT_STATE, setInitStatus);

    return () => {
      app.off(AppEvent.UPDATED_INIT_STATE, setInitStatus);
    };
  }, [app]);

  return (
    <>
      {initState !== AppInitState.INITIALIZED && (
        <Form>
          <FormSection align="center">
            <Block padding="m 0">
              <Text text={initState === AppInitState.INITIALIZING ? getInitString(initStatus) : 'Press the button'} />
            </Block>
            <Block padding="m 0">
              {initStatus.initAction === AppInitAction.AWAIT_LINK_AZTEC_ACCOUNT ? (
                <Button text="Link Account" onSubmit={() => app.linkAccount().catch(err => debug(err))} />
              ) : (
                <Button
                  text="The Button"
                  onSubmit={() => app.init(serverUrl).catch(err => debug(err))}
                  isLoading={initState === AppInitState.INITIALIZING}
                />
              )}
            </Block>
          </FormSection>
          {initState === AppInitState.UNINITIALIZED && (
            <FormSection align="center">
              <TextButton
                theme="implicit"
                text="change server url"
                size="xs"
                color="white-lighter"
                onClick={() => setShowServerUrl(!showServerUrl)}
              />
              {showServerUrl && (
                <Block padding="m 0">
                  <Input value={serverUrl} onChange={setServerUrl} />
                </Block>
              )}
            </FormSection>
          )}
        </Form>
      )}
      {initState === AppInitState.INITIALIZED && children({ app, account: initStatus.account! })}
    </>
  );
};

function getInitString({ initAction, network, account, message }: AppInitStatus) {
  switch (initAction) {
    case undefined:
      return message || 'Initializing...';
    case AppInitAction.CHANGE_NETWORK:
      return `Change MetaMask network to ${network}...`;
    case AppInitAction.LINK_PROVIDER_ACCOUNT:
      return `Check MetaMask to link Ethereum account...`;
    case AppInitAction.LINK_AZTEC_ACCOUNT:
      return `Check for MetaMask signature request to link Aztec account...`;
    case AppInitAction.AWAIT_LINK_AZTEC_ACCOUNT:
      return `Link ${account!.toString().slice(0, 6)}...${account!.toString().slice(-4)} to Aztec.`;
  }
}

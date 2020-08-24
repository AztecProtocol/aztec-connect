import React, { useState, useEffect, FunctionComponent } from 'react';
import { Text, Block } from '@aztec/guacamole-ui';
import { Button, FormField, Input, FormSection, Form } from './components';
import { WebSdk, AppInitState, AppEvent, AppInitAction, AppInitStatus } from 'aztec2-sdk';
import createDebug from 'debug';

const debug = createDebug('bb::init_form');

interface InitProps {
  app: WebSdk;
  initialServerUrl?: string;
}

export const Init: FunctionComponent<InitProps> = ({ app, initialServerUrl = '', children }) => {
  const [initStatus, setInitStatus] = useState(app.getInitStatus());
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
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
          <FormSection>
            {initState === AppInitState.UNINITIALIZED && (
              <Block padding="xs 0">
                <FormField label="Server url">
                  <Input value={serverUrl} onChange={setServerUrl} />
                </FormField>
                <FormField label="Press the button">
                  <Button text="The Button" onSubmit={() => app.init(serverUrl).catch(err => debug(err.message))} />
                </FormField>
              </Block>
            )}
            {initState === AppInitState.INITIALIZING && (
              <Block padding="m 0" align="center">
                <Text text={getInitString(initStatus)} />
              </Block>
            )}
          </FormSection>
        </Form>
      )}
      {initState === AppInitState.INITIALIZED && children}
    </>
  );
};

function getInitString({ initAction, network, message }: AppInitStatus) {
  switch (initAction) {
    case undefined:
      return message || 'Initializing...';
    case AppInitAction.CHANGE_NETWORK:
      return `Change MetaMask network to ${network}...`;
    case AppInitAction.LINK_PROVIDER_ACCOUNT:
      return `Check MetaMask to link Ethereum account...`;
    case AppInitAction.LINK_AZTEC_ACCOUNT:
      return `Check for MetaMask signature request to link Aztec account...`;
  }
}

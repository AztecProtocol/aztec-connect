import React, { useState, useEffect, FunctionComponent } from 'react';
import { Text, Block } from '@aztec/guacamole-ui';
import { Button, FormField, Input, FormSection, Form } from './components';
import { App, AppInitState, AppEvent } from './app';
import { chainIdToNetwork, EthProviderEvent } from './eth_provider';

interface InitProps {
  app: App;
  initialServerUrl?: string;
}

export const Init: FunctionComponent<InitProps> = ({ app, initialServerUrl = '', children }) => {
  const sdk = app.getSdk()!;
  const [initState, setInitState] = useState(app.getInitState());
  const [initMsg, setInitMsg] = useState<string | undefined>();
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [, setChainId] = useState(-1);
  const isLoading = initState === AppInitState.INITIALIZING;

  useEffect(() => {
    app.on(AppEvent.UPDATED_INIT_STATE, (state, msg) => {
      setInitState(state);
      setInitMsg(msg);
    });
    app.on(EthProviderEvent.UPDATED_NETWORK, setChainId);

    return () => {
      app.off(AppEvent.UPDATED_INIT_STATE, setInitState);
      app.off(EthProviderEvent.UPDATED_NETWORK, setChainId);
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
                  <Button text="The Button" onSubmit={() => app.init(serverUrl)} isLoading={isLoading} />
                </FormField>
              </Block>
            )}
            {initState === AppInitState.INITIALIZING && (
              <Block padding="m 0" align="center">
                <Text text={initMsg || 'Initializing...'} />
              </Block>
            )}
          </FormSection>
        </Form>
      )}
      {initState === AppInitState.INITIALIZED && children}
    </>
  );
};

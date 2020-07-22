import { SdkEvent, SdkInitState } from 'aztec2-sdk';
import createDebug from 'debug';
import React, { useState, useEffect } from 'react';
import { App } from '../app';
import { ActionForm } from './action_form';
import { Form, FormSection } from '../components';
import { Init } from './init';

const debug = createDebug('bb:join_split_form');

interface JoinSplitFormProps {
  app: App;
}

export const JoinSplitForm = ({ app }: JoinSplitFormProps) => {
  const [initState, setInitState] = useState(app.getInitState());
  const [serverUrl, setServerUrl] = useState(window.location.protocol + '//' + window.location.hostname);

  useEffect(() => {
    app.on(SdkEvent.UPDATED_INIT_STATE, setInitState);

    return () => {
      app.off(SdkEvent.UPDATED_INIT_STATE, setInitState);
    };
  }, [app]);

  return (
    <Form>
      {initState !== SdkInitState.INITIALIZED && (
        <FormSection>
          <Init
            initialServerUrl={serverUrl}
            onSubmit={async (serverUrl: string) => {
              setServerUrl(serverUrl);
              app.init(serverUrl);
            }}
            isLoading={initState === SdkInitState.INITIALIZING}
          />
        </FormSection>
      )}
      {initState === SdkInitState.INITIALIZED && <ActionForm app={app} />}
    </Form>
  );
};
